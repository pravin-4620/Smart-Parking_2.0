import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { env } from '../config/env.js';

const app = createApp();

describe('no-online-payment reservation confirmation', () => {
  let userToken = '', managerToken = '', reservationId = '';
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
    await seedDatabase();
    userToken = (await request(app).post('/api/auth/login').send({ email: 'user@smartpark.com', password: 'password123' })).body.accessToken;
    managerToken = (await request(app).post('/api/auth/login').send({ email: 'manager@smartpark.com', password: 'password123' })).body.accessToken;
  });
  afterAll(async () => { await mongoose.connection.close(); });

  it('auto-confirms a validated reservation only under the explicit local policy', async () => {
    env.LOCAL_DEMO_AUTO_CONFIRM = true;
    const facility = await ParkingLocation.findOne({ managerIds: { $exists: true, $ne: [] } });
    const slot = await ParkingSlot.findOne({ parkingLocationId: facility!._id, isActive: true });
    const start = new Date(Date.now() + 60 * 60_000);
    const response = await request(app).post('/api/reservations').set('Authorization', `Bearer ${userToken}`).send({
      parkingLocationId: facility!._id.toString(), slotId: slot!._id.toString(), startTime: start.toISOString(), endTime: new Date(start.getTime() + 60 * 60_000).toISOString(),
    });
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('CONFIRMED');
    reservationId = response.body.data._id;
    env.LOCAL_DEMO_AUTO_CONFIRM = false;
  });

  it('does not expose legacy online-payment routes', async () => {
    expect((await request(app).post('/api/payments/create-order').set('Authorization', `Bearer ${userToken}`).send({ reservationId })).status).toBe(404);
  });
});
