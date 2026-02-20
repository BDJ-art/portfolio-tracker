import { ipcMain } from 'electron';
import { getAllRealEstate, createRealEstate, updateRealEstate, deleteRealEstate } from '../database/repositories/realEstateRepo';
import { getAllStocks, createStock, updateStock, deleteStock } from '../database/repositories/stockRepo';
import { getAllCrypto, createCrypto, updateCrypto, deleteCrypto } from '../database/repositories/cryptoRepo';
import { getAllRetirement, createRetirement, updateRetirement, deleteRetirement } from '../database/repositories/retirementRepo';
import { getAllDebts, createDebt, updateDebt, deleteDebt } from '../database/repositories/debtRepo';
import { getAllCashFlow, createCashFlow, updateCashFlow, deleteCashFlow } from '../database/repositories/cashFlowRepo';
import { getAllSnapshots } from '../database/repositories/snapshotRepo';
import { getSetting, setSetting, getAllSettings } from '../database/repositories/settingsRepo';
import { searchCoins } from '../services/cryptoService';
import { generateInsights } from '../services/insightsEngine';
import { openCsvDialog, parseRobinhoodCsv, parseRobinhoodPdf, parseCryptoCsv } from '../services/csvImporter';

function computeSummary() {
  const realEstate = getAllRealEstate();
  const stocks = getAllStocks();
  const crypto = getAllCrypto();
  const retirement = getAllRetirement();
  const debts = getAllDebts();

  const totalRealEstate = realEstate.reduce((sum, p) => sum + (p.estimatedValue - p.mortgageBalance), 0);
  const totalStocks = stocks.reduce((sum, s) => sum + (s.shares * (s.currentPrice ?? s.costBasisPerShare)), 0);
  const totalCrypto = crypto.reduce((sum, c) => sum + (c.quantity * (c.currentPrice ?? c.costBasisPerUnit)), 0);
  const totalRetirement = retirement.reduce((sum, r) => sum + r.balance, 0);
  const totalDebts = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalNetWorth = totalRealEstate + totalStocks + totalCrypto + totalRetirement - totalDebts;

  const totalCostBasis =
    realEstate.reduce((sum, p) => sum + (p.purchasePrice ?? p.estimatedValue), 0) +
    stocks.reduce((sum, s) => sum + (s.shares * s.costBasisPerShare), 0) +
    crypto.reduce((sum, c) => sum + (c.quantity * c.costBasisPerUnit), 0) +
    retirement.reduce((sum, r) => sum + (r.contributions ?? r.balance), 0);

  const totalGainLoss = totalNetWorth - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  return {
    totalNetWorth,
    totalRealEstate,
    totalStocks,
    totalCrypto,
    totalRetirement,
    totalDebts,
    totalGainLoss,
    totalGainLossPercent,
  };
}

export function registerIpcHandlers(): void {
  // Real Estate
  ipcMain.handle('real-estate:get-all', () => getAllRealEstate());
  ipcMain.handle('real-estate:create', (_e, data) => createRealEstate(data));
  ipcMain.handle('real-estate:update', (_e, id, data) => updateRealEstate(id, data));
  ipcMain.handle('real-estate:delete', (_e, id) => deleteRealEstate(id));

  // Stocks
  ipcMain.handle('stocks:get-all', () => getAllStocks());
  ipcMain.handle('stocks:create', (_e, data) => createStock(data));
  ipcMain.handle('stocks:update', (_e, id, data) => updateStock(id, data));
  ipcMain.handle('stocks:delete', (_e, id) => deleteStock(id));

  // Crypto
  ipcMain.handle('crypto:get-all', () => getAllCrypto());
  ipcMain.handle('crypto:create', (_e, data) => createCrypto(data));
  ipcMain.handle('crypto:update', (_e, id, data) => updateCrypto(id, data));
  ipcMain.handle('crypto:delete', (_e, id) => deleteCrypto(id));
  ipcMain.handle('crypto:search', (_e, query) => searchCoins(query));

  // Retirement
  ipcMain.handle('retirement:get-all', () => getAllRetirement());
  ipcMain.handle('retirement:create', (_e, data) => createRetirement(data));
  ipcMain.handle('retirement:update', (_e, id, data) => updateRetirement(id, data));
  ipcMain.handle('retirement:delete', (_e, id) => deleteRetirement(id));

  // Debts
  ipcMain.handle('debts:get-all', () => getAllDebts());
  ipcMain.handle('debts:create', (_e, data) => createDebt(data));
  ipcMain.handle('debts:update', (_e, id, data) => updateDebt(id, data));
  ipcMain.handle('debts:delete', (_e, id) => deleteDebt(id));

  // Cash Flow
  ipcMain.handle('cash-flow:get-all', () => getAllCashFlow());
  ipcMain.handle('cash-flow:create', (_e, data) => createCashFlow(data));
  ipcMain.handle('cash-flow:update', (_e, id, data) => updateCashFlow(id, data));
  ipcMain.handle('cash-flow:delete', (_e, id) => deleteCashFlow(id));

  // Settings
  ipcMain.handle('settings:get', (_e, key: string) => getSetting(key));
  ipcMain.handle('settings:set', (_e, key: string, value: string) => setSetting(key, value));
  ipcMain.handle('settings:get-all', () => getAllSettings());

  // Insights
  ipcMain.handle('insights:generate', () => generateInsights());

  // CSV Import
  ipcMain.handle('import:open-csv', () => openCsvDialog());
  ipcMain.handle('import:robinhood', (_e, filePath: string) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      return parseRobinhoodPdf(filePath);
    }
    return parseRobinhoodCsv(filePath);
  });
  ipcMain.handle('import:crypto-csv', (_e, filePath: string) => parseCryptoCsv(filePath));

  // Fix crypto coinIds for CoinGecko price lookups
  ipcMain.handle('crypto:fix-coin-ids', async () => {
    const { fixCoinIds } = await import('../services/csvImporter');
    return fixCoinIds();
  });

  // Portfolio
  ipcMain.handle('portfolio:summary', () => computeSummary());
  ipcMain.handle('portfolio:snapshots', () => getAllSnapshots());
  ipcMain.handle('portfolio:refresh-prices', async () => {
    // This is handled by the price scheduler, but we trigger a manual refresh
    // by importing and calling the service directly
    const { refreshAllPrices } = await import('../services/priceScheduler');
    const { BrowserWindow } = await import('electron');
    const win = BrowserWindow.getAllWindows()[0] ?? null;
    await refreshAllPrices(() => win);
  });

  // AI Analysis
  ipcMain.handle('ai:analyze', async () => {
    const { analyzePortfolio } = await import('../services/aiAdvisor');
    return analyzePortfolio();
  });
  ipcMain.handle('ai:history', async () => {
    const { getAnalysisHistory } = await import('../services/aiAdvisor');
    return getAnalysisHistory();
  });
  ipcMain.handle('ai:prompt', async () => {
    const { getPortfolioPrompt } = await import('../services/aiAdvisor');
    return getPortfolioPrompt();
  });
}
