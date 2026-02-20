import { useState } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';
import type { DebtLiability, CreateDebtInput } from '../../types/models';

const DEBT_TYPES = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
] as const;

interface DebtFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDebtInput) => Promise<void>;
  initial?: DebtLiability;
}

export default function DebtForm({ isOpen, onClose, onSubmit, initial }: DebtFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [debtType, setDebtType] = useState<string>(initial?.debtType ?? 'credit_card');
  const [lender, setLender] = useState(initial?.lender ?? '');
  const [originalBalance, setOriginalBalance] = useState(initial?.originalBalance?.toString() ?? '');
  const [currentBalance, setCurrentBalance] = useState(initial?.currentBalance?.toString() ?? '');
  const [interestRate, setInterestRate] = useState(initial?.interestRate?.toString() ?? '');
  const [minimumPayment, setMinimumPayment] = useState(initial?.minimumPayment?.toString() ?? '');
  const [monthlyPayment, setMonthlyPayment] = useState(initial?.monthlyPayment?.toString() ?? '');
  const [dueDay, setDueDay] = useState(initial?.dueDay?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !lender || !currentBalance || !interestRate || !minimumPayment) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        debtType: debtType as CreateDebtInput['debtType'],
        lender,
        originalBalance: parseFloat(originalBalance) || parseFloat(currentBalance),
        currentBalance: parseFloat(currentBalance),
        interestRate: parseFloat(interestRate),
        minimumPayment: parseFloat(minimumPayment),
        monthlyPayment: monthlyPayment ? parseFloat(monthlyPayment) : undefined,
        dueDay: dueDay ? parseInt(dueDay) : undefined,
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Debt' : 'Add Debt'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Chase Sapphire Card" required />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
            <select
              value={debtType}
              onChange={e => setDebtType(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {DEBT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <Input label="Lender" value={lender} onChange={e => setLender(e.target.value)} placeholder="e.g., Chase" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Original Balance ($)" type="number" step="any" value={originalBalance} onChange={e => setOriginalBalance(e.target.value)} placeholder="5000.00" />
          <Input label="Current Balance ($)" type="number" step="any" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} placeholder="3200.00" required />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Interest Rate (%)" type="number" step="any" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="24.99" required />
          <Input label="Min Payment ($)" type="number" step="any" value={minimumPayment} onChange={e => setMinimumPayment(e.target.value)} placeholder="75.00" required />
          <Input label="Actual Payment ($)" type="number" step="any" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} placeholder="200.00" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Due Day (1-31)" type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="15" />
          <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : initial ? 'Update' : 'Add Debt'}</Button>
        </div>
      </form>
    </Modal>
  );
}
