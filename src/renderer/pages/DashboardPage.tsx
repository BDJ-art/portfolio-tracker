import { usePortfolio } from '../context/PortfolioContext';
import Header from '../components/layout/Header';
import NetWorthCard from '../components/dashboard/NetWorthCard';
import AllocationPieChart from '../components/dashboard/AllocationPieChart';
import PerformanceLineChart from '../components/dashboard/PerformanceLineChart';
import AssetCategorySummary from '../components/dashboard/AssetCategorySummary';
import CashFlowCard from '../components/dashboard/CashFlowCard';
import AiAdvisorPanel from '../components/dashboard/AiAdvisorPanel';
import { useState } from 'react';

export default function DashboardPage() {
  const { summary, snapshots, realEstate, stocks, crypto, retirement, debts, cashFlow, lastRefresh, refreshPrices } = usePortfolio();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPrices();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      <Header title="Dashboard" lastRefresh={lastRefresh} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex justify-end">
          <AiAdvisorPanel />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <NetWorthCard summary={summary} />
          <CashFlowCard cashFlow={cashFlow} debts={debts} realEstate={realEstate} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <AllocationPieChart summary={summary} />
          <PerformanceLineChart snapshots={snapshots} currentNetWorth={summary?.totalNetWorth} />
        </div>
        <AssetCategorySummary
          summary={summary}
          counts={{
            realEstate: realEstate.length,
            stocks: stocks.length,
            crypto: crypto.length,
            retirement: retirement.length,
            debts: debts.length,
          }}
        />
      </div>
    </div>
  );
}
