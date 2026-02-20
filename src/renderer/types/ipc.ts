import type {
  RealEstateHolding,
  StockHolding,
  CryptoHolding,
  RetirementAccount,
  DebtLiability,
  CashFlowItem,
  PortfolioSummary,
  PortfolioSnapshot,
  CreateRealEstateInput,
  UpdateRealEstateInput,
  CreateStockInput,
  UpdateStockInput,
  CreateCryptoInput,
  UpdateCryptoInput,
  CreateRetirementInput,
  UpdateRetirementInput,
  CreateDebtInput,
  UpdateDebtInput,
  CreateCashFlowInput,
  UpdateCashFlowInput,
  CoinSearchResult,
  InsightsReport,
  AiAnalysis,
} from './models';

export interface ElectronAPI {
  // Real Estate
  getRealEstate: () => Promise<RealEstateHolding[]>;
  createRealEstate: (data: CreateRealEstateInput) => Promise<RealEstateHolding>;
  updateRealEstate: (id: string, data: UpdateRealEstateInput) => Promise<RealEstateHolding>;
  deleteRealEstate: (id: string) => Promise<void>;

  // Stocks
  getStocks: () => Promise<StockHolding[]>;
  createStock: (data: CreateStockInput) => Promise<StockHolding>;
  updateStock: (id: string, data: UpdateStockInput) => Promise<StockHolding>;
  deleteStock: (id: string) => Promise<void>;

  // Crypto
  getCrypto: () => Promise<CryptoHolding[]>;
  createCrypto: (data: CreateCryptoInput) => Promise<CryptoHolding>;
  updateCrypto: (id: string, data: UpdateCryptoInput) => Promise<CryptoHolding>;
  deleteCrypto: (id: string) => Promise<void>;
  searchCoins: (query: string) => Promise<CoinSearchResult[]>;

  // Retirement
  getRetirement: () => Promise<RetirementAccount[]>;
  createRetirement: (data: CreateRetirementInput) => Promise<RetirementAccount>;
  updateRetirement: (id: string, data: UpdateRetirementInput) => Promise<RetirementAccount>;
  deleteRetirement: (id: string) => Promise<void>;

  // Debts
  getDebts: () => Promise<DebtLiability[]>;
  createDebt: (data: CreateDebtInput) => Promise<DebtLiability>;
  updateDebt: (id: string, data: UpdateDebtInput) => Promise<DebtLiability>;
  deleteDebt: (id: string) => Promise<void>;

  // Cash Flow
  getCashFlow: () => Promise<CashFlowItem[]>;
  createCashFlow: (data: CreateCashFlowInput) => Promise<CashFlowItem>;
  updateCashFlow: (id: string, data: UpdateCashFlowInput) => Promise<CashFlowItem>;
  deleteCashFlow: (id: string) => Promise<void>;

  // Settings
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;
  getAllSettings: () => Promise<Record<string, string>>;

  // Insights
  getInsights: () => Promise<InsightsReport>;

  // CSV Import
  openCsvDialog: () => Promise<string | null>;
  importRobinhood: (filePath: string) => Promise<Array<{ name: string; ticker: string; shares: number; costBasisPerShare: number }>>;
  importCryptoCsv: (filePath: string) => Promise<Array<{ name: string; symbol: string; coinId: string; quantity: number; costBasisPerUnit: number }>>;

  // Portfolio
  getPortfolioSummary: () => Promise<PortfolioSummary>;
  getSnapshots: () => Promise<PortfolioSnapshot[]>;
  refreshPrices: () => Promise<void>;

  // AI Analysis
  analyzePortfolio: () => Promise<{ id: string; createdAt: string; response: string }>;
  getAnalysisHistory: () => Promise<AiAnalysis[]>;
  getPortfolioPrompt: () => Promise<string>;

  // Data Transfer
  exportData: () => Promise<Record<string, unknown>>;
  importData: (data: Record<string, unknown>) => Promise<void>;

  // Events
  onPricesUpdated: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
