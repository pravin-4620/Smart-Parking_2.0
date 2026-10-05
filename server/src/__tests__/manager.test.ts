import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';

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

  it('5. Admin creates a manager and assigns one parking facility', async () => {
    const location = await ParkingLocation.findOne({ name: /Metro Station/ });
    const createRes = await request(app).post('/api/admin/managers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'North Zone Manager', email: 'north.manager@example.com', phone: '+919999999999', password: 'password123', parkingLocationId: location!._id.toString() });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.role).toBe('PARKING_MANAGER');
    const updated = await ParkingLocation.findById(location!._id);
    expect(updated!.managerIds.map(String)).toContain(String(createRes.body.data.id));
  });

  it('6. Manager cannot request slots for another manager facility', async () => {
    const unassigned = await ParkingLocation.findOne({ name: /Metro Station/ });
    const res = await request(app).get('/api/manager/slots')
      .query({ parkingLocationId: unassigned!._id.toString() })
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(403);
  });

  it('7. User cannot access manager or admin resources', async () => {
    const managerRes = await request(app).get('/api/manager/parking').set('Authorization', `Bearer ${userToken}`);
    const adminRes = await request(app).get('/api/admin/managers').set('Authorization', `Bearer ${userToken}`);
    expect(managerRes.status).toBe(403);
    expect(adminRes.status).toBe(403);
  });

  it('8. Admin can access manager-assigned and administrative resources', async () => {
    const managerData = await request(app).get('/api/manager/parking').set('Authorization', `Bearer ${adminToken}`);
    const adminData = await request(app).get('/api/admin/parking').set('Authorization', `Bearer ${adminToken}`);
    expect(managerData.status).toBe(200);
    expect(adminData.status).toBe(200);
    expect(adminData.body.data.length).toBeGreaterThan(0);
  });

  it('9. Manager loads saved pricing and slots for an assigned facility', async () => {
    const assigned = await ParkingLocation.findOne({ name: /Central Mall/ });
    const res = await request(app).get(`/api/pricing/location/${assigned!._id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile.baseHourlyRate).toBe(60);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
  });

  it('10. Manager updates location and slot pricing and values persist after reload', async () => {
    const assigned = await ParkingLocation.findOne({ name: /Central Mall/ });
    const slot = await ParkingSlot.findOne({ parkingLocationId: assigned!._id, slotType: 'REGULAR', status: 'AVAILABLE' });
    const update = await request(app).put(`/api/pricing/location/${assigned!._id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ basePrice: 10, baseHourlyRate: 110, minimumCharge: 30, maximumDailyCharge: 700, slotPrices: [{ slotId: slot!._id.toString(), hourlyRateOverride: 150 }] });
    expect(update.status).toBe(200);
    expect(update.body.data.profile.baseHourlyRate).toBe(110);
    expect(update.body.data.slots.find((item: { _id: string }) => item._id.toString() === slot!._id.toString()).hourlyRateOverride).toBe(150);

    const reload = await request(app).get(`/api/pricing/location/${assigned!._id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(reload.body.data.profile.basePrice).toBe(10);
    expect(reload.body.data.profile.baseHourlyRate).toBe(110);
    expect(reload.body.data.slots.find((item: { _id: string }) => item._id.toString() === slot!._id.toString()).hourlyRateOverride).toBe(150);
  });

  it('11. Manager cannot update an unassigned facility', async () => {
    const unassigned = await ParkingLocation.findOne({ name: /Metro Station/ });
    const res = await request(app).put(`/api/pricing/location/${unassigned!._id}`)
      .set('Authorization', `Bearer ${managerToken}`).send({ baseHourlyRate: 999 });
    expect(res.status).toBe(403);
  });

  it('12. Normal user cannot update pricing', async () => {
    const assigned = await ParkingLocation.findOne({ name: /Central Mall/ });
    const res = await request(app).put(`/api/pricing/location/${assigned!._id}`)
      .set('Authorization', `Bearer ${userToken}`).send({ baseHourlyRate: 1 });
    expect(res.status).toBe(403);
  });

  it('13. Admin can update pricing across facilities', async () => {
    const unassigned = await ParkingLocation.findOne({ name: /Metro Station/ });
    const res = await request(app).put(`/api/pricing/location/${unassigned!._id}`)
      .set('Authorization', `Bearer ${adminToken}`).send({ baseHourlyRate: 75 });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.baseHourlyRate).toBe(75);
  });

  it('14. Rejects negative prices, zero multipliers, and invalid overstay settings', async () => {
    const assigned = await ParkingLocation.findOne({ name: /Central Mall/ });
    const url = `/api/pricing/location/${assigned!._id}`;
    const negative = await request(app).put(url).set('Authorization', `Bearer ${managerToken}`).send({ baseHourlyRate: -1 });
    const multiplier = await request(app).put(url).set('Authorization', `Bearer ${managerToken}`).send({ rules: [{ ruleName: 'Invalid', ruleType: 'PEAK', multiplier: 0 }] });
    const overstay = await request(app).put(url).set('Authorization', `Bearer ${managerToken}`).send({ overstayConfig: { gracePeriodMinutes: 0, fineIntervalMinutes: 0, fineAmountPerInterval: 20, maximumFineAmount: 10 } });
    expect(negative.status).toBe(400);
    expect(multiplier.status).toBe(400);
    expect(overstay.status).toBe(400);
  });

  it('15. Existing reservation keeps its snapshot while a new reservation and payment use the updated slot price', async () => {
    const assigned = await ParkingLocation.findOne({ name: /Central Mall/ });
    const slot = await ParkingSlot.findOne({ parkingLocationId: assigned!._id, slotType: 'REGULAR', status: 'AVAILABLE' });
    await request(app).put(`/api/pricing/location/${assigned!._id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ basePrice: 0, baseHourlyRate: 100, slotPrices: [{ slotId: slot!._id.toString(), hourlyRateOverride: 100 }] });
    const oldReservation = await request(app).post('/api/reservations').set('Authorization', `Bearer ${userToken}`).send({ parkingLocationId: assigned!._id.toString(), slotId: slot!._id.toString(), startTime: '2027-01-04T12:00:00.000Z', endTime: '2027-01-04T13:00:00.000Z' });
    expect(oldReservation.status).toBe(201);
    expect(oldReservation.body.data.pricingSnapshot.totalAmount).toBe(100);

    await request(app).put(`/api/pricing/location/${assigned!._id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ slotPrices: [{ slotId: slot!._id.toString(), hourlyRateOverride: 150 }] });
    const unchanged = await request(app).get(`/api/reservations/${oldReservation.body.data._id}`).set('Authorization', `Bearer ${userToken}`);
    expect(unchanged.body.data.pricingSnapshot.totalAmount).toBe(100);

    const newReservation = await request(app).post('/api/reservations').set('Authorization', `Bearer ${userToken}`).send({ parkingLocationId: assigned!._id.toString(), slotId: slot!._id.toString(), startTime: '2027-01-04T14:00:00.000Z', endTime: '2027-01-04T15:00:00.000Z' });
    expect(newReservation.status).toBe(201);
    expect(newReservation.body.data.pricingSnapshot.hourlyRate).toBe(150);
    expect(newReservation.body.data.pricingSnapshot.totalAmount).toBe(150);
    const order = await request(app).post('/api/payments/create-order').set('Authorization', `Bearer ${userToken}`).send({ reservationId: newReservation.body.data._id });
    expect(order.status).toBe(201);
    expect(order.body.data.amount).toBe(15000);
  });
});
