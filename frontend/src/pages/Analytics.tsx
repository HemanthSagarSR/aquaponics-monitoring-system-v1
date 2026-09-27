import React, { useState, useEffect } from 'react';
import { AnalyticsData, CorrelationItem } from '../types';
import { api } from '../services/api';
import {
  BarChart2,
  Download,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Info
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);
  const [selectedPair, setSelectedPair] = useState<string>('water_temp_vs_plant_growth');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalytics(days);
      setData(res);
      // If current selectedPair not present, switch to first key
      if (res.correlations && !res.correlations[selectedPair]) {
        const firstKey = Object.keys(res.correlations)[0];
        if (firstKey) setSelectedPair(firstKey);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  // Export raw research data as CSV
  const handleExportCSV = () => {
    if (!data) return;
    const currentCorr = data.correlations[selectedPair];
    if (!currentCorr || !currentCorr.scatter_data) return;

    let csvContent = `timestamp,${currentCorr.x_label.replace(/,/g, '')},${currentCorr.y_label.replace(/,/g, '')}\n`;
    currentCorr.scatter_data.forEach((pt) => {
      csvContent += `${pt.timestamp},${pt.x},${pt.y}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aquaponics_${selectedPair}_${days}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentPairData: CorrelationItem | undefined = data?.correlations[selectedPair];

  // SVG Scatter plot generator with regression line
  const renderScatterPlot = (item: CorrelationItem) => {
    const points = item.scatter_data;
    if (!points || points.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-mono">
          Insufficient data points matched within the selected {days}-day analysis window.
        </div>
      );
    }

    const xVals = points.map((p) => p.x);
    const yVals = points.map((p) => p.y);

    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);

    const padX = (maxX - minX) * 0.1 || 1;
    const padY = (maxY - minY) * 0.1 || 1;

    const domainX = [minX - padX, maxX + padX];
    const domainY = [Math.max(0, minY - padY), maxY + padY];

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const scaleX = (val: number) =>
      margin.left + ((val - domainX[0]) / (domainX[1] - domainX[0])) * innerW;
    const scaleY = (val: number) =>
      margin.top + innerH - ((val - domainY[0]) / (domainY[1] - domainY[0])) * innerH;

    // Linear regression fit line (y = mx + b)
    const n = points.length;
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);

    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;

    const regX1 = domainX[0];
    const regY1 = slope * regX1 + intercept;
    const regX2 = domainX[1];
    const regY2 = slope * regX2 + intercept;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-mono text-[10px]">
        {/* Grid lines */}
        <line
          x1={margin.left}
          y1={margin.top + innerH}
          x2={margin.left + innerW}
          y2={margin.top + innerH}
          stroke="#334155"
          strokeWidth="1"
        />
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + innerH}
          stroke="#334155"
          strokeWidth="1"
        />

        {/* Regression Fit Line */}
        {points.length > 2 && (
          <line
            x1={scaleX(regX1)}
            y1={scaleY(regY1)}
            x2={scaleX(regX2)}
            y2={scaleY(regY2)}
            stroke="#0d9488"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Data points */}
        {points.map((pt, i) => (
          <g key={i} className="group">
            <circle
              cx={scaleX(pt.x)}
              cy={scaleY(pt.y)}
              r="4.5"
              fill="#14b8a6"
              fillOpacity="0.75"
              stroke="#0f766e"
              strokeWidth="1.5"
              className="hover:r-6 hover:fill-teal-300 transition-all cursor-pointer"
            >
              <title>{`X: ${pt.x}, Y: ${pt.y} (${pt.plant_id || ''} at ${pt.timestamp})`}</title>
            </circle>
          </g>
        ))}

        {/* Axis Labels */}
        <text
          x={margin.left + innerW / 2}
          y={height - 8}
          textAnchor="middle"
          fill="#94a3b8"
          className="font-sans font-semibold text-[11px]"
        >
          {item.x_label}
        </text>

        <text
          x={-height / 2}
          y={15}
          transform="rotate(-90)"
          textAnchor="middle"
          fill="#94a3b8"
          className="font-sans font-semibold text-[11px]"
        >
          {item.y_label}
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-teal-400" />
            Cross-Domain Telemetry & Growth Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Statistical correlations between physical water chemistry and manual plant growth rates.
          </p>
        </div>

        {/* Controls: Time window & Export */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg font-mono font-medium transition-all ${
                  days === d
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scientific Integrity Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block mb-0.5">Scientific Caveat:</strong>
          {data?.scientific_disclaimer ||
            'Observed statistical correlations reflect co-variance under current environmental controls and do not inherently prove biological causation.'}
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left: Correlation Pair Selectors (1 col) */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Analyzed Relationships
          </h2>

          {data?.correlations &&
            Object.entries(data.correlations).map(([key, item]) => {
              const active = selectedPair === key;
              const r = item.correlation.r;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPair(key)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    active
                      ? 'bg-teal-500/15 border-teal-500/40 text-white shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate pr-2">{item.title}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        Math.abs(r) > 0.6
                          ? 'bg-teal-500/20 text-teal-300'
                          : Math.abs(r) > 0.3
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      r = {r > 0 ? `+${r}` : r}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    p = {item.correlation.p_value} (n = {item.correlation.sample_count})
                  </div>
                </button>
              );
            })}
        </div>

        {/* Right: Scatter Plot & Statistics Inspector (3 cols) */}
        <div className="lg:col-span-3 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          {currentPairData ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{currentPairData.title}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Linear Pearson Correlation Analysis (n = {currentPairData.correlation.sample_count} sample points)
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/5">
                    <span className="text-slate-400 mr-1.5">Pearson r:</span>
                    <strong className="text-teal-300">{currentPairData.correlation.r}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/5">
                    <span className="text-slate-400 mr-1.5">p-value:</span>
                    <strong className="text-slate-200">{currentPairData.correlation.p_value}</strong>
                  </div>
                </div>
              </div>

              {/* Scatter Plot */}
              <div className="h-80 w-full pt-2">
                {renderScatterPlot(currentPairData)}
              </div>

              {/* Statistical interpretation footer */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 flex items-center justify-between">
                <span>
                  Strength:{' '}
                  <strong className="text-slate-200">
                    {Math.abs(currentPairData.correlation.r) > 0.7
                      ? 'Strong Correlation'
                      : Math.abs(currentPairData.correlation.r) > 0.4
                      ? 'Moderate Correlation'
                      : 'Weak / Inconclusive'}
                  </strong>
                </span>
                <span>
                  Significance:{' '}
                  <strong className="text-slate-200">
                    {currentPairData.correlation.p_value < 0.05
                      ? 'Statistically Significant (p < 0.05)'
                      : 'Not Statistically Significant (p ≥ 0.05)'}
                  </strong>
                </span>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500 font-mono">
              Loading analytics datasets...
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
