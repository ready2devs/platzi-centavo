import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  variant?: 'neutral' | 'success' | 'danger';
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  icon: Icon,
  variant = 'neutral',
  subtitle,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          iconBg: 'bg-emerald-100 text-emerald-700',
          amountColor: 'text-emerald-700',
        };
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-700',
          amountColor: 'text-rose-700',
        };
      default:
        return {
          iconBg: 'bg-slate-100 text-slate-700',
          amountColor: 'text-slate-900',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl ${styles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className={`text-2xl font-bold tracking-tight ${styles.amountColor}`}>
          {formatCurrency(amount)}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
