import {
  UserRole,
  SlotStatus,
  ReservationStatus,
  PaymentStatus,
  ParkingStatus,
  DeviceStatus,
  FineStatus,
} from "./enums.js";

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "error";
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
  eventType?: "ENTRY" | "EXIT";
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
  eventType?: "ENTRY" | "EXIT";
  heartbeatOnly?: boolean;
  isOffline?: boolean;
  firmwareVersion?: string;
  authorizationStatus?: "AUTHORIZED" | "DENIED";
  scannedSlotId?: string;
  scanId?: string;
}

export interface ReservationStateCommand {
  schemaVersion: 1;
  commandId: string;
  revision: number;
  issuedAt: string;
  deviceId: string;
  parkingId: string;
  slots: Array<{
    slotId: string;
    reservationId?: string;
    sessionId?: string;
    reservationBlocked: boolean;
    indicatorState: 'AVAILABLE' | 'RESERVED' | 'ACTIVE';
  }>;
}

export interface ReservationStateAck {
  schemaVersion: 1;
  commandId: string;
  revision: number;
  timestamp: string;
  deviceId: string;
  parkingId: string;
  applied: boolean;
  reason?: string;
}

export interface OverstayFineSummary {
  id: string;
  sessionId: string;
  reservationId: string;
  overstayMinutes: number;
  amount: number;
  currency: string;
  status: FineStatus;
  calculatedAt: string;
}

export interface ParkingUpdatedEvent {
  parkingLocationId: string;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  unknownSlots: number;
  occupancyRate: number | null;
  updatedAt?: string;
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
  unknownSlots: number;
  occupancy: number | null;
  telemetryStatus: "LIVE" | "PARTIAL" | "UNAVAILABLE";
  startingPrice: number;
  status: ParkingStatus;
  operatingStatus: "OPEN" | "CLOSED";
  operatingHours: { openTime: string; closeTime: string; is24x7: boolean };
  features: string[];
}

export interface AuthorizedPersonDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface AuthorizedVehicleDetails {
  id: string;
  licensePlate: string;
  vehicleType: string;
  make: string;
  model: string;
  color: string;
}

export interface AuthorizedSlotDetails {
  _id: string;
  parkingLocationId: string;
  slotNumber: string;
  status: SlotStatus;
  slotType: string;
  isActive: boolean;
  sensorId?: string;
  maintenanceReason?: string;
  reservation: {
    reservationId: string;
    status: string;
    startTime: string;
    endTime: string;
    duration: number;
    customer: AuthorizedPersonDetails;
    vehicle: AuthorizedVehicleDetails | null;
  } | null;
  activeSession: {
    sessionId: string;
    status: string;
    checkInTime: string;
    customer: AuthorizedPersonDetails;
    vehicle: AuthorizedVehicleDetails | null;
  } | null;
}

export interface PricingBreakdownItem {
  description: string;
  rate: number;
  hours: number;
  amount: number;
}

export interface PricingCalculationResult {
  effectiveHourlyRate: number;
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

export interface PredictionPoint {
  time: string;
  hourLabel: string;
  predictedOccupancyPercentage: number;
  predictedOccupiedSlots: number;
  predictedAvailableSlots: number;
  confidenceScore: number;
  demandFactor: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
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
  modelType: "BASELINE" | "ML_STUB" | "ML_FUTURE";
  predictions: PredictionPoint[];
  historicalSampleCount: number;
}
