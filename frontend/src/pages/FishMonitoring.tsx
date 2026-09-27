import React, { useState } from 'react';
import { FishObservation, FishCreateInput } from '../types';
import { api } from '../services/api';
import {
  Fish,
  PlusCircle,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

interface FishMonitoringProps {
  latestFish: FishObservation | null;
  fishHistory: FishObservation[];
  onRefresh: () => void;
}

export const FishMonitoring: React.FC<FishMonitoringProps> = ({
  latestFish,
  fishHistory,
  onRefresh,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [fishCount, setFishCount] = useState('24');
  const [feedingResponse, setFeedingResponse] = useState('NORMAL');
  const [mortalityCount, setMortalityCount] = useState('0');
  const [behaviourNotes, setBehaviourNotes] = useState('');
  const [observerName, setObserverName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setSuccessMsg(null);

      const payload: FishCreateInput = {
        fish_count: parseInt(fishCount, 10) || 0,
        feeding_response: feedingResponse,
        mortality_count: parseInt(mortalityCount, 10) || 0,
        behaviour_notes: behaviourNotes ? behaviourNotes.trim() : undefined,
        observer_name: observerName ? observerName.trim() : undefined,
      };

      await api.createFishObservation(payload);
      setSuccessMsg('Manual fish observation recorded successfully!');
      setBehaviourNotes('');
      onRefresh();
    } catch (err: any) {
      console.error('Error logging fish observation:', err);
      alert(`Error logging observation: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Fish className="w-6 h-6 text-teal-400" />
          Fish Tank Health & Feeding Observations (Manual)
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Optional research log for student team to track population, feeding vigor, and tank behavior without cameras.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Estimated Population</span>
          <span className="text-2xl font-bold font-mono text-teal-400">
            {latestFish ? latestFish.fish_count : '--'}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Tank stock count</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Latest Feed Response</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {latestFish ? latestFish.feeding_response : 'NORMAL'}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Surface appetite</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Recorded Mortalities</span>
          <span className="text-2xl font-bold font-mono text-slate-200">
            {latestFish ? latestFish.mortality_count : 0}
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Recent check</span>
        </div>
      </div>

      {/* Grid: Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Manual Observation Form */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <PlusCircle className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Log Tank Observation
            </h2>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Estimated Fish Count</label>
              <input
                type="number"
                required
                value={fishCount}
                onChange={(e) => setFishCount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Feeding Response</label>
              <select
                value={feedingResponse}
                onChange={(e) => setFeedingResponse(e.target.value)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              >
                <option value="AGGRESSIVE">AGGRESSIVE (Instant surface strike)</option>
                <option value="NORMAL">NORMAL (Steady feeding)</option>
                <option value="SLOW">SLOW (Hesitant / bottom settling)</option>
                <option value="NONE">NONE (Feed refusal / lethargy)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Mortality Count</label>
              <input
                type="number"
                min="0"
                value={mortalityCount}
                onChange={(e) => setMortalityCount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Observer Name</label>
              <input
                type="text"
                value={observerName}
                onChange={(e) => setObserverName(e.target.value)}
                placeholder="e.g. Research Student"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Behavioral Notes</label>
              <textarea
                rows={3}
                value={behaviourNotes}
                onChange={(e) => setBehaviourNotes(e.target.value)}
                placeholder="Water column distribution, piping at surface, swimming vigor..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Log Observation'}</span>
            </button>
          </form>
        </div>

        {/* Observation Log Table */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Observation History
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">{fishHistory.length} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-2 px-2">Date / Time</th>
                  <th className="py-2 px-2">Count</th>
                  <th className="py-2 px-2">Feed Response</th>
                  <th className="py-2 px-2">Mortality</th>
                  <th className="py-2 px-2">Observer</th>
                  <th className="py-2 px-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                {fishHistory.slice(-10).reverse().map((f) => (
                  <tr key={f.id} className="hover:bg-white/5">
                    <td className="py-2.5 px-2 text-slate-400 whitespace-nowrap">
                      {new Date(f.timestamp).toLocaleDateString()} {new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-2 text-teal-300 font-bold">
                      {f.fish_count}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        f.feeding_response === 'AGGRESSIVE' || f.feeding_response === 'NORMAL'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {f.feeding_response}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-200">
                      {f.mortality_count}
                    </td>
                    <td className="py-2.5 px-2 text-slate-400 font-sans">
                      {f.observer_name || '--'}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300 max-w-xs truncate font-sans text-xs">
                      {f.behaviour_notes || '--'}
                    </td>
                  </tr>
                ))}
                {fishHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      No manual fish observations recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
