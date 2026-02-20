import Card from '../shared/Card';
import { formatCurrency } from '../../lib/formatters';
import type { CashFlowItem, DebtLiability, RealEstateHolding } from '../../types/models';

interface CashFlowCardProps {
  cashFlow: CashFlowItem[];
  debts: DebtLiability[];
  realEstate: RealEstateHolding[];
}

function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return amount * 52 / 12;
    case 'biweekly': return amount * 26 / 12;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

export default function CashFlowCard({ cashFlow, debts, realEstate }: CashFlowCardProps) {
  const active = cashFlow.filter(i => i.isActive);
  const totalIncome = active.filter(i => i.flowType === 'income').reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const manualExpenses = active.filter(i => i.flowType === 'expense').reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);

  // Auto expenses from debts and mortgages
  const autoDebtExpenses = debts.reduce((s, d) => s + (d.monthlyPayment ?? d.minimumPayment), 0);
  const autoMortgageExpenses = realEstate.reduce((s, p) => s + (p.monthlyMortgagePayment ?? 0), 0);
  const totalExpenses = manualExpenses + autoDebtExpenses + autoMortgageExpenses;
  const freeCash = totalIncome - totalExpenses;

  const hasData = cashFlow.length > 0 || debts.length > 0 || realEstate.some(p => p.monthlyMortgagePayment);

  if (!hasData) {
    return (
      <Card title="MONTHLY CASH FLOW" className="flex flex-col justify-center">
        <div className="text-sm text-slate-500">No income or expenses tracked yet.</div>
      </Card>
    );
  }

  return (
    <Card title="MONTHLY CASH FLOW">
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-slate-400">Income</span>
          <span className="text-sm font-semibold text-positive">{formatCurrency(totalIncome, true)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-slate-400">Expenses</span>
          <span className="text-sm font-semibold text-negative">-{formatCurrency(totalExpenses, true)}</span>
        </div>
        <div className="border-t border-slate-700 pt-2 flex justify-between items-baseline">
          <span className="text-sm font-medium text-slate-300">Free Cash</span>
          <span className={`text-lg font-bold ${freeCash >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCurrency(freeCash, true)}
          </span>
        </div>
        {totalIncome > 0 && (
          <div className="pt-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Savings Rate</span>
              <span>{((freeCash / totalIncome) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${freeCash >= 0 ? 'bg-positive' : 'bg-negative'}`}
                style={{ width: `${Math.min(Math.max((freeCash / totalIncome) * 100, 0), 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
