import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { User } from '../models/user.model.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { Reservation } from '../models/reservation.model.js';
import { Vehicle } from '../models/vehicle.model.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { hashPassword } from '../utils/password.js';
import {
  UserRole,
  SlotStatus,
  SlotType,
  ReservationStatus,
  SessionStatus,
} from '@smart-parking/shared';

const app = createApp();

describe('Private Reservation & Vehicle Details in Slot Map Tests', () => {
  let adminToken: string;
  let managerAToken: string;
  let managerBToken: string;
  let userToken: string;

  let managerAId: Types.ObjectId;
  let managerBId: Types.ObjectId;
  let customerId: Types.ObjectId;

  let locationA: any;
  let locationB: any;

  let slotA1: any;
  let slotA2: any;
  let slotA3: any;
  let slotB1: any;

  let vehicleDoc: any;
  let reservationDoc: any;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await seedDatabase();

    // 1. Create Manager A
    const passwordHash = await hashPassword('password123');
    managerAId = new Types.ObjectId();
    await User.create({
      _id: managerAId,
      name: 'Manager Facility A',
      email: 'managerA@test.com',
      passwordHash,
      phone: '9999990001',
      role: UserRole.PARKING_MANAGER,
      isActive: true,
    });

    // 2. Create Manager B
    managerBId = new Types.ObjectId();
    await User.create({
      _id: managerBId,
      name: 'Manager Facility B',
      email: 'managerB@test.com',
      passwordHash,
      phone: '9999990002',
      role: UserRole.PARKING_MANAGER,
      isActive: true,
    });

    // 3. Create Customer User
    customerId = new Types.ObjectId();
    await User.create({
      _id: customerId,
      name: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      passwordHash,
      phone: '9876543210',
      role: UserRole.USER,
      isActive: true,
    });

    // 4. Create Vehicle for customer
    vehicleDoc = await Vehicle.create({
      userId: customerId,
      licensePlate: 'KA01AB1234',
      vehicleType: 'CAR',
      make: 'Hyundai',
      model: 'Creta',
      color: 'Polar White',
      isDefault: true,
    });

    // 5. Create Facility A (assigned to Manager A)
    locationA = await ParkingLocation.create({
      name: 'Downtown Tech Hub A',
      address: '100 Silicon Road',
      city: 'Bengaluru',
      state: 'KA',
      postalCode: '560001',
      geoLocation: { type: 'Point', coordinates: [77.5946, 12.9716] },
      totalSlots: 3,
      managerIds: [managerAId],
    });

    // 6. Create Facility B (assigned to Manager B)
    locationB = await ParkingLocation.create({
      name: 'Airport Metro Plaza B',
      address: '200 Airport Way',
      city: 'Bengaluru',
      state: 'KA',
      postalCode: '560300',
      geoLocation: { type: 'Point', coordinates: [77.7081, 13.1986] },
      totalSlots: 1,
      managerIds: [managerBId],
    });

    // 7. Create Slots for Facility A
    slotA1 = await ParkingSlot.create({
      parkingLocationId: locationA._id,
      slotNumber: 'A-01',
      slotType: SlotType.REGULAR,
      status: SlotStatus.AVAILABLE,
      isActive: true,
    });

    slotA2 = await ParkingSlot.create({
      parkingLocationId: locationA._id,
      slotNumber: 'A-02',
      slotType: SlotType.REGULAR,
      status: SlotStatus.RESERVED,
      isActive: true,
    });

    slotA3 = await ParkingSlot.create({
      parkingLocationId: locationA._id,
      slotNumber: 'A-03',
      slotType: SlotType.REGULAR,
      status: SlotStatus.OCCUPIED,
      isActive: true,
    });

    // 8. Create Slot for Facility B
    slotB1 = await ParkingSlot.create({
      parkingLocationId: locationB._id,
      slotNumber: 'B-01',
      slotType: SlotType.REGULAR,
      status: SlotStatus.RESERVED,
      isActive: true,
    });

    // 9. Create Reservation for Slot A2 with customer & vehicle
    reservationDoc = await Reservation.create({
      userId: customerId,
      parkingLocationId: locationA._id,
      slotId: slotA2._id,
      vehicleId: vehicleDoc._id,
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      duration: 1,
      status: ReservationStatus.CONFIRMED,
      pricingSnapshot: {
        baseRate: 50,
        hourlyRate: 50,
        peakMultiplier: 1.0,
        totalAmount: 50,
        currency: 'INR',
      },
    });

    // Authoritatively link reservation to slot
    await ParkingSlot.findByIdAndUpdate(slotA2._id, {
      currentReservationId: reservationDoc._id,
    });

    // 10. Create Active Session for Slot A3
    await ParkingSession.create({
      userId: customerId,
      parkingLocationId: locationA._id,
      slotId: slotA3._id,
      vehicleId: vehicleDoc._id,
      checkInTime: new Date(Date.now() - 1800000),
      status: SessionStatus.ACTIVE,
    });

    // 11. Login test personas
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@smartpark.com',
      password: 'password123',
    });
    adminToken = adminLogin.body.accessToken;

    const mgrALogin = await request(app).post('/api/auth/login').send({
      email: 'managerA@test.com',
      password: 'password123',
    });
    managerAToken = mgrALogin.body.accessToken;

    const mgrBLogin = await request(app).post('/api/auth/login').send({
      email: 'managerB@test.com',
      password: 'password123',
    });
    managerBToken = mgrBLogin.body.accessToken;

    const custLogin = await request(app).post('/api/auth/login').send({
      email: 'priya.sharma@example.com',
      password: 'password123',
    });
    userToken = custLogin.body.accessToken;
  });

  afterAll(async () => {
    await ParkingSlot.deleteMany({ parkingLocationId: { $in: [locationA?._id, locationB?._id] } });
    await ParkingLocation.deleteMany({ _id: { $in: [locationA?._id, locationB?._id] } });
    await Reservation.deleteMany({ userId: customerId });
    await ParkingSession.deleteMany({ userId: customerId });
    await Vehicle.deleteMany({ userId: customerId });
    await User.deleteMany({ _id: { $in: [managerAId, managerBId, customerId] } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Public slot endpoint returns strictly operational fields without private customer/vehicle leaks', async () => {
    const res = await request(app).get(`/api/parking-locations/${locationA._id}/slots`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);

    // Verify each slot contains only public fields
    res.body.data.forEach((slot: any) => {
      expect(slot).toHaveProperty('_id');
      expect(slot).toHaveProperty('parkingLocationId');
      expect(slot).toHaveProperty('slotNumber');
      expect(slot).toHaveProperty('status');
      expect(slot).toHaveProperty('slotType');

      // Crucial: No private customer, vehicle, or reservation details
      expect(slot.customer).toBeUndefined();
      expect(slot.vehicle).toBeUndefined();
      expect(slot.reservation).toBeUndefined();
      expect(slot.currentReservationId).toBeUndefined();
      expect(slot.activeSession).toBeUndefined();
    });
  });

  it('2. Normal USER calling public slot endpoint gets sanitized response with no private info', async () => {
    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const reservedSlot = res.body.data.find((s: any) => s._id === slotA2._id.toString());
    expect(reservedSlot).toBeDefined();
    expect(reservedSlot.status).toBe(SlotStatus.RESERVED);
    expect(reservedSlot.customer).toBeUndefined();
    expect(reservedSlot.vehicle).toBeUndefined();
    expect(reservedSlot.reservation).toBeUndefined();
  });

  it('3. Normal USER calling authorized slot details endpoint receives 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('4. Normal USER calling /api/manager/slots receives 403 Forbidden', async () => {
    const res = await request(app)
      .get(`/api/manager/slots`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('5. Unauthenticated request to /slots/details receives 401 Unauthorized', async () => {
    const res = await request(app).get(`/api/parking-locations/${locationA._id}/slots/details`);

    expect(res.status).toBe(401);
  });

  it('6. Manager A can view private customer and vehicle details for their assigned facility A', async () => {
    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);

    const reservedSlot = res.body.data.find((s: any) => s._id === slotA2._id.toString());
    expect(reservedSlot).toBeDefined();
    expect(reservedSlot.status).toBe(SlotStatus.RESERVED);
    expect(reservedSlot.reservation).toBeDefined();
    expect(reservedSlot.reservation.customer).toBeDefined();
    expect(reservedSlot.reservation.customer.name).toBe('Priya Sharma');
    expect(reservedSlot.reservation.customer.email).toBe('priya.sharma@example.com');
    expect(reservedSlot.reservation.customer.phone).toBe('9876543210');

    expect(reservedSlot.reservation.vehicle).toBeDefined();
    expect(reservedSlot.reservation.vehicle.licensePlate).toBe('KA01AB1234');
    expect(reservedSlot.reservation.vehicle.make).toBe('Hyundai');
    expect(reservedSlot.reservation.vehicle.model).toBe('Creta');
    expect(reservedSlot.reservation.vehicle.color).toBe('Polar White');
  });

  it('7. Manager A can view private details via /api/manager/slots for assigned facility', async () => {
    const res = await request(app)
      .get(`/api/manager/slots?parkingLocationId=${locationA._id}`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(200);
    const reservedSlot = res.body.data.find((s: any) => s._id === slotA2._id.toString());
    expect(reservedSlot).toBeDefined();
    expect(reservedSlot.reservation).toBeDefined();
    expect(reservedSlot.reservation.customer.name).toBe('Priya Sharma');
    expect(reservedSlot.reservation.vehicle.licensePlate).toBe('KA01AB1234');
  });

  it('8. Manager A is FORBIDDEN (403) from accessing private slot details for unassigned facility B', async () => {
    const res = await request(app)
      .get(`/api/parking-locations/${locationB._id}/slots/details`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('not assigned');
  });

  it('9. Manager A is FORBIDDEN (403) from calling /api/manager/slots for unassigned facility B', async () => {
    const res = await request(app)
      .get(`/api/manager/slots?parkingLocationId=${locationB._id}`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('not assigned');
  });

  it('10. Admin can access private slot details across all facilities', async () => {
    const resA = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resA.status).toBe(200);

    const resB = await request(app)
      .get(`/api/parking-locations/${locationB._id}/slots/details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resB.status).toBe(200);
  });

  it('11. Vacant AVAILABLE slot has null reservation and activeSession', async () => {
    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(200);
    const availableSlot = res.body.data.find((s: any) => s._id === slotA1._id.toString());
    expect(availableSlot).toBeDefined();
    expect(availableSlot.status).toBe(SlotStatus.AVAILABLE);
    expect(availableSlot.reservation).toBeNull();
    expect(availableSlot.activeSession).toBeNull();
  });

  it('12. Occupied slot with active session exposes session customer and vehicle details to manager', async () => {
    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(200);
    const occupiedSlot = res.body.data.find((s: any) => s._id === slotA3._id.toString());
    expect(occupiedSlot).toBeDefined();
    expect(occupiedSlot.status).toBe(SlotStatus.OCCUPIED);
    expect(occupiedSlot.activeSession).toBeDefined();
    expect(occupiedSlot.activeSession.customer.name).toBe('Priya Sharma');
    expect(occupiedSlot.activeSession.vehicle.licensePlate).toBe('KA01AB1234');
    expect(occupiedSlot.activeSession.checkInTime).toBeDefined();
  });

  it('13. Sensitive customer fields (passwordHash, salt, tokens) are NEVER leaked in authorized details', async () => {
    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((slot: any) => {
      if (slot.reservation) {
        expect(slot.reservation.customer.passwordHash).toBeUndefined();
        expect(slot.reservation.customer.password).toBeUndefined();
        expect(slot.reservation.customer.__v).toBeUndefined();
      }
      if (slot.activeSession) {
        expect(slot.activeSession.customer.passwordHash).toBeUndefined();
        expect(slot.activeSession.customer.password).toBeUndefined();
      }
    });
  });

  it('14. Missing vehicle on reservation is handled gracefully without breaking slot map', async () => {
    // Create a customer without vehicle
    const noVehicleUser = await User.create({
      name: 'No Vehicle Driver',
      email: 'novehicle@example.com',
      passwordHash: await hashPassword('password123'),
      phone: '9888888888',
      role: UserRole.USER,
      isActive: true,
    });

    const slotNoVeh = await ParkingSlot.create({
      parkingLocationId: locationA._id,
      slotNumber: 'A-04',
      slotType: SlotType.REGULAR,
      status: SlotStatus.RESERVED,
      isActive: true,
    });

    const resNoVeh = await Reservation.create({
      userId: noVehicleUser._id,
      parkingLocationId: locationA._id,
      slotId: slotNoVeh._id,
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      duration: 1,
      status: ReservationStatus.CONFIRMED,
      pricingSnapshot: {
        baseRate: 50,
        hourlyRate: 50,
        peakMultiplier: 1.0,
        totalAmount: 50,
        currency: 'INR',
      },
    });

    await ParkingSlot.findByIdAndUpdate(slotNoVeh._id, {
      currentReservationId: resNoVeh._id,
    });

    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(200);
    const foundSlot = res.body.data.find((s: any) => s._id === slotNoVeh._id.toString());
    expect(foundSlot).toBeDefined();
    expect(foundSlot.reservation).toBeDefined();
    expect(foundSlot.reservation.customer.name).toBe('No Vehicle Driver');
    // Vehicle is null or undefined, handled gracefully
    expect(foundSlot.reservation.vehicle).toBeNull();

    // Clean up
    await ParkingSlot.deleteOne({ _id: slotNoVeh._id });
    await Reservation.deleteOne({ _id: resNoVeh._id });
    await User.deleteOne({ _id: noVehicleUser._id });
  });

  it('15. Manager cancellation clears reservation details without fabricating physical status', async () => {
    // Manager A cancels reservation for slot A2
    const cancelRes = await request(app)
      .patch(`/api/manager/reservations/${reservationDoc._id}/cancel`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(cancelRes.status).toBe(200);

    // Reservation linkage is cleared; sensor-owned status is unchanged.
    const res = await request(app)
      .get(`/api/parking-locations/${locationA._id}/slots/details`)
      .set('Authorization', `Bearer ${managerAToken}`);

    expect(res.status).toBe(200);
    const updatedSlot = res.body.data.find((s: any) => s._id === slotA2._id.toString());
    expect(updatedSlot.status).toBe(SlotStatus.RESERVED);
    expect(updatedSlot.reservation).toBeNull();
  });

  it('16. User can see their own reservation and vehicle, but cannot access other users records', async () => {
    // Customer can get their own vehicle
    const myVehiclesRes = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`);
    expect(myVehiclesRes.status).toBe(200);
    expect(myVehiclesRes.body.data.some((v: any) => v.licensePlate === 'KA01AB1234')).toBe(true);

    // Customer calling /api/reservations only receives their own reservations (never other users)
    const myResList = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`);
    expect(myResList.status).toBe(200);
    myResList.body.data.forEach((r: any) => {
      expect(r.userId.toString()).toBe(customerId.toString());
    });
  });

});
