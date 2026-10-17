import React from 'react';
import { getStatusBadgeVariant } from '../lib/status';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'rose' | 'amber' | 'none';
}> = ({ children, className = '', glow = 'none' }) => {
  const glowClass =
    glow === 'cyan'
      ? 'border-cyan-500/40 glow-cyan'
      : glow === 'rose'
      ? 'border-rose-500/50 glow-rose'
      : 'border-slate-800';

  return (
    <div
      className={`rounded-xl bg-slate-900/90 border backdrop-blur-md transition-all duration-200 ${glowClass} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-slate-800/80 flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <h3 className={`text-sm font-semibold tracking-wide uppercase text-slate-200 flex items-center gap-2 ${className}`}>
    {children}
  </h3>
);

export const CardDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <p className={`text-xs text-slate-400 mt-0.5 ${className}`}>{children}</p>
);

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

export const Badge: React.FC<{
  status?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}> = ({ status, children, className = '', variant }) => {
  let style = status ? getStatusBadgeVariant(status) : null;
  if (!style) {
    if (variant === 'success') style = getStatusBadgeVariant('HEALTHY');
    else if (variant === 'warning') style = getStatusBadgeVariant('WARNING');
    else if (variant === 'danger') style = getStatusBadgeVariant('CRITICAL');
    else style = getStatusBadgeVariant('DEFAULT');
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {children}
    </span>
  );
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
  }
> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantClasses = {
    primary:
      'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold focus:ring-cyan-500 shadow-md shadow-cyan-500/20',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium border border-slate-700',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white font-semibold focus:ring-rose-500 shadow-md shadow-rose-600/20',
    ghost: 'hover:bg-slate-800 text-slate-300 hover:text-white',
    outline:
      'border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white bg-transparent',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
};

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'cyan' | 'emerald' | 'amber' | 'rose';
}> = ({ label, value, subValue, icon, trend, color = 'cyan' }) => {
  const colorMap = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  };

  return (
    <Card className="hover:border-slate-700 transition-colors">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-xl font-bold font-mono mt-1 ${colorMap[color]}`}>{value}</p>
          {subValue && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
              {trend === 'up' && <span className="text-emerald-400">↑</span>}
              {trend === 'down' && <span className="text-rose-400">↓</span>}
              {subValue}
            </p>
          )}
        </div>
        {icon && <div className="p-2.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60">{icon}</div>}
      </CardContent>
    </Card>
  );
};

export const SkeletonLoader: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-3 animate-pulse ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-4 bg-slate-800 rounded"
        style={{ width: `${100 - (i % 3) * 15}%` }}
      />
    ))}
  </div>
);

export const ErrorMessage: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-4 text-rose-300 flex items-start justify-between gap-3 my-4">
    <div className="flex items-center gap-2">
      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 text-rose-300 border-rose-500/40 hover:bg-rose-500/20">
        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
      </Button>
    )}
  </div>
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
