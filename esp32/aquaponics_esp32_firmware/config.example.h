/**
 * @file config.example.h
 * @brief Aquaponics ESP32 Firmware - Configuration Template (V1 Clean)
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to `config.h`:
 *      cp config.example.h config.h
 * 2. Fill in your local Wi-Fi SSID, Wi-Fi password, and host PC IP address.
 * 3. `config.h` is ignored by Git to keep Wi-Fi secrets secure.
 * 
 * CRITICAL HARDWARE SAFETY NOTICE:
 * - pH SENSOR: Standard 5V-powered analog pH sensor modules can output up to 4.2V-5V.
 *   ESP32 GPIO 34 ADC accepts a maximum of 3.3V. You MUST verify module output voltage
 *   with a multimeter or install a precision voltage divider (e.g. 10k/20k) before connecting.
 * - WATER LEVEL SENSOR: The sensor outputs raw ADC values (0-4095). Calibrate WATER_LEVEL_MIN_ADC
 *   and WATER_LEVEL_MAX_ADC based on physical testing in your container.
 * - BENCH TESTING: Do not assume physical sensors function without active testing.
 */

#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// Device Identity
// ==========================================
#define DEVICE_ID "ESP32_AQUA_01"
#define FIRMWARE_VERSION "1.0.0"

// ==========================================
// Wi-Fi Credentials (DO NOT COMMIT REAL CREDENTIALS)
// ==========================================
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define WIFI_MAX_RETRY 10
#define WIFI_RECONNECT_INTERVAL_MS 10000

// ==========================================
// FastAPI Backend Endpoint (Development Host PC)
// ==========================================
// Set to the local network IP address of the PC running the FastAPI server
#define BACKEND_HOST "192.168.1.100"
#define BACKEND_PORT 8000
#define BACKEND_ENDPOINT "/api/v1/sensors/readings"
#define HTTP_REQUEST_TIMEOUT_MS 3500

// ==========================================
// Confirmed GPIO Pinout (V1 Clean)
// ==========================================
// 1. DS18B20 Waterproof Temperature Sensor (OneWire)
#define PIN_ONEWIRE_DS18B20 4     // GPIO 4 (Requires 4.7kΩ pull-up resistor to 3.3V)

// 2. DHT11 Ambient Air Temperature & Humidity Sensor
#define PIN_DHT11 15              // GPIO 15
#define DHTTYPE DHT11

// 3. Analog pH Sensor Module (ADC1 Channel 6)
// SAFETY: Verify output is <= 3.3V before connecting!
#define PIN_PH_ANALOG 34          // GPIO 34 (ADC1_CH6 - Input only)

// 4. Analog Water Level Sensor (ADC1 Channel 7)
#define PIN_WATER_LEVEL_ANALOG 35 // GPIO 35 (ADC1_CH7 - Input only)

// 5. P31 Mechanical Float Switch
#define PIN_FLOAT_SWITCH 13       // GPIO 13 (INPUT_PULLUP)

// Status Indicator LED
#define PIN_STATUS_LED 2          // GPIO 2 (Built-in LED on ESP32 DevKit)

// ==========================================
// Sampling Intervals (Milliseconds)
// ==========================================
#define INTERVAL_DS18B20_MS    5000   // Water temp every 5 seconds
#define INTERVAL_DHT11_MS      5000   // Air temp/humidity every 5 seconds
#define INTERVAL_PH_MS         5000   // pH reading every 5 seconds
#define INTERVAL_WATER_LVL_MS  2000   // Water level every 2 seconds
#define INTERVAL_TRANSMIT_MS   5000   // JSON telemetry transmit every 5 seconds

// ==========================================
// Sensor Calibration Parameters
// ==========================================
#define ADC_MAX_VALUE 4095.0
#define ADC_REF_VOLTAGE 3.3

// pH Sensor Calibration: pH = Slope * Voltage + Offset
// Calibrate with standard pH 4.01 and pH 7.00 buffer solutions
#define PH_CALIBRATION_SLOPE -5.70
#define PH_CALIBRATION_OFFSET 15.54
#define PH_SAMPLES_COUNT 10

// Water Level Calibration: Percentage mapping from raw ADC reading (0-4095)
#define WATER_LEVEL_MIN_ADC 300       // Sensor dry / minimal immersion
#define WATER_LEVEL_MAX_ADC 2800      // Sensor submerged to max target mark

// Offline FIFO Buffer Settings (Stores readings in RAM if Wi-Fi temporarily drops)
#define OFFLINE_BUFFER_CAPACITY 60

#endif // CONFIG_H
