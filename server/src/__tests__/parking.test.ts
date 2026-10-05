import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { UserRole } from '@smart-parking/shared';

const app = createApp();

describe('Phase 4: Parking Discovery & Geolocation Integration Tests', () => {
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

  let adminToken: string;
  let managerToken: string;
  let userToken: string;
  let centralMallId: string;
  let unassignedLocationId: string;

  it('1. Login all roles for testing', async () => {
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@smartpark.com',
      password: 'password123',
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.accessToken;

    const managerRes = await request(app).post('/api/auth/login').send({
      email: 'manager@smartpark.com',
      password: 'password123',
    });
    expect(managerRes.status).toBe(200);
    managerToken = managerRes.body.accessToken;

    const userRes = await request(app).post('/api/auth/login').send({
      email: 'user@smartpark.com',
      password: 'password123',
    });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.accessToken;
  });

  it('2. GET /api/parking/nearby: should return nearby locations sorted by distance', async () => {
    // Bangalore City Center coordinates
    const res = await request(app)
      .get('/api/parking/nearby')
      .query({ lat: 12.9716, lng: 77.5946, radius: 20 });

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(3);

    const firstLoc = res.body.data[0];
    expect(firstLoc.name).toContain('Central Mall');
    expect(firstLoc.distance).toBeLessThan(1); // very close to center
    expect(firstLoc.availableSlots).toBeGreaterThan(0);
    expect(firstLoc.totalSlots).toBe(12);
    expect(firstLoc.startingPrice).toBe(60);
    expect(firstLoc.operatingStatus).toBeDefined();
    expect(firstLoc.coordinates).toEqual([77.5946, 12.9716]);

    centralMallId = firstLoc.parkingId;

    // Find the metro plaza location ID (unassigned to manager)
    const metroLoc = res.body.data.find((l: any) => l.name.includes('Metro Station'));
    expect(metroLoc).toBeDefined();
    unassignedLocationId = metroLoc.parkingId;
  });

  it('9. Nearby radius is kilometres and navigation preserves facility coordinates', async () => {
    const narrow = await request(app).get('/api/parking/nearby').query({ lat: 12.9716, lng: 77.5946, radius: 1 });
    expect(narrow.status).toBe(200);
    expect(narrow.body.data.every((location: { distance: number }) => location.distance <= 1)).toBe(true);
    const params = new URLSearchParams({ api: '1', destination: '12.9716,77.5946', origin: '12.96,77.58' });
    const url = `https://www.google.com/maps/dir/?${params.toString()}`;
    expect(url).toContain('destination=12.9716%2C77.5946');
    expect(url).toContain('origin=12.96%2C77.58');
  });

  it('3. GET /api/parking-locations/:id: should return full details and slot layout stats', async () => {
    const res = await request(app).get(`/api/parking-locations/${centralMallId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toContain('Central Mall');
    expect(res.body.data.slots.length).toBe(12);
    expect(res.body.data.slotStats.total).toBe(12);
    expect(res.body.data.pricingProfile).toBeDefined();
  });

  it('4. MANAGER Authorization: manager can update ASSIGNED parking location', async () => {
    const res = await request(app)
      .patch(`/api/parking-locations/${centralMallId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ description: 'Updated by Assigned Parking Manager' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated by Assigned Parking Manager');
  });

  it('5. MANAGER Authorization: manager CANNOT update UNASSIGNED parking location', async () => {
    const res = await request(app)
      .patch(`/api/parking-locations/${unassignedLocationId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ description: 'Unauthorized Manager Edit' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('6. ADMIN Authorization: admin can update ANY parking location', async () => {
    const res = await request(app)
      .patch(`/api/parking-locations/${unassignedLocationId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated by System Admin' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated by System Admin');
  });

  it('7. ADMIN Authorization: admin can create a new parking location', async () => {
    const res = await request(app)
      .post('/api/parking-locations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Airport VIP Terminal Parking',
        address: 'Terminal 1, Devanahalli',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560300',
        longitude: 77.7062,
        latitude: 13.1986,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Airport VIP Terminal Parking');
  });

  it('8. Slot Listing: GET /api/parking-locations/:id/slots should return slot array', async () => {
    const res = await request(app).get(`/api/parking-locations/${centralMallId}/slots`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(12);
    expect(res.body.data[0].slotNumber).toBe('A-101');
  });
});
