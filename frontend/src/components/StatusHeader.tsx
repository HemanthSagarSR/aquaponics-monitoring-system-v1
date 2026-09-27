import React from 'react';
import { SystemStatus } from '../types';
import { Clock, CheckCircle2, AlertTriangle, XCircle, Wifi } from 'lucide-react';

interface StatusHeaderProps {
  status: SystemStatus | null;
  lastUpdatedSecondsAgo: number | null;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  status,
  lastUpdatedSecondsAgo,
}) => {
  if (!status) return null;

  const components = [
    { key: 'esp32', label: 'ESP32 IoT Node', state: status.components?.esp32?.status || 'ONLINE' },
    { key: 'backend_server', label: 'FastAPI Host Server', state: status.components?.backend_server?.status || 'ONLINE' },
    { key: 'database', label: 'SQLite DB', state: status.components?.database?.status || 'ONLINE' },
    { key: 'ml_engine', label: 'ML Baseline Engine', state: status.components?.ml_engine?.status || 'ONLINE' },
  ];

  const getStatusDot = (st: string) => {
    if (st.includes('ONLINE') || st.includes('Connected') || st.includes('Running')) {
      return 'bg-emerald-400';
    }
    if (st.includes('WARNING') || st.includes('DEGRADED') || st.includes('DEMO')) {
      return 'bg-amber-400';
    }
    return 'bg-rose-500';
  };

  const getOverallBadge = () => {
    switch (status.overall_status) {
      case 'CRITICAL':
        return {
          label: 'SYSTEM CRITICAL',
          classes: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          icon: <XCircle className="w-3.5 h-3.5" />,
        };
      case 'WARNING':
        return {
          label: 'SYSTEM WARNING',
          classes: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      default:
        return {
          label: 'SYSTEM NORMAL',
          classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
    }
  };

  const overall = getOverallBadge();

  return (
    <div className="w-full bg-slate-900/50 border-b border-white/5 py-2 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Component Health Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono-num font-semibold ${overall.classes}`}>
            {overall.icon}
            <span>{overall.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            {components.map((comp) => (
              <div key={comp.key} className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${getStatusDot(comp.state)}`} />
                <span className="text-slate-400 font-medium">{comp.label}</span>
                <span className="text-slate-500 text-[10px] font-mono">({comp.state})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Heartbeat Latency Display */}
        <div className="flex items-center gap-2 font-mono-num text-[11px] text-slate-400 ml-auto">
          <Clock className="w-3.5 h-3.5 text-teal-400" />
          <span>Last ESP32 telemetry:</span>
          <span className="text-slate-200 font-semibold">
            {lastUpdatedSecondsAgo !== null ? `${lastUpdatedSecondsAgo}s ago` : 'Waiting...'}
          </span>
        </div>

      </div>
    </div>
  );
};
