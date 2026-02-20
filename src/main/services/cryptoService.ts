const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Symbol -> CoinGecko ID mapping for reliable price lookups
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano',
  XRP: 'ripple', DOGE: 'dogecoin', DOT: 'polkadot', AVAX: 'avalanche-2',
  MATIC: 'matic-network', POL: 'matic-network', LINK: 'chainlink',
  ATOM: 'cosmos', UNI: 'uniswap', LTC: 'litecoin', BCH: 'bitcoin-cash',
  ALGO: 'algorand', XLM: 'stellar', FIL: 'filecoin', NEAR: 'near',
  APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', SHIB: 'shiba-inu',
  PEPE: 'pepe', SUI: 'sui', SEI: 'sei-network', TIA: 'celestia',
  INJ: 'injective-protocol', RENDER: 'render-token', FET: 'fetch-ai',
  USDC: 'usd-coin', USDT: 'tether', BNB: 'binancecoin', TRX: 'tron',
  TON: 'the-open-network', AAVE: 'aave', CRO: 'crypto-com-chain',
  MKR: 'maker', GRT: 'the-graph', IMX: 'immutable-x',
  HBAR: 'hedera-hashgraph', VET: 'vechain', SAND: 'the-sandbox',
  MANA: 'decentraland', AXS: 'axie-infinity', THETA: 'theta-token',
  FTM: 'fantom', RUNE: 'thorchain', EGLD: 'elrond-erd-2',
  BONK: 'bonk', WIF: 'dogwifcoin', JUP: 'jupiter-exchange-solana',
  PYTH: 'pyth-network', STX: 'blockstack', ICP: 'internet-computer',
  KAS: 'kaspa', XMR: 'monero', ETC: 'ethereum-classic', XTZ: 'tezos',
  EOS: 'eos', FLOW: 'flow', GALA: 'gala', ENS: 'ethereum-name-service',
  CRV: 'curve-dao-token', LDO: 'lido-dao', APE: 'apecoin',
  COMP: 'compound-governance-token', SNX: 'havven', SUSHI: 'sushi',
  YFI: 'yearn-finance', BAT: 'basic-attention-token', ZEC: 'zcash',
  DASH: 'dash', NEO: 'neo', WAVES: 'waves', ZIL: 'zilliqa',
  ENJ: 'enjincoin', CHZ: 'chiliz', ONE: 'harmony', KAVA: 'kava',
  CELO: 'celo', ROSE: 'oasis-network', MINA: 'mina-protocol',
  QNT: 'quant-network', RPL: 'rocket-pool', GMX: 'gmx',
  PENDLE: 'pendle', WLD: 'worldcoin-wld', TRB: 'tellor',
};

/**
 * Fetch crypto prices using symbols. Resolves symbols to CoinGecko IDs
 * so it works regardless of what coin_id is stored in the DB.
 * Returns a map of symbol -> { price, coinId }.
 */
export async function fetchCryptoPricesBySymbol(
  symbols: string[]
): Promise<Map<string, { price: number; coinId: string }>> {
  const result = new Map<string, { price: number; coinId: string }>();
  if (symbols.length === 0) return result;

  // Map symbols to CoinGecko IDs
  const symbolToId = new Map<string, string>();
  const unknownSymbols: string[] = [];

  for (const sym of symbols) {
    const upper = sym.toUpperCase();
    const id = SYMBOL_TO_ID[upper];
    if (id) {
      symbolToId.set(upper, id);
    } else {
      unknownSymbols.push(upper);
    }
  }

  // Try to resolve unknown symbols via CoinGecko search
  for (const sym of unknownSymbols) {
    try {
      const searchResults = await searchCoins(sym);
      const match = searchResults.find(r => r.symbol.toUpperCase() === sym);
      if (match) {
        symbolToId.set(sym, match.id);
      }
    } catch {
      console.warn(`Could not resolve CoinGecko ID for symbol: ${sym}`);
    }
  }

  if (symbolToId.size === 0) return result;

  // Fetch prices from CoinGecko
  const ids = [...new Set(symbolToId.values())].join(',');
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return result;
    }

    const data = await response.json();

    // Map back to symbols
    for (const [sym, coinId] of symbolToId.entries()) {
      if (data[coinId]?.usd != null) {
        result.set(sym, { price: data[coinId].usd, coinId });
      }
    }
  } catch (err) {
    console.error('CoinGecko fetch failed:', err);
  }

  return result;
}

// Keep old function for backward compat (used by coin search in forms)
export async function fetchCryptoPrices(coinIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (coinIds.length === 0) return prices;

  const ids = coinIds.join(',');
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`CoinGecko API error: ${response.status}`);
    return prices;
  }

  const data = await response.json();
  for (const coinId of coinIds) {
    if (data[coinId]?.usd != null) {
      prices.set(coinId, data[coinId].usd);
    }
  }
  return prices;
}

export async function searchCoins(query: string): Promise<Array<{ id: string; symbol: string; name: string }>> {
  if (!query || query.length < 2) return [];

  const url = `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) return [];

  const data = await response.json();
  return (data.coins ?? []).slice(0, 10).map((c: { id: string; symbol: string; name: string }) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
  }));
}
