import crypto from 'node:crypto';
import { DeviceStatus, ReservationStateCommand, ReservationStatus } from '@smart-parking/shared';
import { IoTDevice } from '../models/ioTDevice.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { Reservation } from '../models/reservation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { getMqttClient } from './mqttClient.js';
import { logger } from '../utils/logger.js';

const blockingReservationStatuses = [
  ReservationStatus.PENDING_CONFIRMATION,
  ReservationStatus.CONFIRMED,
  ReservationStatus.ACTIVE,
  ReservationStatus.CHECKOUT_PENDING,
];

export class ReservationStateService {
  static async publishForDevice(deviceId: string): Promise<ReservationStateCommand | null> {
    const device = await IoTDevice.findOne({ deviceId, isActive: true });
    if (!device) return null;
    const slots = await ParkingSlot.find({ deviceId: device._id, isActive: true }).sort({ slotNumber: 1 });
    const now = new Date();
    const reservationRows = await Promise.all(slots.map(async (slot) => {
      const reservation = await Reservation.findOne({
        slotId: slot._id,
        status: { $in: blockingReservationStatuses },
        endTime: { $gt: now },
      }).sort({ startTime: 1 });
      const session = await ParkingSession.findOne({
        slotId: slot._id,
        status: { $in: ['ACTIVE', 'CHECKOUT_PENDING', 'OVERSTAY'] },
      }).select('_id');
      return {
        slotId: slot.slotNumber,
        reservationId: reservation?._id.toString(),
        sessionId: session?._id.toString(),
        reservationBlocked: Boolean(reservation || session),
        indicatorState: session ? 'ACTIVE' as const : reservation ? 'RESERVED' as const : 'AVAILABLE' as const,
      };
    }));

    const revision = Math.max(Date.now(), (device.lastCommandRevision || 0) + 1);
    const command: ReservationStateCommand = {
      schemaVersion: 1,
      commandId: crypto.randomUUID(),
      revision,
      issuedAt: new Date().toISOString(),
      deviceId: device.deviceId,
      parkingId: device.parkingLocationId.toString(),
      slots: reservationRows,
    };
    const mqtt = getMqttClient();
    if (!mqtt?.connected) {
      logger.warn(`Reservation state for ${device.deviceId} not queued because MQTT is offline`);
      return null;
    }
    const destination = `parking/${command.parkingId}/device/${command.deviceId}/state`;
    try {
      await new Promise<void>((resolve, reject) => mqtt.publish(destination, JSON.stringify(command), { qos: 1, retain: true }, (error) => error ? reject(error) : resolve()));
    } catch (error) {
      logger.warn(`Could not publish reservation state for ${device.deviceId}: ${(error as Error).message}`);
      return null;
    }
    device.lastCommandRevision = revision;
    device.lastCommandId = command.commandId;
    device.lastCommandAt = new Date();
    await device.save();
    logger.info(`Reservation state published to ${device.deviceId}; revision=${revision} slots=${reservationRows.length}`);
    return command;
  }

  static async publishForSlot(slotId: string): Promise<ReservationStateCommand | null> {
    const slot = await ParkingSlot.findById(slotId).populate('deviceId');
    const device = slot?.deviceId as any;
    return device?.deviceId ? this.publishForDevice(device.deviceId) : null;
  }

  static async synchronizeAll(): Promise<void> {
    const devices = await IoTDevice.find({ isActive: true }).select('deviceId');
    await Promise.all(devices.map((device) => this.publishForDevice(device.deviceId)));
  }

  static async recordAck(input: { deviceId: string; parkingId: string; commandId: string; revision: number; applied: boolean }): Promise<void> {
    const device = await IoTDevice.findOne({ deviceId: input.deviceId, isActive: true });
    if (!device || device.parkingLocationId.toString() !== input.parkingId) throw new Error('State acknowledgement identity is not authorized');
    if (input.revision < (device.lastAckRevision || 0)) throw new Error('Stale state acknowledgement rejected');
    if (input.revision > (device.lastCommandRevision || 0)) throw new Error('Unknown state acknowledgement revision rejected');
    if (input.revision < (device.lastCommandRevision || 0)) {
      logger.info(`Obsolete but valid state acknowledgement ignored for ${device.deviceId}; revision=${input.revision}`);
      return;
    }
    if (input.commandId !== device.lastCommandId || input.revision !== device.lastCommandRevision) throw new Error('Acknowledgement does not match the latest command');
    if (!input.applied) throw new Error('Device rejected the reservation state command');
    device.lastAckRevision = input.revision;
    device.lastAckCommandId = input.commandId;
    device.lastAckAt = new Date();
    device.status = DeviceStatus.ONLINE;
    await device.save();
    logger.info(`Reservation state acknowledged by ${device.deviceId}; revision=${input.revision}`);
  }
}
