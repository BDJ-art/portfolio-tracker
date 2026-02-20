// === Base ===
export interface BaseAsset {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// === Real Estate ===
export interface RealEstateHolding extends BaseAsset {
  type: 'real_estate';
  address: string;
  estimatedValue: number;
  mortgageBalance: number;
  monthlyMortgagePayment?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  propertyType: 'primary_residence' | 'rental' | 'vacation' | 'land' | 'other';
}

export type CreateRealEstateInput = Omit<RealEstateHolding, 'id' | 'type' | 'createdAt' | 'updatedAt'>;
export type UpdateRealEstateInput = Partial<CreateRealEstateInput>;

// === Stocks ===
export interface StockHolding extends BaseAsset {
  type: 'stock';
  ticker: string;
  shares: number;
  costBasisPerShare: number;
  currentPrice?: number;
  lastPriceUpdate?: string;
}

export type CreateStockInput = Omit<StockHolding, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'currentPrice' | 'lastPriceUpdate'>;
export type UpdateStockInput = Partial<CreateStockInput>;

// === Crypto ===
export interface CryptoHolding extends BaseAsset {
  type: 'crypto';
  coinId: string;
  symbol: string;
  quantity: number;
  costBasisPerUnit: number;
  currentPrice?: number;
  lastPriceUpdate?: string;
}

export type CreateCryptoInput = Omit<CryptoHolding, 'id' | 'type' | 'createdAt' | 'updatedAt' | 'currentPrice' | 'lastPriceUpdate'>;
export type UpdateCryptoInput = Partial<CreateCryptoInput>;

// === Retirement ===
export interface RetirementAccount extends BaseAsset {
  type: 'retirement';
  accountType: '401k' | 'roth_ira' | 'traditional_ira' | '403b' | 'pension' | 'other';
  institution: string;
  balance: number;
  contributions?: number;
}

export type CreateRetirementInput = Omit<RetirementAccount, 'id' | 'type' | 'createdAt' | 'updatedAt'>;
export type UpdateRetirementInput = Partial<CreateRetirementInput>;

// === Debts / Liabilities ===
export interface DebtLiability extends BaseAsset {
  type: 'debt';
  debtType: 'credit_card' | 'student_loan' | 'auto_loan' | 'personal_loan' | 'mortgage' | 'medical' | 'other';
  lender: string;
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  minimumPayment: number;
  monthlyPayment?: number;
  dueDay?: number;
}

export type CreateDebtInput = Omit<DebtLiability, 'id' | 'type' | 'createdAt' | 'updatedAt'>;
export type UpdateDebtInput = Partial<CreateDebtInput>;

// === Portfolio Snapshot ===
export interface PortfolioSnapshot {
  id: string;
  date: string;
  totalNetWorth: number;
  realEstateValue: number;
  stocksValue: number;
  cryptoValue: number;
  retirementValue: number;
  debtsValue: number;
}

// === Aggregate ===
export type AnyHolding = RealEstateHolding | StockHolding | CryptoHolding | RetirementAccount | DebtLiability;

export interface PortfolioSummary {
  totalNetWorth: number;
  totalRealEstate: number;
  totalStocks: number;
  totalCrypto: number;
  totalRetirement: number;
  totalDebts: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}

// === Insights ===
export interface Insight {
  id: string;
  category: 'debt_payoff' | 'leverage' | 'portfolio_health' | 'cash_flow' | 'opportunity';
  severity: 'info' | 'warning' | 'critical' | 'positive';
  title: string;
  description: string;
  impact?: string;
}

export interface DebtPayoffPlan {
  method: 'avalanche' | 'snowball';
  order: Array<{
    name: string;
    balance: number;
    rate: number;
    minimumPayment: number;
  }>;
  totalInterestSaved?: number;
  monthsToPayoff?: number;
  totalMonthlyMinimum: number;
}

export interface InsightsReport {
  generatedAt: string;
  insights: Insight[];
  debtPayoff: {
    avalanche: DebtPayoffPlan;
    snowball: DebtPayoffPlan;
  } | null;
  metrics: {
    totalAssets: number;
    totalDebts: number;
    netWorth: number;
    debtToAssetRatio: number;
    weightedAvgDebtRate: number;
    monthlyDebtPayments: number;
    highInterestDebtTotal: number;
    goodDebtTotal: number;
    badDebtTotal: number;
    goodDebtMonthly: number;
    badDebtMonthly: number;
  };
}

// === Coin Search Result ===
export interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
}

// === Cash Flow ===
export interface CashFlowItem extends BaseAsset {
  type: 'cash_flow';
  flowType: 'income' | 'expense';
  category: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  isActive: boolean;
}

export type CreateCashFlowInput = Omit<CashFlowItem, 'id' | 'type' | 'createdAt' | 'updatedAt'>;
export type UpdateCashFlowInput = Partial<CreateCashFlowInput>;

// === AI Analysis ===
export interface AiAnalysis {
  id: string;
  createdAt: string;
  model: string;
  portfolioSnapshot: string;
  response: string;
}
