import React, { useState, useEffect } from 'react';
import {
  PageTab,
  SensorReading,
  PlantObservation,
  FishObservation,
  Alert,
  SystemStatus
} from './types';
import { api } from './services/api';
import { wsClient } from './services/websocket';
import { Navbar } from './components/Navbar';
import { StatusHeader } from './components/StatusHeader';
import { AlertsDrawer } from './components/AlertsDrawer';

import { Dashboard } from './pages/Dashboard';
import { WaterMonitoring } from './pages/WaterMonitoring';
import { PlantMonitoring } from './pages/PlantMonitoring';
import { Analytics } from './pages/Analytics';
import { AlertsPage } from './pages/Alerts';
import { FishMonitoring } from './pages/FishMonitoring';
import { SystemSettings } from './pages/SystemSettings';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<PageTab>('dashboard');
  const [wsConnected, setWsConnected] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Core application telemetry states
  const [latestSensor, setLatestSensor] = useState<SensorReading | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [latestPlant, setLatestPlant] = useState<PlantObservation | null>(null);
  const [plantHistory, setPlantHistory] = useState<PlantObservation[]>([]);
  const [latestFish, setLatestFish] = useState<FishObservation | null>(null);
  const [fishHistory, setFishHistory] = useState<FishObservation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  
  // Selected range for water charts ('1h', '6h', '24h', '7d')
  const [waterRange, setWaterRange] = useState('24h');

  // Initial data loading
  const loadInitialData = async () => {
    try {
      const [latestS, histS, latestP, histP, latestF, histF, alertsList, sysStat] = await Promise.all([
        api.getLatestSensor().catch(() => null),
        api.getSensorHistory(waterRange).catch(() => []),
        api.getLatestPlant().catch(() => null),
        api.getPlantHistory().catch(() => []),
        api.getLatestFish().catch(() => null),
        api.getFishHistory().catch(() => []),
        api.getAlerts().catch(() => []),
        api.getSystemStatus().catch(() => null),
      ]);

      if (latestS) setLatestSensor(latestS);
      if (histS) setSensorHistory(histS);
      if (latestP) setLatestPlant(latestP);
      if (histP) setPlantHistory(histP);
      if (latestF) setLatestFish(latestF);
      if (histF) setFishHistory(histF);
      if (alertsList) setAlerts(alertsList);
      if (sysStat) setSystemStatus(sysStat);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload history when range changes
  useEffect(() => {
    api.getSensorHistory(waterRange)
      .then(setSensorHistory)
      .catch(console.error);
  }, [waterRange]);

  // Wire up WebSocket real-time subscription
  useEffect(() => {
    const unsubStatus = wsClient.on('connection_status', (evt) => {
      setWsConnected(evt.connected);
    });

    const unsubSensor = wsClient.on('sensor_reading', (reading: SensorReading) => {
      setLatestSensor(reading);
      setSensorHistory((prev) => {
        const next = [...prev, reading];
        return next.length > 250 ? next.slice(-250) : next;
      });
      // Update latency in system status
      setSystemStatus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          last_sensor_update_seconds_ago: 0,
        };
      });
    });

    const unsubAlert = wsClient.on('new_alert', (newAlert: Alert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    const unsubAlertUpdate = wsClient.on('alert_updated', (updated: any) => {
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    });

    const unsubPlant = wsClient.on('plant_update', (plant: PlantObservation) => {
      setLatestPlant(plant);
      setPlantHistory((prev) => [...prev, plant]);
    });

    const unsubFish = wsClient.on('fish_update', (fish: FishObservation) => {
      setLatestFish(fish);
      setFishHistory((prev) => [...prev, fish]);
    });

    return () => {
      unsubStatus();
      unsubSensor();
      unsubAlert();
      unsubAlertUpdate();
      unsubPlant();
      unsubFish();
    };
  }, []);

  // Periodic heartbeat polling to keep seconds-ago clock and status updated
  useEffect(() => {
    const interval = setInterval(() => {
      api.getSystemStatus().then(setSystemStatus).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledgeAlert = async (id: number) => {
    try {
      const updated = await api.acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const activeAlertsCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        systemStatus={systemStatus}
        wsConnected={wsConnected}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        unreadAlertsCount={activeAlertsCount}
      />

      {/* System Status Strip */}
      <StatusHeader
        status={systemStatus}
        lastUpdatedSecondsAgo={systemStatus?.last_sensor_update_seconds_ago ?? 5}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-20 lg:pb-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            latestSensor={latestSensor}
            latestPlant={latestPlant}
            alerts={alerts}
            systemStatus={systemStatus}
            onNavigate={setCurrentTab}
            sensorHistory={sensorHistory}
            onAcknowledgeAlert={handleAcknowledgeAlert}
          />
        )}

        {currentTab === 'water' && (
          <WaterMonitoring
            latestSensor={latestSensor}
            sensorHistory={sensorHistory}
            selectedRange={waterRange}
            onRangeChange={setWaterRange}
          />
        )}

        {currentTab === 'plants' && (
          <PlantMonitoring
            latestPlant={latestPlant}
            plantHistory={plantHistory}
            onRefresh={loadInitialData}
          />
        )}

        {currentTab === 'analytics' && (
          <Analytics />
        )}

        {currentTab === 'alerts' && (
          <AlertsPage
            alerts={alerts}
            onRefresh={loadInitialData}
            onAcknowledge={handleAcknowledgeAlert}
          />
        )}

        {currentTab === 'fish' && (
          <FishMonitoring
            latestFish={latestFish}
            fishHistory={fishHistory}
            onRefresh={loadInitialData}
          />
        )}

        {currentTab === 'settings' && (
          <SystemSettings
            systemStatus={systemStatus}
            onRefresh={loadInitialData}
          />
        )}
      </main>

      {/* Alerts Quick Slide-over Drawer */}
      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onAcknowledge={handleAcknowledgeAlert}
      />
    </div>
  );
};

export default App;
