import React from 'react';
import { Alert } from '../types';
import { X, CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, Cpu } from 'lucide-react';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  onAcknowledge: (id: number) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledge,
}) => {
  if (!isOpen) return null;

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const acknowledgedAlerts = alerts.filter((a) => a.status === 'ACKNOWLEDGED');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-base font-semibold text-white">System Alerts</h2>
            <span className="text-xs font-mono-num px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
              {activeAlerts.length} Active
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Active Alerts */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Active Alerts ({activeAlerts.length})
            </h3>
            {activeAlerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                No active critical or warning conditions. All systems nominal.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeAlerts.map((alert) => {
                  const isCritical = alert.severity === 'CRITICAL';
                  const isML = alert.source.startsWith('ML');

                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCritical
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {isCritical ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span className="font-semibold text-xs uppercase tracking-wider">
                            {alert.parameter.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {isML && (
                            <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <Cpu className="w-3 h-3" /> ML INFERENCE
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-mono-num font-bold px-1.5 py-0.2 rounded uppercase ${
                              isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mb-2.5">{alert.message}</p>

                      <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400 pt-2 border-t border-white/5">
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-sans text-xs transition-colors"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recently Acknowledged */}
          {acknowledgedAlerts.length > 0 && (
            <div className="pt-3 border-t border-white/5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Recently Acknowledged ({acknowledgedAlerts.length})
              </h3>
              <div className="space-y-2 opacity-60">
                {acknowledgedAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="p-2.5 rounded-lg bg-slate-950 border border-white/5 text-xs text-slate-400">
                    <div className="flex justify-between items-center text-[10px] font-mono-num text-slate-500 mb-1">
                      <span>{alert.parameter}</span>
                      <span>Ack {alert.acknowledged_at ? new Date(alert.acknowledged_at).toLocaleTimeString() : ''}</span>
                    </div>
                    <p className="text-[11px] truncate">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
