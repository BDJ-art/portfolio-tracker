import { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import { formatCurrency, formatNumber } from '../lib/formatters';
import type { InsightsReport, Insight, DebtPayoffPlan } from '../types/models';

const SEVERITY_STYLES: Record<Insight['severity'], { bg: string; border: string; icon: string }> = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '!!' },
  warning:  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '!' },
  info:     { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'i' },
  positive: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '+' },
};

const SEVERITY_ICON_COLORS: Record<Insight['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  positive: 'bg-green-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  debt_payoff: 'Debt Payoff',
  leverage: 'Leverage',
  portfolio_health: 'Portfolio Health',
  cash_flow: 'Cash Flow',
  opportunity: 'Opportunity',
};

export default function InsightsPage() {
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'avalanche' | 'snowball'>('avalanche');

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const data = await window.api.getInsights();
      setReport(data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Smart Insights" />
        <div className="p-6 flex items-center justify-center h-64 text-slate-400">
          Analyzing your portfolio...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div>
        <Header title="Smart Insights" />
        <div className="p-6 text-slate-400">Failed to generate insights. Add some assets and debts first.</div>
      </div>
    );
  }

  const { insights, debtPayoff, metrics } = report;

  return (
    <div>
      <Header title="Smart Insights" />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <MetricCard label="Net Worth" value={formatCurrency(metrics.netWorth)} color={metrics.netWorth >= 0 ? 'text-positive' : 'text-negative'} />
          <MetricCard label="Debt-to-Asset Ratio" value={`${(metrics.debtToAssetRatio * 100).toFixed(1)}%`} color={metrics.debtToAssetRatio > 0.5 ? 'text-negative' : metrics.debtToAssetRatio > 0.3 ? 'text-amber-400' : 'text-positive'} />
          <MetricCard label="Avg Debt Interest" value={`${formatNumber(metrics.weightedAvgDebtRate)}%`} color={metrics.weightedAvgDebtRate > 15 ? 'text-negative' : 'text-slate-100'} />
          <MetricCard label="Monthly Debt Payments" value={formatCurrency(metrics.monthlyDebtPayments)} color="text-slate-100" />
        </div>

        {/* Good vs Bad Debt Breakdown */}
        {(metrics.goodDebtTotal > 0 || metrics.badDebtTotal > 0) && (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
              <div className="text-xs text-slate-400 mb-2">Good Debt</div>
              <div className="text-lg font-bold text-green-400">{formatCurrency(metrics.goodDebtTotal)}</div>
              <div className="text-xs text-slate-500 mt-1">Mortgages, low-rate student loans</div>
              {metrics.goodDebtMonthly > 0 && (
                <div className="text-xs text-slate-400 mt-1">{formatCurrency(metrics.goodDebtMonthly)}/mo</div>
              )}
            </div>
            <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
              <div className="text-xs text-slate-400 mb-2">Bad Debt</div>
              <div className={`text-lg font-bold ${metrics.badDebtTotal > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(metrics.badDebtTotal)}</div>
              <div className="text-xs text-slate-500 mt-1">Credit cards, personal loans, high-rate</div>
              {metrics.badDebtMonthly > 0 && (
                <div className="text-xs text-slate-400 mt-1">{formatCurrency(metrics.badDebtMonthly)}/mo</div>
              )}
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Recommendations</h2>
            <div className="space-y-3">
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {insights.length === 0 && (
          <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-8 text-center">
            <div className="text-slate-400">Add assets and debts to get personalized financial insights.</div>
          </div>
        )}

        {/* Debt Payoff Plan */}
        {debtPayoff && (
          <div>
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Debt Payoff Strategy</h2>
            <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-5">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedPlan('avalanche')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlan === 'avalanche'
                      ? 'bg-accent text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Avalanche (Save Most)
                </button>
                <button
                  onClick={() => setSelectedPlan('snowball')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlan === 'snowball'
                      ? 'bg-accent text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Snowball (Quick Wins)
                </button>
              </div>

              <div className="mb-4 text-sm text-slate-400">
                {selectedPlan === 'avalanche'
                  ? 'Pay highest interest rate first. Saves the most money over time.'
                  : 'Pay smallest balance first. Gives psychological wins to stay motivated.'}
                {debtPayoff[selectedPlan].monthsToPayoff
                  ? ` Estimated payoff: ~${debtPayoff[selectedPlan].monthsToPayoff} months (${(debtPayoff[selectedPlan].monthsToPayoff! / 12).toFixed(1)} years).`
                  : ''}
              </div>

              <PayoffOrderTable plan={debtPayoff[selectedPlan]} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-alt rounded-xl border border-slate-700/50 p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const style = SEVERITY_STYLES[insight.severity];
  const iconColor = SEVERITY_ICON_COLORS[insight.severity];

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${iconColor} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
          {style.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-200">{insight.title}</span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[insight.category] ?? insight.category}
            </span>
          </div>
          <p className="text-sm text-slate-400">{insight.description}</p>
          {insight.impact && (
            <p className="text-sm text-slate-300 mt-1 font-medium">{insight.impact}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PayoffOrderTable({ plan }: { plan: DebtPayoffPlan }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-700/50 text-left">
          <th className="px-4 py-2 text-xs font-medium text-slate-400">Priority</th>
          <th className="px-4 py-2 text-xs font-medium text-slate-400">Debt</th>
          <th className="px-4 py-2 text-xs font-medium text-slate-400 text-right">Balance</th>
          <th className="px-4 py-2 text-xs font-medium text-slate-400 text-right">Rate</th>
          <th className="px-4 py-2 text-xs font-medium text-slate-400 text-right">Min Payment</th>
        </tr>
      </thead>
      <tbody>
        {plan.order.map((debt, i) => (
          <tr key={debt.name} className="border-b border-slate-700/30">
            <td className="px-4 py-2">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                i === 0 ? 'bg-accent text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {i + 1}
              </span>
            </td>
            <td className="px-4 py-2 text-slate-200">{debt.name}</td>
            <td className="px-4 py-2 text-right text-slate-300">{formatCurrency(debt.balance)}</td>
            <td className="px-4 py-2 text-right text-slate-300">{formatNumber(debt.rate)}%</td>
            <td className="px-4 py-2 text-right text-slate-300">{formatCurrency(debt.minimumPayment, true)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
