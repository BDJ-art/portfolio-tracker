import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../shared/Card';
import { formatCurrency } from '../../lib/formatters';
import { CATEGORY_COLORS } from '../../lib/colors';
import type { PortfolioSummary } from '../../types/models';

interface AllocationPieChartProps {
  summary: PortfolioSummary | null;
}

export default function AllocationPieChart({ summary }: AllocationPieChartProps) {
  if (!summary || summary.totalNetWorth === 0) {
    return (
      <Card title="ALLOCATION">
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
          Add assets to see allocation
        </div>
      </Card>
    );
  }

  const data = [
    { name: 'Real Estate', value: Math.max(0, summary.totalRealEstate), color: CATEGORY_COLORS.realEstate },
    { name: 'Stocks', value: Math.max(0, summary.totalStocks), color: CATEGORY_COLORS.stocks },
    { name: 'Crypto', value: Math.max(0, summary.totalCrypto), color: CATEGORY_COLORS.crypto },
    { name: 'Retirement', value: Math.max(0, summary.totalRetirement), color: CATEGORY_COLORS.retirement },
  ].filter(d => d.value > 0);

  return (
    <Card title="ALLOCATION">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-40 h-40 sm:w-48 sm:h-48">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {data.map(item => {
            const pct = ((item.value / summary.totalNetWorth) * 100).toFixed(1);
            return (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-400 w-24">{item.name}</span>
                <span className="text-slate-200 font-medium">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
