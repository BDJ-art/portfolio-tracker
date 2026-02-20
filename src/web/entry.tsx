import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PortfolioProvider } from '@renderer/context/PortfolioContext';
import MainLayout from '@renderer/components/layout/MainLayout';
import DashboardPage from '@renderer/pages/DashboardPage';
import RealEstatePage from '@renderer/pages/RealEstatePage';
import StocksPage from '@renderer/pages/StocksPage';
import CryptoPage from '@renderer/pages/CryptoPage';
import RetirementPage from '@renderer/pages/RetirementPage';
import DebtsPage from '@renderer/pages/DebtsPage';
import InsightsPage from '@renderer/pages/InsightsPage';
import CashFlowPage from '@renderer/pages/CashFlowPage';
import SettingsPage from '@renderer/pages/SettingsPage';
import '@renderer/styles/index.css';
import { createWebApi } from './data/webApi';
import { startScheduler } from './services/priceRefresh';

// Initialize web API on window.api (same interface as Electron preload)
window.api = createWebApi();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

// Start price refresh scheduler
startScheduler();

// Mount React app — uses BrowserRouter instead of HashRouter for clean URLs
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </StrictMode>
);
