/**
 * CSV Import Service
 * ------------------
 * Parses CSV exports from Robinhood (stocks) and CoinMarketCap (crypto)
 * and converts them into portfolio entries.
 */

import { dialog } from 'electron';
import * as fs from 'fs';
import { searchCoins } from './cryptoService';

// ---- Types ----

export interface ImportedStock {
  name: string;
  ticker: string;
  shares: number;
  costBasisPerShare: number;
}

export interface ImportedCrypto {
  name: string;
  symbol: string;
  coinId: string;
  quantity: number;
  costBasisPerUnit: number;
}

// ---- Fix Existing CoinGecko IDs ----

export async function fixCoinIds(): Promise<number> {
  const { getAllCrypto, updateCrypto } = await import('../database/repositories/cryptoRepo');
  const allCrypto = getAllCrypto();
  let fixed = 0;

  for (const coin of allCrypto) {
    const symbol = coin.symbol.toUpperCase();
    const known = KNOWN_COIN_IDS[symbol];
    if (known && coin.coinId !== known.id) {
      updateCrypto(coin.id, { coinId: known.id, name: known.name });
      fixed++;
      continue;
    }
    // If not in known list and coinId looks like a symbol (no hyphens, short), try API
    if (!coin.coinId.includes('-') && coin.coinId.length <= 6) {
      try {
        const results = await searchCoins(symbol);
        const match = results.find(r => r.symbol.toUpperCase() === symbol);
        if (match && coin.coinId !== match.id) {
          updateCrypto(coin.id, { coinId: match.id, name: match.name });
          fixed++;
        }
      } catch {
        // skip
      }
    }
  }
  return fixed;
}

// ---- File Dialog ----

export async function openCsvDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Import CSV or PDF',
    filters: [
      { name: 'Supported Files', extensions: ['csv', 'pdf'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'PDF Files', extensions: ['pdf'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}

// ---- CSV Parsing ----

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Parse header — handle quoted headers
  const headers = parseCsvLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---- Robinhood Import ----

export function parseRobinhoodCsv(filePath: string): ImportedStock[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content);

  // Aggregate Buy/Sell transactions per ticker
  const holdings: Record<string, { shares: number; totalCost: number }> = {};

  for (const row of rows) {
    const ticker = row['Instrument'] ?? '';
    const transCode = (row['Trans Code'] ?? '').toLowerCase();
    const quantity = parseFloat(row['Quantity'] ?? '0') || 0;
    const priceStr = (row['Price'] ?? '').replace(/[$,]/g, '');
    const price = parseFloat(priceStr) || 0;

    if (!ticker || ticker.trim() === '') continue;

    // Only process Buy and Sell transactions
    if (transCode === 'buy') {
      if (!holdings[ticker]) holdings[ticker] = { shares: 0, totalCost: 0 };
      holdings[ticker].shares += quantity;
      holdings[ticker].totalCost += quantity * price;
    } else if (transCode === 'sell') {
      if (!holdings[ticker]) holdings[ticker] = { shares: 0, totalCost: 0 };
      holdings[ticker].shares -= quantity;
      // Reduce cost basis proportionally
      if (holdings[ticker].shares > 0) {
        const avgCost = holdings[ticker].totalCost / (holdings[ticker].shares + quantity);
        holdings[ticker].totalCost = holdings[ticker].shares * avgCost;
      } else {
        holdings[ticker].totalCost = 0;
      }
    }
  }

  // Convert to ImportedStock array (only stocks with positive shares)
  const results: ImportedStock[] = [];
  for (const [ticker, data] of Object.entries(holdings)) {
    if (data.shares > 0.0001) {
      results.push({
        name: ticker, // We'll use ticker as name; price refresh will work via ticker
        ticker: ticker.toUpperCase(),
        shares: Math.round(data.shares * 10000) / 10000,
        costBasisPerShare: data.totalCost / data.shares,
      });
    }
  }

  return results.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// ---- Robinhood PDF Import ----

async function extractPdfText(filePath: string): Promise<string> {
  const { execFileSync } = await import('child_process');
  const { join } = await import('path');
  const { app } = await import('electron');

  // Find the project root (where node_modules lives)
  const appDir = app.getAppPath().replace(/[\\/]\.vite[\\/].*$/, '');
  const nodeModulesDir = join(appDir, 'node_modules');
  const pdfParseCjs = join(nodeModulesDir, 'pdf-parse', 'dist', 'pdf-parse', 'cjs', 'index.cjs');

  // Write a temp CJS script that uses pdf-parse v2 API outside of Vite's bundle
  const scriptPath = join(app.getPath('temp'), 'pdf-extract.cjs');
  fs.writeFileSync(scriptPath, `
const fs = require('fs');
const pdfParsePath = process.argv[2];
const pdfFilePath = process.argv[3];
const { PDFParse } = require(pdfParsePath);
const data = fs.readFileSync(pdfFilePath);
const parser = new PDFParse({ data });
parser.getText().then(result => {
  process.stdout.write(result.text || '');
  return parser.destroy();
}).catch(err => {
  process.stderr.write(err.message || String(err));
  process.exit(1);
});
`);

  const result = execFileSync('node', [scriptPath, pdfParseCjs, filePath], {
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'utf-8',
    timeout: 60000,
    env: { ...process.env, NODE_PATH: nodeModulesDir },
  });
  return result;
}

export async function parseRobinhoodPdf(filePath: string): Promise<ImportedStock[]> {
  const text = await extractPdfText(filePath);

  const results: ImportedStock[] = [];

  // Robinhood statements list holdings in a table format.
  // We look for patterns like: TICKER\nCompany Name\nX.XX shares\n$XX.XX\n$XX,XXX.XX
  // Or tabular: TICKER  shares  avg cost  market value
  const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

  // Strategy 1: Look for "Your Portfolio" or "Stocks" section with structured data
  // Try to find lines that look like stock tickers followed by share counts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match a line that looks like a ticker (1-5 uppercase letters, standalone)
    const tickerMatch = line.match(/^([A-Z]{1,5})$/);
    if (!tickerMatch) continue;

    const ticker = tickerMatch[1];

    // Look ahead for shares and price info in the next few lines
    const nextLines = lines.slice(i + 1, i + 8).join(' ');

    // Look for share count pattern
    const sharesMatch = nextLines.match(/(\d+[\d,.]*)\s*(?:shares?|Shares?)/);
    // Look for dollar amounts
    const dollarMatches = nextLines.match(/\$[\d,]+\.?\d*/g);

    if (sharesMatch && dollarMatches && dollarMatches.length >= 1) {
      const shares = parseNum(sharesMatch[1]);
      if (shares <= 0) continue;

      // First dollar amount is usually avg cost or price per share
      // If multiple, try to find per-share cost (smaller number)
      const amounts = dollarMatches.map((d: string) => parseNum(d)).filter((n: number) => n > 0);

      let costBasis = 0;
      if (amounts.length >= 2) {
        // Usually: avg cost per share, then total value
        // The smaller per-share value is likely the cost basis
        costBasis = Math.min(...amounts.filter((a: number) => a < amounts[amounts.length - 1])) || amounts[0];
      } else if (amounts.length === 1) {
        costBasis = amounts[0] / shares; // total value / shares
      }

      // Skip if this looks like a non-stock entry (e.g., account numbers)
      if (shares > 0 && ticker.length >= 1) {
        results.push({
          name: ticker,
          ticker,
          shares,
          costBasisPerShare: costBasis > shares * 10000 ? costBasis / shares : costBasis,
        });
      }
    }
  }

  // Strategy 2: If strategy 1 found nothing, try tabular parsing
  // Look for lines with ticker + numbers pattern: "AAPL 10 150.00 1500.00"
  if (results.length === 0) {
    for (const line of lines) {
      const tabMatch = line.match(/^([A-Z]{1,5})\s+([\d,.]+)\s+\$?([\d,.]+)\s+\$?([\d,.]+)/);
      if (tabMatch) {
        const ticker = tabMatch[1];
        const shares = parseNum(tabMatch[2]);
        const price = parseNum(tabMatch[3]);
        if (shares > 0 && price > 0) {
          results.push({ name: ticker, ticker, shares, costBasisPerShare: price });
        }
      }
    }
  }

  return results;
}

// ---- CoinMarketCap Import (flexible parser) ----

export async function parseCryptoCsv(filePath: string): Promise<ImportedCrypto[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase());

  // Try to detect column mappings flexibly
  const nameCol = findColumn(headers, ['name', 'coin', 'coin name', 'token', 'asset']);
  const symbolCol = findColumn(headers, ['symbol', 'ticker', 'coin symbol', 'code']);
  const qtyCol = findColumn(headers, ['quantity', 'amount', 'holdings', 'balance', 'qty', 'coins']);
  const priceCol = findColumn(headers, ['price', 'buy price', 'avg price', 'average price', 'cost', 'price per coin', 'purchase price', 'avg buy price', 'average buy price']);

  // If it looks like a transaction log, aggregate like Robinhood
  const typeCol = findColumn(headers, ['type', 'transaction type', 'trans code', 'side']);
  const isTransactionLog = typeCol !== null;

  let results: ImportedCrypto[];
  if (isTransactionLog) {
    results = parseCryptoTransactions(rows, nameCol, symbolCol, qtyCol, priceCol, typeCol);
  } else {
    // Holdings-style CSV
    results = [];
    for (const row of rows) {
      const vals = lowerKeyRow(row);
      const name = getVal(vals, nameCol) || getVal(vals, symbolCol) || '';
      const symbol = getVal(vals, symbolCol) || name;
      const quantity = parseNum(getVal(vals, qtyCol));
      const price = parseNum(getVal(vals, priceCol));

      if (symbol && quantity > 0) {
        results.push({
          name: name || symbol,
          symbol: symbol.toUpperCase(),
          coinId: symbol.toLowerCase(),
          quantity,
          costBasisPerUnit: price,
        });
      }
    }
  }

  // Resolve CoinGecko IDs from symbols so price lookup works
  await resolveCoinGeckoIds(results);
  return results;
}

function parseCryptoTransactions(
  rows: Array<Record<string, string>>,
  nameCol: string | null,
  symbolCol: string | null,
  qtyCol: string | null,
  priceCol: string | null,
  typeCol: string | null,
): ImportedCrypto[] {
  const holdings: Record<string, { name: string; quantity: number; totalCost: number }> = {};

  for (const row of rows) {
    const vals = lowerKeyRow(row);
    const name = getVal(vals, nameCol) || getVal(vals, symbolCol) || '';
    const symbol = (getVal(vals, symbolCol) || name).toUpperCase();
    const quantity = parseNum(getVal(vals, qtyCol));
    const price = parseNum(getVal(vals, priceCol));
    const type = (getVal(vals, typeCol) || '').toLowerCase();

    if (!symbol || quantity <= 0) continue;

    if (!holdings[symbol]) holdings[symbol] = { name: name || symbol, quantity: 0, totalCost: 0 };

    if (type.includes('buy') || type.includes('transfer in') || type === 'in') {
      holdings[symbol].quantity += quantity;
      holdings[symbol].totalCost += quantity * price;
    } else if (type.includes('sell') || type.includes('transfer out') || type === 'out') {
      holdings[symbol].quantity -= quantity;
      if (holdings[symbol].quantity > 0 && holdings[symbol].totalCost > 0) {
        const avgCost = holdings[symbol].totalCost / (holdings[symbol].quantity + quantity);
        holdings[symbol].totalCost = holdings[symbol].quantity * avgCost;
      } else {
        holdings[symbol].totalCost = 0;
      }
    }
  }

  const results: ImportedCrypto[] = [];
  for (const [symbol, data] of Object.entries(holdings)) {
    if (data.quantity > 0.00000001) {
      results.push({
        name: data.name,
        symbol,
        coinId: symbol.toLowerCase(),
        quantity: data.quantity,
        costBasisPerUnit: data.totalCost / data.quantity,
      });
    }
  }
  return results.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

// ---- Helpers ----

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const found = headers.find(h => h === candidate);
    if (found) return found;
  }
  // Fuzzy: check if header contains candidate
  for (const candidate of candidates) {
    const found = headers.find(h => h.includes(candidate));
    if (found) return found;
  }
  return null;
}

function lowerKeyRow(row: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    result[k.toLowerCase()] = v;
  }
  return result;
}

function getVal(row: Record<string, string>, key: string | null): string {
  if (!key) return '';
  return row[key] ?? '';
}

function parseNum(val: string): number {
  return parseFloat(val.replace(/[$,()]/g, '')) || 0;
}

// Common symbol -> CoinGecko ID mappings (covers top coins instantly, no API call needed)
const KNOWN_COIN_IDS: Record<string, { id: string; name: string }> = {
  BTC: { id: 'bitcoin', name: 'Bitcoin' },
  ETH: { id: 'ethereum', name: 'Ethereum' },
  SOL: { id: 'solana', name: 'Solana' },
  ADA: { id: 'cardano', name: 'Cardano' },
  XRP: { id: 'ripple', name: 'XRP' },
  DOGE: { id: 'dogecoin', name: 'Dogecoin' },
  DOT: { id: 'polkadot', name: 'Polkadot' },
  AVAX: { id: 'avalanche-2', name: 'Avalanche' },
  MATIC: { id: 'matic-network', name: 'Polygon' },
  POL: { id: 'matic-network', name: 'Polygon' },
  LINK: { id: 'chainlink', name: 'Chainlink' },
  ATOM: { id: 'cosmos', name: 'Cosmos' },
  UNI: { id: 'uniswap', name: 'Uniswap' },
  LTC: { id: 'litecoin', name: 'Litecoin' },
  BCH: { id: 'bitcoin-cash', name: 'Bitcoin Cash' },
  ALGO: { id: 'algorand', name: 'Algorand' },
  XLM: { id: 'stellar', name: 'Stellar' },
  FIL: { id: 'filecoin', name: 'Filecoin' },
  NEAR: { id: 'near', name: 'NEAR Protocol' },
  APT: { id: 'aptos', name: 'Aptos' },
  ARB: { id: 'arbitrum', name: 'Arbitrum' },
  OP: { id: 'optimism', name: 'Optimism' },
  SHIB: { id: 'shiba-inu', name: 'Shiba Inu' },
  PEPE: { id: 'pepe', name: 'Pepe' },
  SUI: { id: 'sui', name: 'Sui' },
  SEI: { id: 'sei-network', name: 'Sei' },
  TIA: { id: 'celestia', name: 'Celestia' },
  INJ: { id: 'injective-protocol', name: 'Injective' },
  RENDER: { id: 'render-token', name: 'Render' },
  FET: { id: 'fetch-ai', name: 'Fetch.ai' },
  USDC: { id: 'usd-coin', name: 'USD Coin' },
  USDT: { id: 'tether', name: 'Tether' },
  BNB: { id: 'binancecoin', name: 'BNB' },
  TRX: { id: 'tron', name: 'TRON' },
  TON: { id: 'the-open-network', name: 'Toncoin' },
  AAVE: { id: 'aave', name: 'Aave' },
  CRO: { id: 'crypto-com-chain', name: 'Cronos' },
  MKR: { id: 'maker', name: 'Maker' },
  GRT: { id: 'the-graph', name: 'The Graph' },
  IMX: { id: 'immutable-x', name: 'Immutable' },
  HBAR: { id: 'hedera-hashgraph', name: 'Hedera' },
  VET: { id: 'vechain', name: 'VeChain' },
  SAND: { id: 'the-sandbox', name: 'The Sandbox' },
  MANA: { id: 'decentraland', name: 'Decentraland' },
  AXS: { id: 'axie-infinity', name: 'Axie Infinity' },
  THETA: { id: 'theta-token', name: 'Theta Network' },
  FTM: { id: 'fantom', name: 'Fantom' },
  RUNE: { id: 'thorchain', name: 'THORChain' },
  EGLD: { id: 'elrond-erd-2', name: 'MultiversX' },
  BONK: { id: 'bonk', name: 'Bonk' },
  WIF: { id: 'dogwifcoin', name: 'dogwifhat' },
  JUP: { id: 'jupiter-exchange-solana', name: 'Jupiter' },
  PYTH: { id: 'pyth-network', name: 'Pyth Network' },
  STX: { id: 'blockstack', name: 'Stacks' },
  ICP: { id: 'internet-computer', name: 'Internet Computer' },
  KAS: { id: 'kaspa', name: 'Kaspa' },
};

/**
 * Resolve CoinGecko IDs for imported crypto.
 * Uses known mappings first, falls back to CoinGecko search API.
 */
async function resolveCoinGeckoIds(coins: ImportedCrypto[]): Promise<void> {
  for (const coin of coins) {
    const known = KNOWN_COIN_IDS[coin.symbol];
    if (known) {
      coin.coinId = known.id;
      if (coin.name === coin.symbol) coin.name = known.name;
      continue;
    }

    // Fallback: search CoinGecko API
    try {
      const results = await searchCoins(coin.symbol);
      const match = results.find(r => r.symbol.toUpperCase() === coin.symbol);
      if (match) {
        coin.coinId = match.id;
        if (coin.name === coin.symbol) coin.name = match.name;
      }
    } catch {
      // Keep the lowercase symbol as fallback
    }
  }
}
