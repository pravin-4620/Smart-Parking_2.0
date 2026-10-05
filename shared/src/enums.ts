import { z } from 'zod';

export const UserRole = {
  USER: 'USER',
  PARKING_MANAGER: 'PARKING_MANAGER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const UserRoleSchema = z.nativeEnum(UserRole);

export const SlotStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
} as const;
export type SlotStatus = (typeof SlotStatus)[keyof typeof SlotStatus];
export const SlotStatusSchema = z.nativeEnum(SlotStatus);

export const SlotType = {
  REGULAR: 'REGULAR',
  EV_CHARGING: 'EV_CHARGING',
  HANDICAPPED: 'HANDICAPPED',
  COMPACT: 'COMPACT',
  VIP: 'VIP',
} as const;
export type SlotType = (typeof SlotType)[keyof typeof SlotType];
export const SlotTypeSchema = z.nativeEnum(SlotType);

export const ReservationStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];
export const ReservationStatusSchema = z.nativeEnum(ReservationStatus);

export const PaymentStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  REFUND_FAILED: 'REFUND_FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export const PaymentStatusSchema = z.nativeEnum(PaymentStatus);

export const ParkingStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  FULL: 'FULL',
  MAINTENANCE: 'MAINTENANCE',
} as const;
export type ParkingStatus = (typeof ParkingStatus)[keyof typeof ParkingStatus];
export const ParkingStatusSchema = z.nativeEnum(ParkingStatus);

export const DeviceStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  MAINTENANCE: 'MAINTENANCE',
  ERROR: 'ERROR',
} as const;
export type DeviceStatus = (typeof DeviceStatus)[keyof typeof DeviceStatus];
export const DeviceStatusSchema = z.nativeEnum(DeviceStatus);

export const PricingRuleType = {
  HOURLY: 'HOURLY',
  PEAK: 'PEAK',
  PEAK_HOURS: 'PEAK',
  OFF_PEAK: 'OFF_PEAK',
  WEEKEND: 'WEEKEND',
  HOLIDAY: 'HOLIDAY',
} as const;
export type PricingRuleType = (typeof PricingRuleType)[keyof typeof PricingRuleType];
export const PricingRuleTypeSchema = z.nativeEnum(PricingRuleType);

export const RFIDEventType = {
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  ENTRY: 'ENTRY',
  EXIT: 'EXIT',
  DENIED: 'DENIED',
  INVALID_ACCESS: 'INVALID_ACCESS',
  UNAUTHORIZED_ENTRY: 'UNAUTHORIZED_ENTRY',
  UNKNOWN: 'UNKNOWN',
} as const;
export type RFIDEventType = (typeof RFIDEventType)[keyof typeof RFIDEventType];
export const RFIDEventTypeSchema = z.nativeEnum(RFIDEventType);

export const SessionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  OVERSTAY: 'OVERSTAY',
  FORCE_CLOSED: 'FORCE_CLOSED',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
export const SessionStatusSchema = z.nativeEnum(SessionStatus);

export const VehicleType = {
  CAR: 'CAR',
  BIKE: 'BIKE',
  EV: 'EV',
  TRUCK: 'TRUCK',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];
export const VehicleTypeSchema = z.nativeEnum(VehicleType);

export const AllocationStrategy = {
  AUTO_NEAREST: 'AUTO_NEAREST',
  AUTO_OPTIMAL: 'AUTO_OPTIMAL',
  MANUAL: 'MANUAL',
} as const;
export type AllocationStrategy = (typeof AllocationStrategy)[keyof typeof AllocationStrategy];
export const AllocationStrategySchema = z.nativeEnum(AllocationStrategy);

export const NotificationType = {
  RESERVATION_CONFIRMED: 'RESERVATION_CONFIRMED',
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  OVERSTAY_ALERT: 'OVERSTAY_ALERT',
  RESERVATION_REMINDER: 'RESERVATION_REMINDER',
  ALERT: 'ALERT',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NotificationTypeSchema = z.nativeEnum(NotificationType);

