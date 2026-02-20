import type { BrowserWindow } from 'electron';
import { fetchStockQuotes } from './stockService';
import { fetchCryptoPrices } from './cryptoService';
import { getAllTickers, updateStockPrices } from '../database/repositories/stockRepo';
import { getAllCoinIds, updateCryptoPrices } from '../database/repositories/cryptoRepo';
import { getAllRealEstate } from '../database/repositories/realEstateRepo';
import { getAllRetirement } from '../database/repositories/retirementRepo';
import { getAllStocks } from '../database/repositories/stockRepo';
import { getAllCrypto } from '../database/repositories/cryptoRepo';
import { getAllDebts } from '../database/repositories/debtRepo';
import { upsertSnapshot } from '../database/repositories/snapshotRepo';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let intervalId: ReturnType<typeof setInterval> | null = null;

function computePortfolioValues() {
  const realEstate = getAllRealEstate();
  const stocks = getAllStocks();
  const crypto = getAllCrypto();
  const retirement = getAllRetirement();
  const debts = getAllDebts();

  const realEstateValue = realEstate.reduce((sum, p) => sum + (p.estimatedValue - p.mortgageBalance), 0);
  const stocksValue = stocks.reduce((sum, s) => sum + (s.shares * (s.currentPrice ?? s.costBasisPerShare)), 0);
  const cryptoValue = crypto.reduce((sum, c) => sum + (c.quantity * (c.currentPrice ?? c.costBasisPerUnit)), 0);
  const retirementValue = retirement.reduce((sum, r) => sum + r.balance, 0);
  const debtsValue = debts.reduce((sum, d) => sum + d.currentBalance, 0);

  return {
    realEstateValue,
    stocksValue,
    cryptoValue,
    retirementValue,
    debtsValue,
    totalNetWorth: realEstateValue + stocksValue + cryptoValue + retirementValue - debtsValue,
  };
}

export async function refreshAllPrices(getWindow: () => BrowserWindow | null): Promise<void> {
  try {
    // Fetch stock prices
    const tickers = getAllTickers();
    if (tickers.length > 0) {
      const stockPrices = await fetchStockQuotes(tickers);
      const updates = Array.from(stockPrices.entries()).map(([ticker, price]) => ({ ticker, price }));
      if (updates.length > 0) updateStockPrices(updates);
    }

    // Fetch crypto prices using coin_ids from DB
    const coinIds = getAllCoinIds();
    if (coinIds.length > 0) {
      const cryptoPrices = await fetchCryptoPrices(coinIds);
      const updates = Array.from(cryptoPrices.entries()).map(([coinId, price]) => ({ coinId, price }));
      if (updates.length > 0) updateCryptoPrices(updates);
    }

    // Record daily snapshot
    const today = new Date().toISOString().split('T')[0];
    const values = computePortfolioValues();
    upsertSnapshot({ date: today, ...values });

    // Notify renderer
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('prices-updated');
    }

    console.log('Price refresh complete.');
  } catch (error) {
    console.error('Price refresh failed:', error);
  }
}

export function startPriceScheduler(getWindow: () => BrowserWindow | null): void {
  // Initial refresh after a short delay to let the window load
  setTimeout(() => refreshAllPrices(getWindow), 3000);
  // Then every 5 minutes
  intervalId = setInterval(() => refreshAllPrices(getWindow), REFRESH_INTERVAL_MS);
}

export function stopPriceScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
