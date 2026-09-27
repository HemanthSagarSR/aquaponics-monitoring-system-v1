# Aquaponics Monitoring System — V1

An experimental IoT-driven aquaponics monitoring platform designed as a modular local development system and research baseline. An **ESP32 microcontroller** acquires raw sensor telemetry from physical water and environmental sensors, transmitting JSON payloads over local Wi-Fi to a **FastAPI backend** running on the development computer. The backend persists data in **SQLite**, manages a rule-based and prototype baseline machine learning alert engine, and serves a responsive **React + TypeScript + Vite frontend**. Plant growth, morphological metrics, and visual health are **manually recorded and analyzed** by researchers.

> [!IMPORTANT]
> **V1 Architectural Boundaries & Explicit Guarantees**:
> - **No Raspberry Pi**: No Raspberry Pi hardware, operating system images, camera drivers, or deployment configurations are used in V1.
> - **No Automated Plant Computer Vision**: There are no camera modules, automated plant CV pipelines, or deep-learning vision models. Plant health and growth are recorded manually.
> - **Baseline Prototype ML**: Anomaly detection utilizes a baseline scikit-learn Isolation Forest model. It is an experimental prototype and is **not** research-validated.
> - **Hardware Bench Calibration Required**: All sensors (particularly analog pH and water level) require physical calibration against standards before data can be treated as experimentally valid.
> - **Data Segregation**: Demo/simulated data is strictly flagged (`source: "demo"`, `is_demo: true`) and must never be treated as empirical research data.

---

## 1. V1 System Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │                    PHYSICAL SENSORS                    │
 │  - DS18B20 Waterproof Temp Probe (GPIO 4 - OneWire)    │
 │  - Analog pH Sensor Board (GPIO 34 - ADC1)             │
 │  - Analog Water Level Sensor (GPIO 35 - ADC1)          │
 │  - DHT11 Air Temp & Humidity (GPIO 15)                 │
 │  - P31 Mechanical Float Switch (GPIO 13 - Pullup)      │
 │  - Status LED Indicator (GPIO 2)                       │
 └───────────────────────────┬────────────────────────────┘
                             │
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │                  ESP32 HARDWARE NODE                   │
 │  - Non-blocking sensor acquisition & interval polling  │
 │  - Analog-to-digital reading & voltage tracking        │
 │  - Wi-Fi connection manager with auto-reconnect        │
 │  - Offline RAM FIFO buffer (resilience during drops)   │
 │  - Formats JSON telemetry & sends HTTP POST requests   │
 └───────────────────────────┬────────────────────────────┘
                             │ Local Wi-Fi / HTTP POST
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │       FASTAPI BACKEND (HOST DEVELOPMENT COMPUTER)      │
 │  ┌──────────────────────────────────────────────────┐  │
 │  │ REST API Endpoints                               │  │
 │  │ - POST /api/v1/sensors/readings                  │  │
 │  │ - GET  /api/v1/sensors/latest & history          │  │
 │  │ - POST /api/v1/plants/observations (Manual)      │  │
 │  │ - GET  /api/v1/plants/history & summary          │  │
 │  │ - GET  /api/v1/alerts & acknowledge/resolve      │  │
 │  │ - GET  /api/v1/analytics                         │  │
 │  │ - GET  /api/v1/ml/status & POST /predict         │  │
 │  │ - WebSocket /ws (Live Telemetry Broadcast)       │  │
 │  └────────────────────────┬─────────────────────────┘  │
 │                           │                            │
 │         ┌─────────────────┴─────────────────┐          │
 │         ▼                                   ▼          │
 │  ┌──────────────┐                 ┌──────────────────┐ │
 │  │ SQLite DB    │                 │ Intelligence     │ │
 │  │ Storage      │                 │ - Rule Engine    │ │
 │  │ - Readings   │                 │ - Isolation      │ │
 │  │ - Plants     │                 │   Forest ML      │ │
 │  │ - Alerts     │                 │   (Baseline)     │ │
 │  │ - Status     │                 │ - Analytics      │ │
 │  └──────────────┘                 └──────────────────┘ │
 └───────────────────────────┬────────────────────────────┘
                             │ REST + WebSocket
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │           REACT + TYPESCRIPT + VITE FRONTEND           │
 │  - Dashboard: Live metrics, ESP32 status & alerts      │
 │  - Water Monitoring: Live cards, time-series charts    │
 │  - Plant Growth: Manual entry form & growth trends     │
 │  - Analytics: Cross-domain correlation plots           │
 │  - Alerts: Active & historical severity management     │
 │  - System Settings: Pinout, safety guides & mode toggle│
 │  - Fish Tank: Optional manual feeding & health log     │
 └────────────────────────────────────────────────────────┘
```

---

## 2. Confirmed Hardware & Wiring Pinout

Only confirmed V1 hardware components are supported:

| Component / Sensor | Signal Type | ESP32 GPIO Pin | Power Supply | Critical Connection Notes |
| :--- | :--- | :--- | :--- | :--- |
| **DS18B20 Temp Probe** | OneWire (Digital) | **GPIO 4** | 3.3V or 5V | Requires **4.7kΩ pull-up resistor** between DQ (data) and 3.3V. |
| **DHT11 Air Temp & Hum** | Single-Bus (Digital)| **GPIO 15** | 3.3V | Ambient greenhouse/grow bed air monitoring. |
| **Analog pH Sensor Board** | Analog Voltage (ADC) | **GPIO 34 (ADC1_CH6)** | 5.0V (VCC), GND | **CRITICAL SAFETY**: ESP32 ADC accepts **max 3.3V**. Standard 5V boards output up to 4.2V. Voltage divider or level shifter required (see Section 3). |
| **Water Level Sensor** | Analog Voltage (ADC) | **GPIO 35 (ADC1_CH7)** | 3.3V | Sump basin level tracking. Firmware reports raw ADC (0–4095) with linear percentage calibration bounds. |
| **P31 Float Switch** | Contact Closure | **GPIO 13** | GND | Configured with `INPUT_PULLUP`. Pulls to GND on emergency low-water breach. |
| **Built-in Status LED** | Digital Output | **GPIO 2** | Built-in | Blinks on Wi-Fi connection attempt and solid on successful transmission. |

---

## 3. Hardware Safety & Electrical Integrity Protocols

> [!WARNING]
> ### 1. Analog pH Sensor Voltage Safety (ESP32 3.3V Maximum)
> Many commercial analog pH conditioning modules require 5.0V VCC to power their operational amplifiers. In acidic solutions, the analog output voltage can reach 4.0V–5.0V.
> **Directly connecting voltages above 3.3V to GPIO 34 will permanently destroy the ESP32 ADC.**
> **Required Bench Verification:**
> 1. Power the pH module with 5.0V on a breadboard.
> 2. Submerge the glass probe into pH 4.01 and pH 7.00 calibration buffer solutions.
> 3. Verify output voltage with a multimeter.
> 4. If the voltage ever exceeds 3.3V, you must install a precision resistor divider (e.g., $10\text{k}\Omega$ / $20\text{k}\Omega$) or an active 3.3V level shifter before connecting to GPIO 34.

> [!IMPORTANT]
> ### 2. Water Level Sensor Calibration
> Analog water level sensors vary with water ionic conductivity and tank geometry.
> - The firmware acquires raw ADC readings ($0 - 4095$) and computes percentage against `WATER_LEVEL_MIN_ADC` and `WATER_LEVEL_MAX_ADC`.
> - Measure the sensor dry and fully submerged, then configure these calibration constants in `esp32/aquaponics_esp32_firmware/config.h`.

> [!CAUTION]
> ### 3. Wi-Fi Credential Security
> Network credentials must never be committed to Git. The ESP32 credentials are kept in `esp32/aquaponics_esp32_firmware/config.h`, which is explicitly excluded in `.gitignore`. A template file `config.example.h` is provided.

---

## 4. Software Stack

- **Firmware**: Arduino C++ for ESP32 with modular `SensorManager` and `NetworkManager`.
- **Backend**: Python 3.11, **FastAPI**, **Uvicorn**, **SQLAlchemy**, **Pydantic v2**.
- **Database**: **SQLite** via SQLAlchemy ORM (`backend/data/aquaponics.db`).
- **Machine Learning**: **scikit-learn** (Isolation Forest prototype baseline).
- **Frontend**: **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, Lucide React icons.
- **Testing**: **pytest**, **httpx**.

---

## 5. Manual Plant Growth Monitoring Workflow

Instead of automated computer vision, plant morphology and health are inspected manually by researchers and logged into the application:

1. **Parameters Recorded**:
   - **Plant ID**: Unique identifier for the plant/channel (e.g. `PLANT-A-01`).
   - **Species / Botanical Name**: e.g. *Lactuca sativa (Butterhead Lettuce)*.
   - **Measurement Date & Time**: Timestamp of observation.
   - **Height (cm)**: Measured with a ruler from stem base to apex.
   - **Leaf Count**: Number of fully developed true leaves.
   - **Canopy Width (cm)**: Maximum horizontal leaf spread.
   - **Visual Health Rating**: `HEALTHY`, `VIGOROUS`, `STUNTED`, `WILTING`, `PEST_DAMAGE`.
   - **Chlorosis Observation**: `NONE`, `MILD`, `MODERATE`, `SEVERE`.
   - **Observation Notes**: Qualitative observations (root color, tip burn, pest signs).
   - **Observer Name**: Student or researcher recording the data.

2. **Automated Calculations**:
   - The backend computes **date-to-date growth rates** ($\Delta\text{height} / \Delta\text{days}$ in cm/day, and leaves/day).
   - Historical trendlines display linear growth dynamics and compare individual plants.

---

## 6. Machine Learning Anomaly Detection (Baseline Prototype)

The system includes a modular sensor anomaly detection engine based on `scikit-learn`'s **Isolation Forest**:
- **Monitored Features**: Co-variance between `water_temperature`, `ph`, `air_temperature`, `humidity`, and `water_level`.
- **Status & Scoring**: Computes a normalized anomaly score from 0.0 (nominal) to 1.0 (extreme statistical deviation).
- **Classification Categories**: `NORMAL`, `REQUIRES_OBSERVATION`, `UNUSUAL_PATTERN`, `ENVIRONMENTAL_ANOMALY`, `SENSOR_ANOMALY`.
- **Model Metadata**: Stored in `backend/data/models/metadata.json` documenting versioning, training dataset bounds, and feature requirements.

> [!NOTE]
> **Prototype Baseline Disclaimer**:
> This model is an experimental baseline trained on theoretical aquaponics boundaries. It has **not** been validated against empirical physical sensor logs from this specific hardware rig. Model predictions must be treated as diagnostic aids and verified against physical bench measurements.

---

## 7. Alerts & Analytics

- **Alert Engine**: Evaluates thresholds on every sensor reading:
  - Critical pH (< 6.0 or > 8.0) and Warning pH (< 6.5 or > 7.5).
  - Water Temperature Low (< 18°C) and High (> 30°C).
  - Low Water Level (< 20%) and High Water Level (> 95%).
  - Mechanical P31 Float Switch emergency breach (`CRITICAL`).
  - ESP32 Heartbeat Watchdog: triggers if no telemetry received for > 60 seconds.
- **Analytics**: Calculates Pearson cross-correlations between water parameters (temperature, pH) and manual plant growth rates (height delta per day). Supports CSV export.

---

## 8. Project Structure

```text
aquaponics-monitoring-system-v1/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── config.py               # Settings & environmental thresholds
│   │   ├── database.py             # SQLite database engine & session
│   │   ├── main.py                 # FastAPI application entrypoint & lifespan
│   │   ├── models/
│   │   │   ├── orm_models.py       # SQLAlchemy database tables
│   │   │   └── schemas.py          # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── sensors.py          # /api/v1/sensors (telemetry & history)
│   │   │   ├── plants.py           # /api/v1/plants (manual observation log)
│   │   │   ├── alerts.py           # /api/v1/alerts (active & history)
│   │   │   ├── analytics.py        # /api/v1/analytics (correlations & export)
│   │   │   ├── system.py           # /api/v1/system (heartbeat & mode)
│   │   │   ├── ml.py               # /api/v1/ml (model status & predict)
│   │   │   └── fish.py             # /api/v1/fish (optional manual fish log)
│   │   ├── services/
│   │   │   ├── alert_engine.py     # Rule-based & ML alert evaluation
│   │   │   ├── simulator.py        # Realistic bench simulator (Demo mode)
│   │   │   └── websocket_manager.py # Real-time client broadcasting
│   │   └── ml/
│   │       ├── sensor_anomaly.py   # In-memory Isolation Forest engine
│   │       └── train_baseline.py   # Baseline model training script
│   ├── tests/
│   │   └── test_api.py             # Automated test suite (9 test modules)
│   ├── requirements.txt            # Python dependencies (clean UTF-8)
│   └── run.py                      # Backend launcher script
│
├── frontend/                       # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── components/             # Reusable UI widgets & charts
│   │   │   ├── Navbar.tsx          # Navigation header & live status
│   │   │   ├── StatusHeader.tsx    # Hardware health & latency strip
│   │   │   ├── StatCard.tsx        # Metric display card with bounds
│   │   │   ├── TrendChart.tsx      # SVG time-series chart with bounds
│   │   │   └── AlertsDrawer.tsx    # Slide-over quick alert panel
│   │   ├── pages/                  # Application views
│   │   │   ├── Dashboard.tsx       # Live overview of all physical sensors
│   │   │   ├── WaterMonitoring.tsx # Water sensor cards & history charts
│   │   │   ├── PlantMonitoring.tsx # Manual plant data entry & trends
│   │   │   ├── Analytics.tsx       # Sensor-growth cross-correlations
│   │   │   ├── Alerts.tsx          # Comprehensive alerts dashboard
│   │   │   ├── FishMonitoring.tsx  # Optional manual fish tank log
│   │   │   └── SystemSettings.tsx  # Pinout, electrical safety & mode toggle
│   │   ├── services/
│   │   │   ├── api.ts              # REST API client
│   │   │   └── websocket.ts        # Live WebSocket telemetry client
│   │   ├── types.ts                # TypeScript interfaces
│   │   └── App.tsx                 # Main layout & route orchestrator
│   └── package.json
│
├── esp32/                          # ESP32 IoT Node Firmware (C++)
│   ├── README.md                   # Pinout diagram, safety & wiring guide
│   └── aquaponics_esp32_firmware/
│       ├── aquaponics_esp32_firmware.ino # Main Arduino setup & loop
│       ├── config.example.h        # Configuration template
│       ├── SensorManager.h         # Physical sensor reading & validation
│       └── NetworkManager.h        # Wi-Fi client & offline FIFO buffer
│
├── tools/
│   └── esp32_simulator.py          # Python bench simulator for hardware testing
│
├── start_system.ps1                # PowerShell launcher for Windows
├── start_system.sh                 # Bash launcher for Linux/macOS
├── .gitignore                      # Git exclusion rules
└── README.md                       # Project documentation
```

---

## 9. Setup & Quickstart Guide

### Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** and **npm**
- **Arduino IDE** (or PlatformIO) with the **ESP32 Board Package**

---

### Step 1: Backend Setup & Testing

1. Open a terminal in the project directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows PowerShell:
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux/macOS:
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the automated test suite:
   ```bash
   python -m pytest -v
   ```
   *Expected: All 9 test modules pass.*

5. Launch the backend:
   ```bash
   python run.py
   ```
   *Backend runs at `http://127.0.0.1:8000` (API documentation at `http://127.0.0.1:8000/docs`).*

---

### Step 2: Frontend Setup

1. Open a second terminal and navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Build production assets:
   ```bash
   npm run build
   ```
   *The compiled distribution in `frontend/dist` is served directly by FastAPI at `http://localhost:8000`.*

3. (Optional) Run the Vite development server with hot module reloading:
   ```bash
   npm run dev
   ```
   *Vite dev server runs at `http://localhost:5173`.*

---

### Step 3: Bench Testing (Demo Mode / Simulator)

To verify the live telemetry pipeline, alert engine, and ML baseline without physical hardware connected:

```bash
# From project root:
backend/.venv/Scripts/python.exe tools/esp32_simulator.py
```

To test emergency thresholds and anomaly detection:
```bash
backend/.venv/Scripts/python.exe tools/esp32_simulator.py --anomaly
```

> [!NOTE]
> All simulator readings are tagged with `source: "demo"` and `is_demo: true`. They are visually flagged in the UI to prevent confounding live experimental telemetry.

---

### Step 4: Live ESP32 Mode & Firmware Flashing

1. Connect the ESP32 to your PC via micro-USB.
2. In `esp32/aquaponics_esp32_firmware/`, copy `config.example.h` to `config.h`:
   ```bash
   cp config.example.h config.h
   ```
3. Edit `config.h`:
   - Set `WIFI_SSID` and `WIFI_PASSWORD`.
   - Set `BACKEND_HOST` to your computer's local Wi-Fi IP address (e.g., `192.168.1.100`).
4. Open `aquaponics_esp32_firmware.ino` in **Arduino IDE**.
5. Select board **ESP32 Dev Module** and the correct COM port.
6. Upload the firmware.
7. Open Serial Monitor at **115200 baud** to view real-time acquisition and Wi-Fi transmission logs.
8. Live telemetry will arrive at the backend tagged with `source: "esp32_live"`.

---

## 10. API Endpoint Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sensors/readings` | Ingests sensor telemetry payload from ESP32 |
| `GET` | `/api/v1/sensors/latest` | Returns most recent sensor reading |
| `GET` | `/api/v1/sensors/history` | Historical telemetry filtered by range (`1h`, `6h`, `24h`, `7d`) |
| `GET` | `/api/v1/alerts` | Lists system alerts (filtered by status and severity) |
| `POST` | `/api/v1/alerts/{id}/acknowledge` | Acknowledges an active alert |
| `POST` | `/api/v1/alerts/{id}/resolve` | Resolves an active alert |
| `GET` | `/api/v1/system/status` | Component connectivity diagnostics (ESP32, Host PC, SQLite, ML) |
| `POST` | `/api/v1/system/mode` | Toggles between `live` and `demo` telemetry modes |
| `POST` | `/api/v1/plants/observations` | Records manual plant growth observation (height, leaves, health) |
| `GET` | `/api/v1/plants/history` | Historical manual plant growth measurements |
| `GET` | `/api/v1/plants/summary` | Summary stats across all tracked plant IDs |
| `GET` | `/api/v1/analytics` | Statistical Pearson cross-correlations (water metrics vs plant growth) |
| `GET` | `/api/v1/ml/status` | ML Isolation Forest baseline diagnostic metadata & features |
| `POST` | `/api/v1/ml/predict` | On-demand anomaly inference on specified sensor parameters |
| `POST` | `/api/v1/fish/observations` | Records optional manual fish health & feeding observation |
| `GET` | `/api/v1/fish/history` | Historical manual fish observation log |
| `WS` | `/ws` | Low-latency live telemetry & alert broadcasting stream |

---

## 11. Current Limitations & Research Disclaimers

1. **V1 Development Prototype**: This platform is designed for research prototyping and local development; it is not certified for commercial aquaculture production or mission-critical industrial use.
2. **No Raspberry Pi**: V1 does not support or include Raspberry Pi hardware. The host backend runs on a desktop/laptop computer.
3. **Manual Plant Morphology**: Visual health, leaf counts, and stem heights are recorded by human observation; automated computer vision pipelines are not implemented.
4. **Machine Learning Model Baseline**: The Isolation Forest anomaly detection model is an uncalibrated baseline prototype. Its statistical bounds are derived from theoretical aquaponics distributions and have not been validated against long-term physical hardware runs.
5. **Sensor Calibration Dependency**: Analog pH and water level readings depend entirely on manual two-point bench calibration and temperature compensation. Uncalibrated sensor data must not be considered accurate.
6. **Demo Data Distinction**: Data generated in Demo mode or via `tools/esp32_simulator.py` is simulated and tagged accordingly; it should never be included in biological or engineering research publications.
