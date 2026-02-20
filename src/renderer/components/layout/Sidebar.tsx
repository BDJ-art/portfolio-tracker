import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '\u25A6' },
  { to: '/real-estate', label: 'Real Estate', icon: '\u2302' },
  { to: '/stocks', label: 'Stocks', icon: '\u2197' },
  { to: '/crypto', label: 'Crypto', icon: '\u26C1' },
  { to: '/retirement', label: 'Retirement', icon: '\u2691' },
  { to: '/debts', label: 'Debts', icon: '\u2716' },
  { to: '/cash-flow', label: 'Cash Flow', icon: '\u21C4' },
  { to: '/insights', label: 'Insights', icon: '\u2261' },
  { to: '/settings', label: 'Settings', icon: '\u2699' },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col h-full">
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-lg font-bold text-slate-100 tracking-tight">Portfolio Tracker</h1>
      </div>
      <nav className="flex-1 py-3">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'text-accent bg-accent/10 border-r-2 border-accent font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
