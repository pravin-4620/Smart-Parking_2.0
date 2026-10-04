import { z } from 'zod';
import { UserRole } from './enums.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const registerRFIDCardSchema = z.object({
  uid: z.string().min(4, 'RFID UID must be at least 4 hex characters').max(32),
});

export const rfidTapSchema = z.object({
  deviceId: z.string().optional(),
  parkingLocationId: z.string().min(1, 'Parking Location ID is required'),
  rfidUid: z.string().min(4, 'RFID UID is required'),
  eventType: z.enum(['ENTRY', 'EXIT', 'UNKNOWN', 'DENIED', 'CHECK_IN', 'CHECK_OUT']).optional(),
  timestamp: z.union([z.number(), z.string()]).optional(),
});

export const calculatePricingSchema = z.object({
  parkingLocationId: z.string().min(1, 'parkingLocationId is required'),
  slotId: z.string().optional(),
  slotType: z.string().optional(),
  startTime: z.string().min(1, 'startTime is required'),
  endTime: z.string().min(1, 'endTime is required'),
  vehicleType: z.string().optional(),
});

export const createReservationSchema = z.object({
  parkingLocationId: z.string().min(1, 'parkingLocationId is required'),
  slotId: z.string().optional(),
  startTime: z.string().min(1, 'startTime is required'),
  endTime: z.string().min(1, 'endTime is required'),
  vehicleId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  autoAssign: z.boolean().optional(),
  slotType: z.string().optional(),
});

export const autoAllocateSlotSchema = z.object({
  parkingLocationId: z.string().min(1, 'parkingLocationId is required'),
  startTime: z.string().min(1, 'startTime is required'),
  endTime: z.string().min(1, 'endTime is required'),
  slotType: z.string().optional(),
  preferredSlotId: z.string().optional(),
});

export const createParkingLocationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  geoLocation: z
    .object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .optional(),
  operatingHours: z
    .object({
      openTime: z.string().optional(),
      closeTime: z.string().optional(),
      is24x7: z.boolean().optional(),
    })
    .optional(),
  features: z.array(z.string()).optional(),
  status: z.string().optional(),
  managerIds: z.array(z.string()).optional(),
});

export const updateParkingLocationSchema = createParkingLocationSchema.partial();

export const createParkingSlotSchema = z.object({
  slotNumber: z.string().min(1, 'Slot number is required'),
  slotType: z.string().optional(),
  floor: z.number().optional(),
  status: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createBatchParkingSlotsSchema = z.object({
  slots: z.array(createParkingSlotSchema),
});

export const updateParkingSlotSchema = createParkingSlotSchema.partial();

export const createPaymentOrderSchema = z.object({
  reservationId: z.string().min(1, 'reservationId is required'),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'razorpayOrderId is required'),
  razorpayPaymentId: z.string().min(1, 'razorpayPaymentId is required'),
  razorpaySignature: z.string().min(1, 'razorpaySignature is required'),
  reservationId: z.string().min(1, 'reservationId is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CalculatePricingInput = z.infer<typeof calculatePricingSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type AutoAllocateSlotInput = z.infer<typeof autoAllocateSlotSchema>;
export type CreateParkingLocationInput = z.infer<typeof createParkingLocationSchema>;
export type UpdateParkingLocationInput = z.infer<typeof updateParkingLocationSchema>;
export type CreateParkingSlotInput = z.infer<typeof createParkingSlotSchema> & {
  sensorId?: string;
  deviceId?: string;
};
export type UpdateParkingSlotInput = z.infer<typeof updateParkingSlotSchema> & {
  sensorId?: string;
  deviceId?: string;
  maintenanceReason?: string;
};
export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export interface ListReservationsQueryInput {
  status?: string;
  parkingLocationId?: string;
  page?: number;
  limit?: number;
}

export interface NearbyQueryInput {
  lat: number;
  lng: number;
  radius?: number;
  slotType?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    isActive: boolean;
  };
  accessToken: string;
  refreshToken?: string;
}
