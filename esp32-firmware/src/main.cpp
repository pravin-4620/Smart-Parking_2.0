#include <Arduino.h>
#include <ArduinoJson.h>
#include <MFRC522.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <cstring>
#include "config.h"
#include "parking_logic.h"

constexpr uint8_t RFID_SS = 5, RFID_RST = 22;
constexpr uint8_t SENSOR_1 = 32, SENSOR_2 = 33;
constexpr uint8_t GREEN_1 = 27, RED_1 = 14, GREEN_2 = 25, RED_2 = 26;
constexpr uint8_t BUZZER = 13;

MFRC522 reader(RFID_SS, RFID_RST);
WiFiClient plainClient;
WiFiClientSecure secureClient;
PubSubClient mqtt(MQTT_USE_TLS ? static_cast<Client&>(secureClient) : static_cast<Client&>(plainClient));

bool occupied[2] = {false, false};
bool rawOccupied[2] = {false, false};
unsigned long rawChangedAt[2] = {0, 0};
bool sensorInitialized[2] = {false, false};
enum class IndicatorState : uint8_t { Available, Reserved, Active };
IndicatorState indicatorState[2] = {IndicatorState::Active, IndicatorState::Active};
bool hasAuthoritativeState = false;
bool connectivityWasReady = false;
uint64_t lastStateRevision = 0;
bool lastPublished[2] = {false, false};
bool hasPublished = false;
unsigned long lastTelemetry = 0, lastWifiAttempt = 0, lastMqttAttempt = 0, lastScan = 0;
unsigned long lastStatusReport = 0;
unsigned long buzzerTransition = 0;
uint8_t buzzerEdgesRemaining = 0;
unsigned long lastReservedBlink = 0;
bool reservedBlinkOn = true;
String pendingScanId;
int8_t pendingSlotIndex = -1;
unsigned long pendingScanAt = 0;

constexpr unsigned long WIFI_RETRY_MS = 15000UL;
constexpr unsigned long MQTT_RETRY_MS = 10000UL;
constexpr unsigned long STATUS_REPORT_MS = 30000UL;
constexpr unsigned long SENSOR_DEBOUNCE_MS = 200UL;

const char* wifiStatusName(wl_status_t status) {
  switch (status) {
    case WL_IDLE_STATUS: return "IDLE";
    case WL_NO_SSID_AVAIL: return "NO_SSID";
    case WL_SCAN_COMPLETED: return "SCAN_COMPLETE";
    case WL_CONNECTED: return "CONNECTED";
    case WL_CONNECT_FAILED: return "CONNECT_FAILED";
    case WL_CONNECTION_LOST: return "CONNECTION_LOST";
    case WL_DISCONNECTED: return "DISCONNECTED";
    default: return "UNKNOWN";
  }
}

bool wifiConfigurationLooksValid() {
  const size_t ssidLength = std::strlen(WIFI_SSID);
  const size_t passwordLength = std::strlen(WIFI_PASSWORD);
  return ssidLength > 0 && ssidLength <= 32 &&
         (passwordLength == 0 || (passwordLength >= 8 && passwordLength <= 64));
}

const char* wifiDisconnectReasonName(uint8_t reason) {
  switch (reason) {
    case WIFI_REASON_AUTH_EXPIRE: return "AUTH_EXPIRE";
    case WIFI_REASON_ASSOC_EXPIRE: return "ASSOC_EXPIRE";
    case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT: return "4WAY_HANDSHAKE_TIMEOUT";
    case WIFI_REASON_BEACON_TIMEOUT: return "BEACON_TIMEOUT";
    case WIFI_REASON_NO_AP_FOUND: return "NO_AP_FOUND";
    case WIFI_REASON_AUTH_FAIL: return "AUTH_FAIL";
    case WIFI_REASON_ASSOC_FAIL: return "ASSOC_FAIL";
    case WIFI_REASON_HANDSHAKE_TIMEOUT: return "HANDSHAKE_TIMEOUT";
    case WIFI_REASON_CONNECTION_FAIL: return "CONNECTION_FAIL";
    default: return "OTHER";
  }
}

void onWiFiEvent(arduino_event_id_t event, arduino_event_info_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_START:
      Serial.printf("[%10lu ms] Wi-Fi station started\n", millis());
      break;
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.printf("[%10lu ms] Wi-Fi associated; waiting for DHCP\n", millis());
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.printf("[%10lu ms] Wi-Fi ready; IP=%s RSSI=%d dBm\n",
                    millis(), WiFi.localIP().toString().c_str(), WiFi.RSSI());
      lastMqttAttempt = 0;
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.printf("[%10lu ms] Wi-Fi disconnected; reason=%s (%u); local hardware remains active\n",
                    millis(), wifiDisconnectReasonName(info.wifi_sta_disconnected.reason),
                    static_cast<unsigned>(info.wifi_sta_disconnected.reason));
      break;
    case ARDUINO_EVENT_WIFI_STA_LOST_IP:
      Serial.printf("[%10lu ms] Wi-Fi lost its IP address\n", millis());
      break;
    default:
      break;
  }
}

String topic(const char* suffix) {
  return String("parking/") + PARKING_ID + "/device/" + DEVICE_ID + "/" + suffix;
}

bool addTimestamp(JsonDocument& doc) {
  const time_t now = time(nullptr);
  if (now < 1700000000) return false;
  struct tm utc;
  gmtime_r(&now, &utc);
  char value[25];
  strftime(value, sizeof(value), "%Y-%m-%dT%H:%M:%SZ", &utc);
  doc["timestamp"] = value;
  return true;
}

void beep(uint8_t count) {
  buzzerEdgesRemaining = count * 2;
  buzzerTransition = 0;
}

void serviceBuzzer() {
  if (!buzzerEdgesRemaining || (buzzerTransition && millis() - buzzerTransition < 80)) return;
  buzzerTransition = millis();
  digitalWrite(BUZZER, buzzerEdgesRemaining % 2 == 0 ? HIGH : LOW);
  --buzzerEdgesRemaining;
}

void updateSlotLeds(uint8_t index) {
  const uint8_t green = index == 0 ? GREEN_1 : GREEN_2;
  const uint8_t red = index == 0 ? RED_1 : RED_2;
  const bool failClosed = !hasAuthoritativeState || WiFi.status() != WL_CONNECTED || !mqtt.connected();
  if (failClosed || indicatorState[index] == IndicatorState::Active) {
    analogWrite(green, 0); analogWrite(red, 255);
  } else if (indicatorState[index] == IndicatorState::Reserved) {
    analogWrite(green, reservedBlinkOn ? 255 : 0); analogWrite(red, 0);
  } else {
    analogWrite(green, 255); analogWrite(red, 0);
  }
}

bool publishJson(const String& destination, JsonDocument& doc, bool retained = false) {
  if (!mqtt.connected()) return false;
  char body[768];
  const size_t length = serializeJson(doc, body, sizeof(body));
  if (length == 0 || length >= sizeof(body)) return false;
  return mqtt.publish(destination.c_str(), reinterpret_cast<const uint8_t*>(body), length, retained);
}

void publishOccupancy(bool force) {
  if (!mqtt.connected()) return;
  if (!force && hasPublished && occupied[0] == lastPublished[0] && occupied[1] == lastPublished[1]) return;
  JsonDocument doc;
  if (!addTimestamp(doc)) return;
  doc["deviceId"] = DEVICE_ID; doc["parkingId"] = PARKING_ID; doc["firmwareVersion"] = FIRMWARE_VERSION;
  JsonArray slots = doc["slots"].to<JsonArray>();
  JsonObject first = slots.add<JsonObject>(); first["slotId"] = SLOT_1_ID; first["occupied"] = occupied[0];
  JsonObject second = slots.add<JsonObject>(); second["slotId"] = SLOT_2_ID; second["occupied"] = occupied[1];
  publishJson(topic("occupancy"), doc);
  lastPublished[0] = occupied[0]; lastPublished[1] = occupied[1]; hasPublished = true; lastTelemetry = millis();
}

void publishHeartbeat() {
  JsonDocument doc;
  if (!addTimestamp(doc)) return;
  doc["deviceId"] = DEVICE_ID; doc["parkingId"] = PARKING_ID;
  doc["heartbeatOnly"] = true; doc["firmwareVersion"] = FIRMWARE_VERSION;
  publishJson(topic("heartbeat"), doc);
}

void publishScan(const String& uid, SlotSelection selected) {
  JsonDocument doc;
  if (!addTimestamp(doc)) return;
  doc["deviceId"] = DEVICE_ID; doc["parkingId"] = PARKING_ID; doc["rfidUid"] = uid;
  doc["authorizationStatus"] = selected == SlotSelection::None ? "DENIED" : "AUTHORIZED";
  pendingScanId = String(DEVICE_ID) + "-" + String(millis());
  pendingSlotIndex = selected == SlotSelection::Slot1 ? 0 : selected == SlotSelection::Slot2 ? 1 : -1;
  pendingScanAt = millis();
  doc["scanId"] = pendingScanId;
  if (selected == SlotSelection::Slot1) doc["scannedSlotId"] = SLOT_1_ID;
  if (selected == SlotSelection::Slot2) doc["scannedSlotId"] = SLOT_2_ID;
  // Carry the debounced sensor snapshot with the scan so the server can make
  // one atomic entry decision instead of racing a separate occupancy message.
  JsonArray slots = doc["slots"].to<JsonArray>();
  JsonObject first = slots.add<JsonObject>(); first["slotId"] = SLOT_1_ID; first["occupied"] = occupied[0];
  JsonObject second = slots.add<JsonObject>(); second["slotId"] = SLOT_2_ID; second["occupied"] = occupied[1];
  const bool published = publishJson(topic("rfid"), doc);
  Serial.printf("[%10lu ms] RFID request %s; scanId=%s slot=%s\n", millis(),
                published ? "published" : "not published (MQTT offline/error)", pendingScanId.c_str(),
                selected == SlotSelection::Slot1 ? SLOT_1_ID : selected == SlotSelection::Slot2 ? SLOT_2_ID : "UNMAPPED");
  if (!published) {
    pendingScanId = "";
    pendingScanAt = 0;
    pendingSlotIndex = -1;
    beep(2);
  }
}

void publishStateAck(const char* commandId, uint64_t revision, bool applied, const char* reason = nullptr) {
  JsonDocument doc;
  if (!addTimestamp(doc)) return;
  doc["schemaVersion"] = 1; doc["commandId"] = commandId; doc["revision"] = revision;
  doc["deviceId"] = DEVICE_ID; doc["parkingId"] = PARKING_ID; doc["applied"] = applied;
  if (reason) doc["reason"] = reason;
  const bool published = publishJson(topic("state-ack"), doc);
  Serial.printf("[%10lu ms] State acknowledgement %s; revision=%llu applied=%s%s%s\n",
                millis(), published ? "published" : "failed", static_cast<unsigned long long>(revision),
                applied ? "true" : "false", reason ? " reason=" : "", reason ? reason : "");
}

void onMqttMessage(char* incomingTopic, byte* payload, unsigned int length) {
  const String receivedTopic(incomingTopic);
  if (length == 0 || length > 1024) {
    Serial.printf("[%10lu ms] MQTT message rejected; topic=%s reason=INVALID_LENGTH length=%u\n", millis(), incomingTopic, length);
    return;
  }
  JsonDocument doc;
  const DeserializationError jsonError = deserializeJson(doc, payload, length);
  if (jsonError) {
    Serial.printf("[%10lu ms] MQTT message rejected; topic=%s reason=INVALID_JSON\n", millis(), incomingTopic);
    return;
  }
  if (receivedTopic == topic("rfid-result")) {
    const char* deviceId = doc["deviceId"] | "";
    const char* parkingId = doc["parkingId"] | "";
    const char* scanId = doc["scanId"] | "";
    if (doc["schemaVersion"] == 1 && !strcmp(deviceId, DEVICE_ID) && !strcmp(parkingId, PARKING_ID) &&
        pendingScanId.length() && pendingScanId == scanId) {
      const bool allowed = doc["allowed"] | false;
      const char* action = doc["action"] | "UNKNOWN";
      if (allowed && pendingSlotIndex >= 0 && !strcmp(action, "ENTRY_VERIFIED")) {
        indicatorState[pendingSlotIndex] = IndicatorState::Active;
        updateSlotLeds(pendingSlotIndex);
      }
      beep(allowed ? 1 : 2);
      Serial.printf("[%10lu ms] Authoritative RFID result=%s action=%s scanId=%s\n", millis(), allowed ? "allowed" : "denied", action, scanId);
      pendingScanId = "";
      pendingScanAt = 0;
      pendingSlotIndex = -1;
    } else {
      Serial.printf("[%10lu ms] RFID result ignored; reason=IDENTITY_OR_CORRELATION_MISMATCH\n", millis());
    }
    return;
  }
  if (receivedTopic != topic("state")) return;
  const char* commandId = doc["commandId"] | "";
  const char* deviceId = doc["deviceId"] | "";
  const char* parkingId = doc["parkingId"] | "";
  const uint64_t revision = doc["revision"].as<uint64_t>();
  Serial.printf("[%10lu ms] Reservation state received; revision=%llu\n", millis(), static_cast<unsigned long long>(revision));
  if (doc["schemaVersion"] != 1 || !commandId[0] || strcmp(deviceId, DEVICE_ID) || strcmp(parkingId, PARKING_ID)) {
    Serial.printf("[%10lu ms] Reservation state rejected; reason=INVALID_SCHEMA_OR_IDENTITY\n", millis());
    return;
  }
  if (!doc["revision"].is<uint64_t>() || revision == 0) {
    publishStateAck(commandId, revision, false, "INVALID_REVISION");
    return;
  }
  if (revision <= lastStateRevision) {
    publishStateAck(commandId, revision, false, "STALE_REVISION");
    return;
  }
  IndicatorState nextState[2] = {IndicatorState::Active, IndicatorState::Active};
  bool seen[2] = {false, false};
  for (JsonObject state : doc["slots"].as<JsonArray>()) {
    const char* slotId = state["slotId"] | "";
    const int index = !strcmp(slotId, SLOT_1_ID) ? 0 : (!strcmp(slotId, SLOT_2_ID) ? 1 : -1);
    if (index >= 0) {
      const char* value = state["indicatorState"] | "";
      if (!strcmp(value, "AVAILABLE")) nextState[index] = IndicatorState::Available;
      else if (!strcmp(value, "RESERVED")) nextState[index] = IndicatorState::Reserved;
      else if (!strcmp(value, "ACTIVE")) {
        // During an in-flight entry scan, wait for the correlated authoritative
        // rfid-result before showing red. On reconnect/reboot, an already-active
        // backend session remains authoritative without requiring another scan.
        nextState[index] = pendingSlotIndex == index ? IndicatorState::Reserved : IndicatorState::Active;
      }
      else { publishStateAck(commandId, revision, false, "INVALID_INDICATOR_STATE"); return; }
      seen[index] = true;
    }
  }
  if (!seen[0] || !seen[1]) { publishStateAck(commandId, revision, false, "INCOMPLETE_SLOT_STATE"); return; }
  indicatorState[0] = nextState[0]; indicatorState[1] = nextState[1];
  lastStateRevision = revision;
  hasAuthoritativeState = true;
  updateSlotLeds(0); updateSlotLeds(1);
  Serial.printf("[%10lu ms] Applied reservation state revision=%llu; A-101=%s A-102=%s\n",
                millis(), static_cast<unsigned long long>(revision), indicatorState[0] == IndicatorState::Available ? "available" : indicatorState[0] == IndicatorState::Reserved ? "reserved" : "active", indicatorState[1] == IndicatorState::Available ? "available" : indicatorState[1] == IndicatorState::Reserved ? "reserved" : "active");
  publishStateAck(commandId, revision, true);
}

String readUid() {
  String uid;
  for (byte i = 0; i < reader.uid.size; ++i) {
    if (i) uid += ':';
    if (reader.uid.uidByte[i] < 0x10) uid += '0';
    uid += String(reader.uid.uidByte[i], HEX);
  }
  uid.toUpperCase(); return uid;
}

void serviceConnections() {
  const unsigned long now = millis();
  const wl_status_t wifiStatus = WiFi.status();
  if (wifiStatus != WL_CONNECTED && now - lastWifiAttempt >= WIFI_RETRY_MS) {
    lastWifiAttempt = now;
    Serial.printf("[%10lu ms] Wi-Fi retry; current status=%s (%d)\n",
                  now, wifiStatusName(wifiStatus), static_cast<int>(wifiStatus));
    const wl_status_t beginStatus = WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.printf("[%10lu ms] Wi-Fi retry submitted; status=%s (%d)\n",
                  millis(), wifiStatusName(beginStatus), static_cast<int>(beginStatus));
  }
  if (wifiStatus == WL_CONNECTED && !mqtt.connected() && now - lastMqttAttempt >= MQTT_RETRY_MS) {
    lastMqttAttempt = now;
    Serial.printf("[%10lu ms] MQTT connection attempt\n", now);
    if (mqtt.connect(DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD, topic("availability").c_str(), 1, true, "offline")) {
      Serial.printf("[%10lu ms] MQTT connected\n", millis());
      mqtt.publish(topic("availability").c_str(), "online", true);
      const bool stateSubscribed = mqtt.subscribe(topic("state").c_str(), 1);
      const bool rfidSubscribed = mqtt.subscribe(topic("rfid-result").c_str(), 1);
      Serial.printf("[%10lu ms] MQTT subscriptions; state=%s rfid-result=%s\n", millis(),
                    stateSubscribed ? "ok" : "failed", rfidSubscribed ? "ok" : "failed");
      publishHeartbeat();
      publishOccupancy(true);
    } else {
      Serial.printf("[%10lu ms] MQTT connection failed; state=%d; retry remains non-fatal\n",
                    millis(), mqtt.state());
    }
  }
  if (mqtt.connected()) mqtt.loop();
  const bool connectivityReady = WiFi.status() == WL_CONNECTED && mqtt.connected();
  if (connectivityReady != connectivityWasReady) {
    if (!connectivityReady) {
      hasAuthoritativeState = false;
      Serial.printf("[%10lu ms] Connectivity lost; reservation outputs forced fail-closed until fresh state\n", millis());
    }
    connectivityWasReady = connectivityReady;
    updateSlotLeds(0);
    updateSlotLeds(1);
  }
}

void setup() {
  Serial.begin(115200);
  delay(50);
  Serial.printf("\n[%10lu ms] Smart Parking firmware %s booting\n", millis(), FIRMWARE_VERSION);
  Serial.printf("[%10lu ms] Device=%s; local hardware initialization starting\n", millis(), DEVICE_ID);
  pinMode(SENSOR_1, INPUT); pinMode(SENSOR_2, INPUT);
  for (uint8_t pin : {GREEN_1, RED_1, GREEN_2, RED_2, BUZZER}) { pinMode(pin, OUTPUT); digitalWrite(pin, LOW); }
  SPI.begin(18, 19, 23, RFID_SS); reader.PCD_Init();
  const byte readerVersion = reader.PCD_ReadRegister(MFRC522::VersionReg);
  Serial.printf("[%10lu ms] RFID, sensors, LEDs, and buzzer initialized; MFRC522 version=0x%02X%s\n",
                millis(), readerVersion,
                (readerVersion == 0x00 || readerVersion == 0xFF) ? " (reader communication failed)" : "");

  WiFi.onEvent(onWiFiEvent);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  Serial.printf("[%10lu ms] Setting Wi-Fi mode to station\n", millis());
  const bool stationModeReady = WiFi.mode(WIFI_STA);
  Serial.printf("[%10lu ms] Wi-Fi station mode result=%s\n", millis(), stationModeReady ? "ok" : "failed");
  if (stationModeReady && wifiConfigurationLooksValid()) {
    Serial.printf("[%10lu ms] Starting Wi-Fi connection (credentials present; values hidden)\n", millis());
    const wl_status_t beginStatus = WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWifiAttempt = millis();
    Serial.printf("[%10lu ms] Wi-Fi begin returned status=%s (%d); connection is asynchronous\n",
                  millis(), wifiStatusName(beginStatus), static_cast<int>(beginStatus));
  } else {
    lastWifiAttempt = millis();
    Serial.printf("[%10lu ms] Wi-Fi not started: station mode or credential format is invalid; local hardware remains active\n", millis());
  }
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.printf("[%10lu ms] NTP configured asynchronously\n", millis());
  if (MQTT_USE_TLS) {
    secureClient.setCACert(MQTT_ROOT_CA);
    secureClient.setCertificate(MQTT_CLIENT_CERT);
    secureClient.setPrivateKey(MQTT_PRIVATE_KEY);
  }
  plainClient.setTimeout(1);
  secureClient.setTimeout(1);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(1024);
  mqtt.setKeepAlive(30);
  mqtt.setSocketTimeout(1);
  Serial.printf("[%10lu ms] MQTT configured; setup complete; entering non-blocking local loop\n", millis());
  updateSlotLeds(0); updateSlotLeds(1);
}

void loop() {
  if (millis() - lastReservedBlink >= 300UL) {
    lastReservedBlink = millis();
    reservedBlinkOn = !reservedBlinkOn;
    if (indicatorState[0] == IndicatorState::Reserved) updateSlotLeds(0);
    if (indicatorState[1] == IndicatorState::Reserved) updateSlotLeds(1);
  }
  const bool samples[2] = {
    sensorIsOccupied(digitalRead(SENSOR_1), SENSOR_ACTIVE_LOW),
    sensorIsOccupied(digitalRead(SENSOR_2), SENSOR_ACTIVE_LOW),
  };
  for (uint8_t index = 0; index < 2; ++index) {
    if (!sensorInitialized[index]) {
      rawOccupied[index] = samples[index];
      rawChangedAt[index] = millis();
      sensorInitialized[index] = true;
    } else if (samples[index] != rawOccupied[index]) {
      rawOccupied[index] = samples[index];
      rawChangedAt[index] = millis();
    } else if (occupied[index] != rawOccupied[index] && millis() - rawChangedAt[index] >= SENSOR_DEBOUNCE_MS) {
      occupied[index] = rawOccupied[index];
      Serial.printf("[%10lu ms] Debounced sensor state changed; slot=%s physical=%s reservation=%s\n",
                    millis(), index == 0 ? SLOT_1_ID : SLOT_2_ID,
                    occupied[index] ? "occupied" : "clear",
                    indicatorState[index] == IndicatorState::Available ? "available" : indicatorState[index] == IndicatorState::Reserved ? "reserved" : "active");
      updateSlotLeds(index);
    }
  }
  serviceBuzzer();

  if (pendingScanId.length() && millis() - pendingScanAt >= 10000UL) {
    Serial.printf("[%10lu ms] RFID request timed out; scanId=%s\n", millis(), pendingScanId.c_str());
    pendingScanId = "";
    pendingScanAt = 0;
    pendingSlotIndex = -1;
    beep(2);
  }

  if (!pendingScanId.length() && millis() - lastScan >= RFID_SCAN_COOLDOWN_MS && reader.PICC_IsNewCardPresent() && reader.PICC_ReadCardSerial()) {
    lastScan = millis(); const String uid = readUid(); const SlotSelection selected = slotForUid(uid.c_str());
    Serial.printf("[%10lu ms] RFID card detected; uid=%s mapping=%s\n", millis(), uid.c_str(),
                  selected == SlotSelection::Slot1 ? SLOT_1_ID : selected == SlotSelection::Slot2 ? SLOT_2_ID : "UNAUTHORIZED");
    if (selected == SlotSelection::None) beep(2);
    publishOccupancy(true); publishScan(uid, selected);
    reader.PICC_HaltA(); reader.PCD_StopCrypto1();
  }

  serviceConnections();
  publishOccupancy(false);
  if (millis() - lastTelemetry >= TELEMETRY_HEARTBEAT_MS) { publishHeartbeat(); publishOccupancy(true); }
  if (millis() - lastStatusReport >= STATUS_REPORT_MS) {
    lastStatusReport = millis();
    Serial.printf("[%10lu ms] Loop alive; Wi-Fi=%s MQTT=%s slot1=%s slot2=%s\n",
                  millis(), wifiStatusName(WiFi.status()), mqtt.connected() ? "connected" : "offline",
                  occupied[0] ? "occupied" : "clear", occupied[1] ? "occupied" : "clear");
  }
  delay(5);
}
