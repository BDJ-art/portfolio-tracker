import Button from '../shared/Button';
import { formatDateTime } from '../../lib/formatters';

export interface HeaderProps {
  title: string;
  lastRefresh?: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function Header({ title, lastRefresh, onRefresh, isRefreshing }: HeaderProps) {
  return (
    <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-900/80 backdrop-blur-sm">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {onRefresh && (
        <div className="flex items-center gap-2 md:gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              Updated {formatDateTime(lastRefresh.toISOString())}
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      )}
    </header>
  );
}
