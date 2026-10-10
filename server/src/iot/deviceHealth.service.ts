import { DeviceStatus, SlotStatus } from "@smart-parking/shared";
import { env } from "../config/env.js";
import { IoTDevice } from "../models/ioTDevice.model.js";
import { ParkingSlot } from "../models/parkingSlot.model.js";
import { emitDeviceOffline, emitParkingUpdated, emitSlotUpdated } from "../sockets/index.js";
import { logger } from "../utils/logger.js";
import { getParkingTelemetryStats } from "./iotIngestion.service.js";

export const markStaleDevicesOffline = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - env.IOT_DEVICE_OFFLINE_AFTER_MS);
  const staleDevices = await IoTDevice.find({
    isActive: true,
    status: DeviceStatus.ONLINE,
    $or: [{ lastHeartbeat: { $lt: cutoff } }, { lastHeartbeat: { $exists: false } }],
  });
  for (const device of staleDevices) {
    device.status = DeviceStatus.OFFLINE;
    await device.save();
    const staleSlots = await ParkingSlot.find({
      deviceId: device._id,
      isActive: true,
      status: { $in: [SlotStatus.AVAILABLE, SlotStatus.OCCUPIED] },
    });
    for (const slot of staleSlots) {
      slot.status = SlotStatus.UNKNOWN;
      await slot.save();
      emitSlotUpdated({ parkingLocationId: device.parkingLocationId.toString(), slotId: slot._id.toString(), slotNumber: slot.slotNumber, status: SlotStatus.UNKNOWN });
    }
    const stats = await getParkingTelemetryStats(device.parkingLocationId);
    emitDeviceOffline({ deviceId: device.deviceId, parkingLocationId: device.parkingLocationId.toString(), status: DeviceStatus.OFFLINE, lastHeartbeat: device.lastHeartbeat?.toISOString() });
    emitParkingUpdated({ parkingLocationId: device.parkingLocationId.toString(), ...stats, updatedAt: now.toISOString() });
    logger.warn(`Device ${device.deviceId} timed out; its physical occupancy is now unknown`);
  }
  return staleDevices.length;
};

export const startDeviceHealthMonitor = () => {
  void markStaleDevicesOffline().catch((error) => logger.error("Device health check failed", error));
  const timer = setInterval(() => {
    void markStaleDevicesOffline().catch((error) => logger.error("Device health check failed", error));
  }, Math.min(env.IOT_DEVICE_OFFLINE_AFTER_MS, 30000));
  timer.unref();
  return timer;
};
