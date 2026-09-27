import {
  SensorReading,
  PlantObservation,
  PlantCreateInput,
  FishObservation,
  FishCreateInput,
  Alert,
  SystemStatus,
  AnalyticsData,
  MLStatus
} from '../types';

const API_BASE = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText || res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Sensors
  async getLatestSensor(): Promise<SensorReading> {
    return fetchJson<SensorReading>(`${API_BASE}/sensors/latest`);
  },

  async getSensorHistory(range: string = '24h', limit: number = 250, source?: string): Promise<SensorReading[]> {
    const params = new URLSearchParams({ range, limit: limit.toString() });
    if (source) params.append('source', source);
    return fetchJson<SensorReading[]>(`${API_BASE}/sensors/history?${params.toString()}`);
  },

  // Manual Plant Observations
  async getLatestPlant(plantId?: string): Promise<PlantObservation> {
    const url = plantId ? `${API_BASE}/plants/latest?plant_id=${plantId}` : `${API_BASE}/plants/latest`;
    return fetchJson<PlantObservation>(url);
  },

  async getPlantHistory(plantId?: string): Promise<PlantObservation[]> {
    const url = plantId ? `${API_BASE}/plants/history?plant_id=${plantId}` : `${API_BASE}/plants/history`;
    return fetchJson<PlantObservation[]>(url);
  },

  async createPlantObservation(input: PlantCreateInput): Promise<PlantObservation> {
    return fetchJson<PlantObservation>(`${API_BASE}/plants/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },

  async getPlantsSummary(): Promise<any> {
    return fetchJson<any>(`${API_BASE}/plants/summary`);
  },

  // Alerts
  async getAlerts(status?: string, severity?: string): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (severity) params.append('severity', severity);
    return fetchJson<Alert[]>(`${API_BASE}/alerts?${params.toString()}`);
  },

  async acknowledgeAlert(id: number): Promise<Alert> {
    return fetchJson<Alert>(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'POST' });
  },

  async resolveAlert(id: number): Promise<Alert> {
    return fetchJson<Alert>(`${API_BASE}/alerts/${id}/resolve`, { method: 'POST' });
  },

  async acknowledgeAllAlerts(): Promise<{ success: boolean; acknowledged_count: number }> {
    return fetchJson<{ success: boolean; acknowledged_count: number }>(`${API_BASE}/alerts/acknowledge-all`, { method: 'POST' });
  },

  // System
  async getSystemStatus(): Promise<SystemStatus> {
    return fetchJson<SystemStatus>(`${API_BASE}/system/status`);
  },

  async setAppMode(mode: 'live' | 'demo'): Promise<{ success: boolean; current_mode: string }> {
    return fetchJson<{ success: boolean; current_mode: string }>(`${API_BASE}/system/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
  },

  // Analytics
  async getAnalytics(days: number = 14): Promise<AnalyticsData> {
    return fetchJson<AnalyticsData>(`${API_BASE}/analytics?days=${days}`);
  },

  // ML
  async getMLStatus(): Promise<MLStatus> {
    return fetchJson<MLStatus>(`${API_BASE}/ml/status`);
  },

  async predictML(data: {
    water_temperature: number;
    ph: number;
    air_temperature: number;
    humidity: number;
    water_level: number;
  }): Promise<any> {
    return fetchJson<any>(`${API_BASE}/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Optional Fish Observations (Manual)
  async getLatestFish(): Promise<FishObservation> {
    return fetchJson<FishObservation>(`${API_BASE}/fish/latest`);
  },

  async getFishHistory(): Promise<FishObservation[]> {
    return fetchJson<FishObservation[]>(`${API_BASE}/fish/history`);
  },

  async createFishObservation(input: FishCreateInput): Promise<FishObservation> {
    return fetchJson<FishObservation>(`${API_BASE}/fish/observations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
