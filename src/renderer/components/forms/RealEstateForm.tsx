import { useState } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Button from '../shared/Button';
import type { RealEstateHolding, CreateRealEstateInput } from '../../types/models';

interface RealEstateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRealEstateInput) => Promise<void>;
  initial?: RealEstateHolding;
}

const propertyTypes = [
  { value: 'primary_residence', label: 'Primary Residence' },
  { value: 'rental', label: 'Rental Property' },
  { value: 'vacation', label: 'Vacation Home' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

export default function RealEstateForm({ isOpen, onClose, onSubmit, initial }: RealEstateFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [estimatedValue, setEstimatedValue] = useState(initial?.estimatedValue?.toString() ?? '');
  const [mortgageBalance, setMortgageBalance] = useState(initial?.mortgageBalance?.toString() ?? '0');
  const [monthlyMortgagePayment, setMonthlyMortgagePayment] = useState(initial?.monthlyMortgagePayment?.toString() ?? '');
  const [purchasePrice, setPurchasePrice] = useState(initial?.purchasePrice?.toString() ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '');
  const [propertyType, setPropertyType] = useState(initial?.propertyType ?? 'primary_residence');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || !estimatedValue) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        address,
        estimatedValue: parseFloat(estimatedValue),
        mortgageBalance: parseFloat(mortgageBalance) || 0,
        monthlyMortgagePayment: monthlyMortgagePayment ? parseFloat(monthlyMortgagePayment) : undefined,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        purchaseDate: purchaseDate || undefined,
        propertyType: propertyType as CreateRealEstateInput['propertyType'],
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Property' : 'Add Property'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Property Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., My House" required />
        <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, ST" required />
        <Select label="Property Type" value={propertyType} onChange={e => setPropertyType(e.target.value)} options={propertyTypes} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Estimated Value ($)" type="number" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} placeholder="450000" required />
          <Input label="Mortgage Balance ($)" type="number" value={mortgageBalance} onChange={e => setMortgageBalance(e.target.value)} placeholder="320000" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Monthly Payment ($)" type="number" value={monthlyMortgagePayment} onChange={e => setMonthlyMortgagePayment(e.target.value)} placeholder="2100" />
          <Input label="Purchase Price ($)" type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="400000" />
        </div>
        <Input label="Purchase Date" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving...' : initial ? 'Update' : 'Add Property'}</Button>
        </div>
      </form>
    </Modal>
  );
}
