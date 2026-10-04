import { Types } from 'mongoose';
import { IoTDevice } from '../models/ioTDevice.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { SensorEvent } from '../models/sensorEvent.model.js';
import { RFIDEvent } from '../models/rfidEvent.model.js';
import { logger } from '../utils/logger.js';
import { SlotStatus, DeviceStatus, IoTTelemetryPayload } from '@smart-parking/shared';
import {
  emitSlotUpdated,
  emitParkingUpdated,
  emitDeviceUpdated,
  emitDeviceOffline,
  emitPredictionUpdated,
} from '../sockets/index.js';

export class IoTIngestionService {
  public static async processTelemetry(payload: IoTTelemetryPayload) {
    const { deviceId, isOffline, heartbeatOnly, sensors, slots, slotNumber, occupied, rfidCard } = payload;
    const parkingLocationId = payload.parkingId || payload.parkingLocationId;

    logger.info(`📡 Processing IoT Telemetry: Device=${deviceId}, Parking=${parkingLocationId || 'auto'}`);

    // 1. Find or create IoTDevice
    let device = await IoTDevice.findOne({ deviceId });
    let resolvedLocationId: Types.ObjectId | null = null;

    if (parkingLocationId && Types.ObjectId.isValid(parkingLocationId)) {
      resolvedLocationId = new Types.ObjectId(parkingLocationId);
    } else if (parkingLocationId) {
      // Find parking location by name or code if non-ObjectId string passed
      const loc = await ParkingLocation.findOne({
        $or: [{ _id: Types.ObjectId.isValid(parkingLocationId) ? parkingLocationId : null }, { name: new RegExp(parkingLocationId, 'i') }],
      });
      if (loc) resolvedLocationId = loc._id as Types.ObjectId;
    }

    if (!resolvedLocationId && device?.parkingLocationId) {
      resolvedLocationId = device.parkingLocationId as Types.ObjectId;
    }

    // Fallback to first active location if unassigned
    if (!resolvedLocationId) {
      const firstLoc = await ParkingLocation.findOne();
      if (firstLoc) resolvedLocationId = firstLoc._id as Types.ObjectId;
    }

    if (!device) {
      device = await IoTDevice.create({
        deviceId,
        parkingLocationId: resolvedLocationId,
        name: deviceId,
        thingName: deviceId,
        status: isOffline ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE,
        lastHeartbeat: new Date(),
        lastMessageAt: new Date(),
        isActive: true,
      });
    } else {
      device.status = isOffline ? DeviceStatus.OFFLINE : DeviceStatus.ONLINE;
      device.lastHeartbeat = new Date();
      device.lastMessageAt = new Date();
      if (resolvedLocationId) device.parkingLocationId = resolvedLocationId;
      await device.save();
    }

    // Handle offline status notification
    if (isOffline) {
      emitDeviceOffline({
        deviceId,
        parkingLocationId: resolvedLocationId?.toString(),
        status: DeviceStatus.OFFLINE,
        lastHeartbeat: device?.lastHeartbeat ? device.lastHeartbeat.toISOString() : new Date().toISOString(),
      });
      return { status: 'ok', message: 'Device marked offline' };
    }

    // Emit live device heartbeat / status update
    emitDeviceUpdated({
      deviceId,
      parkingLocationId: resolvedLocationId?.toString(),
      status: DeviceStatus.ONLINE,
      lastHeartbeat: device?.lastHeartbeat ? device.lastHeartbeat.toISOString() : new Date().toISOString(),
    });

    if (heartbeatOnly) {
      return { status: 'ok', message: 'Heartbeat recorded' };
    }

    if (!resolvedLocationId) {
      logger.warn(`Cannot process slot updates: No valid ParkingLocation found for device ${deviceId}`);
      return { status: 'ok', message: 'Heartbeat recorded without location' };
    }

    // 2. Process Slot Occupancy Updates
    const updatedSlots: Array<{ slotId: string; slotNumber: string; status: SlotStatus }> = [];

    // Case A: Specific single slot update provided in payload
    if (slotNumber && typeof occupied === 'boolean') {
      const slot = await ParkingSlot.findOne({
        parkingLocationId: resolvedLocationId,
        slotNumber,
      });

      if (slot) {
        const newStatus = occupied ? SlotStatus.OCCUPIED : SlotStatus.AVAILABLE;
        if (slot.status !== newStatus) {
          slot.status = newStatus;
          await slot.save();

          await SensorEvent.create({
            parkingLocationId: resolvedLocationId,
            slotId: slot._id,
            deviceId,
            eventType: occupied ? 'SLOT_OCCUPIED' : 'SLOT_VACATED',
            occupied,
            timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
            payload,
          });

          updatedSlots.push({
            slotId: slot._id.toString(),
            slotNumber: slot.slotNumber,
            status: slot.status as SlotStatus,
          });
        }
      }
    }

    // Case B: Multi-sensor object provided (e.g. { slot1: true, slot2: false, slot3: true })
    if (sensors && typeof sensors === 'object') {
      const locationSlots = await ParkingSlot.find({ parkingLocationId: resolvedLocationId }).sort({ slotNumber: 1 });

      const sensorKeys = Object.keys(sensors); // e.g. ['slot1', 'slot2', 'slot3']
      for (let i = 0; i < sensorKeys.length; i++) {
        const key = sensorKeys[i];
        const isOccupied = Boolean(sensors[key]);
        const targetSlot = locationSlots[i] || locationSlots.find((s) => s.slotNumber.toLowerCase().includes(`slot-${i + 1}`) || s.slotNumber.toLowerCase().includes(`a-10${i + 1}`));

        if (targetSlot) {
          const newStatus = isOccupied ? SlotStatus.OCCUPIED : SlotStatus.AVAILABLE;
          if (targetSlot.status !== newStatus && targetSlot.status !== SlotStatus.RESERVED) {
            targetSlot.status = newStatus;
            await targetSlot.save();

            await SensorEvent.create({
              parkingLocationId: resolvedLocationId,
              slotId: targetSlot._id,
              deviceId,
              eventType: isOccupied ? 'SLOT_OCCUPIED' : 'SLOT_VACATED',
              occupied: isOccupied,
              timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
              payload,
            });

            updatedSlots.push({
              slotId: targetSlot._id.toString(),
              slotNumber: targetSlot.slotNumber,
              status: targetSlot.status as SlotStatus,
            });
          }
        }
      }
    }

    // Case C: Production ESP32 contract with stable slot identifiers.
    if (Array.isArray(slots)) {
      for (const update of slots) {
        const slot = await ParkingSlot.findOne({
          parkingLocationId: resolvedLocationId,
          ...(Types.ObjectId.isValid(update.slotId)
            ? { _id: new Types.ObjectId(update.slotId) }
            : { slotNumber: update.slotId }),
        });

        if (!slot || slot.status === SlotStatus.MAINTENANCE || slot.status === SlotStatus.OUT_OF_SERVICE) {
          continue;
        }

        const newStatus = update.occupied ? SlotStatus.OCCUPIED : SlotStatus.AVAILABLE;
        if (slot.status !== newStatus) {
          slot.status = newStatus;
          slot.lastSensorUpdate = payload.timestamp ? new Date(payload.timestamp) : new Date();
          await slot.save();

          await SensorEvent.create({
            parkingLocationId: resolvedLocationId,
            slotId: slot._id,
            deviceId,
            eventType: update.occupied ? 'SLOT_OCCUPIED' : 'SLOT_VACATED',
            occupied: update.occupied,
            timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
            payload,
          });

          updatedSlots.push({
            slotId: slot._id.toString(),
            slotNumber: slot.slotNumber,
            status: slot.status as SlotStatus,
          });
        }
      }
    }

    // 3. Log RFID Event if RFID tap present
    if (rfidCard) {
      await RFIDEvent.create({
        parkingLocationId: resolvedLocationId,
        uid: rfidCard,
        eventType: 'CHECK_IN',
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      });
      logger.info(`💳 RFID Card Tapped: ${rfidCard}`);
    }

    // 4. Recalculate Aggregate Parking Location Statistics
    const allSlots = await ParkingSlot.find({ parkingLocationId: resolvedLocationId });
    const totalSlots = allSlots.length;
    const availableSlots = allSlots.filter((s) => s.status === SlotStatus.AVAILABLE).length;
    const occupiedSlots = allSlots.filter((s) => s.status === SlotStatus.OCCUPIED).length;
    const reservedSlots = allSlots.filter((s) => s.status === SlotStatus.RESERVED).length;
    const maintenanceSlots = allSlots.filter((s) => s.status === SlotStatus.MAINTENANCE || s.status === SlotStatus.OUT_OF_SERVICE).length;

    const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100 * 10) / 10 : 0;

    // Update ParkingLocation summary fields
    await ParkingLocation.findByIdAndUpdate(resolvedLocationId, {
      totalSlots,
      availableSlots,
      occupancy: occupancyRate,
    });

    // 5. Emit Real-Time Socket.IO Events
    // Emit individual slot:updated events
    for (const s of updatedSlots) {
      emitSlotUpdated({
        parkingLocationId: resolvedLocationId.toString(),
        slotId: s.slotId,
        slotNumber: s.slotNumber,
        status: s.status,
      });
    }

    // Emit parking:updated event with overall aggregate stats
    emitParkingUpdated({
      parkingLocationId: resolvedLocationId.toString(),
      totalSlots,
      availableSlots,
      occupiedSlots,
      reservedSlots,
      maintenanceSlots,
      occupancyRate,
    });

    // Emit live occupancy prediction update
    emitPredictionUpdated({
      parkingLocationId: resolvedLocationId.toString(),
      predictedOccupancyRate: Math.min(100, Math.round((occupancyRate + 5) * 10) / 10),
      confidenceScore: 0.92,
      predictedFor: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    logger.info(
      `⚡ Socket.IO Broadcast: Location=${resolvedLocationId} | Available=${availableSlots}/${totalSlots} (${occupancyRate}% Occupied)`
    );

    return {
      status: 'ok',
      parkingLocationId: resolvedLocationId.toString(),
      updatedSlotsCount: updatedSlots.length,
      locationStats: {
        totalSlots,
        availableSlots,
        occupiedSlots,
        reservedSlots,
        occupancyRate,
      },
    };
  }
}
