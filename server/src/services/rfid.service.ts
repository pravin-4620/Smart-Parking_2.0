import { Types } from 'mongoose';
import { RFIDCard } from '../models/rfidCard.model.js';
import { RFIDEvent } from '../models/rfidEvent.model.js';
import { Reservation } from '../models/reservation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { ReservationStatus, SlotStatus, SessionStatus, RFIDEventType } from '@smart-parking/shared';
import { emitSlotUpdated, emitSessionUpdated, emitReservationUpdated } from '../sockets/index.js';
import { logger } from '../utils/logger.js';

export class RFIDService {
  /**
   * Process RFID Gate Tap (ENTRY / EXIT / CHECK_IN / CHECK_OUT)
   */
  public static async processRFIDTap(input: {
    parkingLocationId: string;
    rfidUid: string;
    eventType: string;
    deviceId?: string;
  }) {
    const { parkingLocationId, rfidUid, eventType, deviceId } = input;
    const normalizedUid = rfidUid.trim().toUpperCase();

    logger.info(`💳 RFID Tap Event: UID=${normalizedUid}, Type=${eventType}, Location=${parkingLocationId}`);

    // 1. Find RFID Card registration
    const card = await RFIDCard.findOne({ uid: normalizedUid, isActive: true });
    if (!card) {
      if (Types.ObjectId.isValid(parkingLocationId)) {
        await RFIDEvent.create({
          parkingLocationId: new Types.ObjectId(parkingLocationId),
          uid: normalizedUid,
          eventType: RFIDEventType.DENIED,
          timestamp: new Date(),
        });
      }

      return {
        allowed: false,
        action: 'KEEP_CLOSED',
        reason: 'Unregistered or inactive RFID tag',
      };
    }

    const userId = card.userId;
    const isEntry = eventType === 'ENTRY' || eventType === 'CHECK_IN';

    if (isEntry) {
      // 2. Look for CONFIRMED reservation
      const reservation = await Reservation.findOne({
        userId,
        parkingLocationId: Types.ObjectId.isValid(parkingLocationId) ? new Types.ObjectId(parkingLocationId) : undefined,
        status: ReservationStatus.CONFIRMED,
      }).sort({ startTime: 1 });

      let slotId: Types.ObjectId | null = reservation ? reservation.slotId : null;

      // If no reservation slot, find any available slot
      if (!slotId) {
        const availableSlot = await ParkingSlot.findOne({
          parkingLocationId: new Types.ObjectId(parkingLocationId),
          status: SlotStatus.AVAILABLE,
        });
        if (availableSlot) slotId = availableSlot._id as Types.ObjectId;
      }

      if (slotId) {
        const slot = await ParkingSlot.findById(slotId);
        if (slot) {
          slot.status = SlotStatus.OCCUPIED;
          await slot.save();

          emitSlotUpdated({
            parkingLocationId,
            slotId: slot._id.toString(),
            slotNumber: slot.slotNumber,
            status: SlotStatus.OCCUPIED,
          });
        }
      }

      // Update reservation status if linked
      if (reservation) {
        reservation.status = ReservationStatus.ACTIVE;
        await reservation.save();
        emitReservationUpdated({
          reservationId: reservation._id.toString(),
          status: ReservationStatus.ACTIVE,
        });
      }

      // Create active ParkingSession
      const session = await ParkingSession.create({
        userId,
        reservationId: reservation?._id,
        parkingLocationId: new Types.ObjectId(parkingLocationId),
        slotId: slotId || new Types.ObjectId(),
        rfidCardId: card._id,
        checkInTime: new Date(),
        status: SessionStatus.ACTIVE,
      });

      await RFIDEvent.create({
        parkingLocationId: new Types.ObjectId(parkingLocationId),
        uid: normalizedUid,
        userId,
        slotId: slotId || undefined,
        eventType: RFIDEventType.ENTRY,
        timestamp: new Date(),
      });

      emitSessionUpdated({
        sessionId: session._id.toString(),
        status: SessionStatus.ACTIVE,
      });

      return {
        allowed: true,
        action: 'OPEN_GATE',
        session,
        message: 'Gate opened. Welcome!',
      };
    } else {
      // EXIT Flow
      const activeSession = await ParkingSession.findOne({
        userId,
        parkingLocationId: Types.ObjectId.isValid(parkingLocationId) ? new Types.ObjectId(parkingLocationId) : undefined,
        status: SessionStatus.ACTIVE,
      });

      if (activeSession) {
        activeSession.status = SessionStatus.COMPLETED;
        activeSession.checkOutTime = new Date();
        await activeSession.save();

        if (activeSession.slotId) {
          const slot = await ParkingSlot.findById(activeSession.slotId);
          if (slot) {
            slot.status = SlotStatus.AVAILABLE;
            slot.currentReservationId = undefined;
            await slot.save();

            emitSlotUpdated({
              parkingLocationId,
              slotId: slot._id.toString(),
              slotNumber: slot.slotNumber,
              status: SlotStatus.AVAILABLE,
            });
          }
        }

        if (activeSession.reservationId) {
          await Reservation.findByIdAndUpdate(activeSession.reservationId, {
            status: ReservationStatus.COMPLETED,
          });
          emitReservationUpdated({
            reservationId: activeSession.reservationId.toString(),
            status: ReservationStatus.COMPLETED,
          });
        }

        emitSessionUpdated({
          sessionId: activeSession._id.toString(),
          status: SessionStatus.COMPLETED,
        });
      }

      if (Types.ObjectId.isValid(parkingLocationId)) {
        await RFIDEvent.create({
          parkingLocationId: new Types.ObjectId(parkingLocationId),
          uid: normalizedUid,
          userId,
          eventType: RFIDEventType.EXIT,
          timestamp: new Date(),
        });
      }

      return {
        allowed: true,
        action: 'OPEN_GATE',
        message: 'Gate opened. Safe travels!',
      };
    }
  }
}
