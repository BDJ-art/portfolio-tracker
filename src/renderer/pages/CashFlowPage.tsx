import { useState, useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import Header from '../components/layout/Header';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import CashFlowForm from '../components/forms/CashFlowForm';
import { formatCurrency } from '../lib/formatters';
import type { CashFlowItem, CreateCashFlowInput } from '../types/models';

const CATEGORY_LABELS: Record<string, string> = {
  salary: 'Salary / Wages',
  freelance: 'Freelance',
  rental_income: 'Rental Income',
  dividends: 'Dividends',
  side_hustle: 'Side Hustle',
  housing: 'Housing',
  utilities: 'Utilities',
  insurance: 'Insurance',
  groceries: 'Groceries',
  transportation: 'Transportation',
  subscriptions: 'Subscriptions',
  dining: 'Dining Out',
  entertainment: 'Entertainment',
  healthcare: 'Healthcare',
  personal: 'Personal',
  education: 'Education',
  debt_payments: 'Debt Payments',
  savings: 'Savings',
  mortgage: 'Mortgage',
  other: 'Other',
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 52 / 12;
    case 'biweekly': return amount * 26 / 12;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

interface AutoExpense {
  id: string;
  name: string;
  category: string;
  amount: number;
  source: string;
}

export default function CashFlowPage() {
  const { cashFlow, debts, realEstate, addCashFlow, updateCashFlow, deleteCashFlow } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CashFlowItem | undefined>();
  const [defaultFlowType, setDefaultFlowType] = useState<'income' | 'expense'>('expense');

  const handleAdd = async (data: CreateCashFlowInput) => { await addCashFlow(data); };
  const handleEdit = async (data: CreateCashFlowInput) => { if (editing) await updateCashFlow(editing.id, data); };
  const handleDelete = async (id: string) => { if (confirm('Delete this item?')) await deleteCashFlow(id); };

  // Auto-derived expenses from debts and mortgages
  const autoExpenses = useMemo<AutoExpense[]>(() => {
    const items: AutoExpense[] = [];
    for (const d of debts) {
      const payment = d.monthlyPayment ?? d.minimumPayment;
      if (payment > 0) {
        items.push({
          id: `auto-debt-${d.id}`,
          name: d.name,
          category: 'debt_payments',
          amount: payment,
          source: 'Debts',
        });
      }
    }
    for (const p of realEstate) {
      if (p.monthlyMortgagePayment && p.monthlyMortgagePayment > 0) {
        items.push({
          id: `auto-mortgage-${p.id}`,
          name: `${p.name} Mortgage`,
          category: 'mortgage',
          amount: p.monthlyMortgagePayment,
          source: 'Real Estate',
        });
      }
    }
    return items;
  }, [debts, realEstate]);

  const activeItems = cashFlow.filter(i => i.isActive);
  const income = activeItems.filter(i => i.flowType === 'income');
  const manualExpenses = activeItems.filter(i => i.flowType === 'expense');

  const totalMonthlyIncome = income.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const totalManualExpenses = manualExpenses.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const totalAutoExpenses = autoExpenses.reduce((s, a) => s + a.amount, 0);
  const totalMonthlyExpenses = totalManualExpenses + totalAutoExpenses;
  const freeCash = totalMonthlyIncome - totalMonthlyExpenses;

  const hasAnyData = cashFlow.length > 0 || autoExpenses.length > 0;

  const openAddForm = (type: 'income' | 'expense') => {
    setEditing(undefined);
    setDefaultFlowType(type);
    setShowForm(true);
  };

  return (
    <div>
      <Header title="Cash Flow" />
      <div className="p-4 md:p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Monthly Income</div>
            <div className="text-lg font-bold text-positive">{formatCurrency(totalMonthlyIncome, true)}</div>
          </div>
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Monthly Expenses</div>
            <div className="text-lg font-bold text-negative">{formatCurrency(totalMonthlyExpenses, true)}</div>
          </div>
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Free Cash / Month</div>
            <div className={`text-lg font-bold ${freeCash >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatCurrency(freeCash, true)}
            </div>
          </div>
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
            <div className="text-xs text-slate-400 mb-1">Savings Rate</div>
            <div className={`text-lg font-bold ${freeCash >= 0 ? 'text-positive' : 'text-negative'}`}>
              {totalMonthlyIncome > 0 ? `${((freeCash / totalMonthlyIncome) * 100).toFixed(1)}%` : '--'}
            </div>
          </div>
        </div>

        {!hasAnyData ? (
          <EmptyState
            title="No income or expenses tracked"
            description="Add your monthly income and expenses to see how much free cash you have to deploy each month."
            actionLabel="Add Income"
            onAction={() => openAddForm('income')}
          />
        ) : (
          <div className="space-y-6">
            {/* Income Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Income</h2>
                <Button size="sm" onClick={() => openAddForm('income')}>+ Add Income</Button>
              </div>
              {income.length === 0 ? (
                <div className="text-sm text-slate-500 bg-surface-alt rounded-xl border border-slate-700/50 p-4">
                  No income sources added yet.
                </div>
              ) : (
                <div className="bg-surface-alt rounded-xl border border-slate-700/50 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 text-left">
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Name</th>
                        <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Category</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Amount</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Frequency</th>
                        <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Monthly</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map(item => (
                        <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                          <td className="px-2 md:px-4 py-3 text-slate-200">{item.name}</td>
                          <td className="hidden md:table-cell px-2 md:px-4 py-3 text-slate-400">{CATEGORY_LABELS[item.category] ?? item.category}</td>
                          <td className="px-2 md:px-4 py-3 text-right text-positive font-medium">{formatCurrency(item.amount, true)}</td>
                          <td className="px-2 md:px-4 py-3 text-right text-slate-400">{FREQUENCY_LABELS[item.frequency]}</td>
                          <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right text-positive">{formatCurrency(toMonthly(item.amount, item.frequency), true)}/mo</td>
                          <td className="px-2 md:px-4 py-3 text-right">
                            <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-slate-400 hover:text-slate-200 mr-2">Edit</button>
                            <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-600">
                        <td colSpan={2} className="px-2 md:px-4 py-3 text-sm font-medium text-slate-300">Total</td>
                        <td colSpan={2} className="hidden md:table-cell"></td>
                        <td className="px-2 md:px-4 py-3 text-right text-sm font-bold text-positive md:hidden">{formatCurrency(totalMonthlyIncome, true)}/mo</td>
                        <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right text-sm font-bold text-positive">{formatCurrency(totalMonthlyIncome, true)}/mo</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Expenses Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Expenses</h2>
                <Button size="sm" onClick={() => openAddForm('expense')}>+ Add Expense</Button>
              </div>
              {manualExpenses.length === 0 && autoExpenses.length === 0 ? (
                <div className="text-sm text-slate-500 bg-surface-alt rounded-xl border border-slate-700/50 p-4">
                  No expenses added yet.
                </div>
              ) : (
                <div className="bg-surface-alt rounded-xl border border-slate-700/50 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 text-left">
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Name</th>
                        <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400">Category</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Amount</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Frequency</th>
                        <th className="hidden md:table-cell px-2 md:px-4 py-3 text-xs font-medium text-slate-400 text-right">Monthly</th>
                        <th className="px-2 md:px-4 py-3 text-xs font-medium text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Auto-derived from debts & mortgages */}
                      {autoExpenses.map(item => (
                        <tr key={item.id} className="border-b border-slate-700/30 bg-slate-800/20">
                          <td className="px-2 md:px-4 py-3 text-slate-200">
                            {item.name}
                            <span className="ml-2 text-[10px] font-medium text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Auto</span>
                          </td>
                          <td className="hidden md:table-cell px-2 md:px-4 py-3 text-slate-400">{CATEGORY_LABELS[item.category] ?? item.category}</td>
                          <td className="px-2 md:px-4 py-3 text-right text-negative font-medium">{formatCurrency(item.amount, true)}</td>
                          <td className="px-2 md:px-4 py-3 text-right text-slate-400">Monthly</td>
                          <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right text-negative">{formatCurrency(item.amount, true)}/mo</td>
                          <td className="px-2 md:px-4 py-3 text-right">
                            <span className="text-xs text-slate-500">via {item.source}</span>
                          </td>
                        </tr>
                      ))}
                      {/* Manual expenses */}
                      {manualExpenses.map(item => (
                        <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                          <td className="px-2 md:px-4 py-3 text-slate-200">{item.name}</td>
                          <td className="hidden md:table-cell px-2 md:px-4 py-3 text-slate-400">{CATEGORY_LABELS[item.category] ?? item.category}</td>
                          <td className="px-2 md:px-4 py-3 text-right text-negative font-medium">{formatCurrency(item.amount, true)}</td>
                          <td className="px-2 md:px-4 py-3 text-right text-slate-400">{FREQUENCY_LABELS[item.frequency]}</td>
                          <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right text-negative">{formatCurrency(toMonthly(item.amount, item.frequency), true)}/mo</td>
                          <td className="px-2 md:px-4 py-3 text-right">
                            <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-slate-400 hover:text-slate-200 mr-2">Edit</button>
                            <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-600">
                        <td colSpan={2} className="px-2 md:px-4 py-3 text-sm font-medium text-slate-300">Total</td>
                        <td colSpan={2} className="hidden md:table-cell"></td>
                        <td className="px-2 md:px-4 py-3 text-right text-sm font-bold text-negative md:hidden">{formatCurrency(totalMonthlyExpenses, true)}/mo</td>
                        <td className="hidden md:table-cell px-2 md:px-4 py-3 text-right text-sm font-bold text-negative">{formatCurrency(totalMonthlyExpenses, true)}/mo</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Inactive items */}
            {cashFlow.some(i => !i.isActive) && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Paused Items</h2>
                <div className="space-y-2">
                  {cashFlow.filter(i => !i.isActive).map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-surface-alt rounded-xl border border-slate-700/30 p-3 opacity-60">
                      <div>
                        <span className="text-sm text-slate-400">{item.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({item.flowType === 'income' ? '+' : '-'}{formatCurrency(item.amount, true)} / {item.frequency})</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-slate-400 hover:text-slate-200">Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <CashFlowForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          onSubmit={editing ? handleEdit : handleAdd}
          initial={editing}
          defaultFlowType={defaultFlowType}
        />
      )}
    </div>
  );
}
