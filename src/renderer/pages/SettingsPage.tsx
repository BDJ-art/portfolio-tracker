import Header from '../components/layout/Header';
import Card from '../components/shared/Card';
import Button from '../components/shared/Button';
import { usePortfolio } from '../context/PortfolioContext';
import { useState, useEffect } from 'react';

const isWeb = typeof navigator !== 'undefined' && !navigator.userAgent.includes('Electron');

export default function SettingsPage() {
  const { lastRefresh, refreshPrices } = usePortfolio();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [age, setAge] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [historicalNetWorth, setHistoricalNetWorth] = useState('');
  const [historicalDate, setHistoricalDate] = useState('');

  useEffect(() => {
    Promise.all([
      window.api.getSetting('age'),
      window.api.getSetting('historicalNetWorth'),
      window.api.getSetting('historicalNetWorthDate'),
    ]).then(([ageVal, nwVal, dateVal]) => {
      if (ageVal) setAge(ageVal);
      if (nwVal) setHistoricalNetWorth(nwVal);
      if (dateVal) setHistoricalDate(dateVal);
    });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await refreshPrices(); } finally { setIsRefreshing(false); }
  };

  const handleSaveProfile = async () => {
    const parsedAge = parseInt(age);
    if (age && (!isNaN(parsedAge) && parsedAge >= 1 && parsedAge <= 120)) {
      await window.api.setSetting('age', String(parsedAge));
    }
    const parsedNW = parseFloat(historicalNetWorth);
    if (historicalNetWorth && !isNaN(parsedNW)) {
      await window.api.setSetting('historicalNetWorth', String(parsedNW));
    }
    if (historicalDate) {
      await window.api.setSetting('historicalNetWorthDate', historicalDate);
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  return (
    <div>
      <Header title="Settings" lastRefresh={lastRefresh} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <Card title="YOUR PROFILE">
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-300">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={e => { setAge(e.target.value); setProfileSaved(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); }}
                  placeholder="e.g., 25"
                  className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Historical Net Worth</label>
              <p className="text-xs text-slate-500 mb-2">Enter a past net worth to anchor your performance chart. This gives the chart a starting point to show growth over time.</p>
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Date</label>
                  <input
                    type="date"
                    value={historicalDate}
                    onChange={e => { setHistoricalDate(e.target.value); setProfileSaved(false); }}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Net Worth ($)</label>
                  <input
                    type="number"
                    step="100"
                    value={historicalNetWorth}
                    onChange={e => { setHistoricalNetWorth(e.target.value); setProfileSaved(false); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); }}
                    placeholder="e.g., 50000"
                    className="w-36 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                </div>
              </div>
            </div>
            <Button size="sm" onClick={handleSaveProfile}>
              {profileSaved ? 'Saved!' : 'Save Profile'}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-3">Age is used by the AI advisor and insights engine for age-appropriate recommendations. Historical net worth anchors your performance chart.</p>
        </Card>
        <Card title="ABOUT">
          <p className="text-sm text-slate-300">Portfolio Tracker v1.0.0</p>
          <p className="text-xs text-slate-500 mt-1">Track your real estate, stocks, crypto, and retirement accounts in one place.</p>
        </Card>
        <Card title="PRICE REFRESH">
          <p className="text-sm text-slate-300">Prices auto-refresh every 5 minutes.</p>
          <p className="text-xs text-slate-500 mt-1">Stock prices from Yahoo Finance. Crypto prices from CoinGecko.</p>
        </Card>
        <Card title="DATA STORAGE">
          {isWeb ? (
            <>
              <p className="text-sm text-slate-300">All data is stored in your browser (IndexedDB).</p>
              <p className="text-xs text-slate-500 mt-1">Data persists across sessions but is local to this browser. Clearing browser data will erase your portfolio.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300">All data is stored locally on your machine.</p>
              <p className="text-xs text-slate-500 mt-1">Database location: AppData/Roaming/PortfolioTracker/portfolio.db</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
