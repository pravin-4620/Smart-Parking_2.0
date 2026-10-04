import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';

const app = createApp();

describe('Phase 9: Manager & Admin Portal Integration Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let userToken: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await seedDatabase();

    // Login Admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@smartpark.com',
      password: 'password123',
    });
    adminToken = adminLogin.body.accessToken;

    // Login Manager
    const managerLogin = await request(app).post('/api/auth/login').send({
      email: 'manager@smartpark.com',
      password: 'password123',
    });
    managerToken = managerLogin.body.accessToken;

    // Login Normal User
    const userLogin = await request(app).post('/api/auth/login').send({
      email: 'user@smartpark.com',
      password: 'password123',
    });
    userToken = userLogin.body.accessToken;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. GET /api/manager/dashboard: Parking Manager can access assigned dashboard', async () => {
    const res = await request(app)
      .get('/api/manager/dashboard')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('occupancyRate');
  });

  it('2. GET /api/manager/dashboard: Normal User is FORBIDDEN (403)', async () => {
    const res = await request(app)
      .get('/api/manager/dashboard')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('3. GET /api/admin/dashboard: Admin can access global platform overview', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalUsers');
  });

  it('4. GET /api/admin/users: Manager CANNOT access Admin users list (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
  });
});
