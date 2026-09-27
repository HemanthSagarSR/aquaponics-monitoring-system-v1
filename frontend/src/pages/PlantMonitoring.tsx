import React, { useState } from 'react';
import { PlantObservation, PlantCreateInput } from '../types';
import { StatCard } from '../components/StatCard';
import { TrendChart, DataPoint } from '../components/TrendChart';
import { api } from '../services/api';
import {
  Sprout,
  PlusCircle,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Filter
} from 'lucide-react';

interface PlantMonitoringProps {
  latestPlant: PlantObservation | null;
  plantHistory: PlantObservation[];
  onRefresh: () => void;
}

export const PlantMonitoring: React.FC<PlantMonitoringProps> = ({
  latestPlant,
  plantHistory,
  onRefresh,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string>('ALL');

  // Form state
  const [plantId, setPlantId] = useState('BED-A-01');
  const [speciesName, setSpeciesName] = useState('Lactuca sativa (Butterhead Lettuce)');
  const [obsDateTime, setObsDateTime] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [leafCount, setLeafCount] = useState('');
  const [canopyWidthCm, setCanopyWidthCm] = useState('');
  const [visualHealth, setVisualHealth] = useState('HEALTHY');
  const [chlorosis, setChlorosis] = useState('NONE');
  const [notes, setNotes] = useState('');
  const [observerName, setObserverName] = useState('');

  // Filter history by plant ID if chosen
  const filteredHistory = selectedPlantId === 'ALL'
    ? plantHistory
    : plantHistory.filter((p) => p.plant_id === selectedPlantId);

  // Distinct plant IDs
  const distinctPlantIds = Array.from(new Set(plantHistory.map((p) => p.plant_id)));

  // Build trend datasets
  const heightTrendData: DataPoint[] = filteredHistory.map((p) => ({
    timestamp: p.timestamp,
    value: p.height_cm,
  }));

  const leafTrendData: DataPoint[] = filteredHistory.map((p) => ({
    timestamp: p.timestamp,
    value: p.leaf_count,
  }));

  // Date-to-date comparison calculation
  const latestInFilter = filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1] : null;
  const previousInFilter = filteredHistory.length > 1 ? filteredHistory[filteredHistory.length - 2] : null;

  const heightDelta = latestInFilter && previousInFilter
    ? roundDelta(latestInFilter.height_cm - previousInFilter.height_cm)
    : null;

  const leafDelta = latestInFilter && previousInFilter
    ? latestInFilter.leaf_count - previousInFilter.leaf_count
    : null;

  function roundDelta(v: number): number {
    return Math.round(v * 10) / 10;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heightCm || !leafCount || !canopyWidthCm) {
      alert('Please fill in Height, Leaf Count, and Canopy Width.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSuccessMsg(null);

      const payload: PlantCreateInput = {
        plant_id: plantId.trim(),
        species_name: speciesName.trim(),
        timestamp: obsDateTime ? new Date(obsDateTime).toISOString() : undefined,
        height_cm: parseFloat(heightCm),
        leaf_count: parseInt(leafCount, 10),
        canopy_width_cm: parseFloat(canopyWidthCm),
        visual_health: visualHealth,
        chlorosis_observation: chlorosis,
        notes: notes ? notes.trim() : undefined,
        observer_name: observerName ? observerName.trim() : undefined,
      };

      await api.createPlantObservation(payload);
      setSuccessMsg(`Observation successfully saved for ${payload.plant_id}!`);
      
      // Reset numeric fields
      setHeightCm('');
      setLeafCount('');
      setCanopyWidthCm('');
      setNotes('');
      
      onRefresh();
    } catch (err: any) {
      console.error('Error saving plant observation:', err);
      alert(`Error saving observation: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sprout className="w-6 h-6 text-emerald-400" />
            Manual Plant Growth & Morphology Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manual physical records logged by research team. No camera or automated computer vision is used.
          </p>
        </div>

        {/* Filter by Plant ID */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Filter Plant:</span>
          <select
            value={selectedPlantId}
            onChange={(e) => setSelectedPlantId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-mono focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Plants ({plantHistory.length})</option>
            {distinctPlantIds.map((pid) => (
              <option key={pid} value={pid}>
                {pid}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Growth Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Plant Height"
          value={latestInFilter ? latestInFilter.height_cm.toFixed(1) : '--'}
          unit="cm"
          status="OPTIMAL"
          statusText={heightDelta !== null ? `${heightDelta >= 0 ? '+' : ''}${heightDelta} cm vs prev` : 'BASE'}
          trend={heightDelta !== null && heightDelta >= 0 ? 'up' : 'stable'}
          subtitle={`Plant: ${latestInFilter?.plant_id || '--'}`}
          icon={<TrendingUp className="w-4 h-4" />}
          sparklineData={heightTrendData.slice(-15).map((d) => d.value)}
        />

        <StatCard
          title="Leaf Count"
          value={latestInFilter ? `${latestInFilter.leaf_count}` : '--'}
          unit="leaves"
          status="OPTIMAL"
          statusText={leafDelta !== null ? `${leafDelta >= 0 ? '+' : ''}${leafDelta} vs prev` : 'BASE'}
          trend={leafDelta !== null && leafDelta >= 0 ? 'up' : 'stable'}
          subtitle="Count of true leaves"
          icon={<Layers className="w-4 h-4" />}
          sparklineData={leafTrendData.slice(-15).map((d) => d.value)}
        />

        <StatCard
          title="Growth Rate"
          value={latestInFilter?.growth_rate_cm_day ? latestInFilter.growth_rate_cm_day.toFixed(2) : '--'}
          unit="cm/day"
          status="OPTIMAL"
          statusText="LINEAR EXPANSION"
          trend="up"
          subtitle="Height delta / days elapsed"
          icon={<Sparkles className="w-4 h-4" />}
        />

        <StatCard
          title="Visual Health Rating"
          value={latestInFilter?.visual_health || 'HEALTHY'}
          status={latestInFilter?.visual_health === 'HEALTHY' || latestInFilter?.visual_health === 'VIGOROUS' ? 'OPTIMAL' : 'WARNING'}
          statusText={latestInFilter?.chlorosis_observation === 'NONE' ? 'NO CHLOROSIS' : `CHLOROSIS: ${latestInFilter?.chlorosis_observation}`}
          subtitle={`Observer: ${latestInFilter?.observer_name || 'Team'}`}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      {/* Main Grid: Data Entry Form & Historical Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Manual Data-Entry Form (1 column on desktop) */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Record Manual Observation
            </h2>
          </div>

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            
            {/* Plant ID */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Plant ID *</label>
              <input
                type="text"
                required
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                placeholder="e.g. BED-A-01"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            {/* Species / Name */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Species / Botanical Name *</label>
              <input
                type="text"
                required
                value={speciesName}
                onChange={(e) => setSpeciesName(e.target.value)}
                placeholder="e.g. Lactuca sativa (Butterhead Lettuce)"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Observation Date / Time */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Date & Time (optional, defaults to now)</label>
              <input
                type="datetime-local"
                value={obsDateTime}
                onChange={(e) => setObsDateTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500 font-mono text-xs"
              />
            </div>

            {/* Physical Measurements Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Height (cm) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="8.5"
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Leaf Count *</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={leafCount}
                  onChange={(e) => setLeafCount(e.target.value)}
                  placeholder="6"
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Canopy (cm) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={canopyWidthCm}
                  onChange={(e) => setCanopyWidthCm(e.target.value)}
                  placeholder="10.0"
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Visual Health & Chlorosis Dropdowns */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Visual Health</label>
                <select
                  value={visualHealth}
                  onChange={(e) => setVisualHealth(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="HEALTHY">HEALTHY</option>
                  <option value="VIGOROUS">VIGOROUS</option>
                  <option value="STUNTED">STUNTED</option>
                  <option value="WILTING">WILTING</option>
                  <option value="PEST_DAMAGE">PEST DAMAGE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Yellowing / Chlorosis</label>
                <select
                  value={chlorosis}
                  onChange={(e) => setChlorosis(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="NONE">NONE</option>
                  <option value="MILD">MILD</option>
                  <option value="MODERATE">MODERATE</option>
                  <option value="SEVERE">SEVERE</option>
                </select>
              </div>
            </div>

            {/* Observer Name */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Observer Name</label>
              <input
                type="text"
                value={observerName}
                onChange={(e) => setObserverName(e.target.value)}
                placeholder="e.g. Student Research Team"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Observation Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Root elongation notes, leaf color, transplant notes..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Manual Record'}</span>
            </button>
          </form>
        </div>

        {/* Charts & Date-to-Date Comparison Tables (2 columns on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Height and Leaf Trends Charts */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Plant Height & Foliage Growth Trend
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {filteredHistory.length} Recorded Entries
              </span>
            </div>

            <div className="h-64 w-full">
              <TrendChart
                title="Measured Height (cm)"
                data={heightTrendData}
                unit="cm"
                color="#10b981"
                min={0}
                max={30}
              />
            </div>
          </div>

          {/* Date-to-Date Comparison Table */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                  Date-to-Date Observation Log
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Recent observations
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2 px-2">Date / Time</th>
                    <th className="py-2 px-2">Plant ID</th>
                    <th className="py-2 px-2">Height</th>
                    <th className="py-2 px-2">Leaves</th>
                    <th className="py-2 px-2">Growth Rate</th>
                    <th className="py-2 px-2">Health</th>
                    <th className="py-2 px-2">Chlorosis</th>
                    <th className="py-2 px-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                  {filteredHistory.slice(-8).reverse().map((obs) => (
                    <tr key={obs.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-2 text-slate-400 whitespace-nowrap">
                        {new Date(obs.timestamp).toLocaleDateString()} {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-2 text-teal-300 font-bold whitespace-nowrap">
                        {obs.plant_id}
                      </td>
                      <td className="py-2.5 px-2 text-emerald-400 whitespace-nowrap">
                        {obs.height_cm.toFixed(1)} cm
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {obs.leaf_count}
                      </td>
                      <td className="py-2.5 px-2 text-teal-400 whitespace-nowrap">
                        {obs.growth_rate_cm_day ? `+${obs.growth_rate_cm_day} cm/d` : '--'}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          obs.visual_health === 'HEALTHY' || obs.visual_health === 'VIGOROUS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {obs.visual_health}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          obs.chlorosis_observation === 'NONE'
                            ? 'text-slate-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {obs.chlorosis_observation}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-400 max-w-xs truncate font-sans text-xs">
                        {obs.notes || '--'}
                      </td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500 font-sans">
                        No manual observations logged yet. Fill out the form on the left to add a record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
