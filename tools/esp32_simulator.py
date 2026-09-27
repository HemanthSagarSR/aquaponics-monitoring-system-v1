#!/usr/bin/env python3
"""
ESP32 Telemetry Bench Simulator (V1).
Simulates physical ESP32 HTTP POST telemetry to the FastAPI backend over local network/localhost.
Used for bench testing and integration validation when physical ESP32 hardware is not plugged in.

Features:
- Periodic telemetry transmission (default 5 seconds).
- Simulates DS18B20, analog pH, DHT11, water level ADC, and P31 float switch.
- Tags all transmitted data with `source: "simulator"` and `is_demo: True`.
- Supports manual anomaly injection (--anomaly flag) to verify alert engine and ML baseline.
"""

import sys
import time
import math
import random
import argparse
import requests
from datetime import datetime

def run_simulator(host: str, port: int, interval: float, device_id: str, inject_anomaly: bool):
    url = f"http://{host}:{port}/api/v1/sensors/readings"
    print("=" * 60)
    print("      ESP32 HARDWARE BENCH SIMULATOR - V1 CLEAN       ")
    print(f" Target: {url}")
    print(f" Interval: {interval}s | Device: {device_id}")
    print(f" Anomaly Mode: {'ACTIVE' if inject_anomaly else 'OFF'}")
    print("=" * 60)

    step = 0
    while True:
        step += 1
        now = datetime.utcnow()
        hour_frac = (now.hour + now.minute / 60.0) / 24.0
        rad = hour_frac * 2 * math.pi

        # Normal diurnal baseline values
        water_temp = 24.2 + 1.4 * math.sin(rad - 3.2) + random.uniform(-0.1, 0.1)
        ph = 6.95 + 0.25 * math.sin(rad - 2.8) + random.uniform(-0.03, 0.03)
        air_temp = 25.0 + 3.5 * math.sin(rad - 2.5) + random.uniform(-0.2, 0.2)
        humidity = 64.0 - 10.0 * math.sin(rad - 2.5) + random.uniform(-0.5, 0.5)
        water_level = 82.0 + random.uniform(-0.3, 0.3)
        float_status = "SAFE"

        # If anomaly injection is requested
        if inject_anomaly and step % 4 == 0:
            print("[SIMULATOR] >> Injecting test sensor anomaly (extreme pH drift & float alert)...")
            ph = 8.75  # Critical alkaline breach
            water_temp = 34.5 # Critical high water temp
            water_level = 18.0 # Sump critically low
            float_status = "ALERT"

        raw_adc_lvl = int(300 + (water_level / 100.0) * 2500)
        raw_ph_voltage = round((ph - 15.54) / -5.70, 3)

        payload = {
            "device_id": device_id,
            "timestamp": now.isoformat(),
            "water_temperature": round(water_temp, 2),
            "ph": round(ph, 2),
            "ph_raw_voltage": raw_ph_voltage,
            "air_temperature": round(air_temp, 2),
            "humidity": round(humidity, 1),
            "water_level": round(water_level, 1),
            "water_level_raw": raw_adc_lvl,
            "float_status": float_status,
            "wifi_rssi": -58 + random.randint(-3, 3),
            "uptime_seconds": step * int(interval),
            "source": "simulator",
            "is_demo": True
        }

        try:
            res = requests.post(url, json=payload, timeout=4.0)
            if res.status_code == 200:
                data = res.json()
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Telemetry Sent -> ID: {data.get('reading_id')} | ML: {data.get('ml_status')} (Score: {data.get('anomaly_score')})")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] HTTP Error {res.status_code}: {res.text}")
        except requests.exceptions.RequestException as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Backend unreachable: {e}")

        time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description="ESP32 Telemetry Bench Simulator")
    parser.add_argument("--host", default="localhost", help="FastAPI backend host (default: localhost)")
    parser.add_argument("--port", type=int, default=8000, help="FastAPI backend port (default: 8000)")
    parser.add_argument("--interval", type=float, default=5.0, help="Transmission interval in seconds (default: 5.0)")
    parser.add_argument("--device", default="SIMULATOR_ESP32_01", help="Device ID string")
    parser.add_argument("--anomaly", action="store_true", help="Inject periodic anomalies to test alerts")
    args = parser.parse_args()

    try:
        run_simulator(args.host, args.port, args.interval, args.device, args.anomaly)
    except KeyboardInterrupt:
        print("\n[Simulator] Stopped by user.")
        sys.exit(0)

if __name__ == "__main__":
    main()
