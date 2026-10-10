import { describe, expect, it } from "vitest";
import { iotTelemetrySchema, reservationStateAckSchema } from "../schemas.js";

const valid = {
  deviceId: "parking-esp32-01",
  parkingId: "507f1f77bcf86cd799439011",
  timestamp: "2026-10-09T10:00:00.000Z",
  slots: [{ slotId: "A-101", occupied: true }],
};

describe("IoT telemetry contract", () => {
  it("accepts physical occupancy and heartbeat payloads", () => {
    expect(iotTelemetrySchema.parse(valid).slots?.[0].occupied).toBe(true);
    expect(
      iotTelemetrySchema.parse({
        ...valid,
        slots: undefined,
        heartbeatOnly: true,
      }),
    ).toMatchObject({ heartbeatOnly: true });
  });
  it("rejects malformed identity, excessive slots, and partial updates", () => {
    expect(() =>
      iotTelemetrySchema.parse({ ...valid, deviceId: "../bad" }),
    ).toThrow();
    expect(() =>
      iotTelemetrySchema.parse({
        ...valid,
        slots: Array(65).fill(valid.slots[0]),
      }),
    ).toThrow();
    expect(() =>
      iotTelemetrySchema.parse({
        ...valid,
        slots: undefined,
        slotNumber: "A-101",
      }),
    ).toThrow();
  });
  it("accepts the local authorized RFID audit contract", () => {
    expect(
      iotTelemetrySchema.parse({
        deviceId: valid.deviceId,
        parkingId: valid.parkingId,
        timestamp: valid.timestamp,
        rfidUid: "03:B7:F7:0F",
        authorizationStatus: "AUTHORIZED",
        scannedSlotId: "A-101",
      }).authorizationStatus,
    ).toBe("AUTHORIZED");
  });
  it("preserves millisecond-sized reservation state revisions", () => {
    const revision = 1_791_546_006_200;
    expect(
      reservationStateAckSchema.parse({
        schemaVersion: 1,
        commandId: "command-1",
        revision,
        timestamp: valid.timestamp,
        deviceId: valid.deviceId,
        parkingId: valid.parkingId,
        applied: true,
      }).revision,
    ).toBe(revision);
  });
});
