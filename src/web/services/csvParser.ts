/**
 * Browser-compatible CSV parsing
 * Extracted from src/main/services/csvImporter.ts
 * Takes content as string instead of file paths.
 */

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

// ---- CSV Parsing ----

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

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

export function parseRobinhoodCsv(content: string): ImportedStock[] {
  const rows = parseCsv(content);
  const holdings: Record<string, { shares: number; totalCost: number }> = {};

  for (const row of rows) {
    const ticker = row['Instrument'] ?? '';
    const transCode = (row['Trans Code'] ?? '').toLowerCase();
    const quantity = parseFloat(row['Quantity'] ?? '0') || 0;
    const priceStr = (row['Price'] ?? '').replace(/[$,]/g, '');
    const price = parseFloat(priceStr) || 0;

    if (!ticker || ticker.trim() === '') continue;

    if (transCode === 'buy') {
      if (!holdings[ticker]) holdings[ticker] = { shares: 0, totalCost: 0 };
      holdings[ticker].shares += quantity;
      holdings[ticker].totalCost += quantity * price;
    } else if (transCode === 'sell') {
      if (!holdings[ticker]) holdings[ticker] = { shares: 0, totalCost: 0 };
      holdings[ticker].shares -= quantity;
      if (holdings[ticker].shares > 0) {
        const avgCost = holdings[ticker].totalCost / (holdings[ticker].shares + quantity);
        holdings[ticker].totalCost = holdings[ticker].shares * avgCost;
      } else {
        holdings[ticker].totalCost = 0;
      }
    }
  }

  const results: ImportedStock[] = [];
  for (const [ticker, data] of Object.entries(holdings)) {
    if (data.shares > 0.0001) {
      results.push({
        name: ticker,
        ticker: ticker.toUpperCase(),
        shares: Math.round(data.shares * 10000) / 10000,
        costBasisPerShare: data.totalCost / data.shares,
      });
    }
  }

  return results.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

// ---- CoinMarketCap / Crypto Import ----

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
  NEAR: { id: 'near', name: 'NEAR Protocol' },
  SHIB: { id: 'shiba-inu', name: 'Shiba Inu' },
  SUI: { id: 'sui', name: 'Sui' },
  USDC: { id: 'usd-coin', name: 'USD Coin' },
  USDT: { id: 'tether', name: 'Tether' },
  BNB: { id: 'binancecoin', name: 'BNB' },
  TON: { id: 'the-open-network', name: 'Toncoin' },
  BONK: { id: 'bonk', name: 'Bonk' },
  PEPE: { id: 'pepe', name: 'Pepe' },
  ICP: { id: 'internet-computer', name: 'Internet Computer' },
  KAS: { id: 'kaspa', name: 'Kaspa' },
};

export function parseCryptoCsv(content: string): ImportedCrypto[] {
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]).map(h => h.toLowerCase());

  const nameCol = findColumn(headers, ['name', 'coin', 'coin name', 'token', 'asset']);
  const symbolCol = findColumn(headers, ['symbol', 'ticker', 'coin symbol', 'code']);
  const qtyCol = findColumn(headers, ['quantity', 'amount', 'holdings', 'balance', 'qty', 'coins']);
  const priceCol = findColumn(headers, ['price', 'buy price', 'avg price', 'average price', 'cost', 'price per coin', 'purchase price', 'avg buy price', 'average buy price']);
  const typeCol = findColumn(headers, ['type', 'transaction type', 'trans code', 'side']);
  const isTransactionLog = typeCol !== null;

  let results: ImportedCrypto[];
  if (isTransactionLog) {
    results = parseCryptoTransactions(rows, nameCol, symbolCol, qtyCol, priceCol, typeCol);
  } else {
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

  // Resolve known CoinGecko IDs
  for (const coin of results) {
    const known = KNOWN_COIN_IDS[coin.symbol];
    if (known) {
      coin.coinId = known.id;
      if (coin.name === coin.symbol) coin.name = known.name;
    }
  }

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
  for (const candidate of candidates) {
    const found = headers.find(h => h.includes(candidate));
    if (found) return found;
  }
  return null;
}

function lowerKeyRow(row: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) result[k.toLowerCase()] = v;
  return result;
}

function getVal(row: Record<string, string>, key: string | null): string {
  if (!key) return '';
  return row[key] ?? '';
}

function parseNum(val: string): number {
  return parseFloat(val.replace(/[$,()]/g, '')) || 0;
}
