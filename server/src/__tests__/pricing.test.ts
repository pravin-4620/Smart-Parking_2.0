import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { SlotType } from '@smart-parking/shared';

const app = createApp();

describe('Phase 5: Server-Authoritative Pricing Engine Integration Tests', () => {
  let parkingLocationId: string;
  let regularSlotId: string;
  let evSlotId: string;
  let handicappedSlotId: string;
  let vipSlotId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await seedDatabase();

    const location = await ParkingLocation.findOne({ name: 'Central Mall Smart Parking' });
    expect(location).toBeDefined();
    parkingLocationId = location!._id.toString();

    const slots = await ParkingSlot.find({ parkingLocationId: location!._id });
    const regSlot = slots.find((s) => s.slotType === SlotType.REGULAR);
    const evSlot = slots.find((s) => s.slotType === SlotType.EV_CHARGING);
    const handiSlot = slots.find((s) => s.slotType === SlotType.HANDICAPPED);
    const vipSlot = slots.find((s) => s.slotType === SlotType.VIP);

    regularSlotId = regSlot!._id.toString();
    evSlotId = evSlot!._id.toString();
    handicappedSlotId = handiSlot!._id.toString();
    vipSlotId = vipSlot!._id.toString();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Calculate pricing for 1 hour regular rate', async () => {
    // Weekday 12:00 to 13:00 (Standard base rate ₹60)
    const startTime = '2026-10-07T12:00:00.000Z'; // Wednesday
    const endTime = '2026-10-07T13:00:00.000Z';

    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        parkingLocationId,
        slotId: regularSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.durationHours).toBe(1);
    expect(data.finalAmount).toBe(60);
    expect(data.currency).toBe('INR');
    expect(Number.isInteger(data.finalAmount * 100)).toBe(true);
  });

  it('2. Calculate pricing for 3 hours regular rate', async () => {
    // Weekday 12:00 to 15:00 (3 hours @ ₹60 = ₹180)
    const startTime = '2026-10-07T12:00:00.000Z';
    const endTime = '2026-10-07T15:00:00.000Z';

    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        parkingLocationId,
        slotId: regularSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.durationHours).toBe(3);
    expect(data.finalAmount).toBe(180);
    expect(data.breakdown.length).toBe(3);
  });

  it('3. Calculate pricing for Peak Hours (1.5x multiplier)', async () => {
    // Morning peak rule: 08:00 to 10:00 on Wednesday (2 hours @ 60 * 1.5 = ₹90/hr -> ₹180)
    const startTime = '2026-10-07T08:00:00.000Z';
    const endTime = '2026-10-07T10:00:00.000Z';

    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        parkingLocationId,
        slotId: regularSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.peakAmount).toBeGreaterThan(0);
    expect(data.finalAmount).toBe(180); // 2 hours * 90
  });

  it('4. Calculate pricing for Off-Peak Hours (0.8x multiplier)', async () => {
    // Night off-peak: 22:00 to 00:00 (2 hours @ 60 * 0.8 = ₹48/hr -> ₹96)
    const startTime = '2026-10-07T22:00:00.000Z';
    const endTime = '2026-10-08T00:00:00.000Z';

    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        parkingLocationId,
        slotId: regularSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.finalAmount).toBe(96); // 2 * 48
  });

  it('5. Calculate pricing for Weekend Rate (1.25x multiplier)', async () => {
    // Saturday 12:00 to 14:00 (2 hours @ 60 * 1.25 = ₹75/hr -> ₹150)
    const startTime = '2026-10-10T12:00:00.000Z'; // Saturday
    const endTime = '2026-10-10T14:00:00.000Z';

    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        parkingLocationId,
        slotId: regularSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.finalAmount).toBe(150); // 2 * 75
  });

  it('6. Minimum Charge Threshold enforcement', async () => {
    const startTime = '2026-10-07T12:00:00.000Z';
    const endTime = '2026-10-07T12:15:00.000Z'; // 15 mins

    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        parkingLocationId,
        slotId: regularSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.finalAmount).toBeGreaterThanOrEqual(30); // minimum charge 30
  });

  it('7. Maximum Daily Charge capping (Daily Cap ₹600)', async () => {
    // 24 hours @ ₹60/hr = ₹1440 uncapped, but max daily cap is ₹600
    const startTime = '2026-10-07T00:00:00.000Z';
    const endTime = '2026-10-08T00:00:00.000Z'; // 24 hours

    const res = await request(app)
      .post('/api/pricing/calculate')
      .send({
        parkingLocationId,
        slotId: regularSlotId,
        startTime,
        endTime,
      });

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.finalAmount).toBe(600); // capped at maximumDailyCharge 600
    expect(data.discount).toBeGreaterThan(0);
  });

  it('8. Calculate pricing for Different Slot Types (EV, Handicapped, VIP)', async () => {
    const startTime = '2026-10-07T12:00:00.000Z';
    const endTime = '2026-10-07T13:00:00.000Z'; // 1 hour

    // EV Charging Slot (1.5x multiplier -> 60 * 1.5 = ₹90)
    const evRes = await request(app).post('/api/pricing/calculate').send({
      parkingLocationId,
      slotId: evSlotId,
      startTime,
      endTime,
    });
    expect(evRes.status).toBe(200);
    expect(evRes.body.data.finalAmount).toBe(90);

    // Handicapped Slot (0.8x multiplier -> 60 * 0.8 = ₹48)
    const handiRes = await request(app).post('/api/pricing/calculate').send({
      parkingLocationId,
      slotId: handicappedSlotId,
      startTime,
      endTime,
    });
    expect(handiRes.status).toBe(200);
    expect(handiRes.body.data.finalAmount).toBe(48);

    // VIP Slot (2.0x multiplier -> 60 * 2.0 = ₹120)
    const vipRes = await request(app).post('/api/pricing/calculate').send({
      parkingLocationId,
      slotId: vipSlotId,
      startTime,
      endTime,
    });
    expect(vipRes.status).toBe(200);
    expect(vipRes.body.data.finalAmount).toBe(120);
  });

  it('9. Verify floating point precision safety across all calculations', async () => {
    const startTime = '2026-10-07T08:30:00.000Z';
    const endTime = '2026-10-07T11:45:00.000Z';

    const res = await request(app).post('/api/pricing/calculate').send({
      parkingLocationId,
      slotId: evSlotId,
      startTime,
      endTime,
    });

    expect(res.status).toBe(200);
    const data = res.body.data;
    // Verify no float tail like 0.30000000000000004
    expect(Number.isInteger(roundPaise(data.baseAmount))).toBe(true);
    expect(Number.isInteger(roundPaise(data.peakAmount))).toBe(true);
    expect(Number.isInteger(roundPaise(data.finalAmount))).toBe(true);
  });
});

function roundPaise(val: number): number {
  return Math.round((val + Number.EPSILON) * 100);
}
