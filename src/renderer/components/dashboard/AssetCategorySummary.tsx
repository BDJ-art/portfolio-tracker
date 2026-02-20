import { useNavigate } from 'react-router-dom';
import Card from '../shared/Card';
import CurrencyDisplay from '../shared/CurrencyDisplay';
import { CATEGORY_COLORS } from '../../lib/colors';
import type { PortfolioSummary } from '../../types/models';

interface AssetCategorySummaryProps {
  summary: PortfolioSummary | null;
  counts: { realEstate: number; stocks: number; crypto: number; retirement: number; debts: number };
}

export default function AssetCategorySummary({ summary, counts }: AssetCategorySummaryProps) {
  const navigate = useNavigate();

  const categories = [
    { key: 'realEstate', label: 'Real Estate', value: summary?.totalRealEstate ?? 0, count: counts.realEstate, unit: 'properties', color: CATEGORY_COLORS.realEstate, path: '/real-estate' },
    { key: 'stocks', label: 'Stocks', value: summary?.totalStocks ?? 0, count: counts.stocks, unit: 'holdings', color: CATEGORY_COLORS.stocks, path: '/stocks' },
    { key: 'crypto', label: 'Crypto', value: summary?.totalCrypto ?? 0, count: counts.crypto, unit: 'coins', color: CATEGORY_COLORS.crypto, path: '/crypto' },
    { key: 'retirement', label: 'Retirement', value: summary?.totalRetirement ?? 0, count: counts.retirement, unit: 'accounts', color: CATEGORY_COLORS.retirement, path: '/retirement' },
    { key: 'debts', label: 'Debts', value: -(summary?.totalDebts ?? 0), count: counts.debts, unit: 'debts', color: CATEGORY_COLORS.debts, path: '/debts' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
      {categories.map(cat => (
        <Card key={cat.key} onClick={() => navigate(cat.path)} className="cursor-pointer hover:border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-sm text-slate-400">{cat.label}</span>
          </div>
          <CurrencyDisplay value={cat.value} size="lg" />
          <div className="mt-1 text-xs text-slate-500">
            {cat.count} {cat.unit}
          </div>
        </Card>
      ))}
    </div>
  );
}
