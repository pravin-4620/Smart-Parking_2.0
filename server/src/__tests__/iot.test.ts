import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import { DeviceStatus, ReservationStatus, SessionStatus, SlotStatus } from "@smart-parking/shared";
import { createApp } from "../app.js";
import { IoTIngestionService } from "../iot/iotIngestion.service.js";
import { markStaleDevicesOffline } from "../iot/deviceHealth.service.js";
import { IoTDevice } from "../models/ioTDevice.model.js";
import { ParkingLocation } from "../models/parkingLocation.model.js";
import { ParkingSlot } from "../models/parkingSlot.model.js";
import { SensorEvent } from "../models/sensorEvent.model.js";
import { seedDatabase } from "../utils/seed.js";
import { emitParkingUpdated, emitSlotUpdated } from "../sockets/index.js";
import { User } from '../models/user.model.js';
import { RFIDCard } from '../models/rfidCard.model.js';
import { Reservation } from '../models/reservation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { OverstayFine } from '../models/overstayFine.model.js';

vi.mock("../sockets/index.js", () => ({
  emitDeviceUpdated: vi.fn(),
  emitDeviceOffline: vi.fn(),
  emitParkingUpdated: vi.fn(),
  emitSlotUpdated: vi.fn(),
  emitReservationUpdated: vi.fn(),
  emitSessionUpdated: vi.fn(),
}));

describe("physical-only IoT ingestion", () => {
  let locationId: mongoose.Types.ObjectId;
  let deviceId: mongoose.Types.ObjectId;
  let firstSlotId: mongoose.Types.ObjectId;
  let secondSlotId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/smart_parking_test");
    }
    await seedDatabase();
    const location = await ParkingLocation.findOne({ name: "Central Mall Smart Parking" }).orFail();
    locationId = location._id as mongoose.Types.ObjectId;
    const device = await IoTDevice.create({
      deviceId: "parking-esp32-01",
      parkingLocationId: locationId,
      name: "Physical ESP32",
      thingName: "parking-esp32-01",
      status: DeviceStatus.OFFLINE,
      isActive: true,
    });
    deviceId = device._id as mongoose.Types.ObjectId;
    const slots = await ParkingSlot.find({ parkingLocationId: locationId, slotNumber: { $in: ["A-101", "A-102"] } }).sort({ slotNumber: 1 });
    firstSlotId = slots[0]._id as mongoose.Types.ObjectId;
    secondSlotId = slots[1]._id as mongoose.Types.ObjectId;
    await ParkingSlot.updateMany({ _id: { $in: [firstSlotId, secondSlotId] } }, { $set: { deviceId, status: SlotStatus.UNKNOWN }, $unset: { lastSensorUpdate: 1 } });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await SensorEvent.deleteMany({ deviceId: "parking-esp32-01" });
    await ParkingSlot.updateMany({ _id: { $in: [firstSlotId, secondSlotId] } }, { $set: { status: SlotStatus.UNKNOWN }, $unset: { lastSensorUpdate: 1 } });
    await IoTDevice.updateOne({ _id: deviceId }, { $set: { status: DeviceStatus.OFFLINE }, $unset: { lastHeartbeat: 1, lastMessageAt: 1 } });
  });

  afterAll(async () => mongoose.connection.close());

  const telemetry = (slotId: string, occupied: boolean, timestamp = new Date()) => ({
    deviceId: "parking-esp32-01",
    parkingId: locationId.toString(),
    timestamp: timestamp.toISOString(),
    slots: [{ slotId, occupied }],
  });

  it("rejects unknown devices, facilities, slots, and unassigned slots", async () => {
    await expect(IoTIngestionService.processTelemetry({ ...telemetry("A-101", true), deviceId: "unknown-device" })).rejects.toThrow("not enrolled");
    const other = await ParkingLocation.findOne({ _id: { $ne: locationId } }).orFail();
    await expect(IoTIngestionService.processTelemetry({ ...telemetry("A-101", true), parkingId: other._id.toString() })).rejects.toThrow("not assigned");
    await expect(IoTIngestionService.processTelemetry(telemetry("DOES-NOT-EXIST", true))).rejects.toThrow("not registered");
    await ParkingSlot.updateOne({ _id: secondSlotId }, { $unset: { deviceId: 1 } });
    await expect(IoTIngestionService.processTelemetry(telemetry("A-102", true))).rejects.toThrow("not assigned to device");
    await ParkingSlot.updateOne({ _id: secondSlotId }, { $set: { deviceId } });
  });

  it("updates only the addressed physical slot and persists the sensor event", async () => {
    const result = await IoTIngestionService.processTelemetry(telemetry("A-101", true));
    expect(result.updatedSlotsCount).toBe(1);
    expect((await ParkingSlot.findById(firstSlotId))?.status).toBe(SlotStatus.OCCUPIED);
    expect((await ParkingSlot.findById(secondSlotId))?.status).toBe(SlotStatus.UNKNOWN);
    expect(await SensorEvent.countDocuments({ deviceId: "parking-esp32-01", slotId: firstSlotId })).toBe(1);
    expect(emitSlotUpdated).toHaveBeenCalledWith(expect.objectContaining({ slotId: firstSlotId.toString(), status: SlotStatus.OCCUPIED }));
    expect(emitParkingUpdated).toHaveBeenCalledWith(expect.objectContaining({ parkingLocationId: locationId.toString(), unknownSlots: 1 }));
  });

  it("rejects stale duplicates without changing MongoDB", async () => {
    const acceptedAt = new Date();
    await IoTIngestionService.processTelemetry(telemetry("A-102", true, acceptedAt));
    await expect(IoTIngestionService.processTelemetry(telemetry("A-102", false, new Date(acceptedAt.getTime() - 1)))).rejects.toThrow("Stale or duplicate");
    expect((await ParkingSlot.findById(secondSlotId))?.status).toBe(SlotStatus.OCCUPIED);
    expect(await SensorEvent.countDocuments({ deviceId: "parking-esp32-01", slotId: secondSlotId })).toBe(1);
  });

  it("does not expose HTTP simulator ingestion routes", async () => {
    const app = createApp();
    await request(app).post("/api/iot/telemetry").send(telemetry("A-101", true)).expect(404);
    await request(app).post("/api/iot/publish").send(telemetry("A-101", true)).expect(404);
  });

  it("marks stale hardware offline and its former occupancy unknown", async () => {
    const staleAt = new Date(Date.now() - 10 * 60 * 1000);
    await IoTDevice.updateOne({ _id: deviceId }, { $set: { status: DeviceStatus.ONLINE, lastHeartbeat: staleAt, lastMessageAt: staleAt } });
    await ParkingSlot.updateOne({ _id: firstSlotId }, { $set: { status: SlotStatus.AVAILABLE, lastSensorUpdate: staleAt } });
    expect(await markStaleDevicesOffline()).toBe(1);
    expect((await IoTDevice.findById(deviceId))?.status).toBe(DeviceStatus.OFFLINE);
    expect((await ParkingSlot.findById(firstSlotId))?.status).toBe(SlotStatus.UNKNOWN);
  });

  it('enforces UID-to-slot mapping and infers entry/exit from the active session', async () => {
    const user = await User.findOne({ email: 'user@smartpark.com' }).orFail();
    await RFIDCard.create({ userId: user._id, uid: '03:B7:F7:0F', isActive: true });
    const now = new Date();
    const reservation = await Reservation.create({
      userId: user._id, parkingLocationId: locationId, slotId: firstSlotId,
      startTime: new Date(now.getTime() - 60000), endTime: new Date(now.getTime() + 3600000), duration: 61,
      status: ReservationStatus.CONFIRMED,
      pricingSnapshot: { baseRate: 60, hourlyRate: 60, peakMultiplier: 1, totalAmount: 60, currency: 'INR' },
    });
    await IoTDevice.updateOne({ _id: deviceId }, { $set: { status: DeviceStatus.ONLINE, lastMessageAt: now, lastHeartbeat: now } });
    await ParkingSlot.updateOne({ _id: firstSlotId }, { $set: { status: SlotStatus.OCCUPIED, lastSensorUpdate: now, currentReservationId: reservation._id } });

    const wrong = await IoTIngestionService.processRFIDScan({ deviceId: 'parking-esp32-01', parkingId: locationId.toString(), timestamp: new Date(now.getTime() + 1).toISOString(), rfidUid: '03:B7:F7:0F', scannedSlotId: 'A-102', scanId: 'test-wrong', authorizationStatus: 'AUTHORIZED' });
    expect(wrong.allowed).toBe(false);
    expect((await Reservation.findById(reservation._id))?.status).toBe(ReservationStatus.CONFIRMED);
    expect(await ParkingSession.countDocuments({ reservationId: reservation._id })).toBe(0);

    const entry = await IoTIngestionService.processRFIDScan({ deviceId: 'parking-esp32-01', parkingId: locationId.toString(), timestamp: new Date(now.getTime() + 2).toISOString(), rfidUid: '03:B7:F7:0F', scannedSlotId: 'A-101', scanId: 'test-entry', authorizationStatus: 'DENIED' });
    expect(entry).toEqual(expect.objectContaining({ allowed: true, action: 'ENTRY_VERIFIED' }));
    expect((await Reservation.findById(reservation._id))?.status).toBe(ReservationStatus.ACTIVE);
    expect((await ParkingSession.findOne({ reservationId: reservation._id }))?.status).toBe(SessionStatus.ACTIVE);

    await ParkingSlot.updateOne({ _id: firstSlotId }, { $set: { status: SlotStatus.OCCUPIED, lastSensorUpdate: new Date() } });
    const occupiedExit = await IoTIngestionService.processRFIDScan({ deviceId: 'parking-esp32-01', parkingId: locationId.toString(), timestamp: new Date(now.getTime() + 3).toISOString(), rfidUid: '03:B7:F7:0F', scannedSlotId: 'A-101', scanId: 'test-occupied-exit' });
    expect(occupiedExit).toEqual(expect.objectContaining({ allowed: true, action: 'EXIT_AUTHORIZED_AWAITING_CLEAR' }));
    expect((await ParkingSession.findOne({ reservationId: reservation._id }))?.status).toBe(SessionStatus.CHECKOUT_PENDING);

    await IoTIngestionService.processTelemetry(telemetry('A-101', false, new Date(Date.now() + 1000)));
    expect((await ParkingSession.findOne({ reservationId: reservation._id }))?.status).toBe(SessionStatus.COMPLETED);
    expect((await Reservation.findById(reservation._id))?.status).toBe(ReservationStatus.COMPLETED);
  });

  it('calculates one idempotent overstay fine and keeps checkout blocked until verified payment', async () => {
    const user = await User.findOne({ email: 'user@smartpark.com' }).orFail();
    const card = await RFIDCard.findOneAndUpdate({ uid: '13:CD:2C:F8' }, { $setOnInsert: { userId: user._id, uid: '13:CD:2C:F8', isActive: true } }, { upsert: true, new: true });
    const now = new Date();
    const reservation = await Reservation.create({
      userId: user._id, parkingLocationId: locationId, slotId: secondSlotId,
      startTime: new Date(now.getTime() - 2 * 3600000), endTime: new Date(now.getTime() - 41 * 60000), duration: 79,
      status: ReservationStatus.ACTIVE,
      pricingSnapshot: { baseRate: 60, hourlyRate: 60, peakMultiplier: 1, totalAmount: 120, currency: 'INR' },
    });
    const session = await ParkingSession.create({ userId: user._id, reservationId: reservation._id, parkingLocationId: locationId, slotId: secondSlotId, rfidCardId: card._id, checkInTime: new Date(now.getTime() - 2 * 3600000), status: SessionStatus.ACTIVE });
    await IoTDevice.updateOne({ _id: deviceId }, { $set: { status: DeviceStatus.ONLINE, lastMessageAt: now, lastHeartbeat: now } });
    await ParkingSlot.updateOne({ _id: secondSlotId }, { $set: { status: SlotStatus.OCCUPIED, lastSensorUpdate: now, currentReservationId: reservation._id } });
    const scan = (offset: number) => IoTIngestionService.processRFIDScan({ deviceId: 'parking-esp32-01', parkingId: locationId.toString(), timestamp: new Date(now.getTime() + offset).toISOString(), rfidUid: '13:CD:2C:F8', scannedSlotId: 'A-102', scanId: `test-fine-${offset}` });

    const first = await scan(10);
    expect(first).toEqual(expect.objectContaining({ allowed: false, action: 'FINE_PAYMENT_REQUIRED', amount: 60 }));
    expect((await ParkingSession.findById(session._id))?.status).toBe(SessionStatus.CHECKOUT_PENDING);
    expect((await Reservation.findById(reservation._id))?.status).toBe(ReservationStatus.CHECKOUT_PENDING);
    expect(await OverstayFine.countDocuments({ sessionId: session._id })).toBe(1);

    const repeated = await scan(20);
    expect(repeated).toEqual(expect.objectContaining({ action: 'FINE_PAYMENT_REQUIRED', amount: 60 }));
    expect(await OverstayFine.countDocuments({ sessionId: session._id })).toBe(1);
  });
});
