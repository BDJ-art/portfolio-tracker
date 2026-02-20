import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, title, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-surface-alt rounded-xl border border-slate-700/50 p-5 ${onClick ? 'cursor-pointer hover:border-slate-600 transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {title && <h3 className="text-sm font-medium text-slate-400 mb-3">{title}</h3>}
      {children}
    </div>
  );
}
