import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { User } from '../models/user.model.js';
import { generateAccessToken } from '../utils/jwt.js';

const app = createApp();

describe('Phase 13: RFID Integration Tests', () => {
  let userToken: string;

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
});
