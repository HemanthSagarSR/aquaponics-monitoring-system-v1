import React, { useState } from 'react';
import { SensorReading } from '../types';
import { StatCard } from '../components/StatCard';
import { TrendChart, DataPoint } from '../components/TrendChart';
import {
  Droplets,
  Thermometer,
  Layers,
  ShieldCheck,
  Wind,
  Cpu,
  AlertTriangle,
  Info
} from 'lucide-react';

interface WaterMonitoringProps {
  latestSensor: SensorReading | null;
  sensorHistory: SensorReading[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
}

export const WaterMonitoring: React.FC<WaterMonitoringProps> = ({
  latestSensor,
  sensorHistory,
  selectedRange,
  onRangeChange,
}) => {
  const [activeMetric, setActiveMetric] = useState<'temp' | 'ph' | 'level' | 'air' | 'hum'>('ph');

  // Chart datasets
  const tempChartData: DataPoint[] = sensorHistory.map((r) => ({
    timestamp: r.timestamp,
    value: r.water_temperature,
  }));

  const phChartData: DataPoint[] = sensorHistory.map((r) => ({
    timestamp: r.timestamp,
    value: r.ph,
  }));

  const levelChartData: DataPoint[] = sensorHistory.map((r) => ({
    timestamp: r.timestamp,
    value: r.water_level,
  }));

  const airChartData: DataPoint[] = sensorHistory.map((r) => ({
    timestamp: r.timestamp,
    value: r.air_temperature,
  }));

  const humChartData: DataPoint[] = sensorHistory.map((r) => ({
    timestamp: r.timestamp,
    value: r.humidity,
  }));

  const ranges = [
    { id: '1h', label: '1 Hour' },
    { id: '6h', label: '6 Hours' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
  ];

  const getActiveChart = () => {
    switch (activeMetric) {
      case 'temp':
        return {
          title: 'Water Temperature Trend (°C)',
          unit: '°C',
          color: '#06b6d4',
          data: tempChartData,
          min: 16.0,
          max: 34.0,
          optimalMin: 22.0,
          optimalMax: 27.0,
        };
      case 'ph':
        return {
          title: 'pH Value Trend (Calibrated)',
          unit: 'pH',
          color: '#14b8a6',
          data: phChartData,
          min: 5.5,
          max: 8.5,
          optimalMin: 6.6,
          optimalMax: 7.4,
        };
      case 'level':
        return {
          title: 'Sump Basin Water Level (%)',
          unit: '%',
          color: '#3b82f6',
          data: levelChartData,
          min: 0,
          max: 100,
          optimalMin: 60,
          optimalMax: 90,
        };
      case 'air':
        return {
          title: 'Ambient Air Temperature (°C)',
          unit: '°C',
          color: '#f59e0b',
          data: airChartData,
          min: 15,
          max: 40,
          optimalMin: 20,
          optimalMax: 28,
        };
      case 'hum':
        return {
          title: 'Relative Humidity (% RH)',
          unit: '%',
          color: '#8b5cf6',
          data: humChartData,
          min: 20,
          max: 100,
          optimalMin: 50,
          optimalMax: 75,
        };
    }
  };

  const chartConfig = getActiveChart();

  return (
    <div className="space-y-6">
      
      {/* Header and Time-Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Droplets className="w-6 h-6 text-teal-400" />
            Water Quality & Environmental Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time physical telemetry acquired by ESP32 micro-controller over local Wi-Fi.
          </p>
        </div>

        {/* Time-Range Selector Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => onRangeChange(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
                selectedRange === r.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Sensor Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Water Temperature (DS18B20) */}
        <StatCard
          title="Water Temperature (DS18B20)"
          value={latestSensor ? latestSensor.water_temperature.toFixed(1) : '--'}
          unit="°C"
          status={
            !latestSensor
              ? 'OPTIMAL'
              : latestSensor.water_temperature < 21 || latestSensor.water_temperature > 28
              ? 'WARNING'
              : 'OPTIMAL'
          }
          statusText={
            !latestSensor
              ? 'NOMINAL'
              : latestSensor.water_temperature < 18 || latestSensor.water_temperature > 32
              ? 'CRITICAL LIMIT'
              : latestSensor.water_temperature < 21 || latestSensor.water_temperature > 28
              ? 'SUB-OPTIMAL'
              : 'OPTIMAL'
          }
          trend="stable"
          subtitle="GPIO 4 (OneWire) | Optimal: 22 - 27°C"
          icon={<Thermometer className="w-4 h-4" />}
          sparklineData={tempChartData.slice(-15).map((d) => d.value)}
          onClick={() => setActiveMetric('temp')}
        />

        {/* pH Sensor (GPIO 34 ADC) */}
        <StatCard
          title="pH Probe (GPIO 34 ADC)"
          value={latestSensor ? latestSensor.ph.toFixed(2) : '--'}
          unit="pH"
          status={
            !latestSensor
              ? 'OPTIMAL'
              : latestSensor.ph < 6.4 || latestSensor.ph > 7.6
              ? 'WARNING'
              : 'OPTIMAL'
          }
          statusText={
            !latestSensor
              ? 'NOMINAL'
              : latestSensor.ph < 5.8 || latestSensor.ph > 8.2
              ? 'CRITICAL IMBALANCE'
              : latestSensor.ph < 6.4 || latestSensor.ph > 7.6
              ? 'DRIFTING'
              : 'BALANCED'
          }
          trend="stable"
          subtitle={
            latestSensor?.ph_raw_voltage !== null && latestSensor?.ph_raw_voltage !== undefined
              ? `Voltage: ${latestSensor.ph_raw_voltage.toFixed(2)}V | Target: 6.6 - 7.4`
              : 'Optimal: 6.6 - 7.4'
          }
          icon={<Droplets className="w-4 h-4" />}
          sparklineData={phChartData.slice(-15).map((d) => d.value)}
          onClick={() => setActiveMetric('ph')}
        />

        {/* Water Level (GPIO 35 ADC) */}
        <StatCard
          title="Water Level Sensor (GPIO 35)"
          value={latestSensor ? latestSensor.water_level.toFixed(0) : '--'}
          unit="%"
          status={
            !latestSensor
              ? 'OPTIMAL'
              : latestSensor.water_level < 40 || latestSensor.water_level > 90
              ? 'WARNING'
              : 'OPTIMAL'
          }
          statusText={
            !latestSensor
              ? 'NOMINAL'
              : latestSensor.water_level < 25
              ? 'CRITICALLY LOW'
              : latestSensor.water_level < 40
              ? 'LOW'
              : latestSensor.water_level > 95
              ? 'OVERFLOW'
              : 'NORMAL'
          }
          trend="stable"
          subtitle={
            latestSensor?.water_level_raw !== null && latestSensor?.water_level_raw !== undefined
              ? `Raw ADC: ${latestSensor.water_level_raw} (Target: 70-90%)`
              : 'Target: 70 - 90%'
          }
          icon={<Layers className="w-4 h-4" />}
          sparklineData={levelChartData.slice(-15).map((d) => d.value)}
          onClick={() => setActiveMetric('level')}
        />

        {/* Ambient Air Temp (DHT11 - GPIO 15) */}
        <StatCard
          title="Air Temperature (DHT11)"
          value={latestSensor ? latestSensor.air_temperature.toFixed(1) : '--'}
          unit="°C"
          status={!latestSensor ? 'OPTIMAL' : latestSensor.air_temperature > 35 ? 'WARNING' : 'OPTIMAL'}
          statusText={!latestSensor ? 'NOMINAL' : latestSensor.air_temperature > 35 ? 'HIGH' : 'NORMAL'}
          trend="stable"
          subtitle="GPIO 15 | Ambient Greenhouse"
          icon={<Wind className="w-4 h-4" />}
          sparklineData={airChartData.slice(-15).map((d) => d.value)}
          onClick={() => setActiveMetric('air')}
        />

        {/* Ambient Humidity (DHT11 - GPIO 15) */}
        <StatCard
          title="Relative Humidity (DHT11)"
          value={latestSensor ? latestSensor.humidity.toFixed(0) : '--'}
          unit="%"
          status={
            !latestSensor
              ? 'OPTIMAL'
              : latestSensor.humidity < 35 || latestSensor.humidity > 85
              ? 'WARNING'
              : 'OPTIMAL'
          }
          statusText={
            !latestSensor
              ? 'NOMINAL'
              : latestSensor.humidity < 35
              ? 'LOW'
              : latestSensor.humidity > 85
              ? 'HIGH'
              : 'OPTIMAL'
          }
          trend="stable"
          subtitle="GPIO 15 | Target: 50 - 75% RH"
          icon={<Wind className="w-4 h-4" />}
          sparklineData={humChartData.slice(-15).map((d) => d.value)}
          onClick={() => setActiveMetric('hum')}
        />

        {/* P31 Mechanical Float Switch */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          latestSensor?.float_status === 'ALERT'
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : 'bg-slate-900/60 border-slate-800 text-slate-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              P31 Float Switch (GPIO 13)
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <span className={`text-2xl font-bold font-mono ${
              latestSensor?.float_status === 'ALERT' ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
            }`}>
              {latestSensor?.float_status || 'SAFE'}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Safety emergency level cutoff in sump basin.
            </p>
          </div>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-white/5">
            Active Digital Input (Debounced)
          </div>
        </div>

      </div>

      {/* Main Historical Time-Series Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        
        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveMetric('ph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMetric === 'ph'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              pH Trend
            </button>
            <button
              onClick={() => setActiveMetric('temp')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMetric === 'temp'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Water Temp Trend
            </button>
            <button
              onClick={() => setActiveMetric('level')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMetric === 'level'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Water Level Trend
            </button>
            <button
              onClick={() => setActiveMetric('air')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMetric === 'air'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Air Temp Trend
            </button>
            <button
              onClick={() => setActiveMetric('hum')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeMetric === 'hum'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Humidity Trend
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Range: {selectedRange}</span>
            <span>Samples: {chartConfig.data.length}</span>
          </div>
        </div>

        {/* Chart Component */}
        <div className="h-72 w-full pt-2">
          <TrendChart
            title={chartConfig.title}
            data={chartConfig.data}
            unit={chartConfig.unit}
            color={chartConfig.color}
            min={chartConfig.min}
            max={chartConfig.max}
            optimalMin={chartConfig.optimalMin}
            optimalMax={chartConfig.optimalMax}
          />
        </div>

        {/* Calibration & Biological Reference Note */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-300 block mb-0.5">Threshold Reference Guide:</strong>
            Optimal biological target for symbiotic nitrifying biofilter: Water temperature 22.0°C – 27.0°C, pH 6.6 – 7.4.
            Rule-based alerts trigger when parameters deviate beyond safety thresholds.
          </div>
        </div>

      </div>

    </div>
  );
};
