# Smart Parking Hardware Integration Contract

This contract is shared by the local IoT simulator and the production ESP32 firmware.

## Connection

- Local broker: `mqtt://localhost:1883`
- AWS IoT endpoint: set `AWS_IOT_ENDPOINT` to the account-specific ATS endpoint shown in AWS IoT Core.
- Device identity: use a unique stable value such as `ESP32-001` for `deviceId` and the AWS IoT Thing name.
- Quality of Service: QoS 1 is recommended for occupancy and RFID events.
- Production transport: MQTT over TLS 1.2 using the device certificate, private key, and Amazon Root CA.

The backend subscribes to `parking/+/device/+/+`.

## Occupancy

Topic:

```text
parking/{parkingId}/device/{deviceId}/occupancy
```

Payload:

```json
{
  "deviceId": "ESP32-001",
  "parkingId": "<MongoDB parking location ID>",
  "timestamp": "2026-10-03T10:00:00Z",
  "slots": [
    { "slotId": "A-101", "occupied": false },
    { "slotId": "A-102", "occupied": true }
  ]
}
```

`slotId` may be the configured slot number or its MongoDB ID. The backend ignores occupancy changes for slots in `MAINTENANCE` or `OUT_OF_SERVICE`, persists sensor events/current state, and broadcasts `slot:updated` and `parking:updated` through Socket.IO.

## Heartbeat

Topic:

```text
parking/{parkingId}/device/{deviceId}/heartbeat
```

Payload:

```json
{
  "deviceId": "ESP32-001",
  "parkingId": "<MongoDB parking location ID>",
  "timestamp": "2026-10-03T10:00:00Z",
  "heartbeatOnly": true
}
```

This updates device status and `lastHeartbeat` and broadcasts `device:updated`.

## RFID gate event

Topic:

```text
parking/{parkingId}/device/{deviceId}/rfid
```

Payload:

```json
{
  "deviceId": "ESP32-GATE-01",
  "parkingId": "<MongoDB parking location ID>",
  "timestamp": "2026-10-03T10:00:00Z",
  "rfidUid": "A1B2C3D4",
  "eventType": "ENTRY"
}
```

`eventType` is `ENTRY` or `EXIT`. A registered active card opens the gate and creates or completes a parking session. An unknown/inactive card is recorded as `DENIED` and the gate must remain closed. For hardware that needs a synchronous gate decision, POST the same body to `/api/rfid/tap`; the response contains `allowed` and `action` (`OPEN_GATE` or `KEEP_CLOSED`).

## Required provisioning

1. Create the parking location and slots in the application first.
2. Copy their stable parking ID and slot numbers into the ESP32 configuration.
3. Create an AWS IoT Thing per ESP32 and attach a least-privilege policy for the three topic suffixes above.
4. Flash the endpoint, device certificate, private key, Root CA, device ID, parking ID, and slot mapping.
5. Synchronize ESP32 time with NTP before publishing ISO-8601 UTC timestamps.
6. Publish a heartbeat on boot and periodically; publish occupancy only when state changes plus a periodic full snapshot.
