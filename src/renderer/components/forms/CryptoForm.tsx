import { useState, useEffect, useCallback } from 'react';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Button from '../shared/Button';
import type { CryptoHolding, CreateCryptoInput, CoinSearchResult } from '../../types/models';

interface CryptoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCryptoInput) => Promise<void>;
  initial?: CryptoHolding;
}

export default function CryptoForm({ isOpen, onClose, onSubmit, initial }: CryptoFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoinSearchResult[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinSearchResult | null>(
    initial ? { id: initial.coinId, symbol: initial.symbol, name: initial.name } : null
  );
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '');
  const [costBasisPerUnit, setCostBasisPerUnit] = useState(initial?.costBasisPerUnit?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchCoins = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await window.api.searchCoins(query);
      setSearchResults(results);
      setShowResults(true);
    } catch {
      setSearchResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchCoins(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCoins]);

  const handleSelectCoin = (coin: CoinSearchResult) => {
    setSelectedCoin(coin);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoin || !quantity || !costBasisPerUnit) return;
    setSaving(true);
    try {
      await onSubmit({
        name: selectedCoin.name,
        coinId: selectedCoin.id,
        symbol: selectedCoin.symbol,
        quantity: parseFloat(quantity),
        costBasisPerUnit: parseFloat(costBasisPerUnit),
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit Crypto' : 'Add Crypto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {selectedCoin ? (
          <div className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
            <span className="text-sm text-slate-100">{selectedCoin.name} ({selectedCoin.symbol.toUpperCase()})</span>
            <button type="button" onClick={() => setSelectedCoin(null)} className="text-xs text-slate-400 hover:text-slate-200">Change</button>
          </div>
        ) : (
          <div className="relative">
            <Input
              label="Search Coin"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name (e.g., Bitcoin)..."
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {searchResults.map(coin => (
                  <button
                    key={coin.id}
                    type="button"
                    onClick={() => handleSelectCoin(coin)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors text-slate-200"
                  >
                    {coin.name} <span className="text-slate-400">({coin.symbol.toUpperCase()})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantity" type="number" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.5" required />
          <Input label="Cost Basis / Unit ($)" type="number" step="any" value={costBasisPerUnit} onChange={e => setCostBasisPerUnit(e.target.value)} placeholder="67000" required />
        </div>
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving || !selectedCoin}>{saving ? 'Saving...' : initial ? 'Update' : 'Add Crypto'}</Button>
        </div>
      </form>
    </Modal>
  );
}
