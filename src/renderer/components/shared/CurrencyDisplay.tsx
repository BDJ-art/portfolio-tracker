import { formatCurrency, formatPercent } from '../../lib/formatters';

interface CurrencyDisplayProps {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  detailed?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl font-bold',
  xl: 'text-4xl font-bold',
};

export default function CurrencyDisplay({ value, size = 'md', showSign = false, detailed = false, className = '' }: CurrencyDisplayProps) {
  const color = showSign ? (value >= 0 ? 'text-positive' : 'text-negative') : 'text-slate-100';
  const prefix = showSign && value > 0 ? '+' : '';

  return (
    <span className={`${sizeClasses[size]} ${color} ${className}`}>
      {prefix}{formatCurrency(value, detailed)}
    </span>
  );
}

interface GainLossProps {
  gainLoss: number;
  gainLossPercent: number;
  className?: string;
}

export function GainLoss({ gainLoss, gainLossPercent, className = '' }: GainLossProps) {
  const color = gainLoss >= 0 ? 'text-positive' : 'text-negative';
  const arrow = gainLoss >= 0 ? '\u25B2' : '\u25BC';
  const sign = gainLoss >= 0 ? '+' : '';

  return (
    <span className={`text-sm ${color} ${className}`}>
      {arrow} {sign}{formatCurrency(gainLoss)} ({formatPercent(gainLossPercent)})
    </span>
  );
}
