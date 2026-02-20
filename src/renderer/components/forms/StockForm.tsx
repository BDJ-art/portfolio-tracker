import { useState } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';
import type { StockHolding, CreateStockInput } from '../../types/models';

interface StockFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStockInput) => Promise<void>;
  initial?: StockHolding;
}

export default function StockForm({ isOpen, onClose, onSubmit, initial }: StockFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [shares, setShares] = useState(initial?.shares?.toString() ?? '');
  const [costBasisPerShare, setCostBasisPerShare] = useState(initial?.costBasisPerShare?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !ticker || !shares || !costBasisPerShare) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        ticker: ticker.toUpperCase(),
        shares: parseFloat(shares),
        costBasisPerShare: parseFloat(costBasisPerShare),
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Stock' : 'Add Stock'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Apple Inc." required />
        <Input label="Ticker Symbol" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g., AAPL" required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Shares" type="number" step="any" value={shares} onChange={e => setShares(e.target.value)} placeholder="10" required />
          <Input label="Cost Basis / Share ($)" type="number" step="any" value={costBasisPerShare} onChange={e => setCostBasisPerShare(e.target.value)} placeholder="150.00" required />
        </div>
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : initial ? 'Update' : 'Add Stock'}</Button>
        </div>
      </form>
    </Modal>
  );
}
