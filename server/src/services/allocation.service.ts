import { Types } from 'mongoose';
import { ParkingSlot, IParkingSlot } from '../models/parkingSlot.model.js';
import { Reservation } from '../models/reservation.model.js';
import { AllocationLog } from '../models/allocationLog.model.js';
import { AutoAllocateSlotInput, SlotStatus, ReservationStatus, SlotType } from '@smart-parking/shared';

export interface AllocationResult {
  allocatedSlot: IParkingSlot;
  reason: string;
  strategy: string;
  timestamp: Date;
}

export class AllocationService {
  /**
   * Auto-assign the optimal available slot for a given parking location & time window
   */
  public static async autoAllocateSlot(
    input: AutoAllocateSlotInput,
    userId?: string
  ): Promise<AllocationResult> {
    const { parkingLocationId, slotType = SlotType.REGULAR, startTime, endTime } = input;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      throw new Error('endTime must be after startTime');
    }

    // 1. Fetch all candidate slots for this parking location and requested type
    const candidateSlots = await ParkingSlot.find({
      parkingLocationId: new Types.ObjectId(parkingLocationId),
      slotType,
      isActive: true,
      status: SlotStatus.AVAILABLE,
    });

    if (candidateSlots.length === 0) {
      throw new Error(`No active ${slotType} slots available at this parking location`);
    }

    // 2. Filter candidate slots for overlap with existing active reservations
    const candidateSlotIds = candidateSlots.map((s) => s._id);

    const activeStatuses = [
      ReservationStatus.PENDING_CONFIRMATION,
      ReservationStatus.PENDING_PAYMENT,
      ReservationStatus.CONFIRMED,
      ReservationStatus.ACTIVE,
      ReservationStatus.PAYMENT_FAILED,
    ];

    const overlappingReservations = await Reservation.find({
      slotId: { $in: candidateSlotIds },
      status: { $in: activeStatuses },
      $and: [{ startTime: { $lt: end } }, { endTime: { $gt: start } }],
    });

    const reservedSlotIdsSet = new Set(
      overlappingReservations.map((r) => r.slotId.toString())
    );

    // Physically unavailable slots never enter the candidate set. RESERVED
    // slots remain eligible for a non-overlapping future time window.
    const availableSlots = candidateSlots.filter(
      (slot) => !reservedSlotIdsSet.has(slot._id.toString())
    );

    if (availableSlots.length === 0) {
      throw new Error(
        `All ${slotType} slots are reserved or occupied for the requested time window`
      );
    }

    // 3. Selection Strategy: First Available / Lowest Slot Number
    availableSlots.sort((a, b) => a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true }));
    const allocatedSlot = availableSlots[0];

    const strategy = 'LOWEST_NUMERIC_SLOT_NUMBER';
    const reason = `Optimal available ${slotType} slot auto-assigned for requested time window.`;

    // 4. Record allocation log for ML dataset training
    await AllocationLog.create({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      parkingLocationId: new Types.ObjectId(parkingLocationId),
      allocatedSlotId: allocatedSlot._id,
      requestCriteria: { slotType, startTime: start, endTime: end },
      allocatedStrategy: strategy,
      decisionReason: reason,
    });

    return {
      allocatedSlot,
      reason,
      strategy,
      timestamp: new Date(),
    };
  }
}
