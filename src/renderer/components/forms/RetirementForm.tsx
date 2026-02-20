import { useState } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Button from '../shared/Button';
import type { RetirementAccount, CreateRetirementInput } from '../../types/models';

interface RetirementFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRetirementInput) => Promise<void>;
  initial?: RetirementAccount;
}

const accountTypes = [
  { value: '401k', label: '401(k)' },
  { value: 'roth_ira', label: 'Roth IRA' },
  { value: 'traditional_ira', label: 'Traditional IRA' },
  { value: '403b', label: '403(b)' },
  { value: 'pension', label: 'Pension' },
  { value: 'other', label: 'Other' },
];

export default function RetirementForm({ isOpen, onClose, onSubmit, initial }: RetirementFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [accountType, setAccountType] = useState(initial?.accountType ?? '401k');
  const [institution, setInstitution] = useState(initial?.institution ?? '');
  const [balance, setBalance] = useState(initial?.balance?.toString() ?? '');
  const [contributions, setContributions] = useState(initial?.contributions?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !institution || !balance) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        accountType: accountType as CreateRetirementInput['accountType'],
        institution,
        balance: parseFloat(balance),
        contributions: contributions ? parseFloat(contributions) : undefined,
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Account' : 'Add Retirement Account'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Account Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., My 401(k)" required />
        <Select label="Account Type" value={accountType} onChange={e => setAccountType(e.target.value)} options={accountTypes} />
        <Input label="Institution" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g., Fidelity" required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Current Balance ($)" type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="150000" required />
          <Input label="Total Contributions ($)" type="number" value={contributions} onChange={e => setContributions(e.target.value)} placeholder="120000" />
        </div>
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : initial ? 'Update' : 'Add Account'}</Button>
        </div>
      </form>
    </Modal>
  );
}
