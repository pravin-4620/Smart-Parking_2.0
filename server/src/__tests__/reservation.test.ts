import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { Reservation } from '../models/reservation.model.js';
import { SlotType, ReservationStatus, SlotStatus } from '@smart-parking/shared';

const app = createApp();

describe('Phase 6: Reservation & Dynamic Slot Allocation Integration Tests', () => {
  let userToken: string;
  let parkingLocationId: string;
  let targetSlotId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await seedDatabase();

    const location = await ParkingLocation.findOne({ name: 'Central Mall Smart Parking' });
    expect(location).toBeDefined();
    parkingLocationId = location!._id.toString();

    const slot = await ParkingSlot.findOne({
      parkingLocationId: location!._id,
      slotType: SlotType.REGULAR,
    });
    expect(slot).toBeDefined();
    targetSlotId = slot!._id.toString();

    const userRes = await request(app).post('/api/auth/login').send({
      email: 'user@smartpark.com',
      password: 'password123',
    });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.accessToken;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Create reservation for a specific slot', async () => {
    const startTime = '2026-10-20T10:00:00.000Z';
    const endTime = '2026-10-20T12:00:00.000Z';

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe(ReservationStatus.PENDING_CONFIRMATION);
    expect(res.body.data.pricingSnapshot.totalAmount).toBeGreaterThan(0);
  });

  it('2. Reject overlapping reservation for the exact same slot', async () => {
    // Attempt overlapping reservation for targetSlotId
    const startTime = '2026-10-20T11:00:00.000Z'; // Overlaps with 10:00-12:00
    const endTime = '2026-10-20T13:00:00.000Z';

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Reservation Conflict');
  });

  it('3. Auto-allocate slot endpoint POST /api/allocation', async () => {
    const startTime = '2026-10-21T14:00:00.000Z';
    const endTime = '2026-10-21T16:00:00.000Z';

    const res = await request(app)
      .post('/api/allocation')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotType: SlotType.REGULAR,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.allocatedSlot).toBeDefined();
    expect(res.body.data.reason).toBeDefined();
  });

  it('4. Create reservation with autoAssign: true', async () => {
    const startTime = '2026-10-22T08:00:00.000Z';
    const endTime = '2026-10-22T10:00:00.000Z';

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        autoAssign: true,
        slotType: SlotType.EV_CHARGING,
        startTime,
        endTime,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.slotId).toBeDefined();
  });

  it('5. CRITICAL: Simultaneous 5-way race condition test for same slot', async () => {
    // Pick another available slot for clean race condition test
    const newSlot = await ParkingSlot.findOne({
      parkingLocationId,
      slotType: SlotType.REGULAR,
      _id: { $ne: targetSlotId },
    });
    expect(newSlot).toBeDefined();
    const raceSlotId = newSlot!._id.toString();

    const startTime = '2026-10-25T10:00:00.000Z';
    const endTime = '2026-10-25T12:00:00.000Z';

    // Fire 5 requests simultaneously in parallel via Promise.all
    const requests = Array.from({ length: 5 }).map(() =>
      request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          parkingLocationId,
          slotId: raceSlotId,
          startTime,
          endTime,
        })
    );

    const responses = await Promise.all(requests);

    const createdCount = responses.filter((r) => r.status === 201).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    // Concurrency guarantee: EXACTLY 1 request must succeed, 4 must fail with 409 Conflict
    expect(createdCount).toBe(1);
    expect(conflictCount).toBe(4);
  });

  it('6. Cancel reservation', async () => {
    const startTime = '2026-10-28T10:00:00.000Z';
    const endTime = '2026-10-28T12:00:00.000Z';

    const createRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    const reservationId = createRes.body.data._id;

    await ParkingSlot.findByIdAndUpdate(targetSlotId, {
      currentReservationId: reservationId,
    });

    const cancelRes = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe(ReservationStatus.CANCELLED);

    const releasedSlot = await ParkingSlot.findById(targetSlotId).lean();
    expect(releasedSlot!.status).toBe(SlotStatus.AVAILABLE);
    expect(releasedSlot!.currentReservationId).toBeUndefined();

    const replacementRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    expect(replacementRes.status).toBe(201);
  });

  it('7. Background expiration worker test', async () => {
    const expiredRes = await Reservation.create({
      userId: new mongoose.Types.ObjectId(),
      parkingLocationId: new mongoose.Types.ObjectId(parkingLocationId),
      slotId: new mongoose.Types.ObjectId(targetSlotId),
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      duration: 60,
      status: ReservationStatus.PENDING_CONFIRMATION,
      pricingSnapshot: {
        baseRate: 60,
        hourlyRate: 60,
        peakMultiplier: 1.0,
        totalAmount: 60,
        currency: 'INR',
      },
      expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
    });

    const { ReservationService } = await import('../services/reservation.service.js');
    const expiredCount = await ReservationService.expirePendingReservations();
    expect(expiredCount).toBeGreaterThanOrEqual(1);

    const reFetched = await Reservation.findById(expiredRes._id);
    expect(reFetched!.status).toBe(ReservationStatus.EXPIRED);
  });
});
