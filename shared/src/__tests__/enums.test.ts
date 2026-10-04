import { describe, it, expect } from 'vitest';
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
} from '../index.js';

describe('Shared Enums and Contracts', () => {
  it('should define all UserRole values', () => {
    expect(UserRole.USER).toBe('USER');
    expect(UserRole.PARKING_MANAGER).toBe('PARKING_MANAGER');
    expect(UserRole.ADMIN).toBe('ADMIN');
  });

  it('should define all SlotStatus values', () => {
    expect(SlotStatus.AVAILABLE).toBe('AVAILABLE');
    expect(SlotStatus.RESERVED).toBe('RESERVED');
    expect(SlotStatus.OCCUPIED).toBe('OCCUPIED');
    expect(SlotStatus.MAINTENANCE).toBe('MAINTENANCE');
    expect(SlotStatus.OUT_OF_SERVICE).toBe('OUT_OF_SERVICE');
  });

  it('should define all ReservationStatus values required for Phase 2', () => {
    expect(ReservationStatus.PENDING_PAYMENT).toBe('PENDING_PAYMENT');
    expect(ReservationStatus.CONFIRMED).toBe('CONFIRMED');
    expect(ReservationStatus.ACTIVE).toBe('ACTIVE');
    expect(ReservationStatus.COMPLETED).toBe('COMPLETED');
    expect(ReservationStatus.CANCELLED).toBe('CANCELLED');
    expect(ReservationStatus.EXPIRED).toBe('EXPIRED');
    expect(ReservationStatus.PAYMENT_FAILED).toBe('PAYMENT_FAILED');
    expect(ReservationStatus.NO_SHOW).toBe('NO_SHOW');
  });

  it('should define domain enums correctly', () => {
    expect(PaymentStatus.COMPLETED).toBe('COMPLETED');
    expect(ParkingStatus.ACTIVE).toBe('ACTIVE');
    expect(DeviceStatus.ONLINE).toBe('ONLINE');
    expect(PricingRuleType.HOURLY).toBe('HOURLY');
    expect(RFIDEventType.CHECK_IN).toBe('CHECK_IN');
    expect(SessionStatus.ACTIVE).toBe('ACTIVE');
    expect(VehicleType.CAR).toBe('CAR');
    expect(AllocationStrategy.AUTO_OPTIMAL).toBe('AUTO_OPTIMAL');
    expect(NotificationType.SYSTEM).toBe('SYSTEM');
  });
});
