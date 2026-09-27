import React, { useState, useEffect } from 'react';
import { SystemStatus, MLStatus } from '../types';
import { api } from '../services/api';
import {
  Settings,
  Cpu,
  Database,
  Server,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ShieldAlert,
  Info
} from 'lucide-react';

interface SystemSettingsProps {
  systemStatus: SystemStatus | null;
  onRefresh: () => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  systemStatus,
  onRefresh,
}) => {
  const [mlStatus, setMLStatus] = useState<MLStatus | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);

  useEffect(() => {
    api.getMLStatus().then(setMLStatus).catch(console.error);
  }, []);

  const handleToggleMode = async (targetMode: 'live' | 'demo') => {
    try {
      setSwitchingMode(true);
      await api.setAppMode(targetMode);
      onRefresh();
    } catch (err) {
      console.error('Error changing mode:', err);
    } finally {
      setSwitchingMode(false);
    }
  };

  const isDemo = systemStatus?.app_mode === 'demo';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-400" />
            System Architecture & Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ESP32 IoT acquisition node, FastAPI local host server, baseline ML anomaly diagnostics, and hardware safety.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 text-xs font-medium self-start sm:self-auto transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
          <span>Refresh System</span>
        </button>
      </div>

      {/* Mode Switcher Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
                Operating Telemetry Mode
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Toggle between physical ESP32 Wi-Fi telemetry and mathematical bench simulation.
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
              isDemo
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {isDemo ? 'DEMO SIMULATOR ACTIVE' : 'LIVE ESP32 HARDWARE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Live Mode Card */}
          <div
            onClick={() => handleToggleMode('live')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              !isDemo
                ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Live ESP32 Mode
              </span>
              {!isDemo && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Receives HTTP telemetry payloads posted by the physical ESP32 node over local Wi-Fi.
              All data tagged as <code className="text-emerald-300">source: "esp32_live"</code>.
            </p>
          </div>

          {/* Demo Mode Card */}
          <div
            onClick={() => handleToggleMode('demo')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              isDemo
                ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                Demo Simulation Mode
              </span>
              {isDemo && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Generates realistic diurnal cycles for demonstration when hardware is disconnected.
              All simulated data tagged as <code className="text-amber-300">is_demo: true</code> to preserve research integrity.
            </p>
          </div>
        </div>
      </div>

      {/* Component Registry Grid */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Architectural Components (V1 Clean)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* ESP32 Node */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-sm text-slate-200">ESP32 IoT Sensor Node</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {systemStatus?.components?.esp32?.status || 'ONLINE'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {systemStatus?.components?.esp32?.details || 'Acquires DS18B20, analog pH, DHT11, water level, and float switch.'}
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-1">
              Heartbeat: {systemStatus?.components?.esp32?.last_heartbeat ? new Date(systemStatus.components.esp32.last_heartbeat).toLocaleTimeString() : 'Active'}
            </div>
          </div>

          {/* FastAPI Host Server */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-sm text-slate-200">FastAPI Host Server</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Running locally on your development computer with Uvicorn. Exposes REST endpoints and WebSocket stream.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-1">
              Port: 8000 | OpenAPI: /docs
            </div>
          </div>

          {/* SQLite Database */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-sm text-slate-200">SQLite Database</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Stores raw sensor payloads, calibrated readings, manual plant growth observations, alerts, and ML predictions.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-1">
              Readings Stored: {systemStatus?.total_readings_stored || 0}
            </div>
          </div>

          {/* ML Baseline Anomaly Engine */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-sm text-slate-200">Isolation Forest Baseline</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                PROTOTYPE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {mlStatus?.active_models?.[0]?.validation_status ||
                'Baseline prototype model. Evaluates 5-dimensional telemetry co-variance in memory.'}
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-1">
              Threshold: {mlStatus?.active_models?.[0]?.anomaly_threshold ?? 0.65} | Model: v1.0.0-prototype
            </div>
          </div>

        </div>
      </div>

      {/* Hardware Safety & Pinout Guidelines */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/30 space-y-4">
        <div className="flex items-center gap-2 text-amber-400">
          <ShieldAlert className="w-5 h-5" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Hardware Wiring & Critical Electrical Safety
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <strong className="text-amber-300 block font-mono">1. Analog pH Module Voltage Safety</strong>
            <p className="text-slate-400">
              Many hobbyist analog pH modules require 5.0V VCC and output 0 to 4.2V.
              <strong> The ESP32 ADC pins support a maximum of 3.3V.</strong> Connecting a 5V analog signal directly to GPIO 34 will damage the ESP32.
              Verify your module's exact output range with a multimeter or use a precision resistor voltage divider before connecting.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <strong className="text-teal-300 block font-mono">2. Water Level Sensor Calibration</strong>
            <p className="text-slate-400">
              Do not assume the water level sensor is automatically calibrated to percentage.
              The firmware reads raw ADC values (0–4095) on GPIO 35. Calibrate <code className="text-teal-300">WATER_LEVEL_MIN_ADC</code> and <code className="text-teal-300">WATER_LEVEL_MAX_ADC</code> in <code className="text-teal-300">config.h</code> according to your physical sump tank dimensions.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <strong className="text-slate-200 block font-mono">3. DS18B20 OneWire Pull-up</strong>
            <p className="text-slate-400">
              The DS18B20 digital temperature probe (GPIO 4) requires a <strong>4.7kΩ pull-up resistor</strong> between the DQ signal wire and 3.3V power. Without this pull-up resistor, the OneWire bus will fail to detect sensor addresses.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
            <strong className="text-slate-200 block font-mono">4. Wi-Fi Secrets & Git Hygiene</strong>
            <p className="text-slate-400">
              Network credentials are stored in <code className="text-teal-300">config.h</code> on the ESP32, which is explicitly ignored in <code className="text-teal-300">.gitignore</code>.
              Never commit Wi-Fi passwords, private endpoints, or local IP addresses to version control.
            </p>
          </div>

        </div>
      </div>

      {/* Configured Thresholds Reference Table */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Active Alert Threshold Configuration (Rule Engine)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2 px-2">Parameter</th>
                <th className="py-2 px-2">Hardware Sensor</th>
                <th className="py-2 px-2">GPIO Pin</th>
                <th className="py-2 px-2">Critical Min</th>
                <th className="py-2 px-2">Warning Min</th>
                <th className="py-2 px-2">Optimal Range</th>
                <th className="py-2 px-2">Warning Max</th>
                <th className="py-2 px-2">Critical Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="py-2 px-2 font-bold text-teal-300">Water Temperature</td>
                <td className="py-2 px-2">DS18B20</td>
                <td className="py-2 px-2 text-slate-400">GPIO 4</td>
                <td className="py-2 px-2 text-rose-400">&lt; 18.0°C</td>
                <td className="py-2 px-2 text-amber-400">21.0°C</td>
                <td className="py-2 px-2 text-emerald-400">22.0 – 27.0°C</td>
                <td className="py-2 px-2 text-amber-400">28.0°C</td>
                <td className="py-2 px-2 text-rose-400">&gt; 32.0°C</td>
              </tr>
              <tr>
                <td className="py-2 px-2 font-bold text-teal-300">Water pH</td>
                <td className="py-2 px-2">Analog pH Probe</td>
                <td className="py-2 px-2 text-slate-400">GPIO 34 ADC1</td>
                <td className="py-2 px-2 text-rose-400">&lt; 5.8</td>
                <td className="py-2 px-2 text-amber-400">6.4</td>
                <td className="py-2 px-2 text-emerald-400">6.6 – 7.4</td>
                <td className="py-2 px-2 text-amber-400">7.6</td>
                <td className="py-2 px-2 text-rose-400">&gt; 8.2</td>
              </tr>
              <tr>
                <td className="py-2 px-2 font-bold text-teal-300">Water Level</td>
                <td className="py-2 px-2">Resistive Track</td>
                <td className="py-2 px-2 text-slate-400">GPIO 35 ADC1</td>
                <td className="py-2 px-2 text-rose-400">&lt; 25%</td>
                <td className="py-2 px-2 text-amber-400">40%</td>
                <td className="py-2 px-2 text-emerald-400">60 – 90%</td>
                <td className="py-2 px-2 text-amber-400">90%</td>
                <td className="py-2 px-2 text-rose-400">&gt; 96%</td>
              </tr>
              <tr>
                <td className="py-2 px-2 font-bold text-teal-300">Air Temperature</td>
                <td className="py-2 px-2">DHT11</td>
                <td className="py-2 px-2 text-slate-400">GPIO 15</td>
                <td className="py-2 px-2 text-slate-500">--</td>
                <td className="py-2 px-2 text-slate-500">--</td>
                <td className="py-2 px-2 text-emerald-400">20.0 – 28.0°C</td>
                <td className="py-2 px-2 text-amber-400">&gt; 35.0°C</td>
                <td className="py-2 px-2 text-slate-500">--</td>
              </tr>
              <tr>
                <td className="py-2 px-2 font-bold text-teal-300">Air Humidity</td>
                <td className="py-2 px-2">DHT11</td>
                <td className="py-2 px-2 text-slate-400">GPIO 15</td>
                <td className="py-2 px-2 text-slate-500">--</td>
                <td className="py-2 px-2 text-amber-400">&lt; 35%</td>
                <td className="py-2 px-2 text-emerald-400">50 – 75%</td>
                <td className="py-2 px-2 text-amber-400">&gt; 85%</td>
                <td className="py-2 px-2 text-slate-500">--</td>
              </tr>
              <tr>
                <td className="py-2 px-2 font-bold text-teal-300">Float Switch</td>
                <td className="py-2 px-2">P31 Float</td>
                <td className="py-2 px-2 text-slate-400">GPIO 13</td>
                <td className="py-2 px-2 text-rose-400">ALERT Trigger</td>
                <td className="py-2 px-2 text-slate-500">--</td>
                <td className="py-2 px-2 text-emerald-400">SAFE</td>
                <td className="py-2 px-2 text-slate-500">--</td>
                <td className="py-2 px-2 text-slate-500">--</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
