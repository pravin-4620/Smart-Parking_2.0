import { Types } from 'mongoose';
import { FineStatus, ReservationStatus, RFIDEventType, SessionStatus, SlotStatus } from '@smart-parking/shared';
import { env } from '../config/env.js';
import { RFIDCard } from '../models/rfidCard.model.js';
import { RFIDEvent } from '../models/rfidEvent.model.js';
import { Reservation } from '../models/reservation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { ParkingSlot, IParkingSlot } from '../models/parkingSlot.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { IoTDevice } from '../models/ioTDevice.model.js';
import { OverstayFine } from '../models/overstayFine.model.js';
import { LockService } from './lock.service.js';
import { ReservationStateService } from '../iot/reservationState.service.js';
import { emitReservationUpdated, emitSessionUpdated } from '../sockets/index.js';

const AUTHORIZED_SLOT_BY_UID: Readonly<Record<string, string>> = Object.freeze({
  '03:B7:F7:0F': 'A-101',
  '13:CD:2C:F8': 'A-102',
});

type ScanInput = { parkingLocationId: string; deviceId: string; rfidUid: string; slot: IParkingSlot };

export class RFIDService {
  static async processDeviceScan(input: ScanInput) {
    const now = new Date();
    const uid = input.rfidUid.trim().toUpperCase();
    const mappedSlot = AUTHORIZED_SLOT_BY_UID[uid];
    if (!mappedSlot || mappedSlot !== input.slot.slotNumber) return this.deny(input, uid, 'RFID tag is not authorized for this slot');
    const card = await RFIDCard.findOne({ uid, isActive: true });
    if (!card || !card.userId) return this.deny(input, uid, 'RFID tag is not linked to an active customer');
    const lockKey = `rfid:${input.slot._id.toString()}`;
    const lockToken = await LockService.acquireLock(lockKey, 10000);
    if (!lockToken) return this.deny(input, uid, 'Another slot operation is already in progress');
    try {
      const activeSession = await ParkingSession.findOne({ slotId: input.slot._id, status: { $in: [SessionStatus.ACTIVE, SessionStatus.CHECKOUT_PENDING, SessionStatus.OVERSTAY] } });
      if (activeSession) return await this.processExit(input, uid, card._id as Types.ObjectId, card.userId, activeSession, now);
      return await this.processEntry(input, uid, card._id as Types.ObjectId, card.userId, now);
    } finally {
      await LockService.releaseLock(lockKey, lockToken);
    }
  }

  private static async processEntry(input: ScanInput, uid: string, cardId: Types.ObjectId, userId: Types.ObjectId, now: Date) {
    const slot = await ParkingSlot.findById(input.slot._id);
    const device = slot?.deviceId ? await IoTDevice.findById(slot.deviceId) : null;
    const sensorFresh = Boolean(slot?.lastSensorUpdate && now.getTime() - slot.lastSensorUpdate.getTime() <= env.SENSOR_FRESHNESS_MS);
    if (!device || device.status !== 'ONLINE' || !sensorFresh || slot?.status !== SlotStatus.OCCUPIED) {
      return this.deny(input, uid, 'Entry requires a valid reservation and fresh vehicle-presence detection at the assigned slot', userId);
    }
    const earliestStart = new Date(now.getTime() + env.RFID_ENTRY_EARLY_MINUTES * 60000);
    const reservation = await Reservation.findOne({
      userId,
      parkingLocationId: new Types.ObjectId(input.parkingLocationId),
      slotId: input.slot._id,
      status: ReservationStatus.CONFIRMED,
      startTime: { $lte: earliestStart },
      endTime: { $gt: now },
    }).sort({ startTime: 1 });
    if (!reservation) return this.deny(input, uid, 'No confirmed reservation is currently valid for this customer and slot', userId);
    const session = await ParkingSession.create({ userId, reservationId: reservation._id, parkingLocationId: reservation.parkingLocationId, slotId: reservation.slotId, vehicleId: reservation.vehicleId, rfidCardId: cardId, checkInTime: now, status: SessionStatus.ACTIVE });
    reservation.status = ReservationStatus.ACTIVE;
    await reservation.save();
    await RFIDEvent.create({ uid, userId, parkingLocationId: reservation.parkingLocationId, slotId: reservation.slotId, eventType: RFIDEventType.ENTRY, timestamp: now });
    emitReservationUpdated({ reservationId: reservation._id.toString(), userId: reservation.userId.toString(), parkingLocationId: reservation.parkingLocationId.toString(), slotId: reservation.slotId.toString(), status: reservation.status });
    emitSessionUpdated({ sessionId: session._id.toString(), userId: session.userId.toString(), parkingLocationId: session.parkingLocationId.toString(), slotId: session.slotId.toString(), status: session.status });
    await ReservationStateService.publishForSlot(input.slot._id.toString());
    return { allowed: true, action: 'ENTRY_VERIFIED', sessionId: session._id.toString(), reservationId: reservation._id.toString() };
  }

  private static async processExit(input: ScanInput, uid: string, cardId: Types.ObjectId, userId: Types.ObjectId, session: any, now: Date) {
    if (!session.userId.equals(userId) || !session.rfidCardId?.equals(cardId)) return this.deny(input, uid, 'RFID tag does not own the active parking session', userId);
    const reservation = session.reservationId ? await Reservation.findById(session.reservationId) : null;
    if (!reservation || !reservation.userId.equals(userId) || !reservation.slotId.equals(input.slot._id)) return this.deny(input, uid, 'Active session is not linked to this reservation and slot', userId);
    const slot = await ParkingSlot.findById(input.slot._id);
    const device = slot?.deviceId ? await IoTDevice.findById(slot.deviceId) : null;
    const sensorFresh = Boolean(slot?.lastSensorUpdate && now.getTime() - slot.lastSensorUpdate.getTime() <= env.SENSOR_FRESHNESS_MS);
    if (!device || device.status !== 'ONLINE' || !sensorFresh) return this.deny(input, uid, 'Exit cannot be authorized while the device or sensor telemetry is offline or stale', userId);
    if (session.status === SessionStatus.CHECKOUT_PENDING && session.exitVerifiedAt) {
      const existingFine = await OverstayFine.findOne({ sessionId: session._id, status: { $nin: [FineStatus.PAID, FineStatus.WAIVED] } });
      if (env.REQUIRE_FINE_PAYMENT_BEFORE_EXIT && existingFine) {
        return { allowed: false, action: 'FINE_PAYMENT_REQUIRED', sessionId: session._id.toString(), fineId: existingFine._id.toString(), amount: existingFine.amount, currency: existingFine.currency };
      }
      return { allowed: true, action: 'EXIT_AUTHORIZED_AWAITING_CLEAR', sessionId: session._id.toString(), reservationId: reservation._id.toString() };
    }
    if (slot?.status !== SlotStatus.OCCUPIED) return this.deny(input, uid, 'Exit authorization requires the vehicle to still be present in the slot', userId);

    const location = await ParkingLocation.findById(reservation.parkingLocationId);
    const policy = location?.overstayConfig || { gracePeriodMinutes: 10, fineIntervalMinutes: 15, fineAmountPerInterval: 20, maximumFineAmount: 500 };
    const lateMinutes = Math.max(0, Math.ceil((now.getTime() - reservation.endTime.getTime()) / 60000));
    const billableMinutes = Math.max(0, lateMinutes - policy.gracePeriodMinutes);
    if (billableMinutes > 0) {
      const intervals = Math.ceil(billableMinutes / policy.fineIntervalMinutes);
      const amount = Math.min(policy.maximumFineAmount, intervals * policy.fineAmountPerInterval);
      const fine = await OverstayFine.findOneAndUpdate(
        { sessionId: session._id },
        { $setOnInsert: { userId, reservationId: reservation._id, sessionId: session._id, parkingLocationId: reservation.parkingLocationId, slotId: reservation.slotId, overstayMinutes: lateMinutes, gracePeriodMinutes: policy.gracePeriodMinutes, intervalMinutes: policy.fineIntervalMinutes, intervalsCharged: intervals, amountPerInterval: policy.fineAmountPerInterval, amount, maximumAmount: policy.maximumFineAmount, currency: reservation.pricingSnapshot.currency || 'INR', status: FineStatus.DUE, calculatedAt: now } },
        { new: true, upsert: true }
      );
      session.overstayMinutes = fine.overstayMinutes;
      session.overstayFee = fine.amount;
      if (env.REQUIRE_FINE_PAYMENT_BEFORE_EXIT && fine.status !== FineStatus.PAID && fine.status !== FineStatus.WAIVED) {
        session.exitVerifiedAt = now;
        session.status = SessionStatus.CHECKOUT_PENDING;
        reservation.status = ReservationStatus.CHECKOUT_PENDING;
        await Promise.all([session.save(), reservation.save()]);
        emitSessionUpdated({ sessionId: session._id.toString(), userId: session.userId.toString(), parkingLocationId: session.parkingLocationId.toString(), slotId: session.slotId.toString(), status: session.status, fineStatus: fine.status, fineAmount: fine.amount });
        emitReservationUpdated({ reservationId: reservation._id.toString(), userId: reservation.userId.toString(), parkingLocationId: reservation.parkingLocationId.toString(), slotId: reservation.slotId.toString(), status: reservation.status });
        await ReservationStateService.publishForSlot(input.slot._id.toString());
        return { allowed: false, action: 'FINE_PAYMENT_REQUIRED', sessionId: session._id.toString(), fineId: fine._id.toString(), amount: fine.amount, currency: fine.currency };
      }
    }
    session.exitVerifiedAt = now;
    session.status = SessionStatus.CHECKOUT_PENDING;
    reservation.status = ReservationStatus.CHECKOUT_PENDING;
    await Promise.all([session.save(), reservation.save()]);
    await RFIDEvent.create({ uid, userId, parkingLocationId: reservation.parkingLocationId, slotId: reservation.slotId, eventType: RFIDEventType.EXIT, timestamp: now });
    emitSessionUpdated({ sessionId: session._id.toString(), userId: session.userId.toString(), parkingLocationId: session.parkingLocationId.toString(), slotId: session.slotId.toString(), status: session.status });
    emitReservationUpdated({ reservationId: reservation._id.toString(), userId: reservation.userId.toString(), parkingLocationId: reservation.parkingLocationId.toString(), slotId: reservation.slotId.toString(), status: reservation.status });
    await ReservationStateService.publishForSlot(input.slot._id.toString());
    return { allowed: true, action: 'EXIT_AUTHORIZED_AWAITING_CLEAR', sessionId: session._id.toString(), reservationId: reservation._id.toString() };
  }

  private static async deny(input: ScanInput, uid: string, reason: string, userId?: Types.ObjectId) {
    await RFIDEvent.create({ parkingLocationId: new Types.ObjectId(input.parkingLocationId), slotId: input.slot._id, uid, userId, eventType: RFIDEventType.DENIED, timestamp: new Date() });
    return { allowed: false, action: 'KEEP_CLOSED', reason };
  }

  static async processRFIDTap(_input?: unknown): Promise<any> {
    const error: any = new Error('Browser-supplied RFID taps are disabled; use the authenticated MQTT device path');
    error.statusCode = 403;
    throw error;
  }
}
