import { Types } from 'mongoose';
import { Reservation, IReservation } from '../models/reservation.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { LockService } from './lock.service.js';
import { PricingService } from './pricing.service.js';
import { AllocationService } from './allocation.service.js';
import { IoTDevice } from '../models/ioTDevice.model.js';
import { env } from '../config/env.js';
import { ReservationStateService } from '../iot/reservationState.service.js';
import { emitReservationUpdated } from '../sockets/index.js';
import {
  CreateReservationInput,
  ListReservationsQueryInput,
  ReservationStatus,
  SlotStatus,
  UserRole,
  SlotType,
} from '@smart-parking/shared';

export class ReservationService {
  /** Create a validated reservation under the configured confirmation policy. */
  public static async createReservation(
    input: CreateReservationInput,
    userId: string
  ): Promise<IReservation> {
    const { parkingLocationId, autoAssign, vehicleId, startTime, endTime } = input;
    let slotId = input.slotId;
    const slotType = input.slotType || SlotType.REGULAR;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      throw new Error('endTime must be after startTime');
    }
    if (start.getTime() < Date.now() - 30_000) {
      const error: any = new Error('startTime must be in the future');
      error.statusCode = 400;
      throw error;
    }

    // Step 1: Validate Parking Location and Operating Hours
    const location = await ParkingLocation.findById(parkingLocationId);
    if (!location) {
      throw new Error('Parking location not found');
    }

    if (location.status !== 'ACTIVE') {
      throw new Error('Parking location is currently inactive');
    }

    // Step 2: Auto Allocate Slot if requested
    if (autoAssign || !slotId) {
      const allocation = await AllocationService.autoAllocateSlot(
        {
          parkingLocationId,
          slotType,
          startTime,
          endTime,
        },
        userId
      );
      slotId = allocation.allocatedSlot._id.toString();
    }

    const targetSlotId = slotId!;

    // Step 3: Fast-Path Concurrency Protection (Acquire Lock on slotId)
    const lockAcquired = await LockService.acquireLock(targetSlotId, 5000);
    if (!lockAcquired) {
      const err: any = new Error(
        'Slot is currently being processed by another concurrent user. Please try again.'
      );
      err.statusCode = 409;
      throw err;
    }

    try {
      // Step 4: Verify Slot Exists and is not in maintenance
      const slot = await ParkingSlot.findById(targetSlotId);
      if (!slot) {
        throw new Error('Target parking slot not found');
      }

      if (
        slot.status !== SlotStatus.AVAILABLE
      ) {
        throw new Error(`Slot ${slot.slotNumber} is currently unavailable for booking`);
      }
      if (slot.parkingLocationId.toString() !== parkingLocationId || !slot.isActive) {
        throw new Error('Target parking slot is not active at this parking location');
      }
      if (slot.deviceId) {
        const device = await IoTDevice.findById(slot.deviceId);
        const sensorFresh = Boolean(slot.lastSensorUpdate && Date.now() - slot.lastSensorUpdate.getTime() <= env.SENSOR_FRESHNESS_MS);
        if (!device || device.status !== 'ONLINE' || !sensorFresh) {
          throw new Error(`Slot ${slot.slotNumber} cannot be booked while device or occupancy data is offline, stale, or unknown`);
        }
      }

      // Overlap Query across active reservation statuses
      const activeStatuses = [
        ReservationStatus.PENDING_CONFIRMATION,
        ReservationStatus.PENDING_PAYMENT,
        ReservationStatus.CONFIRMED,
        ReservationStatus.ACTIVE,
        ReservationStatus.PAYMENT_FAILED,
      ];

      const overlappingReservation = await Reservation.findOne({
        slotId: new Types.ObjectId(targetSlotId),
        status: { $in: activeStatuses },
        $and: [{ startTime: { $lt: end } }, { endTime: { $gt: start } }],
      });

      if (overlappingReservation) {
        const err: any = new Error(
          `Slot ${slot.slotNumber} is already reserved for the requested time period`
        );
        err.statusCode = 409;
        throw err;
      }

      // Step 5: Server-Authoritative Price Calculation
      const pricingResult = await PricingService.calculatePricing({
        parkingLocationId,
        slotId: targetSlotId,
        slotType: slot.slotType as SlotType,
        startTime,
        endTime,
      });

      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

      // Local demonstration may explicitly bypass operational confirmation. This
      // does not create a payment or weaken the RFID authorization checks.
      const autoConfirm = env.NODE_ENV !== 'production' && env.LOCAL_DEMO_AUTO_CONFIRM;
      const expiresAt = autoConfirm ? end : new Date(Date.now() + 15 * 60 * 1000);

      const reservation = await Reservation.create({
        userId: new Types.ObjectId(userId),
        parkingLocationId: new Types.ObjectId(parkingLocationId),
        slotId: new Types.ObjectId(targetSlotId),
        vehicleId: vehicleId ? new Types.ObjectId(vehicleId) : undefined,
        startTime: start,
        endTime: end,
        duration: durationMinutes,
        status: autoConfirm ? ReservationStatus.CONFIRMED : ReservationStatus.PENDING_CONFIRMATION,
        pricingSnapshot: {
          baseRate: pricingResult.baseAmount,
          hourlyRate: pricingResult.effectiveHourlyRate,
          peakMultiplier: pricingResult.peakAmount > 0 ? 1.5 : 1.0,
          totalAmount: pricingResult.finalAmount,
          currency: pricingResult.currency,
          ruleApplied: `Version ${pricingResult.pricingRuleVersion}`,
        },
        expiresAt,
      });

      if (autoConfirm) {
        await ParkingSlot.updateOne({ _id: targetSlotId }, { $set: { currentReservationId: reservation._id } });
        await ReservationStateService.publishForSlot(targetSlotId);
      }
      emitReservationUpdated({ reservationId: reservation._id.toString(), userId: reservation.userId.toString(), parkingLocationId: reservation.parkingLocationId.toString(), slotId: reservation.slotId.toString(), status: reservation.status });

      return reservation;
    } finally {
      // Step 7: Release lock
      await LockService.releaseLock(targetSlotId, lockAcquired);
    }
  }

  /**
   * Fetch single reservation by ID
   */
  public static async getReservationById(
    reservationId: string,
    userId: string,
    role: UserRole
  ): Promise<IReservation> {
    const reservation = await Reservation.findById(reservationId)
      .populate('parkingLocationId', 'name address city operatingHours')
      .populate('slotId', 'slotNumber slotType status');

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (role === UserRole.USER && reservation.userId.toString() !== userId) {
      const err: any = new Error('Forbidden: Access denied to this reservation');
      err.statusCode = 403;
      throw err;
    }
    if (role === UserRole.PARKING_MANAGER && !(await ParkingLocation.exists({ _id: reservation.parkingLocationId, managerIds: userId }))) {
      const err: any = new Error('Forbidden: Reservation belongs to an unassigned facility');
      err.statusCode = 403;
      throw err;
    }

    return reservation;
  }

  /**
   * List reservations with pagination & filtering
   */
  public static async listReservations(
    query: ListReservationsQueryInput,
    userId: string,
    role: UserRole
  ): Promise<{ data: IReservation[]; total: number; page: number; limit: number }> {
    const { status, parkingLocationId, page = 1, limit = 20 } = query;
    const filter: Record<string, any> = {};

    if (role === UserRole.USER) {
      filter.userId = new Types.ObjectId(userId);
    } else if (role === UserRole.PARKING_MANAGER) {
      const assigned = await ParkingLocation.find({ managerIds: userId }).select('_id').lean();
      filter.parkingLocationId = { $in: assigned.map((location) => location._id) };
    }

    if (status) {
      filter.status = status;
    }

    if (parkingLocationId) {
      if (role === UserRole.PARKING_MANAGER) {
        const assignedIds = (filter.parkingLocationId?.$in || []) as Types.ObjectId[];
        if (!assignedIds.some((id) => id.toString() === parkingLocationId)) {
          const error: any = new Error('Forbidden: Parking facility is not assigned to this manager');
          error.statusCode = 403;
          throw error;
        }
      }
      filter.parkingLocationId = new Types.ObjectId(parkingLocationId);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Reservation.find(filter)
        .populate('parkingLocationId', 'name address city')
        .populate('slotId', 'slotNumber slotType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Reservation.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Cancel an active reservation
   */
  public static async cancelReservation(
    reservationId: string,
    userId: string,
    role: UserRole
  ): Promise<IReservation> {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (role === UserRole.USER && reservation.userId.toString() !== userId) {
      const err: any = new Error('Forbidden: Access denied');
      err.statusCode = 403;
      throw err;
    }
    if (role === UserRole.PARKING_MANAGER && !(await ParkingLocation.exists({ _id: reservation.parkingLocationId, managerIds: userId }))) {
      const err: any = new Error('Forbidden: Reservation belongs to an unassigned facility');
      err.statusCode = 403;
      throw err;
    }

    if (
      reservation.status === ReservationStatus.COMPLETED ||
      reservation.status === ReservationStatus.CANCELLED
    ) {
      throw new Error(`Cannot cancel reservation in ${reservation.status} state`);
    }

    reservation.status = ReservationStatus.CANCELLED;
    await reservation.save();

    // Reset ParkingSlot if it was marked reserved by this reservation
    if (reservation.slotId) {
      await ParkingSlot.updateOne({ _id: reservation.slotId, currentReservationId: reservation._id }, { $unset: { currentReservationId: 1 } });
      await ReservationStateService.publishForSlot(reservation.slotId.toString());
    }

    emitReservationUpdated({ reservationId: reservation._id.toString(), userId: reservation.userId.toString(), parkingLocationId: reservation.parkingLocationId.toString(), slotId: reservation.slotId.toString(), status: reservation.status });

    return reservation;
  }

  public static async confirmReservation(reservationId: string, userId: string, role: UserRole): Promise<IReservation> {
    if (role !== UserRole.ADMIN && role !== UserRole.PARKING_MANAGER) {
      const error: any = new Error('Only an authorized Manager or Admin can confirm a no-payment reservation');
      error.statusCode = 403;
      throw error;
    }
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error('Reservation not found');
    if (role === UserRole.PARKING_MANAGER && !(await ParkingLocation.exists({ _id: reservation.parkingLocationId, managerIds: userId }))) {
      const error: any = new Error('Forbidden: Reservation belongs to an unassigned facility');
      error.statusCode = 403;
      throw error;
    }
    if (reservation.status === ReservationStatus.CONFIRMED) return reservation;
    if (reservation.status !== ReservationStatus.PENDING_CONFIRMATION) throw new Error(`Cannot confirm reservation in ${reservation.status} state`);
    reservation.status = ReservationStatus.CONFIRMED;
    await reservation.save();
    await ParkingSlot.updateOne({ _id: reservation.slotId }, { $set: { currentReservationId: reservation._id } });
    await ReservationStateService.publishForSlot(reservation.slotId.toString());
    emitReservationUpdated({ reservationId: reservation._id.toString(), userId: reservation.userId.toString(), parkingLocationId: reservation.parkingLocationId.toString(), slotId: reservation.slotId.toString(), status: reservation.status });
    return reservation;
  }

  /**
   * Background job worker to expire stale pending reservations
   */
  public static async expirePendingReservations(): Promise<number> {
    const now = new Date();
    const expiring = await Reservation.find({
      $or: [
        { status: { $in: [ReservationStatus.PENDING_CONFIRMATION, ReservationStatus.PENDING_PAYMENT, ReservationStatus.PAYMENT_FAILED] }, expiresAt: { $lt: now } },
        { status: ReservationStatus.CONFIRMED, endTime: { $lt: now } },
      ],
    }).select('_id slotId userId parkingLocationId');
    if (!expiring.length) return 0;
    const ids = expiring.map((reservation) => reservation._id);
    const result = await Reservation.updateMany(
      {
        _id: { $in: ids },
      },
      {
        $set: { status: ReservationStatus.EXPIRED },
      }
    );
    await Promise.all(expiring.map(async (reservation) => {
      await ParkingSlot.updateOne({ _id: reservation.slotId, currentReservationId: reservation._id }, { $unset: { currentReservationId: 1 } });
      await ReservationStateService.publishForSlot(reservation.slotId.toString());
      emitReservationUpdated({ reservationId: reservation._id.toString(), userId: reservation.userId.toString(), parkingLocationId: reservation.parkingLocationId.toString(), slotId: reservation.slotId.toString(), status: ReservationStatus.EXPIRED });
    }));
    return result.modifiedCount;
  }
}
