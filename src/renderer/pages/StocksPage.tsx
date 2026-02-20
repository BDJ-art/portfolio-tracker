import { useState, useRef } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import Header from '../components/layout/Header';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import StockForm from '../components/forms/StockForm';
import { formatCurrency, formatNumber } from '../lib/formatters';
import type { StockHolding, CreateStockInput } from '../types/models';

const isWeb = typeof navigator !== 'undefined' && !navigator.userAgent.includes('Electron');

export default function StocksPage() {
  const { stocks, addStock, updateStock, deleteStock, lastRefresh, refreshPrices } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StockHolding | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async (data: CreateStockInput) => { await addStock(data); };
  const handleEdit = async (data: CreateStockInput) => { if (editing) await updateStock(editing.id, data); };
  const handleDelete = async (id: string) => { if (confirm('Delete this stock?')) await deleteStock(id); };

  const doImport = async (content: string) => {
    setImporting(true);
    try {
      const imported = await window.api.importRobinhood(content);
      for (const stock of imported) {
        await addStock({ name: stock.name, ticker: stock.ticker, shares: stock.shares, costBasisPerShare: stock.costBasisPerShare });
      }
      alert(`Imported ${imported.length} stock holdings from Robinhood.`);
    } catch (err) {
      alert(`Import failed: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImportRobinhood = async () => {
    if (isWeb) {
      fileInputRef.current?.click();
    } else {
      const filePath = await window.api.openCsvDialog();
      if (!filePath) return;
      await doImport(filePath);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => doImport(reader.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshPrices(); } finally { setIsRefreshing(false); }
  };

  const totalValue = stocks.reduce((s, st) => s + st.shares * (st.currentPrice ?? st.costBasisPerShare), 0);
  const totalCost = stocks.reduce((s, st) => s + st.shares * st.costBasisPerShare, 0);
  const totalGain = totalValue - totalCost;

  return (
    <div>
      <Header title="Stocks" lastRefresh={lastRefresh} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <span className="text-sm text-slate-400">{stocks.length} holdings</span>
          <div className="flex gap-2">
            {isWeb && <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />}
            <Button variant="secondary" onClick={handleImportRobinhood} disabled={importing}>{importing ? 'Importing...' : 'Import CSV'}</Button>
            <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>+ Add Stock</Button>
          </div>
        </div>

        {stocks.length === 0 ? (
          <EmptyState title="No stocks yet" description="Add your stock holdings to track their performance." actionLabel="Add Stock" onAction={() => setShowForm(true)} />
        ) : (
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left">
                  <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Name</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Ticker</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Shares</th>
                  <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Cost Basis</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Price</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Value</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Gain/Loss</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(stock => {
                  const price = stock.currentPrice ?? stock.costBasisPerShare;
                  const value = stock.shares * price;
                  const cost = stock.shares * stock.costBasisPerShare;
                  const gain = value - cost;
                  const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                  const color = gain >= 0 ? 'text-positive' : 'text-negative';
                  return (
                    <tr key={stock.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <td className="hidden md:table-cell px-2 md:px-4 py-3 text-slate-200">{stock.name}</td>
                      <td className="px-2 md:px-4 py-3 font-mono text-slate-300">{stock.ticker}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-300">{formatNumber(stock.shares)}</td>
                      <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right text-slate-300">{formatCurrency(stock.costBasisPerShare, true)}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-200 font-medium">{formatCurrency(price, true)}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-200 font-medium">{formatCurrency(value)}</td>
                      <td className={`px-2 md:px-4 py-3 text-right font-medium ${color}`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct.toFixed(1)}%)
                      </td>
                      <td className="px-2 md:px-4 py-3 text-right">
                        <button onClick={() => { setEditing(stock); setShowForm(true); }} className="text-xs text-slate-400 hover:text-slate-200 mr-2">Edit</button>
                        <button onClick={() => handleDelete(stock.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-600">
                  <td colSpan={3} className="px-2 md:px-4 py-3 text-sm font-medium text-slate-300 md:hidden">Total</td>
                  <td colSpan={5} className="hidden md:table-cell px-2 md:px-4 py-3 text-sm font-medium text-slate-300">Total</td>
                  <td className="px-2 md:px-4 py-3 text-right text-sm font-bold text-slate-100">{formatCurrency(totalValue)}</td>
                  <td className={`px-2 md:px-4 py-3 text-right text-sm font-bold ${totalGain >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <StockForm isOpen={showForm} onClose={() => { setShowForm(false); setEditing(undefined); }} onSubmit={editing ? handleEdit : handleAdd} initial={editing} />
      )}
    </div>
  );
}
