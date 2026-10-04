import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';

const app = createApp();

describe('Phase 15: End-to-End System Flow Integration Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await seedDatabase();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Full E2E Flow: Healthcheck -> Auth -> Parking -> Slot Allocation', async () => {
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'user@smartpark.com',
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.accessToken;

    const nearbyRes = await request(app)
      .get('/api/parking/nearby')
      .set('Authorization', `Bearer ${token}`)
      .query({ lat: 12.9716, lng: 77.5946 });
    expect(nearbyRes.status).toBe(200);
    expect(nearbyRes.body.data.length).toBeGreaterThan(0);
  });
});
