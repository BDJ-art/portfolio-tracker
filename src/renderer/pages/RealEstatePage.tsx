import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import Header from '../components/layout/Header';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import CurrencyDisplay from '../components/shared/CurrencyDisplay';
import EmptyState from '../components/shared/EmptyState';
import RealEstateForm from '../components/forms/RealEstateForm';
import { formatCurrency } from '../lib/formatters';
import type { RealEstateHolding, CreateRealEstateInput } from '../types/models';

const typeLabels: Record<string, string> = {
  primary_residence: 'Primary Residence',
  rental: 'Rental',
  vacation: 'Vacation',
  land: 'Land',
  other: 'Other',
};

export default function RealEstatePage() {
  const { realEstate, addRealEstate, updateRealEstate, deleteRealEstate, lastRefresh, refreshPrices } = usePortfolio();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RealEstateHolding | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAdd = async (data: CreateRealEstateInput) => {
    await addRealEstate(data);
  };

  const handleEdit = async (data: CreateRealEstateInput) => {
    if (editing) await updateRealEstate(editing.id, data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this property?')) await deleteRealEstate(id);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshPrices(); } finally { setIsRefreshing(false); }
  };

  return (
    <div>
      <Header title="Real Estate" lastRefresh={lastRefresh} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div>
            <span className="text-sm text-slate-400">{realEstate.length} properties</span>
          </div>
          <Button onClick={() => { setEditing(undefined); setShowForm(true); }}>+ Add Property</Button>
        </div>

        {realEstate.length === 0 ? (
          <EmptyState
            title="No properties yet"
            description="Add your real estate holdings to track their value and equity."
            actionLabel="Add Property"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {realEstate.map(prop => {
              const equity = prop.estimatedValue - prop.mortgageBalance;
              return (
                <Card key={prop.id}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">{prop.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{prop.address}</p>
                    </div>
                    <span className="text-xs bg-re/20 text-re px-2 py-0.5 rounded-full">
                      {typeLabels[prop.propertyType] ?? prop.propertyType}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-slate-500">Value</div>
                      <div className="text-sm font-medium text-slate-200">{formatCurrency(prop.estimatedValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Mortgage</div>
                      <div className="text-sm font-medium text-slate-200">{formatCurrency(prop.mortgageBalance)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Equity</div>
                      <CurrencyDisplay value={equity} showSign className="text-sm font-medium" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(prop); setShowForm(true); }}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(prop.id)} className="text-red-400 hover:text-red-300">Delete</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <RealEstateForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          onSubmit={editing ? handleEdit : handleAdd}
          initial={editing}
        />
      )}
    </div>
  );
}
