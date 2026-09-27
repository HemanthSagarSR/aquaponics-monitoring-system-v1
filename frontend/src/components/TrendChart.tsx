import React, { useState } from 'react';

export interface DataPoint {
  timestamp: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: DataPoint[];
  unit: string;
  color?: string;
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  targetMin?: number;
  targetMax?: number;
  min?: number;
  max?: number;
  optimalMin?: number;
  optimalMax?: number;
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  data,
  unit,
  color = '#06b6d4',
  selectedRange,
  onRangeChange,
  targetMin,
  targetMax,
  min,
  max,
  optimalMin,
  optimalMax,
  height = 240,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const ranges = ['1h', '6h', '24h', '7d'];

  if (!data || data.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs font-mono" style={{ height }}>
        No historical telemetry data available for the selected interval.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  const effTargetMin = targetMin ?? optimalMin ?? min;
  const effTargetMax = targetMax ?? optimalMax ?? max;

  if (effTargetMin !== undefined) minVal = Math.min(minVal, effTargetMin);
  if (effTargetMax !== undefined) maxVal = Math.max(maxVal, effTargetMax);

  // Add 10% padding
  const padding = (maxVal - minVal) * 0.1 || 1.0;
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin || 1;

  const chartWidth = 700;
  const chartHeight = height - 60;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  const plotW = chartWidth - paddingLeft - paddingRight;
  const plotH = chartHeight - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(1, data.length - 1)) * plotW;
    const y = paddingTop + plotH - ((d.value - yMin) / yRange) * plotH;
    return { x, y, ...d };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `M ${points[0].x},${paddingTop + plotH} ` +
    points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1].x},${paddingTop + plotH} Z`;

  const getYCoordinate = (val: number) => paddingTop + plotH - ((val - yMin) / yRange) * plotH;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
      {/* Header with Title and Range Selector if provided */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
          <span className="text-xs text-slate-400 font-mono">({unit})</span>
        </div>

        {/* Range Buttons if onRangeChange is provided */}
        {selectedRange && onRangeChange && (
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-white/5 text-[11px] font-mono">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => onRangeChange(r)}
                className={`px-2.5 py-1 rounded-md transition-colors uppercase font-medium ${
                  selectedRange === r
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SVG Canvas Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`grad-${title.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and horizontal Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
            const yPos = paddingTop + plotH * (1 - frac);
            const val = yMin + yRange * frac;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={chartWidth - paddingRight}
                  y2={yPos}
                  stroke="#334155"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[9px]"
                >
                  {val.toFixed(val < 10 ? 1 : 0)}
                </text>
              </g>
            );
          })}

          {/* Optimal Target Band (if targetMin and targetMax provided) */}
          {effTargetMin !== undefined && effTargetMax !== undefined && (
            <rect
              x={paddingLeft}
              y={Math.min(getYCoordinate(effTargetMin), getYCoordinate(effTargetMax))}
              width={plotW}
              height={Math.abs(getYCoordinate(effTargetMax) - getYCoordinate(effTargetMin))}
              fill="#10b981"
              fillOpacity="0.06"
              stroke="#10b981"
              strokeOpacity="0.18"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {/* Gradient Area Fill under curve */}
          <path d={areaPath} fill={`url(#grad-${title.replace(/[^a-zA-Z0-9]/g, '')})`} />

          {/* Primary Trend Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylineStr}
          />

          {/* Interactive Mouse Hover Overlay */}
          {points.map((p, idx) => (
            <rect
              key={idx}
              x={p.x - plotW / (points.length * 2)}
              y={paddingTop}
              width={plotW / Math.max(1, points.length)}
              height={plotH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIndex(idx)}
            />
          ))}

          {/* Hover Indicator Crosshair */}
          {hoverIndex !== null && points[hoverIndex] && (
            <g>
              <line
                x1={points[hoverIndex].x}
                y1={paddingTop}
                x2={points[hoverIndex].x}
                y2={paddingTop + plotH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={points[hoverIndex].x}
                cy={points[hoverIndex].y}
                r="4.5"
                fill={color}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-Axis timestamps (start and end) */}
          <text
            x={paddingLeft}
            y={chartHeight - 6}
            textAnchor="start"
            className="fill-slate-500 font-mono text-[9px]"
          >
            {new Date(data[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
          <text
            x={chartWidth - paddingRight}
            y={chartHeight - 6}
            textAnchor="end"
            className="fill-slate-500 font-mono text-[9px]"
          >
            {new Date(data[data.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </text>
        </svg>

        {/* Hover Tooltip Box */}
        {hoverIndex !== null && points[hoverIndex] && (
          <div
            className="absolute top-2 right-2 pointer-events-none p-2 rounded-lg bg-slate-950/90 border border-slate-700/80 shadow-lg text-[11px] font-mono"
          >
            <div className="text-slate-400">
              {new Date(points[hoverIndex].timestamp).toLocaleTimeString()}
            </div>
            <div className="font-bold text-white text-xs" style={{ color }}>
              {points[hoverIndex].value.toFixed(2)} {unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
