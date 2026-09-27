import React from 'react';
import {
  SensorReading,
  PlantObservation,
  Alert,
  SystemStatus,
  PageTab
} from '../types';
import { StatCard } from '../components/StatCard';
import {
  Droplets,
  Thermometer,
  Wind,
  Layers,
  Sprout,
  Cpu,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Clock,
  Wifi,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DashboardProps {
  latestSensor: SensorReading | null;
  latestPlant: PlantObservation | null;
  alerts: Alert[];
  systemStatus: SystemStatus | null;
  onNavigate: (tab: PageTab) => void;
  sensorHistory: SensorReading[];
  onAcknowledgeAlert?: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  latestSensor,
  latestPlant,
  alerts,
  systemStatus,
  onNavigate,
  sensorHistory,
  onAcknowledgeAlert
}) => {
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const recentAlerts = alerts.slice(0, 5);

  // Sparklines from history
  const tempSparkline = sensorHistory.slice(-20).map((r) => r.water_temperature);
  const phSparkline = sensorHistory.slice(-20).map((r) => r.ph);
  const levelSparkline = sensorHistory.slice(-20).map((r) => r.water_level);
  const airSparkline = sensorHistory.slice(-20).map((r) => r.air_temperature);
  const humSparkline = sensorHistory.slice(-20).map((r) => r.humidity);

  const mlStatus = latestSensor?.ml_prediction?.status || 'NORMAL';
  const anomalyScore = latestSensor?.ml_prediction?.anomaly_score ?? 0.05;

  const isFloatAlert = latestSensor?.float_status === 'ALERT';

  return (
    <div className="space-y-6">
      
      {/* 1. ESP32 Connection & Overview Banner */}
      <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/40 border border-teal-500/20 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-teal-400 font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                ESP32 IoT Node: {latestSensor?.device_id || 'ESP32_AQUA_01'}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                systemStatus?.components?.esp32?.status?.includes('ONLINE')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {systemStatus?.components?.esp32?.status || 'ONLINE'}
              </span>
              {latestSensor?.wifi_rssi && (
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-slate-400" />
                  {latestSensor.wifi_rssi} dBm
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Aquaponics Live Monitoring Telemetry
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Latest Reading:{' '}
                <strong className="text-slate-200 font-mono">
                  {latestSensor?.timestamp
                    ? new Date(latestSensor.timestamp).toLocaleTimeString()
                    : '--'}
                </strong>
              </span>
              <span>
                Source:{' '}
                <span className="font-mono text-teal-300">
                  {latestSensor?.source === 'demo' ? 'Simulated Demo' : 'Physical ESP32'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('water')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold transition-all shadow-sm"
            >
              <span>Water Sensor Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('plants')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Record Plant Growth</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Core Physical Sensor Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Confirmed Physical Sensor Readings
            </h2>
          </div>
          <span className="text-xs text-slate-400">GPIO 4, 34, 35, 15, 13</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Water Temperature (DS18B20 - GPIO 4) */}
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
                ? 'CRITICAL RANGE'
                : latestSensor.water_temperature < 21 || latestSensor.water_temperature > 28
                ? 'SUB-OPTIMAL'
                : 'OPTIMAL (22-26°C)'
            }
            trend="stable"
            subtitle="GPIO 4 (OneWire Waterproof Probe)"
            icon={<Thermometer className="w-4 h-4" />}
            sparklineData={tempSparkline}
            onClick={() => onNavigate('water')}
          />

          {/* pH Level (Analog pH - GPIO 34) */}
          <StatCard
            title="pH Sensor (GPIO 34 ADC)"
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
                : 'BALANCED (6.6-7.2)'
            }
            trend="stable"
            subtitle={
              latestSensor?.ph_raw_voltage !== undefined && latestSensor?.ph_raw_voltage !== null
                ? `ADC V: ${latestSensor.ph_raw_voltage.toFixed(2)}V (requires < 3.3V)`
                : 'Target: 6.6 – 7.4'
            }
            icon={<Droplets className="w-4 h-4" />}
            sparklineData={phSparkline}
            onClick={() => onNavigate('water')}
          />

          {/* Water Level (Water-level sensor - GPIO 35) */}
          <StatCard
            title="Water Level Sensor (GPIO 35)"
            value={latestSensor ? latestSensor.water_level.toFixed(0) : '--'}
            unit="%"
            status={
              !latestSensor
                ? 'OPTIMAL'
                : latestSensor.water_level < 40
                ? 'WARNING'
                : latestSensor.water_level > 90
                ? 'WARNING'
                : 'OPTIMAL'
            }
            statusText={
              !latestSensor
                ? 'NOMINAL'
                : latestSensor.water_level < 25
                ? 'CRITICALLY LOW'
                : latestSensor.water_level < 40
                ? 'LOW RESERVOIR'
                : latestSensor.water_level > 95
                ? 'OVERFLOW RISK'
                : 'NORMAL SUMP LEVEL'
            }
            trend="stable"
            subtitle={
              latestSensor?.water_level_raw !== undefined && latestSensor?.water_level_raw !== null
                ? `Raw ADC: ${latestSensor.water_level_raw} / 4095`
                : 'Sump basin calibrated'
            }
            icon={<Layers className="w-4 h-4" />}
            sparklineData={levelSparkline}
            onClick={() => onNavigate('water')}
          />

          {/* Air Temperature (DHT11 - GPIO 15) */}
          <StatCard
            title="Ambient Air Temp (DHT11)"
            value={latestSensor ? latestSensor.air_temperature.toFixed(1) : '--'}
            unit="°C"
            status={
              !latestSensor
                ? 'OPTIMAL'
                : latestSensor.air_temperature > 35
                ? 'WARNING'
                : 'OPTIMAL'
            }
            statusText={
              !latestSensor
                ? 'NOMINAL'
                : latestSensor.air_temperature > 35
                ? 'HEAT STRESS'
                : 'NORMAL ROOM'
            }
            trend="stable"
            subtitle="GPIO 15 (Grow environment)"
            icon={<Wind className="w-4 h-4" />}
            sparklineData={airSparkline}
            onClick={() => onNavigate('water')}
          />

          {/* Air Humidity (DHT11 - GPIO 15) */}
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
                ? 'DRY AIR'
                : latestSensor.humidity > 85
                ? 'HIGH HUMIDITY'
                : 'BALANCED'
            }
            trend="stable"
            subtitle="Target: 50% – 75% RH"
            icon={<Wind className="w-4 h-4" />}
            sparklineData={humSparkline}
            onClick={() => onNavigate('water')}
          />

          {/* P31 Mechanical Float Switch (GPIO 13) */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            isFloatAlert
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-100'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                P31 Float Switch (GPIO 13)
              </span>
              {isFloatAlert ? (
                <span className="p-1 rounded bg-rose-500/20 text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                </span>
              ) : (
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              )}
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${isFloatAlert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {latestSensor?.float_status || 'SAFE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isFloatAlert
                  ? 'EMERGENCY TRIGGER: Float switch open/closed circuit indicating basin threshold breach!'
                  : 'Contact closed: Water level above safety cutoff point.'}
              </p>
            </div>

            <div className="text-[11px] font-mono text-slate-500 border-t border-white/5 pt-2">
              Configured INPUT_PULLUP on GPIO 13
            </div>
          </div>

        </div>
      </div>

      {/* 3. ML Baseline Anomaly Status & Manual Plant Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* ML Baseline Anomaly Detection Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Sensor Anomaly Inference (ML Baseline)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
              Prototype Baseline
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Modular scikit-learn Isolation Forest evaluating multidimensional co-variance across
            water temperature, pH, air temperature, humidity, and water level.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[11px] text-slate-400 block mb-1">Inference Status</span>
              <span className={`text-base font-bold font-mono ${
                mlStatus === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {mlStatus}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
              <span className="text-[11px] text-slate-400 block mb-1">Anomaly Score</span>
              <span className="text-base font-bold font-mono text-slate-200">
                {(anomalyScore * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            * Notice: Baseline model trained on theoretical bounds. Empirical calibration required before production deployment.
          </div>
        </div>

        {/* Manual Plant Growth Status Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Manual Plant Growth Tracking
              </h3>
            </div>
            <button
              onClick={() => onNavigate('plants')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <span>Open Growth Log</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Physical measurements manually recorded by the research team (no camera/CV).
          </p>

          {latestPlant ? (
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Latest Height</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {latestPlant.height_cm.toFixed(1)} cm
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Leaf Count</span>
                <span className="text-base font-bold font-mono text-slate-200">
                  {latestPlant.leaf_count} leaves
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[11px] text-slate-400 block mb-1">Growth Rate</span>
                <span className="text-base font-bold font-mono text-teal-300">
                  {latestPlant.growth_rate_cm_day ? `${latestPlant.growth_rate_cm_day} cm/d` : '--'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-400">
              No manual observations entered yet. Click "Record Plant Growth" to log initial seedling baseline.
            </div>
          )}

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Plant: <strong className="text-slate-300">{latestPlant?.plant_id || 'BED-A-01'}</strong></span>
            <span>Health: <strong className="text-emerald-400">{latestPlant?.visual_health || 'HEALTHY'}</strong></span>
          </div>
        </div>

      </div>

      {/* 4. Recent Alerts Section */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Recent System Alerts ({activeAlerts.length} Active)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('alerts')}
            className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
          >
            <span>View all alerts</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentAlerts.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>All sensor thresholds within nominal operating ranges. No active alerts.</span>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="text-slate-300 truncate font-medium">{alert.message}</span>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                  <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  {alert.status === 'ACTIVE' && onAcknowledgeAlert && (
                    <button
                      onClick={() => onAcknowledgeAlert(alert.id)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px]"
                    >
                      Ack
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
