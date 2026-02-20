import { useState, useMemo, useEffect } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import Card from '../shared/Card';
import { formatCurrency } from '../../lib/formatters';
import type { PortfolioSnapshot } from '../../types/models';
import { subMonths, parseISO, isAfter } from 'date-fns';

interface PerformanceLineChartProps {
  snapshots: PortfolioSnapshot[];
  currentNetWorth?: number;
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export default function PerformanceLineChart({ snapshots, currentNetWorth }: PerformanceLineChartProps) {
  const [range, setRange] = useState<TimeRange>('ALL');
  const [historicalPoint, setHistoricalPoint] = useState<{ date: string; value: number } | null>(null);

  useEffect(() => {
    Promise.all([
      window.api.getSetting('historicalNetWorth'),
      window.api.getSetting('historicalNetWorthDate'),
    ]).then(([nw, date]) => {
      if (nw && date) {
        const val = parseFloat(nw);
        if (!isNaN(val)) {
          setHistoricalPoint({ date, value: val });
        }
      }
    });
  }, []);

  const filteredData = useMemo(() => {
    const allPoints: Array<{ date: string; value: number }> = [];

    // Prepend historical anchor point if it exists and is before all snapshots
    if (historicalPoint) {
      const firstSnapshotDate = snapshots.length > 0 ? snapshots[0].date : null;
      if (!firstSnapshotDate || historicalPoint.date < firstSnapshotDate) {
        allPoints.push(historicalPoint);
      }
    }

    // Add real snapshots
    for (const s of snapshots) {
      allPoints.push({ date: s.date, value: s.totalNetWorth });
    }

    // Always append current net worth as today's data point
    const today = new Date().toISOString().split('T')[0];
    if (currentNetWorth != null) {
      const lastPoint = allPoints[allPoints.length - 1];
      if (!lastPoint || lastPoint.date !== today) {
        // No snapshot for today yet — add current net worth
        allPoints.push({ date: today, value: currentNetWorth });
      } else {
        // Snapshot exists for today — update it with live value
        lastPoint.value = currentNetWorth;
      }
    }

    if (allPoints.length === 0) return [];

    const now = new Date();
    let cutoff: Date;
    switch (range) {
      case '1M': cutoff = subMonths(now, 1); break;
      case '3M': cutoff = subMonths(now, 3); break;
      case '6M': cutoff = subMonths(now, 6); break;
      case '1Y': cutoff = subMonths(now, 12); break;
      default: cutoff = new Date(0);
    }

    return allPoints.filter(p => isAfter(parseISO(p.date), cutoff));
  }, [snapshots, range, historicalPoint, currentNetWorth]);

  // Compute change from first to last point
  const changeInfo = useMemo(() => {
    if (filteredData.length < 2) return null;
    const first = filteredData[0].value;
    const last = filteredData[filteredData.length - 1].value;
    const change = last - first;
    const changePct = first !== 0 ? (change / Math.abs(first)) * 100 : 0;
    return { change, changePct };
  }, [filteredData]);

  const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y', 'ALL'];

  return (
    <Card title="PERFORMANCE">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                range === r ? 'bg-accent text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        {changeInfo && (
          <div className={`text-sm font-medium ${changeInfo.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {changeInfo.change >= 0 ? '+' : ''}{formatCurrency(changeInfo.change)}
            {' '}
            <span className="text-xs">
              ({changeInfo.changePct >= 0 ? '+' : ''}{changeInfo.changePct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
      {filteredData.length < 2 ? (
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
          Performance data will appear as you use the app over time.
          {!historicalPoint && ' Add a historical net worth in Settings to see growth.'}
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
