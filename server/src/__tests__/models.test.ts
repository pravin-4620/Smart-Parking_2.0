import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import {
  User,
  ParkingLocation,
  ParkingSlot,
  Reservation,
  ParkingSession,
  Vehicle,
  RFIDCard,
  RFIDEvent,
  IoTDevice,
  SensorEvent,
  PricingProfile,
  PricingRule,
  PaymentTransaction,
  Notification,
  Prediction,
  AllocationLog,
  AuditLog,
} from '../models/index.js';
import {
  UserRole,
  SlotStatus,
  ReservationStatus,
  PaymentStatus,
  ParkingStatus,
  DeviceStatus,
  PricingRuleType,
  RFIDEventType,
  SessionStatus,
  VehicleType,
  AllocationStrategy,
  NotificationType,
} from '@smart-parking/shared';

describe('Domain Models Validation Suite', () => {
  it('should instantiate User model and validate required fields', () => {
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashed_password',
      role: UserRole.USER,
      phone: '+919876543210',
    });

    const err = user.validateSync();
    expect(err).toBeUndefined();
    expect(user.role).toBe('USER');
    expect(user.isActive).toBe(true);
  });

  it('should validate ParkingLocation model with GeoJSON point and operating hours', () => {
    const location = new ParkingLocation({
      name: 'Central Mall Parking',
      address: '123 Main Street',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      postalCode: '560001',
      geoLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
      },
      operatingHours: {
        openTime: '06:00',
        closeTime: '23:00',
        is24x7: false,
      },
      status: ParkingStatus.ACTIVE,
    });

    const err = location.validateSync();
    expect(err).toBeUndefined();
    expect(location.geoLocation.coordinates).toEqual([77.5946, 12.9716]);
  });

  it('should validate ParkingSlot model with location reference and status', () => {
    const slot = new ParkingSlot({
      parkingLocationId: new mongoose.Types.ObjectId(),
      slotNumber: 'A-101',
      status: SlotStatus.AVAILABLE,
      isActive: true,
    });

    const err = slot.validateSync();
    expect(err).toBeUndefined();
    expect(slot.status).toBe('AVAILABLE');
  });

  it('should validate Reservation model with pricing snapshot and status', () => {
    const reservation = new Reservation({
      userId: new mongoose.Types.ObjectId(),
      parkingLocationId: new mongoose.Types.ObjectId(),
      slotId: new mongoose.Types.ObjectId(),
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      duration: 60,
      status: ReservationStatus.CONFIRMED,
      pricingSnapshot: {
        baseRate: 50,
        hourlyRate: 50,
        peakMultiplier: 1.2,
        totalAmount: 60,
        currency: 'INR',
      },
    });

    const err = reservation.validateSync();
    expect(err).toBeUndefined();
    expect(reservation.status).toBe('CONFIRMED');
    expect(reservation.pricingSnapshot.totalAmount).toBe(60);
  });

  it('should validate ParkingSession model', () => {
    const session = new ParkingSession({
      userId: new mongoose.Types.ObjectId(),
      parkingLocationId: new mongoose.Types.ObjectId(),
      slotId: new mongoose.Types.ObjectId(),
      checkInTime: new Date(),
      status: SessionStatus.ACTIVE,
    });

    const err = session.validateSync();
    expect(err).toBeUndefined();
    expect(session.status).toBe('ACTIVE');
  });

  it('should validate Vehicle model', () => {
    const vehicle = new Vehicle({
      userId: new mongoose.Types.ObjectId(),
      licensePlate: 'KA-01-AB-1234',
      vehicleType: VehicleType.EV,
    });

    const err = vehicle.validateSync();
    expect(err).toBeUndefined();
    expect(vehicle.licensePlate).toBe('KA-01-AB-1234');
  });

  it('should validate RFIDCard and RFIDEvent models', () => {
    const rfidCard = new RFIDCard({
      userId: new mongoose.Types.ObjectId(),
      uid: 'RF12345678',
    });
    expect(rfidCard.validateSync()).toBeUndefined();

    const rfidEvent = new RFIDEvent({
      uid: 'RF12345678',
      parkingLocationId: new mongoose.Types.ObjectId(),
      eventType: RFIDEventType.CHECK_IN,
      timestamp: new Date(),
    });
    expect(rfidEvent.validateSync()).toBeUndefined();
  });

  it('should validate IoTDevice and SensorEvent models', () => {
    const device = new IoTDevice({
      deviceId: 'ESP32-NODE-01',
      parkingLocationId: new mongoose.Types.ObjectId(),
      name: 'Gateway North',
      status: DeviceStatus.ONLINE,
      thingName: 'SmartParking_Thing_01',
    });
    expect(device.validateSync()).toBeUndefined();

    const sensorEvent = new SensorEvent({
      deviceId: 'ESP32-NODE-01',
      parkingLocationId: new mongoose.Types.ObjectId(),
      slotId: new mongoose.Types.ObjectId(),
      occupied: true,
      timestamp: new Date(),
      payload: { rawIRValue: 1 },
    });
    expect(sensorEvent.validateSync()).toBeUndefined();
  });

  it('should validate PricingProfile and PricingRule models', () => {
    const profile = new PricingProfile({
      parkingLocationId: new mongoose.Types.ObjectId(),
      name: 'Standard Rates 2026',
      version: 1,
      baseHourlyRate: 40,
      minimumCharge: 20,
      maximumDailyCharge: 300,
    });
    expect(profile.validateSync()).toBeUndefined();

    const rule = new PricingRule({
      pricingProfileId: new mongoose.Types.ObjectId(),
      ruleName: 'Peak Hours Multiplier',
      ruleType: PricingRuleType.PEAK,
      multiplier: 1.5,
      startTime: '17:00',
      endTime: '21:00',
      daysOfWeek: [1, 2, 3, 4, 5],
    });
    expect(rule.validateSync()).toBeUndefined();
  });

  it('should validate PaymentTransaction model', () => {
    const payment = new PaymentTransaction({
      userId: new mongoose.Types.ObjectId(),
      reservationId: new mongoose.Types.ObjectId(),
      orderId: 'order_12345',
      paymentId: 'pay_67890',
      amount: 100,
      currency: 'INR',
      status: PaymentStatus.COMPLETED,
    });
    expect(payment.validateSync()).toBeUndefined();
  });

  it('should validate Notification, Prediction, AllocationLog and AuditLog models', () => {
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(),
      title: 'Booking Confirmed',
      message: 'Your slot A-101 is reserved.',
      type: NotificationType.RESERVATION_CONFIRMED,
    });
    expect(notification.validateSync()).toBeUndefined();

    const prediction = new Prediction({
      parkingLocationId: new mongoose.Types.ObjectId(),
      timestamp: new Date(),
      horizon: 30,
      predictedOccupancy: 75.5,
      predictedAvailableSlots: 10,
      confidence: 0.92,
      modelVersion: 'v1.0.0',
    });
    expect(prediction.validateSync()).toBeUndefined();

    const allocation = new AllocationLog({
      userId: new mongoose.Types.ObjectId(),
      parkingLocationId: new mongoose.Types.ObjectId(),
      allocatedSlotId: new mongoose.Types.ObjectId(),
      strategy: AllocationStrategy.AUTO_OPTIMAL,
      score: 95,
    });
    expect(allocation.validateSync()).toBeUndefined();

    const audit = new AuditLog({
      userId: new mongoose.Types.ObjectId(),
      role: UserRole.ADMIN,
      action: 'UPDATE_PRICING',
      resource: 'PricingProfile',
      resourceId: 'profile_123',
    });
    expect(audit.validateSync()).toBeUndefined();
  });
});
