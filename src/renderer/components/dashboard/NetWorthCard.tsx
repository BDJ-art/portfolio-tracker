import Card from '../shared/Card';
import CurrencyDisplay, { GainLoss } from '../shared/CurrencyDisplay';
import type { PortfolioSummary } from '../../types/models';

interface NetWorthCardProps {
  summary: PortfolioSummary | null;
}

export default function NetWorthCard({ summary }: NetWorthCardProps) {
  if (!summary) {
    return (
      <Card title="NET WORTH" className="flex flex-col justify-center">
        <div className="text-2xl font-bold text-slate-500">--</div>
      </Card>
    );
  }

  return (
    <Card title="NET WORTH">
      <CurrencyDisplay value={summary.totalNetWorth} size="xl" />
      <div className="mt-2">
        <GainLoss gainLoss={summary.totalGainLoss} gainLossPercent={summary.totalGainLossPercent} />
      </div>
    </Card>
  );
}
