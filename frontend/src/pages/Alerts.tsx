import React, { useState } from 'react';
import { Alert } from '../types';
import { api } from '../services/api';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ShieldCheck,
  CheckCheck,
  Filter
} from 'lucide-react';

interface AlertsPageProps {
  alerts: Alert[];
  onRefresh: () => void;
  onAcknowledge: (id: number) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  onRefresh,
  onAcknowledge,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    return true;
  });

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      onRefresh();
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      setIsBulkProcessing(true);
      await api.acknowledgeAllAlerts();
      onRefresh();
    } catch (err) {
      console.error('Error acknowledging all alerts:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'ACKNOWLEDGED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-teal-400" />
            System Alerts & Threshold Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time rule-based threshold breaches, P31 float switch triggers, and ML baseline anomaly detections.
          </p>
        </div>

        {activeCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            disabled={isBulkProcessing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-all self-start sm:self-auto disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4 text-teal-400" />
            <span>Acknowledge All ({activeCount})</span>
          </button>
        )}
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Critical Active</span>
            <div className="text-xl font-bold font-mono text-rose-400">{criticalCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Total Active</span>
            <div className="text-xl font-bold font-mono text-amber-400">{activeCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400">Total Recorded</span>
            <div className="text-xl font-bold font-mono text-slate-200">{alerts.length}</div>
          </div>
        </div>
      </div>

      {/* Filters and Alert Feed */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Status:
            </span>
            {(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
                  statusFilter === st
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium mr-1">Severity:</span>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all ${
                  severityFilter === sev
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Alert List */}
        <div className="divide-y divide-white/5">
          {filteredAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No alerts match the selected filters.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase border ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase border ${getStatusBadge(alert.status)}`}>
                      {alert.status}
                    </span>
                    <span className="text-slate-500 font-mono">Source: {alert.source}</span>
                    <span className="text-slate-400 font-mono">{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium">
                    {alert.message}
                  </p>

                  {alert.value && (
                    <div className="text-[11px] text-teal-400 font-mono">
                      Trigger Value: {alert.value}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {alert.status === 'ACTIVE' && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
};
