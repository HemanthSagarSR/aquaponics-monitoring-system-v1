/**
 * @file NetworkManager.h
 * @brief Wi-Fi, NTP Sync, HTTP Client, and Offline FIFO Buffer for Aquaponics ESP32
 */

#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <vector>
#include "config.h"

class NetworkManager {
private:
  const char* ntpServer = "pool.ntp.org";
  const long gmtOffset_sec = 0;
  const int daylightOffset_sec = 0;
  unsigned long lastReconnectAttempt = 0;

  // Offline FIFO circular buffer for resilience against network/backend outages
  std::vector<String> offlineBuffer;

public:
  NetworkManager() {}

  void begin() {
    Serial.println("[NetworkManager] Initializing Wi-Fi...");
    WiFi.mode(WIFI_STA);
    connectWiFi();
  }

  bool connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
      return true;
    }

    Serial.printf("[NetworkManager] Connecting to SSID: %s\n", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < WIFI_MAX_RETRY) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("[NetworkManager] Wi-Fi Connected! IP Address: ");
      Serial.println(WiFi.localIP());

      // Configure NTP
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
      Serial.println("[NetworkManager] NTP time sync requested.");
      return true;
    } else {
      Serial.println("[NetworkManager] Wi-Fi Connection failed. Entering offline buffer mode.");
      return false;
    }
  }

  void checkConnection() {
    unsigned long now = millis();
    if (WiFi.status() != WL_CONNECTED) {
      if (now - lastReconnectAttempt >= WIFI_RECONNECT_INTERVAL_MS) {
        lastReconnectAttempt = now;
        Serial.println("[NetworkManager] Wi-Fi lost. Attempting reconnection...");
        connectWiFi();
      }
    }
  }

  bool isConnected() {
    return WiFi.status() == WL_CONNECTED;
  }

  bool postReading(const String& jsonPayload) {
    checkConnection();

    if (!isConnected()) {
      enqueueOfflineBuffer(jsonPayload);
      return false;
    }

    // First flush any previously queued offline readings
    flushOfflineBuffer();

    // Now send the current reading
    return sendHttpPayload(jsonPayload);
  }

private:
  bool sendHttpPayload(const String& payload) {
    HTTPClient http;
    String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + String(BACKEND_ENDPOINT);
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_REQUEST_TIMEOUT_MS);

    int httpResponseCode = http.POST(payload);
    bool success = false;

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("[NetworkManager] HTTP POST [%s] Response code: %d\n", url.c_str(), httpResponseCode);
      if (httpResponseCode >= 200 && httpResponseCode < 300) {
        success = true;
        // Blink status LED on successful send
        digitalWrite(PIN_STATUS_LED, HIGH);
        delay(40);
        digitalWrite(PIN_STATUS_LED, LOW);
      } else {
        Serial.printf("[NetworkManager] Backend error: %s\n", response.c_str());
      }
    } else {
      Serial.printf("[NetworkManager] HTTP POST failed, error: %s\n", http.errorToString(httpResponseCode).c_str());
      enqueueOfflineBuffer(payload);
    }

    http.end();
    return success;
  }

  void enqueueOfflineBuffer(const String& payload) {
    if (offlineBuffer.size() >= OFFLINE_BUFFER_CAPACITY) {
      // Discard oldest reading if buffer capacity is reached
      offlineBuffer.erase(offlineBuffer.begin());
      Serial.println("[NetworkManager] Warning: Offline buffer full. Dropping oldest reading.");
    }
    offlineBuffer.push_back(payload);
    Serial.printf("[NetworkManager] Reading buffered offline. Queue size: %u\n", (unsigned int)offlineBuffer.size());
  }

  void flushOfflineBuffer() {
    if (offlineBuffer.empty()) return;

    Serial.printf("[NetworkManager] Flushing %u buffered readings to backend...\n", (unsigned int)offlineBuffer.size());
    while (!offlineBuffer.empty() && isConnected()) {
      String bufferedReading = offlineBuffer.front();
      
      HTTPClient http;
      String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + String(BACKEND_ENDPOINT);
      http.begin(url);
      http.addHeader("Content-Type", "application/json");
      http.setTimeout(HTTP_REQUEST_TIMEOUT_MS);

      int code = http.POST(bufferedReading);
      if (code >= 200 && code < 300) {
        offlineBuffer.erase(offlineBuffer.begin());
      } else {
        Serial.printf("[NetworkManager] Flush interrupted at code %d. Keeping remaining in buffer.\n", code);
        http.end();
        break;
      }
      http.end();
      delay(50); // Small inter-packet gap
    }
  }
};

#endif // NETWORK_MANAGER_H
