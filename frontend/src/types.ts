export interface SensorReading {
  id: number;
  timestamp: string;
  device_id: string;
  water_temperature: number;
  ph: number;
  ph_raw_voltage?: number | null;
  air_temperature: number;
  humidity: number;
  water_level: number;
  water_level_raw?: number | null;
  float_status: 'SAFE' | 'ALERT';
  wifi_rssi?: number | null;
  uptime_seconds?: number | null;
  source?: string;
  is_demo?: boolean;
  ml_prediction?: {
    status: string;
    anomaly_score: number;
  };
}

export interface PlantObservation {
  id: number;
  timestamp: string;
  plant_id: string;
  species_name: string;
  height_cm: number;
  leaf_count: number;
  canopy_width_cm: number;
  visual_health: string;
  chlorosis_observation: string;
  growth_rate_cm_day?: number | null;
  leaf_growth_rate_day?: number | null;
  notes?: string | null;
  observer_name?: string | null;
}

export interface PlantCreateInput {
  plant_id: string;
  species_name: string;
  timestamp?: string;
  height_cm: number;
  leaf_count: number;
  canopy_width_cm: number;
  visual_health: string;
  chlorosis_observation: string;
  notes?: string;
  observer_name?: string;
}

export interface FishObservation {
  id: number;
  timestamp: string;
  fish_count: number;
  feeding_response: string;
  mortality_count: number;
  behaviour_notes?: string | null;
  observer_name?: string | null;
}

export interface FishCreateInput {
  timestamp?: string;
  fish_count: number;
  feeding_response: string;
  mortality_count: number;
  behaviour_notes?: string;
  observer_name?: string;
}

export interface MLPrediction {
  id: number;
  timestamp: string;
  model_name: string;
  model_version: string;
  prediction: string;
  confidence: number;
  anomaly_score: number;
  input_features?: string | null;
}

export interface MLStatus {
  status: string;
  active_models: Array<{
    model_name: string;
    version: string;
    algorithm: string;
    model_role: string;
    validation_status: string;
    accuracy_claim: string;
    training_dataset_info: string;
    features: string[];
    anomaly_threshold: number;
    memory_resident: boolean;
  }>;
}

export interface Alert {
  id: number;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  source: string;
  parameter: string;
  message: string;
  value?: string | null;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledged_at?: string | null;
  resolved_at?: string | null;
}

export interface ComponentStatus {
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | string;
  last_heartbeat?: string | null;
  latency_seconds?: number | null;
  details?: string | null;
}

export interface SystemStatus {
  app_mode: 'live' | 'demo';
  overall_status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  last_sensor_update_seconds_ago?: number | null;
  total_readings_stored: number;
  active_alerts_count: number;
  critical_alerts_count: number;
  components: Record<string, ComponentStatus>;
  timestamp: string;
}

export interface ScatterPoint {
  x: number;
  y: number;
  plant_id?: string;
  timestamp: string;
}

export interface CorrelationStat {
  r: number;
  p_value: number;
  sample_count: number;
}

export interface CorrelationItem {
  title: string;
  x_label: string;
  y_label: string;
  correlation: CorrelationStat;
  scatter_data: ScatterPoint[];
}

export interface AnalyticsData {
  analysis_period_days: number;
  scientific_disclaimer: string;
  correlations: Record<string, CorrelationItem>;
}

export type PageTab = 'dashboard' | 'water' | 'plants' | 'analytics' | 'alerts' | 'settings' | 'fish';
