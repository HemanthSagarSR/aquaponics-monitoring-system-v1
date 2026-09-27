"""
Alert Engine for Aquaponics Monitoring System V1.
Evaluates rule-based thresholds, float switch triggers, watchdog events, and ML baseline anomaly detections.
Includes deduplication to prevent alert flapping.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.orm_models import Alert

class AlertEngine:
    def __init__(self):
        self.dedup_window_minutes = 15

    def evaluate_reading(
        self,
        db: Session,
        reading_data: Dict[str, Any],
        ml_result: Optional[Dict[str, Any]] = None
    ) -> List[Alert]:
        """
        Evaluates a newly arrived sensor reading against rule-based and ML-based criteria.
        Creates and persists alerts to database if thresholds are violated.
        """
        generated_alerts: List[Alert] = []
        now = datetime.utcnow()
        cutoff_time = now - timedelta(minutes=self.dedup_window_minutes)

        def is_duplicate(param: str, sev: str) -> bool:
            """Check if an active alert for the same parameter already exists within dedup window."""
            existing = db.query(Alert).filter(
                Alert.parameter == param,
                Alert.severity == sev,
                Alert.status == "ACTIVE",
                Alert.timestamp >= cutoff_time
            ).first()
            return existing is not None

        # ==========================================
        # 1. Water Temperature Checks (DS18B20)
        # ==========================================
        water_temp = reading_data.get("water_temperature")
        if water_temp is not None:
            if water_temp <= settings.TEMP_MIN_CRITICAL:
                if not is_duplicate("water_temperature", "CRITICAL"):
                    generated_alerts.append(Alert(
                        severity="CRITICAL",
                        source="RULE",
                        parameter="water_temperature",
                        message=f"Critically low water temperature ({water_temp:.1f}°C). Sub-optimal for nitrifying bacteria and fish.",
                        value=f"{water_temp:.1f}°C"
                    ))
            elif water_temp >= settings.TEMP_MAX_CRITICAL:
                if not is_duplicate("water_temperature", "CRITICAL"):
                    generated_alerts.append(Alert(
                        severity="CRITICAL",
                        source="RULE",
                        parameter="water_temperature",
                        message=f"Critically high water temperature ({water_temp:.1f}°C). Severe dissolved oxygen depletion risk.",
                        value=f"{water_temp:.1f}°C"
                    ))
            elif water_temp <= settings.TEMP_MIN_WARNING or water_temp >= settings.TEMP_MAX_WARNING:
                if not is_duplicate("water_temperature", "WARNING"):
                    generated_alerts.append(Alert(
                        severity="WARNING",
                        source="RULE",
                        parameter="water_temperature",
                        message=f"Water temperature outside optimal range ({water_temp:.1f}°C). Optimal: {settings.TEMP_MIN_WARNING}°C – {settings.TEMP_MAX_WARNING}°C.",
                        value=f"{water_temp:.1f}°C"
                    ))

        # ==========================================
        # 2. pH Sensor Checks
        # ==========================================
        ph = reading_data.get("ph")
        if ph is not None:
            if ph <= settings.PH_MIN_CRITICAL or ph >= settings.PH_MAX_CRITICAL:
                if not is_duplicate("ph", "CRITICAL"):
                    generated_alerts.append(Alert(
                        severity="CRITICAL",
                        source="RULE",
                        parameter="ph",
                        message=f"Critical pH level ({ph:.2f}). Biofilter inhibition and root nutrient lockout risk.",
                        value=f"{ph:.2f}"
                    ))
            elif ph <= settings.PH_MIN_WARNING or ph >= settings.PH_MAX_WARNING:
                if not is_duplicate("ph", "WARNING"):
                    generated_alerts.append(Alert(
                        severity="WARNING",
                        source="RULE",
                        parameter="ph",
                        message=f"pH drifting out of optimal range ({ph:.2f}). Target: {settings.PH_MIN_WARNING} – {settings.PH_MAX_WARNING}.",
                        value=f"{ph:.2f}"
                    ))

        # ==========================================
        # 3. Water Level Checks
        # ==========================================
        level = reading_data.get("water_level")
        if level is not None:
            if level <= settings.WATER_LEVEL_MIN_CRITICAL:
                if not is_duplicate("water_level", "CRITICAL"):
                    generated_alerts.append(Alert(
                        severity="CRITICAL",
                        source="RULE",
                        parameter="water_level",
                        message=f"Critical water level detected ({level:.1f}%). Sump tank low; risk of pump dry run!",
                        value=f"{level:.1f}%"
                    ))
            elif level >= settings.WATER_LEVEL_MAX_CRITICAL:
                if not is_duplicate("water_level", "CRITICAL"):
                    generated_alerts.append(Alert(
                        severity="CRITICAL",
                        source="RULE",
                        parameter="water_level",
                        message=f"Emergency high water level detected ({level:.1f}%). Tank overflow hazard!",
                        value=f"{level:.1f}%"
                    ))
            elif level <= settings.WATER_LEVEL_MIN_WARNING:
                if not is_duplicate("water_level", "WARNING"):
                    generated_alerts.append(Alert(
                        severity="WARNING",
                        source="RULE",
                        parameter="water_level",
                        message=f"Low water level ({level:.1f}%). Evaporation top-up recommended.",
                        value=f"{level:.1f}%"
                    ))
            elif level >= settings.WATER_LEVEL_MAX_WARNING:
                if not is_duplicate("water_level", "WARNING"):
                    generated_alerts.append(Alert(
                        severity="WARNING",
                        source="RULE",
                        parameter="water_level",
                        message=f"High water level ({level:.1f}%). Near maximum capacity.",
                        value=f"{level:.1f}%"
                    ))

        # ==========================================
        # 4. P31 Float Switch Physical Safety Trigger
        # ==========================================
        float_status = reading_data.get("float_status")
        if float_status == "ALERT":
            if not is_duplicate("float_switch", "CRITICAL"):
                generated_alerts.append(Alert(
                    severity="CRITICAL",
                    source="RULE",
                    parameter="float_switch",
                    message="P31 Mechanical Float Switch triggered: Emergency sump water level breach!",
                    value="ALERT"
                ))

        # ==========================================
        # 5. Environmental Thresholds (DHT11)
        # ==========================================
        air_temp = reading_data.get("air_temperature")
        if air_temp is not None and air_temp >= settings.AIR_TEMP_MAX_WARNING:
            if not is_duplicate("air_temperature", "WARNING"):
                generated_alerts.append(Alert(
                    severity="WARNING",
                    source="RULE",
                    parameter="air_temperature",
                    message=f"High greenhouse/ambient air temperature ({air_temp:.1f}°C). Risk of plant transpiration stress.",
                    value=f"{air_temp:.1f}°C"
                ))

        humidity = reading_data.get("humidity")
        if humidity is not None:
            if humidity <= settings.HUMIDITY_MIN_WARNING:
                if not is_duplicate("humidity", "WARNING"):
                    generated_alerts.append(Alert(
                        severity="WARNING",
                        source="RULE",
                        parameter="humidity",
                        message=f"Low relative humidity ({humidity:.1f}%). Accelerated leaf water loss.",
                        value=f"{humidity:.1f}%"
                    ))
            elif humidity >= settings.HUMIDITY_MAX_WARNING:
                if not is_duplicate("humidity", "WARNING"):
                    generated_alerts.append(Alert(
                        severity="WARNING",
                        source="RULE",
                        parameter="humidity",
                        message=f"High relative humidity ({humidity:.1f}%). Elevated fungal/mold susceptibility.",
                        value=f"{humidity:.1f}%"
                    ))

        # ==========================================
        # 6. ML Anomaly Detection Alerts
        # ==========================================
        if ml_result:
            anomaly_score = ml_result.get("anomaly_score", 0.0)
            status = ml_result.get("status", "NORMAL")
            
            if anomaly_score >= settings.SENSOR_ANOMALY_THRESHOLD:
                if not is_duplicate("sensor_anomaly", "WARNING"):
                    model_name = ml_result.get("model_name", "IsolationForest")
                    model_ver = ml_result.get("model_version", "1.0.0-prototype")
                    
                    msg = (
                        f"ML Anomaly Detected: {status} (Score: {anomaly_score:.2f}). "
                        f"Model: {model_name} v{model_ver} [Prototype Baseline]."
                    )
                    generated_alerts.append(Alert(
                        severity="WARNING" if anomaly_score < 0.85 else "CRITICAL",
                        source="ML_ISOLATION_FOREST",
                        parameter="sensor_anomaly",
                        message=msg,
                        value=f"score: {anomaly_score:.2f}"
                    ))

        # Persist generated alerts
        for alert in generated_alerts:
            db.add(alert)
        if generated_alerts:
            db.commit()

        return generated_alerts

    def check_esp32_watchdog(self, db: Session, last_reading_time: Optional[datetime]) -> Optional[Alert]:
        """Checks if ESP32 has gone offline based on heartbeat timeout."""
        if last_reading_time is None:
            return None
        
        elapsed_seconds = (datetime.utcnow() - last_reading_time).total_seconds()
        if elapsed_seconds > settings.ESP32_OFFLINE_TIMEOUT_SECONDS:
            cutoff = datetime.utcnow() - timedelta(minutes=self.dedup_window_minutes)
            existing = db.query(Alert).filter(
                Alert.parameter == "esp32_offline",
                Alert.status == "ACTIVE",
                Alert.timestamp >= cutoff
            ).first()
            if not existing:
                alert = Alert(
                    severity="WARNING",
                    source="WATCHDOG",
                    parameter="esp32_offline",
                    message=f"ESP32 node offline: No telemetry received for {int(elapsed_seconds)} seconds.",
                    value=f"{int(elapsed_seconds)}s"
                )
                db.add(alert)
                db.commit()
                return alert
        return None

alert_engine = AlertEngine()
