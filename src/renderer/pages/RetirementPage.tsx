import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import Header from '../components/layout/Header';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import CurrencyDisplay from '../components/shared/CurrencyDisplay';
import EmptyState from '../components/shared/EmptyState';
import RetirementForm from '../components/forms/RetirementForm';
import { formatCurrency } from '../lib/formatters';
import type { RetirementAccount, CreateRetirementInput } from '../types/models';

const typeLabels: Record<string, string> = {
  '401k': '401(k)',
  'roth_ira': 'Roth IRA',
  'traditional_ira': 'Traditional IRA',
  '403b': '403(b)',
  'pension': 'Pension',
  'other': 'Other',
};

export default function RetirementPage() {
  const { retirement, addRetirement, updateRetirement, deleteRetirement, lastRefresh, refreshPrices } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RetirementAccount | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAdd = async (data: CreateRetirementInput) => { await addRetirement(data); };
  const handleEdit = async (data: CreateRetirementInput) => { if (editing) await updateRetirement(editing.id, data); };
  const handleDelete = async (id: string) => { if (confirm('Delete this account?')) await deleteRetirement(id); };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshPrices(); } finally { setIsRefreshing(false); }
  };

  return (
    <div>
      <Header title="Retirement" lastRefresh={lastRefresh} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <span className="text-sm text-slate-400">{retirement.length} accounts</span>
          <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>+ Add Account</Button>
        </div>

        {retirement.length === 0 ? (
          <EmptyState title="No retirement accounts yet" description="Add your retirement accounts to track your long-term savings." actionLabel="Add Account" onAction={() => setShowForm(true)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {retirement.map(acct => {
              const growth = acct.contributions ? acct.balance - acct.contributions : 0;
              return (
                <Card key={acct.id}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{acct.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{acct.institution}</p>
                    </div>
                    <span className="text-xs bg-retire/20 text-retire px-2 py-0.5 rounded-full">
                      {typeLabels[acct.accountType] ?? acct.accountType}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-slate-500">Balance</div>
                      <div className="text-sm font-medium text-slate-200">{formatCurrency(acct.balance)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Contributions</div>
                      <div className="text-sm font-medium text-slate-300">{acct.contributions ? formatCurrency(acct.contributions) : '--'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Growth</div>
                      {acct.contributions ? (
                        <CurrencyDisplay value={growth} showSign className="text-sm font-medium" />
                      ) : (
                        <span className="text-sm text-slate-500">--</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(acct); setShowForm(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(acct.id)} className="text-red-400 hover:text-red-300">Delete</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <RetirementForm isOpen={showForm} onClose={() => { setShowForm(false); setEditing(undefined); }} onSubmit={editing ? handleEdit : handleAdd} initial={editing} />
      )}
    </div>
  );
}
