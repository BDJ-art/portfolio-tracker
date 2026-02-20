import { getAll, getById, put, remove } from './db';
import { computeInsights } from '../services/insightsEngine';
import { parseRobinhoodCsv, parseCryptoCsv } from '../services/csvParser';
import type { ElectronAPI } from '../../renderer/types/ipc';
import type {
  RealEstateHolding, StockHolding, CryptoHolding, RetirementAccount, DebtLiability,
  CashFlowItem, PortfolioSnapshot, PortfolioSummary, InsightsReport, CoinSearchResult, AiAnalysis,
  CreateRealEstateInput, UpdateRealEstateInput,
  CreateStockInput, UpdateStockInput,
  CreateCryptoInput, UpdateCryptoInput,
  CreateRetirementInput, UpdateRetirementInput,
  CreateDebtInput, UpdateDebtInput,
  CreateCashFlowInput, UpdateCashFlowInput,
} from '../../renderer/types/models';

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// CRUD factory for each entity type
function createEntity<T extends { id: string; type: string; createdAt: string; updatedAt: string }>(
  storeName: string,
  type: string,
) {
  return {
    getAll: () => getAll<T>(storeName),
    create: async (data: Record<string, unknown>): Promise<T> => {
      const entity = { ...data, id: uuid(), type, createdAt: now(), updatedAt: now() } as T;
      await put(storeName, entity);
      return entity;
    },
    update: async (id: string, data: Record<string, unknown>): Promise<T> => {
      const existing = await getById<T>(storeName, id);
      if (!existing) throw new Error(`${storeName} ${id} not found`);
      const updated = { ...existing, ...data, updatedAt: now() };
      await put(storeName, updated);
      return updated;
    },
    delete: (id: string) => remove(storeName, id),
  };
}

const realEstateOps = createEntity<RealEstateHolding>('real_estate', 'real_estate');
const stockOps = createEntity<StockHolding>('stocks', 'stock');
const cryptoOps = createEntity<CryptoHolding>('crypto', 'crypto');
const retirementOps = createEntity<RetirementAccount>('retirement', 'retirement');
const debtOps = createEntity<DebtLiability>('debts', 'debt');
const cashFlowOps = createEntity<CashFlowItem>('cash_flow', 'cash_flow');

async function computeSummary(): Promise<PortfolioSummary> {
  const [realEstate, stocks, crypto, retirement, debts] = await Promise.all([
    realEstateOps.getAll(),
    stockOps.getAll(),
    cryptoOps.getAll(),
    retirementOps.getAll(),
    debtOps.getAll(),
  ]);

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
    totalNetWorth, totalRealEstate, totalStocks, totalCrypto,
    totalRetirement, totalDebts, totalGainLoss, totalGainLossPercent,
  };
}

export function createWebApi(): ElectronAPI {
  return {
    // Real Estate
    getRealEstate: () => realEstateOps.getAll(),
    createRealEstate: (data: CreateRealEstateInput) => realEstateOps.create(data as Record<string, unknown>),
    updateRealEstate: (id: string, data: UpdateRealEstateInput) => realEstateOps.update(id, data as Record<string, unknown>),
    deleteRealEstate: (id: string) => realEstateOps.delete(id),

    // Stocks
    getStocks: () => stockOps.getAll(),
    createStock: (data: CreateStockInput) => stockOps.create(data as Record<string, unknown>),
    updateStock: (id: string, data: UpdateStockInput) => stockOps.update(id, data as Record<string, unknown>),
    deleteStock: (id: string) => stockOps.delete(id),

    // Crypto
    getCrypto: () => cryptoOps.getAll(),
    createCrypto: (data: CreateCryptoInput) => cryptoOps.create(data as Record<string, unknown>),
    updateCrypto: (id: string, data: UpdateCryptoInput) => cryptoOps.update(id, data as Record<string, unknown>),
    deleteCrypto: (id: string) => cryptoOps.delete(id),
    searchCoins: async (query: string): Promise<CoinSearchResult[]> => {
      try {
        const resp = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
        const data = await resp.json();
        return (data.coins || []).slice(0, 10).map((c: { id: string; symbol: string; name: string }) => ({
          id: c.id,
          symbol: c.symbol,
          name: c.name,
        }));
      } catch {
        return [];
      }
    },

    // Retirement
    getRetirement: () => retirementOps.getAll(),
    createRetirement: (data: CreateRetirementInput) => retirementOps.create(data as Record<string, unknown>),
    updateRetirement: (id: string, data: UpdateRetirementInput) => retirementOps.update(id, data as Record<string, unknown>),
    deleteRetirement: (id: string) => retirementOps.delete(id),

    // Debts
    getDebts: () => debtOps.getAll(),
    createDebt: (data: CreateDebtInput) => debtOps.create(data as Record<string, unknown>),
    updateDebt: (id: string, data: UpdateDebtInput) => debtOps.update(id, data as Record<string, unknown>),
    deleteDebt: (id: string) => debtOps.delete(id),

    // Settings
    getSetting: async (key: string): Promise<string | null> => {
      const row = await getById<{ key: string; value: string }>('user_settings', key);
      return row?.value ?? null;
    },
    setSetting: async (key: string, value: string): Promise<void> => {
      await put('user_settings', { key, value });
    },
    getAllSettings: async (): Promise<Record<string, string>> => {
      const all = await getAll<{ key: string; value: string }>('user_settings');
      const result: Record<string, string> = {};
      for (const row of all) result[row.key] = row.value;
      return result;
    },

    // Cash Flow
    getCashFlow: () => cashFlowOps.getAll(),
    createCashFlow: (data: CreateCashFlowInput) => cashFlowOps.create(data as Record<string, unknown>),
    updateCashFlow: (id: string, data: UpdateCashFlowInput) => cashFlowOps.update(id, data as Record<string, unknown>),
    deleteCashFlow: (id: string) => cashFlowOps.delete(id),

    // Insights
    getInsights: async (): Promise<InsightsReport> => {
      const [realEstate, stocks, crypto, retirement, debts] = await Promise.all([
        realEstateOps.getAll(),
        stockOps.getAll(),
        cryptoOps.getAll(),
        retirementOps.getAll(),
        debtOps.getAll(),
      ]);
      return computeInsights(realEstate, stocks, crypto, retirement, debts);
    },

    // CSV Import
    openCsvDialog: async () => null, // Not available on web — handled by HTML file input
    importRobinhood: async (content: string) => parseRobinhoodCsv(content),
    importCryptoCsv: async (content: string) => parseCryptoCsv(content),

    // Portfolio
    getPortfolioSummary: computeSummary,
    getSnapshots: async (): Promise<PortfolioSnapshot[]> => {
      const all = await getAll<PortfolioSnapshot>('snapshots');
      return all.sort((a, b) => a.date.localeCompare(b.date));
    },
    refreshPrices: async (): Promise<void> => {
      const { refreshAllPrices } = await import('../services/priceRefresh');
      await refreshAllPrices();
    },

    // AI Analysis
    analyzePortfolio: async () => {
      // On web, call the serverless proxy (requires ANTHROPIC_API_KEY on server)
      const resp = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err || 'AI analysis failed');
      }
      const result = await resp.json() as { id: string; createdAt: string; response: string; model: string; portfolioSnapshot: string };
      // Save to local IndexedDB for history
      await put('ai_analyses', result);
      return { id: result.id, createdAt: result.createdAt, response: result.response };
    },
    getAnalysisHistory: async (): Promise<AiAnalysis[]> => {
      const all = await getAll<AiAnalysis>('ai_analyses');
      return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    getPortfolioPrompt: async (): Promise<string> => {
      const [realEstate, stocks, crypto, retirement, debts, cashFlowItems] = await Promise.all([
        realEstateOps.getAll(),
        stockOps.getAll(),
        cryptoOps.getAll(),
        retirementOps.getAll(),
        debtOps.getAll(),
        cashFlowOps.getAll(),
      ]);
      const ageSetting = await getById<{ key: string; value: string }>('user_settings', 'age');
      const age = ageSetting?.value ? parseInt(ageSetting.value) : null;

      function toMonthly(amount: number, frequency: string): number {
        switch (frequency) {
          case 'weekly': return amount * 52 / 12;
          case 'biweekly': return amount * 26 / 12;
          case 'yearly': return amount / 12;
          default: return amount;
        }
      }

      const totalRE = realEstate.reduce((s, p) => s + (p.estimatedValue - p.mortgageBalance), 0);
      const totalSt = stocks.reduce((s, st) => s + st.shares * (st.currentPrice ?? st.costBasisPerShare), 0);
      const totalCr = crypto.reduce((s, c) => s + c.quantity * (c.currentPrice ?? c.costBasisPerUnit), 0);
      const totalRet = retirement.reduce((s, r) => s + r.balance, 0);
      const totalDbt = debts.reduce((s, d) => s + d.currentBalance, 0);
      const activeFlow = cashFlowItems.filter(i => i.isActive);
      const monthlyIncome = activeFlow.filter(i => i.flowType === 'income').reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
      const monthlyExpenses = activeFlow.filter(i => i.flowType === 'expense').reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
      const autoDebt = debts.reduce((s, d) => s + (d.monthlyPayment ?? d.minimumPayment), 0);
      const autoMortgage = realEstate.reduce((s, p) => s + (p.monthlyMortgagePayment ?? 0), 0);

      const snapshot = {
        age,
        summary: { netWorth: totalRE + totalSt + totalCr + totalRet - totalDbt, totalRealEstateEquity: totalRE, totalStocks: totalSt, totalCrypto: totalCr, totalRetirement: totalRet, totalDebts: totalDbt, monthlyIncome, totalMonthlyExpenses: monthlyExpenses + autoDebt + autoMortgage, freeCashPerMonth: monthlyIncome - (monthlyExpenses + autoDebt + autoMortgage) },
        realEstate: realEstate.map(p => ({ name: p.name, address: p.address, type: p.propertyType, estimatedValue: p.estimatedValue, mortgageBalance: p.mortgageBalance, monthlyPayment: p.monthlyMortgagePayment, equity: p.estimatedValue - p.mortgageBalance })),
        stocks: stocks.map(s => ({ name: s.name, ticker: s.ticker, shares: s.shares, costBasis: s.costBasisPerShare, currentPrice: s.currentPrice, value: s.shares * (s.currentPrice ?? s.costBasisPerShare), gainLoss: s.currentPrice ? (s.currentPrice - s.costBasisPerShare) * s.shares : 0 })),
        crypto: crypto.map(c => ({ name: c.name, symbol: c.symbol, quantity: c.quantity, costBasis: c.costBasisPerUnit, currentPrice: c.currentPrice, value: c.quantity * (c.currentPrice ?? c.costBasisPerUnit), gainLoss: c.currentPrice ? (c.currentPrice - c.costBasisPerUnit) * c.quantity : 0, notes: c.notes })),
        retirement: retirement.map(r => ({ name: r.name, type: r.accountType, institution: r.institution, balance: r.balance, contributions: r.contributions })),
        debts: debts.map(d => ({ name: d.name, type: d.debtType, lender: d.lender, originalBalance: d.originalBalance, currentBalance: d.currentBalance, interestRate: d.interestRate, minimumPayment: d.minimumPayment, monthlyPayment: d.monthlyPayment, notes: d.notes })),
        cashFlow: activeFlow.map(i => ({ name: i.name, type: i.flowType, category: i.category, amount: i.amount, frequency: i.frequency, monthlyAmount: toMonthly(i.amount, i.frequency) })),
      };

      const systemPrompt = `You are a personal financial advisor analyzing a user's complete portfolio. Be specific, actionable, and personalized — reference their actual holdings by name, ticker, and dollar amounts. Structure your response with clear sections using markdown headers.\n\nThe data includes their age (if provided), all assets, debts, and monthly cash flow (income, expenses, free cash). Use their age to tailor advice for their life stage:\n- Under 30: Can afford more risk, emphasize growth, maximize retirement contributions early for compounding\n- 30-45: Balance growth with stability, ensure adequate insurance and emergency fund, plan for major expenses\n- 45-60: Shift toward capital preservation, catch-up retirement contributions, reduce high-risk positions\n- Over 60: Focus on income generation, minimize volatility, plan for withdrawal strategies\n\nYour analysis should cover:\n1. **Portfolio Overview** — Quick health check: net worth, monthly cash flow, savings rate, and how they compare for their age\n2. **Asset Allocation Assessment** — Are they properly diversified for their age? What's overweight/underweight?\n3. **Cash Flow Analysis** — How is their free cash being deployed? Are they saving enough? Where can they optimize spending?\n4. **Debt Strategy** — Should they pay down debt or invest? Which debts to prioritize and why.\n5. **Investment Recommendations** — Where should they invest next? Be specific about asset classes, sectors, or strategies appropriate for their age and situation.\n6. **Risk Warnings** — Red flags, concentration risks, or urgent issues to address\n7. **Action Items** — Top 3-5 concrete next steps, ranked by priority\n\nBe direct and honest. If something is risky, say so clearly. Use dollar amounts and percentages from their actual data.`;

      return `${systemPrompt}\n\nHere is my complete financial portfolio as of ${new Date().toLocaleDateString()}:\n\n\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\`\n\nPlease analyze my portfolio and give me personalized financial advice.`;
    },

    // Events
    onPricesUpdated: (callback: () => void) => {
      const handler = () => callback();
      window.addEventListener('portfolio-prices-updated', handler);
      return () => window.removeEventListener('portfolio-prices-updated', handler);
    },
  };
}
