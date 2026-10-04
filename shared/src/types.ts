import { UserRole, SlotStatus, ReservationStatus, PaymentStatus, ParkingStatus, DeviceStatus } from './enums.js';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      connected: boolean;
      status: string;
    };
    redis: {
      connected: boolean;
      status: string;
    };
  };
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface ParkingSpotSummary {
  id: string;
  parkingLotId: string;
  slotNumber: string;
  status: SlotStatus;
  floor?: number;
  isEvCharging: boolean;
  pricePerHour: number;
}

export interface TelemetryPayload {
  deviceId: string;
  parkingLotId: string;
  timestamp: number;
  sensors: {
    slot1: boolean;
    slot2: boolean;
    slot3: boolean;
  };
  rfidCard?: string;
  rfidUid?: string;
  eventType?: 'ENTRY' | 'EXIT';
}

export interface IoTTelemetryPayload {
  deviceId: string;
  parkingId?: string;
  parkingLocationId?: string;
  timestamp?: string | number;
  slots?: Array<{ slotId: string; occupied: boolean }>;
  sensors?: Record<string, boolean>;
  slotNumber?: string;
  occupied?: boolean;
  rfidCard?: string;
  rfidUid?: string;
  eventType?: 'ENTRY' | 'EXIT';
  heartbeatOnly?: boolean;
  isOffline?: boolean;
}

export interface NearbyParkingResponse {
  parkingId: string;
  name: string;
  description?: string;
  distance: number;
  address: string;
  city: string;
  coordinates: [number, number];
  availableSlots: number;
  totalSlots: number;
  occupancy: number;
  startingPrice: number;
  status: ParkingStatus;
  operatingStatus: 'OPEN' | 'CLOSED';
  operatingHours: { openTime: string; closeTime: string; is24x7: boolean };
  features: string[];
}

export interface PricingBreakdownItem {
  description: string;
  rate: number;
  hours: number;
  amount: number;
}

export interface PricingCalculationResult {
  baseAmount: number;
  peakAmount: number;
  discount: number;
  taxes: number;
  finalAmount: number;
  currency: string;
  durationHours: number;
  breakdown: PricingBreakdownItem[];
  pricingRuleVersion: number;
}

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  reservationId: string;
}

export interface PaymentReceipt {
  receiptId: string;
  transactionId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  reservationDetails: {
    id: string;
    parkingName: string;
    slotNumber: string;
    startTime: string;
    endTime: string;
  };
}

export interface PredictionPoint {
  time: string;
  hourLabel: string;
  predictedOccupancyPercentage: number;
  predictedOccupiedSlots: number;
  predictedAvailableSlots: number;
  confidenceScore: number;
  demandFactor: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface ParkingPredictionResult {
  parkingLocationId: string;
  parkingName: string;
  totalSlots: number;
  currentOccupancyPercentage: number;
  currentOccupiedSlots: number;
  currentAvailableSlots: number;
  horizonHours: number;
  generatedAt: string;
  modelVersion: string;
  modelType: 'BASELINE' | 'ML_STUB' | 'ML_FUTURE';
  predictions: PredictionPoint[];
  historicalSampleCount: number;
}
