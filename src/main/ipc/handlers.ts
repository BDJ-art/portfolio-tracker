import { ipcMain } from 'electron';
import { getAllRealEstate, createRealEstate, updateRealEstate, deleteRealEstate } from '../database/repositories/realEstateRepo';
import { getAllStocks, createStock, updateStock, deleteStock } from '../database/repositories/stockRepo';
import { getAllCrypto, createCrypto, updateCrypto, deleteCrypto } from '../database/repositories/cryptoRepo';
import { getAllRetirement, createRetirement, updateRetirement, deleteRetirement } from '../database/repositories/retirementRepo';
import { getAllDebts, createDebt, updateDebt, deleteDebt } from '../database/repositories/debtRepo';
import { getAllCashFlow, createCashFlow, updateCashFlow, deleteCashFlow } from '../database/repositories/cashFlowRepo';
import { getAllSnapshots } from '../database/repositories/snapshotRepo';
import { getSetting, setSetting, getAllSettings } from '../database/repositories/settingsRepo';
import { getDatabase } from '../database/connection';
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

  // Data Export
  ipcMain.handle('data:export', () => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      realEstate: getAllRealEstate(),
      stocks: getAllStocks(),
      crypto: getAllCrypto(),
      retirement: getAllRetirement(),
      debts: getAllDebts(),
      cashFlow: getAllCashFlow(),
      snapshots: getAllSnapshots(),
      settings: getAllSettings(),
    };
  });

  // Data Import
  ipcMain.handle('data:import', (_e, importData: Record<string, unknown>) => {
    const d = importData as {
      realEstate?: Array<Record<string, unknown>>;
      stocks?: Array<Record<string, unknown>>;
      crypto?: Array<Record<string, unknown>>;
      retirement?: Array<Record<string, unknown>>;
      debts?: Array<Record<string, unknown>>;
      cashFlow?: Array<Record<string, unknown>>;
      snapshots?: Array<Record<string, unknown>>;
      settings?: Record<string, string>;
    };

    const db = getDatabase();
    db.transaction(() => {
      // Clear all tables
      db.prepare('DELETE FROM real_estate').run();
      db.prepare('DELETE FROM stocks').run();
      db.prepare('DELETE FROM crypto').run();
      db.prepare('DELETE FROM retirement').run();
      db.prepare('DELETE FROM debts').run();
      db.prepare('DELETE FROM cash_flow').run();
      db.prepare('DELETE FROM portfolio_snapshots').run();
      db.prepare('DELETE FROM user_settings').run();

      // Import real estate
      if (d.realEstate?.length) {
        const stmt = db.prepare(`INSERT INTO real_estate (id, name, address, estimated_value, mortgage_balance, monthly_mortgage_payment, purchase_price, purchase_date, property_type, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const r of d.realEstate) {
          stmt.run(r.id, r.name, r.address, r.estimatedValue, r.mortgageBalance, r.monthlyMortgagePayment ?? null, r.purchasePrice ?? null, r.purchaseDate ?? null, r.propertyType, r.notes ?? null, r.createdAt, r.updatedAt);
        }
      }

      // Import stocks
      if (d.stocks?.length) {
        const stmt = db.prepare(`INSERT INTO stocks (id, name, ticker, shares, cost_basis_per_share, current_price, last_price_update, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const s of d.stocks) {
          stmt.run(s.id, s.name, s.ticker, s.shares, s.costBasisPerShare, s.currentPrice ?? null, s.lastPriceUpdate ?? null, s.notes ?? null, s.createdAt, s.updatedAt);
        }
      }

      // Import crypto
      if (d.crypto?.length) {
        const stmt = db.prepare(`INSERT INTO crypto (id, name, coin_id, symbol, quantity, cost_basis_per_unit, current_price, last_price_update, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const c of d.crypto) {
          stmt.run(c.id, c.name, c.coinId, c.symbol, c.quantity, c.costBasisPerUnit, c.currentPrice ?? null, c.lastPriceUpdate ?? null, c.notes ?? null, c.createdAt, c.updatedAt);
        }
      }

      // Import retirement
      if (d.retirement?.length) {
        const stmt = db.prepare(`INSERT INTO retirement (id, name, account_type, institution, balance, contributions, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const r of d.retirement) {
          stmt.run(r.id, r.name, r.accountType, r.institution, r.balance, r.contributions ?? null, r.notes ?? null, r.createdAt, r.updatedAt);
        }
      }

      // Import debts
      if (d.debts?.length) {
        const stmt = db.prepare(`INSERT INTO debts (id, name, debt_type, lender, original_balance, current_balance, interest_rate, minimum_payment, monthly_payment, due_day, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const dd of d.debts) {
          stmt.run(dd.id, dd.name, dd.debtType, dd.lender, dd.originalBalance, dd.currentBalance, dd.interestRate, dd.minimumPayment, dd.monthlyPayment ?? null, dd.dueDay ?? null, dd.notes ?? null, dd.createdAt, dd.updatedAt);
        }
      }

      // Import cash flow
      if (d.cashFlow?.length) {
        const stmt = db.prepare(`INSERT INTO cash_flow (id, name, flow_type, category, amount, frequency, is_active, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const cf of d.cashFlow) {
          stmt.run(cf.id, cf.name, cf.flowType, cf.category, cf.amount, cf.frequency, cf.isActive ? 1 : 0, cf.notes ?? null, cf.createdAt, cf.updatedAt);
        }
      }

      // Import snapshots
      if (d.snapshots?.length) {
        const stmt = db.prepare(`INSERT INTO portfolio_snapshots (id, date, total_net_worth, real_estate_value, stocks_value, crypto_value, retirement_value, debts_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        for (const s of d.snapshots) {
          stmt.run(s.id, s.date, s.totalNetWorth, s.realEstateValue, s.stocksValue, s.cryptoValue, s.retirementValue, s.debtsValue);
        }
      }

      // Import settings
      if (d.settings) {
        const stmt = db.prepare('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(d.settings)) {
          stmt.run(key, value);
        }
      }
    })();
  });
}
