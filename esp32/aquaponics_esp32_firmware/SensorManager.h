/**
 * @file SensorManager.h
 * @brief Modular Sensor Acquisition, Validation, and Calibration for Aquaponics ESP32 (V1 Clean)
 * 
 * Acquires:
 * - DS18B20 Waterproof Temperature Probe (OneWire on GPIO 4)
 * - DHT11 Ambient Temperature & Humidity (GPIO 15)
 * - Analog pH Sensor (GPIO 34 ADC1) with voltage tracking
 * - Analog Water Level Sensor (GPIO 35 ADC1) with raw ADC + calibrated percentage
 * - P31 Mechanical Float Switch (GPIO 13, INPUT_PULLUP)
 * - Status LED Indicator (GPIO 2)
 */

#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include "config.h"

struct SensorData {
  String deviceId;
  float waterTemperature;     // DS18B20 (°C)
  float ph;                   // Calibrated pH
  float phRawVoltage;         // Measured ADC voltage (V)
  float airTemperature;       // DHT11 (°C)
  float humidity;             // DHT11 (% RH)
  float waterLevel;           // Calibrated water level (%)
  int waterLevelRaw;          // Raw ADC count (0 - 4095)
  String floatStatus;         // "SAFE" or "ALERT"
  int wifiRssi;               // Wi-Fi signal (dBm)
  unsigned long uptimeSeconds;// Uptime in seconds

  // Validation flags for serial diagnostics
  bool ds18b20Valid;
  bool dhtValid;
  bool phValid;
  bool waterLevelValid;
  bool floatSwitchValid;
};

class SensorManager {
private:
  OneWire oneWire;
  DallasTemperature ds18b20;
  DHT dht;

  unsigned long lastDS18B20Time = 0;
  unsigned long lastDHT11Time = 0;
  unsigned long lastPhTime = 0;
  unsigned long lastWaterLevelTime = 0;

  // Cached sensor measurements
  float cachedWaterTemp = 24.0;
  float cachedAirTemp = 25.0;
  float cachedHumidity = 65.0;
  float cachedPh = 7.0;
  float cachedPhVoltage = 1.5;
  float cachedWaterLevel = 80.0;
  int cachedWaterLevelRaw = 2000;
  String cachedFloatStatus = "SAFE";

  bool ds18b20Connected = false;
  bool dhtConnected = false;

  void readPhSensor() {
    long sum = 0;
    for (int i = 0; i < PH_SAMPLES_COUNT; i++) {
      sum += analogRead(PIN_PH_ANALOG);
      delay(4);
    }
    float avgAdc = (float)sum / PH_SAMPLES_COUNT;
    cachedPhVoltage = (avgAdc / ADC_MAX_VALUE) * ADC_REF_VOLTAGE;
    
    // Apply calibration equation: pH = slope * voltage + offset
    float calculatedPh = (PH_CALIBRATION_SLOPE * cachedPhVoltage) + PH_CALIBRATION_OFFSET;
    
    // Constrain to physical pH bounds (0 to 14)
    if (calculatedPh < 0.0) calculatedPh = 0.0;
    if (calculatedPh > 14.0) calculatedPh = 14.0;
    cachedPh = calculatedPh;
  }

  void readWaterLevelSensor() {
    long sum = 0;
    for (int i = 0; i < 8; i++) {
      sum += analogRead(PIN_WATER_LEVEL_ANALOG);
      delay(2);
    }
    cachedWaterLevelRaw = (int)(sum / 8);

    if (cachedWaterLevelRaw <= WATER_LEVEL_MIN_ADC) {
      cachedWaterLevel = 0.0;
    } else if (cachedWaterLevelRaw >= WATER_LEVEL_MAX_ADC) {
      cachedWaterLevel = 100.0;
    } else {
      float pct = ((float)(cachedWaterLevelRaw - WATER_LEVEL_MIN_ADC) / (WATER_LEVEL_MAX_ADC - WATER_LEVEL_MIN_ADC)) * 100.0;
      cachedWaterLevel = round(pct * 10.0) / 10.0;
    }
  }

  void readFloatSwitch() {
    // P31 float switch configured with internal pullup
    // When water drops / float drops, circuit closes to GND (LOW)
    int state = digitalRead(PIN_FLOAT_SWITCH);
    if (state == LOW) {
      cachedFloatStatus = "ALERT";
    } else {
      cachedFloatStatus = "SAFE";
    }
  }

public:
  SensorManager() : oneWire(PIN_ONEWIRE_DS18B20), ds18b20(&oneWire), dht(PIN_DHT11, DHTTYPE) {}

  void begin() {
    Serial.println("[SensorManager] Initializing physical sensors...");
    
    // 1. Initialize DS18B20 OneWire Bus (GPIO 4)
    ds18b20.begin();
    int deviceCount = ds18b20.getDeviceCount();
    Serial.printf("[SensorManager] DS18B20 devices found on GPIO %d: %d\n", PIN_ONEWIRE_DS18B20, deviceCount);
    ds18b20Connected = (deviceCount > 0);

    // 2. Initialize DHT11 Sensor (GPIO 15)
    dht.begin();
    dhtConnected = true;

    // 3. Configure GPIO Pin Modes
    pinMode(PIN_PH_ANALOG, INPUT);
    pinMode(PIN_WATER_LEVEL_ANALOG, INPUT);
    pinMode(PIN_FLOAT_SWITCH, INPUT_PULLUP);
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    // Perform initial sensor read
    updateSensors(true);
    Serial.println("[SensorManager] Sensors initialized successfully.");
  }

  void updateSensors(bool force = false) {
    unsigned long now = millis();

    // 1. DS18B20 Water Temperature (GPIO 4)
    if (force || (now - lastDS18B20Time >= INTERVAL_DS18B20_MS)) {
      ds18b20.requestTemperatures();
      float tempC = ds18b20.getTempCByIndex(0);
      if (tempC != DEVICE_DISCONNECTED_C && tempC > -10.0 && tempC < 65.0) {
        cachedWaterTemp = tempC;
        ds18b20Connected = true;
      } else {
        ds18b20Connected = false;
      }
      lastDS18B20Time = now;
    }

    // 2. DHT11 Air Temperature & Humidity (GPIO 15)
    if (force || (now - lastDHT11Time >= INTERVAL_DHT11_MS)) {
      float h = dht.readHumidity();
      float t = dht.readTemperature();
      if (!isnan(h) && !isnan(t) && h >= 0 && h <= 100 && t > -10 && t < 70) {
        cachedHumidity = h;
        cachedAirTemp = t;
        dhtConnected = true;
      } else {
        dhtConnected = false;
      }
      lastDHT11Time = now;
    }

    // 3. Analog pH Sensor (GPIO 34 ADC)
    if (force || (now - lastPhTime >= INTERVAL_PH_MS)) {
      readPhSensor();
      lastPhTime = now;
    }

    // 4. Water Level Sensor (GPIO 35 ADC)
    if (force || (now - lastWaterLevelTime >= INTERVAL_WATER_LVL_MS)) {
      readWaterLevelSensor();
      lastWaterLevelTime = now;
    }

    // 5. P31 Mechanical Float Switch (GPIO 13)
    readFloatSwitch();
  }

  SensorData getSensorData(int wifiRssi) {
    updateSensors(false);

    SensorData data;
    data.deviceId = DEVICE_ID;
    data.waterTemperature = cachedWaterTemp;
    data.ph = cachedPh;
    data.phRawVoltage = cachedPhVoltage;
    data.airTemperature = cachedAirTemp;
    data.humidity = cachedHumidity;
    data.waterLevel = cachedWaterLevel;
    data.waterLevelRaw = cachedWaterLevelRaw;
    data.floatStatus = cachedFloatStatus;
    data.wifiRssi = wifiRssi;
    data.uptimeSeconds = millis() / 1000;

    data.ds18b20Valid = ds18b20Connected;
    data.dhtValid = dhtConnected;
    data.phValid = (cachedPhVoltage >= 0.0 && cachedPhVoltage <= 3.3);
    data.waterLevelValid = (cachedWaterLevelRaw >= 0 && cachedWaterLevelRaw <= 4095);
    data.floatSwitchValid = true;

    return data;
  }

  String toJson(const SensorData& data) {
    String json = "{";
    json += "\"device_id\":\"" + data.deviceId + "\",";
    json += "\"water_temperature\":" + String(data.waterTemperature, 2) + ",";
    json += "\"ph\":" + String(data.ph, 2) + ",";
    json += "\"ph_raw_voltage\":" + String(data.phRawVoltage, 3) + ",";
    json += "\"air_temperature\":" + String(data.airTemperature, 2) + ",";
    json += "\"humidity\":" + String(data.humidity, 1) + ",";
    json += "\"water_level\":" + String(data.waterLevel, 1) + ",";
    json += "\"water_level_raw\":" + String(data.waterLevelRaw) + ",";
    json += "\"float_status\":\"" + data.floatStatus + "\",";
    json += "\"wifi_rssi\":" + String(data.wifiRssi) + ",";
    json += "\"uptime_seconds\":" + String(data.uptimeSeconds) + ",";
    json += "\"source\":\"esp32_live\",";
    json += "\"is_demo\":false";
    json += "}";
    return json;
  }

  void printDiagnostics(const SensorData& data) {
    Serial.println("----------------------------------------------");
    Serial.printf("[DIAGNOSTIC] Time: %lus | Node: %s | RSSI: %d dBm\n", data.uptimeSeconds, data.deviceId.c_str(), data.wifiRssi);
    Serial.printf("  DS18B20 Water Temp (GPIO 4) : %.2f °C [%s]\n", data.waterTemperature, data.ds18b20Valid ? "OK" : "NO SENSOR");
    Serial.printf("  Analog pH Probe    (GPIO 34): %.2f pH (%.3fV) [%s]\n", data.ph, data.phRawVoltage, data.phValid ? "OK" : "CHECK VOLTAGE");
    Serial.printf("  Water Level        (GPIO 35): %.1f %% (Raw: %d) [%s]\n", data.waterLevel, data.waterLevelRaw, data.waterLevelValid ? "OK" : "INVALID");
    Serial.printf("  DHT11 Air Temp     (GPIO 15): %.2f °C [%s]\n", data.airTemperature, data.dhtValid ? "OK" : "NO SENSOR");
    Serial.printf("  DHT11 Humidity     (GPIO 15): %.1f %% RH [%s]\n", data.humidity, data.dhtValid ? "OK" : "NO SENSOR");
    Serial.printf("  P31 Float Switch   (GPIO 13): %s\n", data.floatStatus.c_str());
    Serial.println("----------------------------------------------");
  }
};

#endif // SENSOR_MANAGER_H
