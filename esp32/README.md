# ESP32 Aquaponics Sensor Acquisition Firmware (V1 Clean)

This directory contains the production C++ firmware for the ESP32 microcontroller, acting as the dedicated IoT sensor acquisition node in the Smart Aquaponics Monitoring System.

---

## 1. Confirmed Hardware Pinout & Wiring Diagram

| Sensor / Module | Signal Type | ESP32 GPIO Pin | Power Supply | Critical Wiring Notes |
| :--- | :--- | :--- | :--- | :--- |
| **DS18B20 Temp Probe** | OneWire (Digital) | **GPIO 4** | 3.3V or 5.0V | **Requires 4.7kΩ pull-up resistor** between DQ (signal) and 3.3V |
| **DHT11 Air Temp & Hum** | Single-Bus (Digital)| **GPIO 15** | 3.3V | Ambient grow environment air sensor |
| **Analog pH Sensor Board** | Analog Voltage (ADC) | **GPIO 34 (ADC1_CH6)** | 5.0V (VCC), GND | **CRITICAL SAFETY**: ESP32 ADC pins accept **max 3.3V**. Verify output voltage with a multimeter before connecting to GPIO 34 (see Section 2). |
| **Water Level Sensor** | Analog Voltage (ADC) | **GPIO 35 (ADC1_CH7)** | 3.3V | Sump tank level tracking. Provides raw ADC (0–4095) + linear percentage calibration. |
| **P31 Float Switch** | Contact Closure | **GPIO 13** | GND | Configured with `INPUT_PULLUP`. Pulls to GND on emergency level breach, triggering an instant hardware interrupt. |
| **Built-in Status LED** | Digital Output | **GPIO 2** | Built-in | Blinks on Wi-Fi connection and successful HTTP transmission. |

---

## 2. Critical Hardware Safety & Calibration Protocol

> [!WARNING]
> **Analog pH Sensor Module Voltage Verification**:
> Many analog pH sensor modules (e.g., standard hobbyist blue boards) require a 5V power supply to operate their onboard operational amplifier, and can produce output voltages up to 4.2V–5.0V when measuring acidic or saturated states.
> **Connecting any voltage above 3.3V directly to an ESP32 ADC pin will permanently damage the microcontroller.**
> **Required Steps Before Physical Connection:**
> 1. Power the pH module with 5V and GND.
> 2. Submerge probe in standard pH 4.01 and pH 7.00 buffer solutions.
> 3. Measure the output pin (Po) with a multimeter to verify voltage range.
> 4. If output exceeds 3.3V, install a precision two-resistor voltage divider (e.g., $10\text{k}\Omega$ / $20\text{k}\Omega$) or an active 3.3V level shifter before connecting to GPIO 34.

> [!IMPORTANT]
> **Water Level Sensor Calibration**:
> Do not assume the water-level sensor is calibrated to percentage out of the box.
> 1. Dip sensor to its minimum dry mark and note raw ADC count on the Serial monitor (e.g., `300`).
> 2. Submerge sensor to your tank's maximum desired water level and note the ADC count (e.g., `2800`).
> 3. Set `WATER_LEVEL_MIN_ADC` and `WATER_LEVEL_MAX_ADC` in `config.h`.

> [!NOTE]
> **Bench Testing Rule**:
> Do not claim physical hardware functionality until each sensor has been verified with live bench test telemetry.

---

## 3. Wi-Fi Secrets & Configuration Setup

1. Copy the configuration template:
   ```bash
   cp config.example.h config.h
   ```
2. Edit `config.h`:
   ```cpp
   #define WIFI_SSID "Your_Local_WiFi_SSID"
   #define WIFI_PASSWORD "Your_Local_WiFi_Password"

   // Set to your development PC's local IP running FastAPI
   #define BACKEND_HOST "192.168.1.100"
   #define BACKEND_PORT 8000
   #define BACKEND_ENDPOINT "/api/v1/sensors/readings"
   ```
3. `config.h` is excluded from Git via `.gitignore` to prevent leaking network passwords.

---

## 4. Arduino IDE / PlatformIO Setup

### Required Libraries
Install via the Arduino Library Manager:
1. **OneWire** by Paul Stoffregen
2. **DallasTemperature** by Miles Burton
3. **DHT sensor library** by Adafruit
4. **Adafruit Unified Sensor** by Adafruit
5. **WiFi** (built into ESP32 Arduino Core)
6. **HTTPClient** (built into ESP32 Arduino Core)

### Board Settings
* **Board**: `ESP32 Dev Module` (or `DOIT ESP32 DEVKIT V1`)
* **Upload Speed**: 115200 or 921600
* **CPU Frequency**: 240MHz
* **Flash Frequency**: 80MHz
* **Serial Monitor Baud Rate**: **115200**

---

## 5. Network Resilience & Offline Buffering

If local Wi-Fi or the host PC backend temporarily disconnects:
* The ESP32 does not block sensor loops or crash.
* Readings are queued in a 60-sample FIFO ring buffer in RAM.
* Once the network reconnects, buffered readings are flushed chronologically with original timestamps.
