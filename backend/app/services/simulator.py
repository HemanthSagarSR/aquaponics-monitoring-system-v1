"""
Aquaponics Simulator Service (Demo Mode).
Provides realistic biological data generation for DEMO MODE and optional database seeding.
Simulates diurnal cycles (temperature, photosynthetic pH shifts, humidity).

DATA INTEGRITY ASSURANCE:
All simulated data is tagged with `is_demo=True` and `source="demo"`.
Live hardware data from ESP32 is tagged with `is_demo=False` and `source="esp32_live"`.
When APP_MODE == "live", the background simulator loop remains idle.
"""

import asyncio
import math
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.config import settings
from app.database import SessionLocal
from app.models.orm_models import (
    SensorReading, PlantObservation, FishObservation, MLPrediction, Alert, SystemStatus
)
from app.ml.sensor_anomaly import sensor_ml_engine
from app.services.alert_engine import alert_engine
from app.services.websocket_manager import ws_manager

class AquaponicsSimulator:
    def __init__(self):
        self.is_running = False
        self.step_counter = 0

    def seed_initial_history(self, hours: int = 48):
        """
        Populates SQLite database with realistic historical telemetry across the past N hours
        if the database is empty. Ensures historical graphs (1h, 6h, 24h, 7d) are populated for UI testing.
        All seeded records are tagged with is_demo=True and source="demo".
        """
        db: Session = SessionLocal()
        try:
            count = db.query(SensorReading).count()
            if count > 20:
                print(f"[Simulator] Database already populated with {count} sensor readings. Skipping seed.")
                return

            print(f"[Simulator] Seeding initial {hours} hours of aquaponics telemetry (DEMO TAGGED)...")
            now = datetime.utcnow()
            readings = []

            interval_minutes = 15
            total_points = (hours * 60) // interval_minutes

            for i in range(total_points):
                point_time = now - timedelta(minutes=(total_points - i) * interval_minutes)
                
                # Diurnal cycle calculation
                hour_of_day = point_time.hour + point_time.minute / 60.0
                diurnal_rad = (hour_of_day / 24.0) * 2 * math.pi
                
                # Air temperature peaks around 14:00 (phase shift)
                air_temp = 24.5 + 4.0 * math.sin(diurnal_rad - 2.5) + random.uniform(-0.4, 0.4)
                # Water temperature has higher thermal mass (damped and delayed)
                water_temp = 23.8 + 1.8 * math.sin(diurnal_rad - 3.5) + random.uniform(-0.15, 0.15)
                # pH rises during peak daylight photosynthesis (CO2 uptake)
                ph = 6.95 + 0.35 * math.sin(diurnal_rad - 2.8) + random.uniform(-0.04, 0.04)
                # Humidity inversely related to air temperature
                humidity = 68.0 - 14.0 * math.sin(diurnal_rad - 2.5) + random.uniform(-1.0, 1.0)
                # Water level slight evaporation loss
                water_level = 88.0 - (i / float(total_points)) * 6.0 + random.uniform(-0.5, 0.5)

                raw_adc_lvl = int(300 + (water_level / 100.0) * 2500)
                raw_ph_v = round((ph - 15.54) / -5.70, 3)

                r = SensorReading(
                    timestamp=point_time,
                    device_id="ESP32_AQUA_01",
                    water_temperature=round(water_temp, 2),
                    ph=round(ph, 2),
                    ph_raw_voltage=raw_ph_v,
                    air_temperature=round(air_temp, 2),
                    humidity=round(humidity, 1),
                    water_level=round(water_level, 1),
                    water_level_raw=raw_adc_lvl,
                    float_status="SAFE",
                    wifi_rssi=-62 + random.randint(-4, 4),
                    uptime_seconds=3600 + i * 900,
                    is_demo=True,
                    source="demo",
                    raw_payload="{}"
                )
                readings.append(r)

            db.bulk_save_objects(readings)
            db.commit()

            # Seed sample manual plant observations across the past 14 days
            print("[Simulator] Seeding manual plant growth observation records...")
            plants_seed = []
            plant_ids = ["BED-A-01", "BED-A-02", "BED-B-01"]
            species = "Lactuca sativa (Butterhead Lettuce)"
            
            for pid in plant_ids:
                base_height = 4.5 if pid != "BED-B-01" else 5.2
                base_leaves = 4
                base_canopy = 5.0

                for day_offset in range(14, 0, -2):
                    obs_time = now - timedelta(days=day_offset, hours=random.randint(9, 16))
                    days_grown = 14 - day_offset
                    h = round(base_height + days_grown * 0.95 + random.uniform(-0.3, 0.3), 1)
                    l = int(base_leaves + days_grown * 0.65)
                    c = round(base_canopy + days_grown * 1.1 + random.uniform(-0.4, 0.4), 1)
                    
                    plants_seed.append(PlantObservation(
                        timestamp=obs_time,
                        plant_id=pid,
                        species_name=species,
                        height_cm=h,
                        leaf_count=l,
                        canopy_width_cm=c,
                        visual_health="VIGOROUS" if days_grown > 6 else "HEALTHY",
                        chlorosis_observation="NONE",
                        growth_rate_cm_day=0.95,
                        leaf_growth_rate_day=0.65,
                        notes="Manual measurement: healthy root mat, no leaf tip burn.",
                        observer_name="Research Team"
                    ))

            db.bulk_save_objects(plants_seed)
            db.commit()

            # Seed an initial manual fish observation
            fish_obs = FishObservation(
                timestamp=now - timedelta(hours=3),
                fish_count=24,
                feeding_response="AGGRESSIVE",
                mortality_count=0,
                behaviour_notes="Normal schooling activity in middle water column. Vigorous surface feed response.",
                observer_name="Research Team"
            )
            db.add(fish_obs)
            db.commit()

            print(f"[Simulator] Seed complete. {len(readings)} readings and {len(plants_seed)} plant observations stored.")
        except Exception as e:
            db.rollback()
            print(f"[Simulator] Error seeding initial data: {e}")
        finally:
            db.close()

    async def run_simulation_loop(self):
        """
        Background simulation loop generating a periodic telemetry point every 5 seconds.
        Only runs when settings.APP_MODE == 'demo'.
        All readings are marked with is_demo=True and source='demo'.
        """
        self.is_running = True
        print("[Simulator] Background simulation loop started.")

        while self.is_running:
            try:
                # If app is configured in LIVE HARDWARE mode, pause simulation loop
                if settings.APP_MODE.lower() != "demo":
                    await asyncio.sleep(2)
                    continue

                self.step_counter += 1
                now = datetime.utcnow()
                hour_of_day = now.hour + now.minute / 60.0 + now.second / 3600.0
                diurnal_rad = (hour_of_day / 24.0) * 2 * math.pi

                # Diurnal values with light jitter
                air_temp = 24.5 + 3.5 * math.sin(diurnal_rad - 2.5) + random.uniform(-0.2, 0.2)
                water_temp = 23.8 + 1.5 * math.sin(diurnal_rad - 3.5) + random.uniform(-0.08, 0.08)
                ph = 6.95 + 0.3 * math.sin(diurnal_rad - 2.8) + random.uniform(-0.03, 0.03)
                humidity = 66.0 - 12.0 * math.sin(diurnal_rad - 2.5) + random.uniform(-0.5, 0.5)
                water_level = 84.5 + random.uniform(-0.4, 0.4)

                raw_adc = int(300 + (water_level / 100.0) * 2500)
                raw_ph_voltage = round((ph - 15.54) / -5.70, 3)

                reading_dict = {
                    "water_temperature": round(water_temp, 2),
                    "ph": round(ph, 2),
                    "air_temperature": round(air_temp, 2),
                    "humidity": round(humidity, 1),
                    "water_level": round(water_level, 1)
                }

                ml_res = sensor_ml_engine.predict(reading_dict)

                db: Session = SessionLocal()
                try:
                    reading = SensorReading(
                        timestamp=now,
                        device_id="ESP32_AQUA_01",
                        water_temperature=reading_dict["water_temperature"],
                        ph=reading_dict["ph"],
                        ph_raw_voltage=raw_ph_voltage,
                        air_temperature=reading_dict["air_temperature"],
                        humidity=reading_dict["humidity"],
                        water_level=reading_dict["water_level"],
                        water_level_raw=raw_adc,
                        float_status="SAFE",
                        wifi_rssi=-58,
                        uptime_seconds=self.step_counter * 5,
                        is_demo=True,
                        source="demo",
                        raw_payload="{}"
                    )
                    db.add(reading)
                    db.commit()
                    db.refresh(reading)

                    # Evaluate alerts
                    alerts = alert_engine.evaluate_reading(db, reading_dict, ml_res)

                    # Update system status heartbeat
                    esp_status = db.query(SystemStatus).filter(SystemStatus.component == "ESP32").first()
                    if not esp_status:
                        esp_status = SystemStatus(
                            component="ESP32",
                            status="ONLINE (DEMO)",
                            last_heartbeat=now,
                            details="Simulated demo feed active"
                        )
                        db.add(esp_status)
                    else:
                        esp_status.status = "ONLINE (DEMO)"
                        esp_status.last_heartbeat = now
                    db.commit()

                    # Broadcast over WebSocket
                    await ws_manager.broadcast("sensor_reading", {
                        "id": reading.id,
                        "timestamp": reading.timestamp.isoformat(),
                        "device_id": reading.device_id,
                        "water_temperature": reading.water_temperature,
                        "ph": reading.ph,
                        "ph_raw_voltage": reading.ph_raw_voltage,
                        "air_temperature": reading.air_temperature,
                        "humidity": reading.humidity,
                        "water_level": reading.water_level,
                        "water_level_raw": reading.water_level_raw,
                        "float_status": reading.float_status,
                        "wifi_rssi": reading.wifi_rssi,
                        "uptime_seconds": reading.uptime_seconds,
                        "is_demo": True,
                        "source": "demo",
                        "ml_prediction": {
                            "status": ml_res["status"],
                            "anomaly_score": ml_res["anomaly_score"]
                        }
                    })

                    for a in alerts:
                        await ws_manager.broadcast("new_alert", {
                            "id": a.id,
                            "severity": a.severity,
                            "source": a.source,
                            "parameter": a.parameter,
                            "message": a.message,
                            "value": a.value,
                            "timestamp": a.timestamp.isoformat()
                        })

                finally:
                    db.close()

            except Exception as e:
                print(f"[Simulator] Error in simulation loop: {e}")

            await asyncio.sleep(5)

simulator = AquaponicsSimulator()
