import { useState, useRef } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import Header from '../components/layout/Header';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import CryptoForm from '../components/forms/CryptoForm';
import { formatCurrency, formatNumber } from '../lib/formatters';
import type { CryptoHolding, CreateCryptoInput } from '../types/models';

const isWeb = typeof navigator !== 'undefined' && !navigator.userAgent.includes('Electron');

export default function CryptoPage() {
  const { crypto, addCrypto, updateCrypto, deleteCrypto, lastRefresh, refreshPrices } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CryptoHolding | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async (data: CreateCryptoInput) => { await addCrypto(data); };
  const handleEdit = async (data: CreateCryptoInput) => { if (editing) await updateCrypto(editing.id, data); };
  const handleDelete = async (id: string) => { if (confirm('Delete this crypto?')) await deleteCrypto(id); };

  const doImport = async (content: string) => {
    setImporting(true);
    try {
      const imported = await window.api.importCryptoCsv(content);
      for (const coin of imported) {
        await addCrypto({ name: coin.name, coinId: coin.coinId, symbol: coin.symbol, quantity: coin.quantity, costBasisPerUnit: coin.costBasisPerUnit });
      }
      alert(`Imported ${imported.length} crypto holdings.`);
    } catch (err) {
      alert(`Import failed: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImportCsv = async () => {
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

  const totalValue = crypto.reduce((s, c) => s + c.quantity * (c.currentPrice ?? c.costBasisPerUnit), 0);
  const totalCost = crypto.reduce((s, c) => s + c.quantity * c.costBasisPerUnit, 0);
  const totalGain = totalValue - totalCost;

  return (
    <div>
      <Header title="Crypto" lastRefresh={lastRefresh} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <span className="text-sm text-slate-400">{crypto.length} coins</span>
          <div className="flex gap-2">
            {isWeb && <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />}
            <Button variant="secondary" onClick={handleImportCsv} disabled={importing}>{importing ? 'Importing...' : 'Import CSV'}</Button>
            <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>+ Add Crypto</Button>
          </div>
        </div>

        {crypto.length === 0 ? (
          <EmptyState title="No crypto yet" description="Add your cryptocurrency holdings to track their performance." actionLabel="Add Crypto" onAction={() => setShowForm(true)} />
        ) : (
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left">
                  <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Name</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Symbol</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Quantity</th>
                  <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Cost Basis</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Price</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Value</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Gain/Loss</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {crypto.map(coin => {
                  const price = coin.currentPrice ?? coin.costBasisPerUnit;
                  const value = coin.quantity * price;
                  const cost = coin.quantity * coin.costBasisPerUnit;
                  const gain = value - cost;
                  const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                  const color = gain >= 0 ? 'text-positive' : 'text-negative';
                  return (
                    <tr key={coin.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <td className="hidden md:table-cell px-2 md:px-4 py-3 text-slate-200">{coin.name}</td>
                      <td className="px-2 md:px-4 py-3 font-mono text-slate-300">{coin.symbol.toUpperCase()}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-300">{formatNumber(coin.quantity, 6)}</td>
                      <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right text-slate-300">{formatCurrency(coin.costBasisPerUnit, true)}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-200 font-medium">{formatCurrency(price, true)}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-200 font-medium">{formatCurrency(value)}</td>
                      <td className={`px-2 md:px-4 py-3 text-right font-medium ${color}`}>
                        {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPct.toFixed(1)}%)
                      </td>
                      <td className="px-2 md:px-4 py-3 text-right">
                        <button onClick={() => { setEditing(coin); setShowForm(true); }} className="text-xs text-slate-400 hover:text-slate-200 mr-2">Edit</button>
                        <button onClick={() => handleDelete(coin.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
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
        <CryptoForm isOpen={showForm} onClose={() => { setShowForm(false); setEditing(undefined); }} onSubmit={editing ? handleEdit : handleAdd} initial={editing} />
      )}
    </div>
  );
}
