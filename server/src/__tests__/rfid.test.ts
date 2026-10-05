import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
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
    const res = await request(app)
      .post('/api/rfid-cards')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ uid: 'A1B2C3D4' });

    expect(res.status).toBe(201);
    expect(res.body.data.uid).toBe('A1B2C3D4');
  });

  it('2. List RFID Cards for authenticated user', async () => {
    const res = await request(app)
      .get('/api/rfid-cards')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('3. ENTRY creates an active session and EXIT persists a non-negative duration', async () => {
    const entryRes = await request(app).post('/api/rfid/tap').send({
      parkingLocationId,
      rfidUid: 'A1B2C3D4',
      eventType: 'ENTRY',
      deviceId: 'RFID-TEST-DEVICE',
    });

    expect(entryRes.status).toBe(200);
    expect(entryRes.body.data.allowed).toBe(true);
    expect(entryRes.body.data.action).toBe('OPEN_GATE');

    const activeSession = await ParkingSession.findById(entryRes.body.data.session._id);
    expect(activeSession!.status).toBe(SessionStatus.ACTIVE);
    expect(activeSession!.durationMinutes).toBeUndefined();

    activeSession!.checkInTime = new Date(Date.now() - 5 * 60 * 1000);
    await activeSession!.save();

    const exitRes = await request(app).post('/api/rfid/tap').send({
      parkingLocationId,
      rfidUid: 'A1B2C3D4',
      eventType: 'EXIT',
      deviceId: 'RFID-TEST-DEVICE',
    });

    expect(exitRes.status).toBe(200);
    expect(exitRes.body.data.allowed).toBe(true);

    const completedSession = await ParkingSession.findById(activeSession!._id);
    expect(completedSession!.status).toBe(SessionStatus.COMPLETED);
    expect(completedSession!.checkOutTime).toBeDefined();
    expect(completedSession!.durationMinutes).toBeGreaterThanOrEqual(5);

    const releasedSlot = await ParkingSlot.findById(completedSession!.slotId);
    expect(releasedSlot!.status).toBe(SlotStatus.AVAILABLE);

    const repeatedExitRes = await request(app).post('/api/rfid/tap').send({
      parkingLocationId,
      rfidUid: 'A1B2C3D4',
      eventType: 'EXIT',
      deviceId: 'RFID-TEST-DEVICE',
    });

    expect(repeatedExitRes.status).toBe(403);
    expect(repeatedExitRes.body.data.allowed).toBe(false);
    expect(repeatedExitRes.body.data.action).toBe('KEEP_CLOSED');
  });
});
