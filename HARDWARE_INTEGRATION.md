# Smart Parking physical IoT integration

## Architecture

`ESP32 -> MQTT -> Express ingestion -> MongoDB -> Socket.IO -> React`

Only an authenticated, enrolled physical device can enter the runtime occupancy path. MQTT messages are schema-validated, checked against topic identity and exact device/facility/slot assignments, persisted, aggregated, and broadcast using `slot:updated` and `parking:updated`. Nearby Parking and Parking Details consume those events. There is no browser or HTTP telemetry injection route and no direct-ingestion fallback.

## Fixed wiring and local behavior

| Device                               |        ESP32 GPIO |
| ------------------------------------ | ----------------: |
| MFRC522 SDA/SS, SCK, MOSI, MISO, RST | 5, 18, 23, 19, 22 |
| IR slot 1, slot 2                    |            32, 33 |
| Slot 1 green, red                    |            27, 14 |
| Slot 2 green, red                    |            25, 26 |
| Buzzer                               |                13 |

Power the MFRC522 from **3.3 V only** and leave IRQ disconnected. Give every LED a 220–330 ohm resistor. Confirm the IR module supply/output voltage and `SENSOR_ACTIVE_LOW` before connecting it. GPIO 13 may drive only a low-current active buzzer; use a transistor driver and, for an inductive load, a flyback diode when current exceeds the ESP32 GPIO rating.

Tags `03:B7:F7:0F` and `13:CD:2C:F8` map only to A-101 and A-102. Sensors are sampled continuously. The backend validates the same mapping, registered card owner, confirmed reservation, and active session; device-reported authorization is never trusted. Direction is inferred from an active session, and browser-supplied RFID transitions are forbidden.

LED priority is deterministic: physical occupied, reservation/session blocked, unknown startup state, then reliably clear and unreserved. Any of the first three conditions means red on and green off. Green is shown only when the local IR sensor is clear and retained backend state says the slot is not blocked. Unauthorized scans leave both LEDs unchanged and produce two short beeps. Known scans do not claim success locally; authoritative backend state controls the LEDs.

## MQTT topics and payloads

- `parking/{parkingId}/device/{deviceId}/occupancy`
- `parking/{parkingId}/device/{deviceId}/heartbeat`
- `parking/{parkingId}/device/{deviceId}/rfid`
- `parking/{parkingId}/device/{deviceId}/availability` (retained `online`/`offline`; informational)
- `parking/{parkingId}/device/{deviceId}/state` (backend to device, retained, QoS 1)
- `parking/{parkingId}/device/{deviceId}/state-ack` (device to backend, QoS 1)
- `parking/{parkingId}/device/{deviceId}/rfid-result` (backend to device, non-retained, QoS 1)

Occupancy:

```json
{
  "deviceId": "parking-esp32-01",
  "parkingId": "<Mongo ObjectId>",
  "timestamp": "2026-10-09T10:00:00.000Z",
  "firmwareVersion": "1.0.0",
  "slots": [
    { "slotId": "A-101", "occupied": false },
    { "slotId": "A-102", "occupied": true }
  ]
}
```

Authorized local scan audit:

```json
{
  "deviceId": "parking-esp32-01",
  "parkingId": "<Mongo ObjectId>",
  "timestamp": "2026-10-09T10:00:00.000Z",
  "rfidUid": "03:B7:F7:0F",
  "authorizationStatus": "AUTHORIZED",
  "scannedSlotId": "A-101"
}
```

QoS 1 is recommended. Firmware publishes on changes plus a periodic full snapshot and heartbeat. RFID audits never set server-side occupancy; IR sensor telemetry is authoritative.

The retained `state` command contains a schema version, unique command ID, monotonic revision, server issue time, exact device/facility identity, and per-slot blocking state. Firmware rejects stale revisions and incomplete or wrong-device commands, applies both slots atomically, then publishes `state-ack`. The backend records only an acknowledgement matching its latest command. Every backend MQTT reconnect republishes current state. Each known-tag scan also has a unique `scanId`; the non-retained `rfid-result` produces a success beep only after backend approval and cannot replay after reconnect.

## Local setup

```bash
cp .env.example .env
docker compose up -d mongodb redis mqtt
npm install
npm run dev
```

This repository maps the Docker MongoDB service to host port `27018` to avoid colliding with a native MongoDB installation. The container still uses its standard internal port `27017`.

Copy `esp32-firmware/include/config.example.h` to the ignored `config.h`. Set Wi-Fi, this computer's LAN IP as `MQTT_HOST` (never `localhost` on ESP32), the broker-issued device credentials, MongoDB facility ID, and exact slot numbers. Mosquitto rejects anonymous clients. Its ACL lets this device publish only its telemetry/availability topics plus `state-ack`, and read only its own `state` topic. The backend can read device topics and publish only state commands. Keep port 1883 limited to the trusted LAN; use TLS for any network outside that trusted segment.

Build and flash with PlatformIO:

```bash
cd esp32-firmware
pio run
pio run --target upload
pio device monitor
```

The repository's publisher is test-only and requires a separate `IOT_TEST_BROKER_URL`, `NODE_ENV=test`, and `IOT_TEST_SIMULATOR_ENABLED=true`. It must never target this facility or the live broker.

## Configuration and AWS IoT Core

Backend variables are `MQTT_BROKER_URL`, `MQTT_CLIENT_ID`, optional `MQTT_USERNAME`/`MQTT_PASSWORD`, optional mutual-TLS `MQTT_CA_PATH`/`MQTT_CERT_PATH`/`MQTT_KEY_PATH`, and `MQTT_MAX_MESSAGE_BYTES`. Existing `PORT`, `CLIENT_URL`, `MONGODB_URI`, and `REDIS_URL` remain unchanged. Certificate/key files and firmware `config.h` are Git-ignored.

For AWS IoT use `mqtts://<account-endpoint>:8883`, unique client IDs, Amazon Root CA, device/backend certificates and keys, and a policy limited to connect plus publish/subscribe/receive on the exact `parking/<parkingId>/device/<deviceId>/*` resources. Provision these in AWS and load secrets outside source control. No credentials are included in this repository.

## Enrollment and troubleshooting

Create the facility, device, and two assigned slots first. `IOT_ALLOW_AUTO_ENROLL` defaults to `false`; unknown devices are rejected. Stale timestamps, duplicate messages, mismatched topic identities, and unassigned slots are rejected.

- MQTT failure does not generate occupancy. The web/API remains available and reports occupancy as unknown when device telemetry is stale.
- For missing messages, check firewall/LAN routing, `MQTT_HOST`, broker logs, topic IDs, and backend subscription logs.
- For inverted readings, measure the IR OUT signal and change only `SENSOR_ACTIVE_LOW`, never the fixed GPIO map.
- For TLS failures, verify time, ATS endpoint, CA, certificate activation, and policy resource ARNs.

## Manual A-101/A-102 acceptance test

1. Upload the current firmware and open the 115200-baud monitor. Confirm Wi-Fi, MQTT, the first retained state revision, and a successful `state-ack` in the Admin/Manager Devices page.
2. With both IR sensors reliably clear and the device online, create and pay for an A-101 reservation. Confirm only A-101 is red; A-102 must not change.
3. Scan `13:CD:2C:F8` at A-101. Confirm two warning beeps and no reservation, session, slot, payment, or LED change.
4. Scan `03:B7:F7:0F` during A-101's permitted entry window. Confirm the reservation becomes `ACTIVE`, an entry-verified session appears, and A-101 remains red.
5. Block A-101's IR sensor and scan the correct tag again. Checkout must be refused and A-101 must remain red.
6. Clear the sensor, wait for fresh occupancy telemetry, and scan the correct tag. An on-time session completes; green appears only after the backend release state is acknowledged and the sensor remains clear.
7. Repeat steps 2–6 independently for A-102 with `13:CD:2C:F8`; A-101 must never change as a side effect.
8. For a controlled late reservation, verify the configured grace/interval/cap calculation. The first exit attempt creates one `DUE` fine and `CHECKOUT_PENDING`; repeated scans must not duplicate it. Only a verified fine payment may complete checkout when `REQUIRE_FINE_PAYMENT_BEFORE_EXIT=true`.
9. Disconnect MQTT or power down the device. The website must show device offline/occupancy unknown after the timeout, booking must be rejected, and firmware must never show green based on missing backend state.
