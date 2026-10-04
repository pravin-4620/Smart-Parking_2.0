import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../models/user.model.js';
import { UserRole } from '@smart-parking/shared';

const app = createApp();

describe('Authentication & Role-Based Access Control Integration Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  let userToken: string;
  let managerToken: string;
  let adminToken: string;
  let userRefreshToken: string;

  it('1. Register: should register a new USER successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Regular User',
        email: 'user@example.com',
        password: 'password123',
        phone: '+919876543210',
        role: UserRole.USER,
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('user@example.com');
    expect(res.body.user.role).toBe('USER');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    userToken = res.body.accessToken;
    userRefreshToken = res.body.refreshToken;
  });

  it('2. Duplicate Email: should reject registration with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        email: 'user@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('already exists');
  });

  it('3. Login: should log in successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('user@example.com');

    userToken = res.body.accessToken;
  });

  it('4. Wrong Password: should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid email or password');
  });

  it('5. Get Me: should fetch profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('user@example.com');
  });

  it('6. Refresh Token: should obtain new access token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: userRefreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('7. Register Manager & Admin for RBAC testing', async () => {
    // Register Parking Manager
    const managerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Parking Manager',
        email: 'manager@example.com',
        password: 'password123',
        role: UserRole.PARKING_MANAGER,
      });

    expect(managerRes.status).toBe(201);
    managerToken = managerRes.body.accessToken;

    // Register Admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'System Admin',
        email: 'admin@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
      });

    expect(adminRes.status).toBe(201);
    adminToken = adminRes.body.accessToken;
  });

  it('8. RBAC: USER cannot access ADMIN endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/system-summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('9. RBAC: MANAGER cannot access ADMIN endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/system-summary')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('10. RBAC: MANAGER can access MANAGER endpoint', async () => {
    const res = await request(app)
      .get('/api/manager/dashboard-summary')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Manager dashboard summary');
  });

  it('11. RBAC: ADMIN can access ADMIN endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/system-summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Admin system summary');
  });

  it('12. Logout: should revoke refresh token on logout', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: userRefreshToken });

    expect(res.status).toBe(200);
  });
});
