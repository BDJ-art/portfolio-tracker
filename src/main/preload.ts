import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Real Estate
  getRealEstate: () => ipcRenderer.invoke('real-estate:get-all'),
  createRealEstate: (data: unknown) => ipcRenderer.invoke('real-estate:create', data),
  updateRealEstate: (id: string, data: unknown) => ipcRenderer.invoke('real-estate:update', id, data),
  deleteRealEstate: (id: string) => ipcRenderer.invoke('real-estate:delete', id),

  // Stocks
  getStocks: () => ipcRenderer.invoke('stocks:get-all'),
  createStock: (data: unknown) => ipcRenderer.invoke('stocks:create', data),
  updateStock: (id: string, data: unknown) => ipcRenderer.invoke('stocks:update', id, data),
  deleteStock: (id: string) => ipcRenderer.invoke('stocks:delete', id),

  // Crypto
  getCrypto: () => ipcRenderer.invoke('crypto:get-all'),
  createCrypto: (data: unknown) => ipcRenderer.invoke('crypto:create', data),
  updateCrypto: (id: string, data: unknown) => ipcRenderer.invoke('crypto:update', id, data),
  deleteCrypto: (id: string) => ipcRenderer.invoke('crypto:delete', id),
  searchCoins: (query: string) => ipcRenderer.invoke('crypto:search', query),

  // Debts
  getDebts: () => ipcRenderer.invoke('debts:get-all'),
  createDebt: (data: unknown) => ipcRenderer.invoke('debts:create', data),
  updateDebt: (id: string, data: unknown) => ipcRenderer.invoke('debts:update', id, data),
  deleteDebt: (id: string) => ipcRenderer.invoke('debts:delete', id),

  // Retirement
  getRetirement: () => ipcRenderer.invoke('retirement:get-all'),
  createRetirement: (data: unknown) => ipcRenderer.invoke('retirement:create', data),
  updateRetirement: (id: string, data: unknown) => ipcRenderer.invoke('retirement:update', id, data),
  deleteRetirement: (id: string) => ipcRenderer.invoke('retirement:delete', id),

  // Cash Flow
  getCashFlow: () => ipcRenderer.invoke('cash-flow:get-all'),
  createCashFlow: (data: unknown) => ipcRenderer.invoke('cash-flow:create', data),
  updateCashFlow: (id: string, data: unknown) => ipcRenderer.invoke('cash-flow:update', id, data),
  deleteCashFlow: (id: string) => ipcRenderer.invoke('cash-flow:delete', id),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:get-all'),

  // Insights
  getInsights: () => ipcRenderer.invoke('insights:generate'),

  // CSV Import
  openCsvDialog: () => ipcRenderer.invoke('import:open-csv'),
  importRobinhood: (filePath: string) => ipcRenderer.invoke('import:robinhood', filePath),
  importCryptoCsv: (filePath: string) => ipcRenderer.invoke('import:crypto-csv', filePath),

  // Portfolio
  getPortfolioSummary: () => ipcRenderer.invoke('portfolio:summary'),
  getSnapshots: () => ipcRenderer.invoke('portfolio:snapshots'),
  refreshPrices: () => ipcRenderer.invoke('portfolio:refresh-prices'),

  // AI Analysis
  analyzePortfolio: () => ipcRenderer.invoke('ai:analyze'),
  getAnalysisHistory: () => ipcRenderer.invoke('ai:history'),
  getPortfolioPrompt: () => ipcRenderer.invoke('ai:prompt'),

  // Events
  onPricesUpdated: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('prices-updated', handler);
    return () => ipcRenderer.removeListener('prices-updated', handler);
  },
});
