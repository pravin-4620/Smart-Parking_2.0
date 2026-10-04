import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { generateAccessToken } from '../utils/jwt.js';

const app = createApp();

describe('Phase 14: Parking Occupancy Prediction Integration Tests', () => {
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
    expect(location).toBeDefined();
    parkingLocationId = location!._id.toString();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. GET /api/predictions/:parkingId: Should calculate deterministic baseline prediction', async () => {
    const res = await request(app)
      .get(`/api/predictions/${parkingLocationId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data).toHaveProperty('parkingLocationId', parkingLocationId);
    expect(data).toHaveProperty('parkingName', 'Central Mall Smart Parking');
    expect(data.totalSlots).toBeGreaterThan(0);
    expect(data.horizonHours).toBe(12);
    expect(data.modelVersion).toBe('v1.0-deterministic-historical-baseline');
    expect(data.modelType).toBe('BASELINE');
    expect(data.historicalSampleCount).toBeGreaterThan(0);
    expect(Array.isArray(data.predictions)).toBe(true);
    expect(data.predictions.length).toBe(12);

    const firstPoint = data.predictions[0];
    expect(firstPoint).toHaveProperty('time');
    expect(firstPoint).toHaveProperty('hourLabel');
    expect(firstPoint).toHaveProperty('predictedOccupancyPercentage');
    expect(firstPoint).toHaveProperty('predictedOccupiedSlots');
    expect(firstPoint).toHaveProperty('predictedAvailableSlots');
    expect(firstPoint).toHaveProperty('confidenceScore');
    expect(firstPoint).toHaveProperty('demandFactor');

    expect(firstPoint.predictedOccupancyPercentage).toBeGreaterThanOrEqual(0);
    expect(firstPoint.predictedOccupancyPercentage).toBeLessThanOrEqual(100);
    expect(firstPoint.confidenceScore).toBeGreaterThan(0.5);
  });

  it('2. GET /api/predictions/:parkingId?hours=6: Respect custom horizon hours parameter', async () => {
    const res = await request(app)
      .get(`/api/predictions/${parkingLocationId}?hours=6`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.horizonHours).toBe(6);
    expect(res.body.data.predictions.length).toBe(6);
  });

  it('3. GET /api/predictions/:parkingId?engine=ml: Support Future ML Engine stub parameter', async () => {
    const res = await request(app)
      .get(`/api/predictions/${parkingLocationId}?engine=ml`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.modelType).toBe('ML_FUTURE');
    expect(res.body.data.modelVersion).toBe('v2.0-experimental-xgboost-stub');
  });

  it('4. GET /api/predictions/:parkingId: Return 404 for non-existent parking location', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/predictions/${fakeId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(404);
  });
});
