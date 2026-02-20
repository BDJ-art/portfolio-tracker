import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PortfolioProvider } from './context/PortfolioContext';
import MainLayout from './components/layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import RealEstatePage from './pages/RealEstatePage';
import StocksPage from './pages/StocksPage';
import CryptoPage from './pages/CryptoPage';
import RetirementPage from './pages/RetirementPage';
import DebtsPage from './pages/DebtsPage';
import CashFlowPage from './pages/CashFlowPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <PortfolioProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/real-estate" element={<RealEstatePage />} />
            <Route path="/stocks" element={<StocksPage />} />
            <Route path="/crypto" element={<CryptoPage />} />
            <Route path="/retirement" element={<RetirementPage />} />
            <Route path="/debts" element={<DebtsPage />} />
            <Route path="/cash-flow" element={<CashFlowPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MainLayout>
      </PortfolioProvider>
    </HashRouter>
  );
}
