import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'SAFE' | 'ALERT' | string;
  statusText?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  sparklineData?: number[];
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  status = 'OPTIMAL',
  statusText,
  trend,
  trendValue,
  icon,
  subtitle,
  sparklineData,
  onClick,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'CRITICAL':
      case 'ALERT':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'WARNING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'OPTIMAL':
      case 'SAFE':
      case 'HEALTHY':
      case 'NORMAL':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-teal-400 bg-teal-500/10 border-teal-500/30';
    }
  };

  // Render SVG mini sparkline if data is provided
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 100;
    const height = 28;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg className="w-24 h-7 stroke-teal-400/80 fill-none" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`scientific-card p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group ${
        onClick ? 'cursor-pointer hover:border-teal-500/40' : ''
      }`}
    >
      {/* Top Header: Title, Icon & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400 group-hover:text-teal-400 transition-colors">{icon}</span>}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        </div>

        <span
          className={`text-[10px] font-mono-num font-semibold px-2 py-0.5 rounded-full border ${getStatusColor()}`}
        >
          {statusText || status}
        </span>
      </div>

      {/* Center Value and Unit */}
      <div className="flex items-baseline gap-1.5 my-2">
        <span className="text-3xl sm:text-4xl font-bold font-mono-num tracking-tight text-white">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
      </div>

      {/* Bottom Subtitle / Trend / Sparkline */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
          {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />}
          {trend === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
          {trendValue && <span className="font-mono-num font-medium text-slate-300">{trendValue}</span>}
          {subtitle && <span>{subtitle}</span>}
        </div>

        {sparklineData && renderSparkline()}
      </div>
    </div>
  );
};
