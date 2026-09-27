"""
Automated Test Suite for Aquaponics Monitoring System V1.
Verifies all required REST endpoints, manual plant growth tracking,
baseline ML anomaly detection, rule-based alerts, and system health diagnostics.
Strictly verifies that no Raspberry Pi or computer vision components exist.
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db
from app.ml.sensor_anomaly import sensor_ml_engine

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Ensure database and ML models are initialized before running tests."""
    init_db()
    sensor_ml_engine.load_model()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_root_and_api_info(client):
    """Test root and api information endpoints."""
    response = client.get("/")
    assert response.status_code == 200
    
    api_resp = client.get("/api")
    if api_resp.status_code == 200:
        data = api_resp.json()
    else:
        data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "version" in data
    assert "Raspberry" not in str(data)

def test_ingest_sensor_reading_and_ml_inference(client):
    """Test ingestion of valid sensor payload from physical ESP32 or simulator."""
    payload = {
        "device_id": "TEST_ESP32_01",
        "water_temperature": 24.6,
        "ph": 6.85,
        "ph_raw_voltage": 1.52,
        "air_temperature": 25.1,
        "humidity": 64.2,
        "water_level": 82.0,
        "water_level_raw": 2350,
        "float_status": "SAFE",
        "wifi_rssi": -62,
        "uptime_seconds": 120,
        "source": "esp32_live",
        "is_demo": False
    }
    response = client.post("/api/v1/sensors/readings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "reading_id" in data
    assert data["ml_status"] in ["NORMAL", "REQUIRES_OBSERVATION", "UNUSUAL_PATTERN", "ENVIRONMENTAL_ANOMALY"]
    assert 0.0 <= data["anomaly_score"] <= 1.0

def test_sensor_latest_and_history(client):
    """Test fetching latest sensor reading and historical window."""
    # Latest
    latest_resp = client.get("/api/v1/sensors/latest")
    assert latest_resp.status_code == 200
    latest_data = latest_resp.json()
    assert "water_temperature" in latest_data
    assert "ph" in latest_data
    assert "water_level" in latest_data
    assert "float_status" in latest_data

    # History 24h
    history_resp = client.get("/api/v1/sensors/history?range=24h&limit=50")
    assert history_resp.status_code == 200
    history_data = history_resp.json()
    assert isinstance(history_data, list)
    assert len(history_data) > 0

def test_rule_based_alert_trigger_and_resolution(client):
    """Test triggering critical alerts (extreme temperature + float alert), acknowledging, and resolving."""
    critical_payload = {
        "device_id": "TEST_ESP32_ALERT",
        "water_temperature": 35.5,  # Exceeds critical 32.0°C
        "ph": 8.6,                 # Exceeds critical 8.2
        "air_temperature": 32.0,
        "humidity": 45.0,
        "water_level": 15.0,        # Below critical 25.0%
        "float_status": "ALERT",    # Emergency float triggered
        "source": "esp32_live",
        "is_demo": False
    }
    resp = client.post("/api/v1/sensors/readings", json=critical_payload)
    assert resp.status_code == 200

    # Verify alerts list contains critical alerts
    alerts_resp = client.get("/api/v1/alerts?status=ACTIVE")
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    assert len(alerts) > 0
    params = [a["parameter"] for a in alerts]
    assert "water_temperature" in params or "float_switch" in params

    # Acknowledge an alert
    target_alert = alerts[0]
    ack_resp = client.post(f"/api/v1/alerts/{target_alert['id']}/acknowledge")
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"

    # Resolve the alert
    res_resp = client.post(f"/api/v1/alerts/{target_alert['id']}/resolve")
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "RESOLVED"

def test_ml_status_and_predict(client):
    """Test ML diagnostic metadata and on-demand inference endpoint."""
    status_resp = client.get("/api/v1/ml/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "RUNNING"
    assert len(status_data["active_models"]) > 0
    model_info = status_data["active_models"][0]
    assert "prototype" in model_info["version"].lower() or "prototype" in model_info["model_role"].lower()
    assert "accuracy_claim" in model_info

    predict_req = {
        "water_temperature": 24.2,
        "ph": 6.9,
        "air_temperature": 24.5,
        "humidity": 65.0,
        "water_level": 85.0
    }
    predict_resp = client.post("/api/v1/ml/predict", json=predict_req)
    assert predict_resp.status_code == 200
    pred = predict_resp.json()
    assert "status" in pred
    assert "anomaly_score" in pred
    assert "model_name" in pred

def test_manual_plant_observations_flow(client):
    """Test recording manual plant growth observations and growth rate calculations."""
    import uuid
    unique_plant_id = f"PLANT-{uuid.uuid4().hex[:6]}"
    t1 = datetime.utcnow() - timedelta(days=2)
    obs1 = {
        "plant_id": unique_plant_id,
        "species_name": "Lactuca sativa",
        "timestamp": t1.isoformat(),
        "height_cm": 8.0,
        "leaf_count": 6,
        "canopy_width_cm": 9.5,
        "visual_health": "HEALTHY",
        "chlorosis_observation": "NONE",
        "notes": "Initial test transplant",
        "observer_name": "Alice"
    }
    r1 = client.post("/api/v1/plants/observations", json=obs1)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["height_cm"] == 8.0
    assert d1["growth_rate_cm_day"] is None  # First reading has no delta

    # Second reading 2 days later
    t2 = datetime.utcnow()
    obs2 = {
        "plant_id": unique_plant_id,
        "species_name": "Lactuca sativa",
        "timestamp": t2.isoformat(),
        "height_cm": 10.4,
        "leaf_count": 8,
        "canopy_width_cm": 12.0,
        "visual_health": "VIGOROUS",
        "chlorosis_observation": "NONE",
        "notes": "Good root expansion",
        "observer_name": "Alice"
    }
    r2 = client.post("/api/v1/plants/observations", json=obs2)
    assert r2.status_code == 200
    d2 = r2.json()
    assert d2["height_cm"] == 10.4
    # Height grew from 8.0 to 10.4 over 2 days -> ~1.2 cm/day
    assert d2["growth_rate_cm_day"] is not None
    assert 1.0 <= d2["growth_rate_cm_day"] <= 1.4

    # Query history
    hist_resp = client.get(f"/api/v1/plants/history?plant_id={unique_plant_id}")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    assert len(hist) >= 2

def test_analytics_endpoint(client):
    """Test analytics correlation calculations."""
    resp = client.get("/api/v1/analytics?days=14")
    assert resp.status_code == 200
    data = resp.json()
    assert "correlations" in data
    assert "scientific_disclaimer" in data
    assert "water_temp_vs_plant_growth" in data["correlations"]
    assert "air_temp_vs_water_temp" in data["correlations"]

def test_system_status_and_no_raspberry_pi(client):
    """Verify system diagnostics and ensure zero Raspberry Pi references exist."""
    status_resp = client.get("/api/v1/system/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "components" in data
    assert "esp32" in data["components"]
    assert "backend_server" in data["components"]
    assert "database" in data["components"]
    assert "ml_engine" in data["components"]
    
    # Strictly check that raspberry_pi and cameras are NOT in components
    assert "raspberry_pi" not in data["components"]
    assert "plant_camera" not in data["components"]
    assert "fish_camera" not in data["components"]

def test_optional_fish_observations(client):
    """Test manual fish health and feeding observation logging."""
    obs = {
        "fish_count": 22,
        "feeding_response": "AGGRESSIVE",
        "mortality_count": 0,
        "behaviour_notes": "Normal mid-tank swimming",
        "observer_name": "Bob"
    }
    resp = client.post("/api/v1/fish/observations", json=obs)
    assert resp.status_code == 200
    data = resp.json()
    assert data["fish_count"] == 22
    assert data["feeding_response"] == "AGGRESSIVE"

    hist_resp = client.get("/api/v1/fish/history")
    assert hist_resp.status_code == 200
    assert len(hist_resp.json()) > 0
