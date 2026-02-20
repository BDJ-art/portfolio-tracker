import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import Header from '../components/layout/Header';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import DebtForm from '../components/forms/DebtForm';
import { formatCurrency, formatNumber } from '../lib/formatters';
import type { DebtLiability, CreateDebtInput } from '../types/models';

const DEBT_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
  auto_loan: 'Auto Loan',
  personal_loan: 'Personal Loan',
  mortgage: 'Mortgage',
  medical: 'Medical',
  other: 'Other',
};

export default function DebtsPage() {
  const { debts, addDebt, updateDebt, deleteDebt } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DebtLiability | undefined>();

  const handleAdd = async (data: CreateDebtInput) => { await addDebt(data); };
  const handleEdit = async (data: CreateDebtInput) => { if (editing) await updateDebt(editing.id, data); };
  const handleDelete = async (id: string) => { if (confirm('Delete this debt?')) await deleteDebt(id); };

  const totalBalance = debts.reduce((s, d) => s + d.currentBalance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minimumPayment, 0);
  const totalMonthlyPayment = debts.reduce((s, d) => s + (d.monthlyPayment ?? d.minimumPayment), 0);
  const weightedRate = totalBalance > 0
    ? debts.reduce((s, d) => s + d.interestRate * d.currentBalance, 0) / totalBalance
    : 0;

  return (
    <div>
      <Header title="Debts & Liabilities" />
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <span className="text-sm text-slate-400">{debts.length} {debts.length === 1 ? 'debt' : 'debts'}</span>
          <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>+ Add Debt</Button>
        </div>

        {/* Summary cards */}
        {debts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
              <div className="text-xs text-slate-400 mb-1">Total Owed</div>
              <div className="text-lg font-bold text-negative">{formatCurrency(totalBalance)}</div>
            </div>
            <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
              <div className="text-xs text-slate-400 mb-1">Weighted Avg Rate</div>
              <div className="text-lg font-bold text-slate-100">{formatNumber(weightedRate)}%</div>
            </div>
            <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
              <div className="text-xs text-slate-400 mb-1">Min Monthly Payment</div>
              <div className="text-lg font-bold text-slate-100">{formatCurrency(totalMinPayment)}</div>
            </div>
            <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
              <div className="text-xs text-slate-400 mb-1">Actual Monthly Payment</div>
              <div className="text-lg font-bold text-slate-100">{formatCurrency(totalMonthlyPayment)}</div>
            </div>
          </div>
        )}

        {debts.length === 0 ? (
          <EmptyState title="No debts tracked" description="Add your debts and liabilities to see how they affect your net worth." actionLabel="Add Debt" onAction={() => setShowForm(true)} />
        ) : (
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left">
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Name</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Type</th>
                  <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Lender</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Rate</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Balance</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Min Payment</th>
                  <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Progress</th>
                  <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {debts.map(debt => {
                  const paidOff = debt.originalBalance > 0
                    ? ((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100
                    : 0;
                  return (
                    <tr key={debt.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                      <td className="px-2 md:px-4 py-3 text-slate-200">{debt.name}</td>
                      <td className="px-2 md:px-4 py-3 text-slate-400">{DEBT_TYPE_LABELS[debt.debtType] ?? debt.debtType}</td>
                      <td className="hidden md:table-cell px-2 md:px-4 py-3 text-slate-300">{debt.lender}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-300">{formatNumber(debt.interestRate)}%</td>
                      <td className="px-2 md:px-4 py-3 text-right text-negative font-medium">{formatCurrency(debt.currentBalance)}</td>
                      <td className="px-2 md:px-4 py-3 text-right text-slate-300">{formatCurrency(debt.minimumPayment, true)}/mo</td>
                      <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(paidOff, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{paidOff.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-2 md:px-4 py-3 text-right">
                        <button onClick={() => { setEditing(debt); setShowForm(true); }} className="text-xs text-slate-400 hover:text-slate-200 mr-2">Edit</button>
                        <button onClick={() => handleDelete(debt.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-600">
                  <td colSpan={2} className="px-2 md:px-4 py-3 text-sm font-medium text-slate-300 md:hidden">Total</td>
                  <td colSpan={4} className="hidden md:table-cell px-2 md:px-4 py-3 text-sm font-medium text-slate-300">Total</td>
                  <td className="px-2 md:px-4 py-3 text-right text-sm font-bold text-negative">{formatCurrency(totalBalance)}</td>
                  <td className="px-2 md:px-4 py-3 text-right text-sm font-bold text-slate-100">{formatCurrency(totalMinPayment, true)}/mo</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <DebtForm isOpen={showForm} onClose={() => { setShowForm(false); setEditing(undefined); }} onSubmit={editing ? handleEdit : handleAdd} initial={editing} />
      )}
    </div>
  );
}
