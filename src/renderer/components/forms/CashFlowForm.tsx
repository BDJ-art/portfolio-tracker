import { useState } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';
import type { CashFlowItem, CreateCashFlowInput } from '../../types/models';

const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salary / Wages' },
  { value: 'freelance', label: 'Freelance / Contract' },
  { value: 'rental_income', label: 'Rental Income' },
  { value: 'dividends', label: 'Dividends / Interest' },
  { value: 'side_hustle', label: 'Side Hustle' },
  { value: 'other', label: 'Other Income' },
] as const;

const EXPENSE_CATEGORIES = [
  { value: 'housing', label: 'Housing (Rent/Mortgage)' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'dining', label: 'Dining Out' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'personal', label: 'Personal / Shopping' },
  { value: 'education', label: 'Education' },
  { value: 'debt_payments', label: 'Debt Payments' },
  { value: 'savings', label: 'Savings / Investments' },
  { value: 'other', label: 'Other' },
] as const;

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

interface CashFlowFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCashFlowInput) => Promise<void>;
  initial?: CashFlowItem;
  defaultFlowType?: 'income' | 'expense';
}

export default function CashFlowForm({ isOpen, onClose, onSubmit, initial, defaultFlowType }: CashFlowFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [flowType, setFlowType] = useState<string>(initial?.flowType ?? defaultFlowType ?? 'expense');
  const [category, setCategory] = useState(initial?.category ?? (flowType === 'income' ? 'salary' : 'housing'));
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [frequency, setFrequency] = useState<string>(initial?.frequency ?? 'monthly');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const categories = flowType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleFlowTypeChange = (newType: string) => {
    setFlowType(newType);
    // Reset category to first option of new type
    if (newType === 'income') {
      setCategory('salary');
    } else {
      setCategory('housing');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        flowType: flowType as CreateCashFlowInput['flowType'],
        category,
        amount: parseFloat(amount),
        frequency: frequency as CreateCashFlowInput['frequency'],
        isActive,
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Cash Flow Item' : 'Add Cash Flow Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Monthly Salary" required />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
            <select
              value={flowType}
              onChange={e => handleFlowTypeChange(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount ($)" type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000.00" required />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Frequency</label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {FREQUENCIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 pt-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
            <span className="text-sm text-slate-300">Active</span>
          </div>
          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : initial ? 'Update' : 'Add Item'}</Button>
        </div>
      </form>
    </Modal>
  );
}
