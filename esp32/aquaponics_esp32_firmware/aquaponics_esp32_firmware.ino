/**
 * @file aquaponics_esp32_firmware.ino
 * @brief Aquaponics Monitoring System - ESP32 Firmware Entry Point (V1 Clean)
 * 
 * Hardware Support:
 * - DS18B20 Waterproof Temperature Sensor (GPIO 4, OneWire)
 * - Analog pH Sensor Module (GPIO 34 ADC1) with voltage monitoring
 * - DHT11 Air Temperature & Relative Humidity (GPIO 15)
 * - Analog Water Level Probe (GPIO 35 ADC1) with raw ADC count & percentage
 * - P31 Float Switch (GPIO 13, INPUT_PULLUP)
 * - Status LED Indicator (GPIO 2)
 * 
 * Architecture:
 * Sensors -> ESP32 -> Local Wi-Fi HTTP POST -> FastAPI Host Server -> SQLite -> React UI
 */

#include <Arduino.h>
#include "config.h"
#include "SensorManager.h"
#include "NetworkManager.h"

SensorManager sensors;
NetworkManager network;

unsigned long lastTransmitTime = 0;
volatile bool floatAlertTriggered = false;

// Interrupt service routine for emergency float switch trigger
void IRAM_ATTR onFloatSwitchInterrupt() {
  floatAlertTriggered = true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("==================================================");
  Serial.println("  AQUAPONICS MONITORING SYSTEM - ESP32 NODE V1.0  ");
  Serial.println("==================================================");
  Serial.printf("Device ID: %s | Firmware: %s\n", DEVICE_ID, FIRMWARE_VERSION);

  // Initialize sensors
  sensors.begin();

  // Attach interrupt to P31 float switch for immediate notification on water level cutoff
  attachInterrupt(digitalPinToInterrupt(PIN_FLOAT_SWITCH), onFloatSwitchInterrupt, CHANGE);

  // Initialize Wi-Fi network connection
  network.begin();

  Serial.println("[System] Initialization complete. Entering monitoring loop.");
}

void loop() {
  unsigned long now = millis();

  // Periodically update sensor caches
  sensors.updateSensors();

  // Handle immediate emergency float switch interrupt if triggered
  if (floatAlertTriggered) {
    floatAlertTriggered = false;
    Serial.println("[ALERT] P31 Float switch state changed! Dispatching priority payload...");
    SensorData immediateData = sensors.getSensorData(WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -99);
    String payload = sensors.toJson(immediateData);
    network.postReading(payload);
  }

  // Periodic scheduled transmission
  if (now - lastTransmitTime >= INTERVAL_TRANSMIT_MS) {
    lastTransmitTime = now;

    // 1. Acquire current readings with Wi-Fi signal strength
    int rssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : -99;
    SensorData reading = sensors.getSensorData(rssi);

    // 2. Format structured JSON payload
    String payload = sensors.toJson(reading);

    // 3. Print step-by-step diagnostics to Serial console (115200 baud)
    sensors.printDiagnostics(reading);

    // 4. Send HTTP POST to FastAPI backend running on local PC (or buffer offline in RAM)
    bool sent = network.postReading(payload);
    if (!sent) {
      Serial.println("[System] Telemetry deferred to offline RAM buffer.");
    }
  }

  // Brief pause for background tasks and watchdog feeding
  delay(20);
}
