import { Types } from 'mongoose';
import { ParkingLocation } from '../../models/parkingLocation.model.js';
import { ParkingSlot } from '../../models/parkingSlot.model.js';
import { SensorEvent } from '../../models/sensorEvent.model.js';
import { ParkingSession } from '../../models/parkingSession.model.js';
import { Reservation } from '../../models/reservation.model.js';
import { IPredictionEngine } from './predictionEngine.interface.js';
import {
  ParkingPredictionResult,
  PredictionPoint,
  SlotStatus,
  ReservationStatus,
} from '@smart-parking/shared';

export class BaselinePredictionService implements IPredictionEngine {
  readonly modelVersion = 'v1.0-deterministic-historical-baseline';
  readonly modelType = 'BASELINE' as const;

  async predictOccupancy(
    parkingLocationId: string,
    horizonHours: number = 12
  ): Promise<ParkingPredictionResult> {
    const horizon = Math.min(24, Math.max(1, horizonHours));
    const locationObjId = new Types.ObjectId(parkingLocationId);

    // 1. Validate Parking Location
    const location = await ParkingLocation.findById(locationObjId);
    if (!location) {
      throw new Error(`Parking location with ID ${parkingLocationId} not found`);
    }

    // 2. Fetch current slot stats
    const slots = await ParkingSlot.find({ parkingLocationId: locationObjId, isActive: true });
    const totalSlots = slots.length || 1;
    const currentOccupiedSlots = slots.filter((s) => s.status === SlotStatus.OCCUPIED).length;
    const currentReservedSlots = slots.filter((s) => s.status === SlotStatus.RESERVED).length;
    const currentAvailableSlots = Math.max(
      0,
      totalSlots - currentOccupiedSlots - currentReservedSlots
    );
    const currentOccupancyPercentage = Math.min(
      100,
      Math.round(((currentOccupiedSlots + currentReservedSlots) / totalSlots) * 100)
    );

    // 3. Query historical events (last 30 days) from MongoDB
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [sensorEvents, sessionsCount, historicalReservations] = await Promise.all([
      SensorEvent.find({
        parkingLocationId: locationObjId,
        timestamp: { $gte: thirtyDaysAgo },
      }).lean(),
      ParkingSession.countDocuments({
        parkingLocationId: locationObjId,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Reservation.countDocuments({
        parkingLocationId: locationObjId,
        status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE, ReservationStatus.COMPLETED] },
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    const historicalSampleCount = sensorEvents.length + sessionsCount + historicalReservations;

    // Build historical hourly occupancy lookup table [dayOfWeek 0-6][hourOfDay 0-23]
    const hourlyCounts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const hourlyOccupiedSum: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const evt of sensorEvents) {
      const d = new Date(evt.timestamp);
      const day = d.getDay();
      const hour = d.getHours();
      hourlyCounts[day][hour]++;
      if (evt.occupied) {
        hourlyOccupiedSum[day][hour]++;
      }
    }

    // Calculate empirical confidence score strictly derived from historical data density
    const confidenceScore = Number(
      Math.min(0.95, Math.max(0.50, 0.50 + 0.45 * Math.min(1.0, historicalSampleCount / 50))).toFixed(2)
    );

    // Default hourly baseline curve if no historical events exist for a slot
    const defaultHourlyCurve = [15, 12, 10, 10, 15, 25, 45, 65, 80, 85, 80, 75, 70, 75, 80, 85, 80, 70, 60, 50, 40, 30, 20, 15];

    const predictions: PredictionPoint[] = [];
    const now = new Date();

    for (let h = 1; h <= horizon; h++) {
      const targetTime = new Date(now.getTime() + h * 60 * 60 * 1000);
      const targetDay = targetTime.getDay();
      const targetHour = targetTime.getHours();

      // Check upcoming confirmed reservation demand for this window
      const windowStart = new Date(targetTime);
      windowStart.setMinutes(0, 0, 0);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

      const confirmedReservations = await Reservation.countDocuments({
        parkingLocationId: locationObjId,
        status: { $in: [ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE] },
        $and: [{ startTime: { $lt: windowEnd } }, { endTime: { $gt: windowStart } }],
      });

      const reservationDemandPercentage = Math.min(100, (confirmedReservations / totalSlots) * 100);

      // Determine historical baseline for target hour
      let historicalOccupancy: number;
      if (hourlyCounts[targetDay][targetHour] > 0) {
        historicalOccupancy = Math.round(
          (hourlyOccupiedSum[targetDay][targetHour] / hourlyCounts[targetDay][targetHour]) * 100
        );
      } else {
        historicalOccupancy = defaultHourlyCurve[targetHour];
      }

      // Exponential decay of current state inertia over time: w = e^(-h / 3)
      const currentInertiaWeight = Math.exp(-h / 3.0);
      const blendedOccupancy = Math.min(
        100,
        Math.max(
          reservationDemandPercentage,
          Math.round(
            currentInertiaWeight * currentOccupancyPercentage +
              (1 - currentInertiaWeight) * historicalOccupancy
          )
        )
      );

      const predictedOccupied = Math.min(
        totalSlots,
        Math.round((blendedOccupancy / 100) * totalSlots)
      );
      const predictedAvailable = Math.max(0, totalSlots - predictedOccupied);

      let demandFactor: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (blendedOccupancy >= 90) demandFactor = 'CRITICAL';
      else if (blendedOccupancy >= 70) demandFactor = 'HIGH';
      else if (blendedOccupancy >= 40) demandFactor = 'MODERATE';

      const hourStr = targetTime.getHours().toString().padStart(2, '0') + ':00';

      predictions.push({
        time: targetTime.toISOString(),
        hourLabel: hourStr,
        predictedOccupancyPercentage: blendedOccupancy,
        predictedOccupiedSlots: predictedOccupied,
        predictedAvailableSlots: predictedAvailable,
        confidenceScore,
        demandFactor,
      });
    }

    return {
      parkingLocationId,
      parkingName: location.name,
      totalSlots,
      currentOccupancyPercentage,
      currentOccupiedSlots,
      currentAvailableSlots,
      horizonHours: horizon,
      generatedAt: new Date().toISOString(),
      modelVersion: this.modelVersion,
      modelType: this.modelType,
      predictions,
      historicalSampleCount,
    };
  }
}
