import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { RFIDCard } from '../models/rfidCard.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { generateAccessToken } from '../utils/jwt.js';
import { SessionStatus, SlotStatus } from '@smart-parking/shared';

const app = createApp();

describe('Phase 13: RFID Integration Tests', () => {
  let userToken: string;
  let parkingLocationId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await seedDatabase();

    const user = await User.findOne({ email: 'user@smartpark.com' });
    userToken = generateAccessToken({
      userId: user!._id.toString(),
      email: user!.email,
      role: user!.role,
    });

    const location = await ParkingLocation.findOne({ name: 'Central Mall Smart Parking' });
    parkingLocationId = location!._id.toString();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Create RFID Card for authenticated user', async () => {
    const user = await User.findOne({ email: 'user@smartpark.com' });
    await Vehicle.create({ userId: user!._id, licensePlate: 'KA01RF1001', vehicleType: 'CAR', isDefault: true });
    await RFIDCard.create({ uid: '03:B7:F7:0F', isActive: true });
    const res = await request(app)
      .post('/api/rfid-cards')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.uid).toBe('03:B7:F7:0F');
  });

  it('2. List RFID Cards for authenticated user', async () => {
    const res = await request(app)
      .get('/api/rfid-cards')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('3. rejects browser-supplied RFID transitions without mutating sessions or slots', async () => {
    const beforeSessions = await ParkingSession.countDocuments();
    const beforeSlot = await ParkingSlot.findOne({ parkingLocationId }).lean();
    const entryRes = await request(app).post('/api/rfid/tap').send({
      parkingLocationId,
      rfidUid: 'A1B2C3D4',
      eventType: 'ENTRY',
      deviceId: 'RFID-TEST-DEVICE',
    });

    expect(entryRes.status).toBe(403);
    expect(entryRes.body.message).toContain('authenticated MQTT device path');
    expect(await ParkingSession.countDocuments()).toBe(beforeSessions);
    const afterSlot = await ParkingSlot.findById(beforeSlot!._id).lean();
    expect(afterSlot!.status).toBe(beforeSlot!.status);
    expect(afterSlot!.currentReservationId?.toString()).toBe(beforeSlot!.currentReservationId?.toString());
  });
});
