#pragma once

// Copy to include/config.h. This file contains placeholders only.
#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"
#define MQTT_HOST "192.168.1.10" // LAN address of broker; never localhost on ESP32
#define MQTT_PORT 1883
#define MQTT_USERNAME "parking-esp32-01"
#define MQTT_PASSWORD "replace-with-generated-device-password"
#define MQTT_USE_TLS 0
#define DEVICE_ID "parking-esp32-01"
#define PARKING_ID "mongodb-parking-location-id"
#define SLOT_1_ID "A-101"
#define SLOT_2_ID "A-102"
#define FIRMWARE_VERSION "1.0.0"
#define SENSOR_ACTIVE_LOW 1 // Verify against the installed IR modules before flashing.
#define TELEMETRY_HEARTBEAT_MS 60000UL
#define RFID_SCAN_COOLDOWN_MS 1500UL

#define MQTT_ROOT_CA ""
#define MQTT_CLIENT_CERT ""
#define MQTT_PRIVATE_KEY ""

// For MQTT_USE_TLS=1, define MQTT_ROOT_CA, MQTT_CLIENT_CERT, MQTT_PRIVATE_KEY
// in config.h. Never commit those values.
