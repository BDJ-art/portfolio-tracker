/**
 * Client-side price refresh service
 * Fetches crypto prices from CoinGecko, stock prices from /api/stock-prices serverless proxy.
 * Updates IndexedDB and dispatches events.
 */

import { getAll, put } from '../data/db';
import type { StockHolding, CryptoHolding, RealEstateHolding, RetirementAccount, DebtLiability, PortfolioSnapshot } from '../../renderer/types/models';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let intervalId: ReturnType<typeof setInterval> | null = null;

export async function refreshAllPrices(): Promise<void> {
  try {
    // Fetch and update stock prices
    const stocks = await getAll<StockHolding>('stocks');
    const tickers = [...new Set(stocks.map(s => s.ticker).filter(Boolean))];

    if (tickers.length > 0) {
      try {
        const resp = await fetch(`/api/stock-prices?tickers=${tickers.join(',')}`);
        if (resp.ok) {
          const data = await resp.json();
          const prices: Record<string, number> = data.prices || {};
          const now = new Date().toISOString();
          for (const stock of stocks) {
            if (prices[stock.ticker] != null) {
              stock.currentPrice = prices[stock.ticker];
              stock.lastPriceUpdate = now;
              await put('stocks', stock);
            }
          }
        }
      } catch (e) {
        console.warn('Stock price fetch failed:', e);
      }
    }

    // Fetch and update crypto prices from CoinGecko
    const cryptos = await getAll<CryptoHolding>('crypto');
    const coinIds = [...new Set(cryptos.map(c => c.coinId).filter(Boolean))];

    if (coinIds.length > 0) {
      try {
        const resp = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`
        );
        if (resp.ok) {
          const data = await resp.json();
          const now = new Date().toISOString();
          for (const coin of cryptos) {
            if (data[coin.coinId]?.usd != null) {
              coin.currentPrice = data[coin.coinId].usd;
              coin.lastPriceUpdate = now;
              await put('crypto', coin);
            }
          }
        }
      } catch (e) {
        console.warn('Crypto price fetch failed:', e);
      }
    }

    // Record daily snapshot
    const today = new Date().toISOString().split('T')[0];
    const [realEstate, updatedStocks, updatedCrypto, retirement, debts] = await Promise.all([
      getAll<RealEstateHolding>('real_estate'),
      getAll<StockHolding>('stocks'),
      getAll<CryptoHolding>('crypto'),
      getAll<RetirementAccount>('retirement'),
      getAll<DebtLiability>('debts'),
    ]);

    const realEstateValue = realEstate.reduce((sum, p) => sum + (p.estimatedValue - p.mortgageBalance), 0);
    const stocksValue = updatedStocks.reduce((sum, s) => sum + (s.shares * (s.currentPrice ?? s.costBasisPerShare)), 0);
    const cryptoValue = updatedCrypto.reduce((sum, c) => sum + (c.quantity * (c.currentPrice ?? c.costBasisPerUnit)), 0);
    const retirementValue = retirement.reduce((sum, r) => sum + r.balance, 0);
    const debtsValue = debts.reduce((sum, d) => sum + d.currentBalance, 0);
    const totalNetWorth = realEstateValue + stocksValue + cryptoValue + retirementValue - debtsValue;

    // Upsert snapshot (find existing by date, or create new)
    const allSnapshots = await getAll<PortfolioSnapshot>('snapshots');
    const existing = allSnapshots.find(s => s.date === today);
    const snapshot: PortfolioSnapshot = {
      id: existing?.id ?? crypto.randomUUID(),
      date: today,
      totalNetWorth,
      realEstateValue,
      stocksValue,
      cryptoValue,
      retirementValue,
      debtsValue,
    };
    await put('snapshots', snapshot);

    // Notify UI
    window.dispatchEvent(new Event('portfolio-prices-updated'));
    console.log('Price refresh complete.');
  } catch (error) {
    console.error('Price refresh failed:', error);
  }
}

export function startScheduler(): void {
  // Initial refresh after short delay
  setTimeout(() => refreshAllPrices(), 3000);
  // Then every 5 minutes
  intervalId = setInterval(() => refreshAllPrices(), REFRESH_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
