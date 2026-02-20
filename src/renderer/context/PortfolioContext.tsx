import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import type {
  RealEstateHolding, StockHolding, CryptoHolding, RetirementAccount, DebtLiability,
  CashFlowItem, PortfolioSnapshot, PortfolioSummary,
  CreateRealEstateInput, UpdateRealEstateInput,
  CreateStockInput, UpdateStockInput,
  CreateCryptoInput, UpdateCryptoInput,
  CreateRetirementInput, UpdateRetirementInput,
  CreateDebtInput, UpdateDebtInput,
  CreateCashFlowInput, UpdateCashFlowInput,
} from '../types/models';

interface PortfolioState {
  realEstate: RealEstateHolding[];
  stocks: StockHolding[];
  crypto: CryptoHolding[];
  retirement: RetirementAccount[];
  debts: DebtLiability[];
  cashFlow: CashFlowItem[];
  snapshots: PortfolioSnapshot[];
  summary: PortfolioSummary | null;
  isLoading: boolean;
  lastRefresh: Date | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ALL_DATA'; payload: Partial<PortfolioState> }
  | { type: 'SET_REAL_ESTATE'; payload: RealEstateHolding[] }
  | { type: 'SET_STOCKS'; payload: StockHolding[] }
  | { type: 'SET_CRYPTO'; payload: CryptoHolding[] }
  | { type: 'SET_RETIREMENT'; payload: RetirementAccount[] }
  | { type: 'SET_DEBTS'; payload: DebtLiability[] }
  | { type: 'SET_CASH_FLOW'; payload: CashFlowItem[] }
  | { type: 'SET_SNAPSHOTS'; payload: PortfolioSnapshot[] }
  | { type: 'SET_SUMMARY'; payload: PortfolioSummary }
  | { type: 'SET_LAST_REFRESH' };

const initialState: PortfolioState = {
  realEstate: [],
  stocks: [],
  crypto: [],
  retirement: [],
  debts: [],
  cashFlow: [],
  snapshots: [],
  summary: null,
  isLoading: true,
  lastRefresh: null,
};

function reducer(state: PortfolioState, action: Action): PortfolioState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ALL_DATA':
      return { ...state, ...action.payload, isLoading: false };
    case 'SET_REAL_ESTATE':
      return { ...state, realEstate: action.payload };
    case 'SET_STOCKS':
      return { ...state, stocks: action.payload };
    case 'SET_CRYPTO':
      return { ...state, crypto: action.payload };
    case 'SET_RETIREMENT':
      return { ...state, retirement: action.payload };
    case 'SET_DEBTS':
      return { ...state, debts: action.payload };
    case 'SET_CASH_FLOW':
      return { ...state, cashFlow: action.payload };
    case 'SET_SNAPSHOTS':
      return { ...state, snapshots: action.payload };
    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };
    case 'SET_LAST_REFRESH':
      return { ...state, lastRefresh: new Date() };
    default:
      return state;
  }
}

interface PortfolioContextValue extends PortfolioState {
  refreshAll: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  addRealEstate: (data: CreateRealEstateInput) => Promise<void>;
  updateRealEstate: (id: string, data: UpdateRealEstateInput) => Promise<void>;
  deleteRealEstate: (id: string) => Promise<void>;
  addStock: (data: CreateStockInput) => Promise<void>;
  updateStock: (id: string, data: UpdateStockInput) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  addCrypto: (data: CreateCryptoInput) => Promise<void>;
  updateCrypto: (id: string, data: UpdateCryptoInput) => Promise<void>;
  deleteCrypto: (id: string) => Promise<void>;
  addRetirement: (data: CreateRetirementInput) => Promise<void>;
  updateRetirement: (id: string, data: UpdateRetirementInput) => Promise<void>;
  deleteRetirement: (id: string) => Promise<void>;
  addDebt: (data: CreateDebtInput) => Promise<void>;
  updateDebt: (id: string, data: UpdateDebtInput) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addCashFlow: (data: CreateCashFlowInput) => Promise<void>;
  updateCashFlow: (id: string, data: UpdateCashFlowInput) => Promise<void>;
  deleteCashFlow: (id: string) => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refreshAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [realEstate, stocks, crypto, retirement, debts, cashFlow, snapshots, summary] = await Promise.all([
        window.api.getRealEstate(),
        window.api.getStocks(),
        window.api.getCrypto(),
        window.api.getRetirement(),
        window.api.getDebts(),
        window.api.getCashFlow(),
        window.api.getSnapshots(),
        window.api.getPortfolioSummary(),
      ]);
      dispatch({
        type: 'SET_ALL_DATA',
        payload: { realEstate, stocks, crypto, retirement, debts, cashFlow, snapshots, summary },
      });
      dispatch({ type: 'SET_LAST_REFRESH' });
    } catch (err) {
      console.error('Failed to refresh data:', err);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    await window.api.refreshPrices();
    await refreshAll();
  }, [refreshAll]);

  // CRUD helpers
  const addRealEstate = useCallback(async (data: CreateRealEstateInput) => {
    await window.api.createRealEstate(data);
    dispatch({ type: 'SET_REAL_ESTATE', payload: await window.api.getRealEstate() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const updateRealEstateAction = useCallback(async (id: string, data: UpdateRealEstateInput) => {
    await window.api.updateRealEstate(id, data);
    dispatch({ type: 'SET_REAL_ESTATE', payload: await window.api.getRealEstate() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const deleteRealEstateAction = useCallback(async (id: string) => {
    await window.api.deleteRealEstate(id);
    dispatch({ type: 'SET_REAL_ESTATE', payload: await window.api.getRealEstate() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const addStock = useCallback(async (data: CreateStockInput) => {
    await window.api.createStock(data);
    dispatch({ type: 'SET_STOCKS', payload: await window.api.getStocks() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const updateStockAction = useCallback(async (id: string, data: UpdateStockInput) => {
    await window.api.updateStock(id, data);
    dispatch({ type: 'SET_STOCKS', payload: await window.api.getStocks() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const deleteStockAction = useCallback(async (id: string) => {
    await window.api.deleteStock(id);
    dispatch({ type: 'SET_STOCKS', payload: await window.api.getStocks() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const addCrypto = useCallback(async (data: CreateCryptoInput) => {
    await window.api.createCrypto(data);
    dispatch({ type: 'SET_CRYPTO', payload: await window.api.getCrypto() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const updateCryptoAction = useCallback(async (id: string, data: UpdateCryptoInput) => {
    await window.api.updateCrypto(id, data);
    dispatch({ type: 'SET_CRYPTO', payload: await window.api.getCrypto() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const deleteCryptoAction = useCallback(async (id: string) => {
    await window.api.deleteCrypto(id);
    dispatch({ type: 'SET_CRYPTO', payload: await window.api.getCrypto() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const addRetirement = useCallback(async (data: CreateRetirementInput) => {
    await window.api.createRetirement(data);
    dispatch({ type: 'SET_RETIREMENT', payload: await window.api.getRetirement() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const updateRetirementAction = useCallback(async (id: string, data: UpdateRetirementInput) => {
    await window.api.updateRetirement(id, data);
    dispatch({ type: 'SET_RETIREMENT', payload: await window.api.getRetirement() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const deleteRetirementAction = useCallback(async (id: string) => {
    await window.api.deleteRetirement(id);
    dispatch({ type: 'SET_RETIREMENT', payload: await window.api.getRetirement() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const addDebt = useCallback(async (data: CreateDebtInput) => {
    await window.api.createDebt(data);
    dispatch({ type: 'SET_DEBTS', payload: await window.api.getDebts() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const updateDebtAction = useCallback(async (id: string, data: UpdateDebtInput) => {
    await window.api.updateDebt(id, data);
    dispatch({ type: 'SET_DEBTS', payload: await window.api.getDebts() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const deleteDebtAction = useCallback(async (id: string) => {
    await window.api.deleteDebt(id);
    dispatch({ type: 'SET_DEBTS', payload: await window.api.getDebts() });
    dispatch({ type: 'SET_SUMMARY', payload: await window.api.getPortfolioSummary() });
  }, []);

  const addCashFlow = useCallback(async (data: CreateCashFlowInput) => {
    await window.api.createCashFlow(data);
    dispatch({ type: 'SET_CASH_FLOW', payload: await window.api.getCashFlow() });
  }, []);

  const updateCashFlowAction = useCallback(async (id: string, data: UpdateCashFlowInput) => {
    await window.api.updateCashFlow(id, data);
    dispatch({ type: 'SET_CASH_FLOW', payload: await window.api.getCashFlow() });
  }, []);

  const deleteCashFlowAction = useCallback(async (id: string) => {
    await window.api.deleteCashFlow(id);
    dispatch({ type: 'SET_CASH_FLOW', payload: await window.api.getCashFlow() });
  }, []);

  // Load data on mount
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Listen for price update events
  useEffect(() => {
    const cleanup = window.api.onPricesUpdated(() => {
      refreshAll();
    });
    return cleanup;
  }, [refreshAll]);

  const value: PortfolioContextValue = {
    ...state,
    refreshAll,
    refreshPrices,
    addRealEstate,
    updateRealEstate: updateRealEstateAction,
    deleteRealEstate: deleteRealEstateAction,
    addStock,
    updateStock: updateStockAction,
    deleteStock: deleteStockAction,
    addCrypto,
    updateCrypto: updateCryptoAction,
    deleteCrypto: deleteCryptoAction,
    addRetirement,
    updateRetirement: updateRetirementAction,
    deleteRetirement: deleteRetirementAction,
    addDebt,
    updateDebt: updateDebtAction,
    deleteDebt: deleteDebtAction,
    addCashFlow,
    updateCashFlow: updateCashFlowAction,
    deleteCashFlow: deleteCashFlowAction,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
