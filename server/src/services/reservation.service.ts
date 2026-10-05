import { Types } from 'mongoose';
import { Reservation, IReservation } from '../models/reservation.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { LockService } from './lock.service.js';
import { PricingService } from './pricing.service.js';
import { AllocationService } from './allocation.service.js';
import {
  CreateReservationInput,
  ListReservationsQueryInput,
  ReservationStatus,
  SlotStatus,
  UserRole,
  SlotType,
} from '@smart-parking/shared';

export class ReservationService {
  /**
   * Create a reservation in PENDING_PAYMENT status with fast-path distributed concurrency locks
   */
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
        slot.status === SlotStatus.OCCUPIED ||
        slot.status === SlotStatus.MAINTENANCE ||
        slot.status === SlotStatus.OUT_OF_SERVICE
      ) {
        throw new Error(`Slot ${slot.slotNumber} is currently unavailable for booking`);
      }

      // Overlap Query across active reservation statuses
      const activeStatuses = [
        ReservationStatus.PENDING_PAYMENT,
        ReservationStatus.CONFIRMED,
        ReservationStatus.ACTIVE,
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

      // Step 6: Create Pending Reservation with 15-minute expiry
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins TTL

      const reservation = await Reservation.create({
        userId: new Types.ObjectId(userId),
        parkingLocationId: new Types.ObjectId(parkingLocationId),
        slotId: new Types.ObjectId(targetSlotId),
        vehicleId: vehicleId ? new Types.ObjectId(vehicleId) : undefined,
        startTime: start,
        endTime: end,
        duration: durationMinutes,
        status: ReservationStatus.PENDING_PAYMENT,
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

      return reservation;
    } finally {
      // Step 7: Release lock
      await LockService.releaseLock(targetSlotId);
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
    }

    if (status) {
      filter.status = status;
    }

    if (parkingLocationId) {
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
      await ParkingSlot.findByIdAndUpdate(reservation.slotId, {
        $set: { status: SlotStatus.AVAILABLE },
        $unset: { currentReservationId: 1 },
      });
    }

    return reservation;
  }

  /**
   * Background job worker to expire stale pending reservations
   */
  public static async expirePendingReservations(): Promise<number> {
    const now = new Date();
    const result = await Reservation.updateMany(
      {
        status: ReservationStatus.PENDING_PAYMENT,
        expiresAt: { $lt: now },
      },
      {
        $set: { status: ReservationStatus.EXPIRED },
      }
    );

    return result.modifiedCount;
  }
}
