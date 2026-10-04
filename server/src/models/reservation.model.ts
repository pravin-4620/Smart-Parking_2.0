import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ReservationStatus } from '@smart-parking/shared';

export interface IReservation extends Document {
  userId: Types.ObjectId;
  parkingLocationId: Types.ObjectId;
  slotId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  status: ReservationStatus;
  pricingSnapshot: {
    baseRate: number;
    hourlyRate: number;
    peakMultiplier: number;
    totalAmount: number;
    currency: string;
    ruleApplied?: string;
  };
  paymentTransactionId?: Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parkingLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
      index: true,
    },
    slotId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingSlot',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.PENDING_PAYMENT,
      required: true,
      index: true,
    },
    pricingSnapshot: {
      baseRate: { type: Number, required: true },
      hourlyRate: { type: Number, required: true },
      peakMultiplier: { type: Number, default: 1.0 },
      totalAmount: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      ruleApplied: { type: String },
    },
    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for slot availability overlap checks
reservationSchema.index({ slotId: 1, startTime: 1, endTime: 1, status: 1 });
reservationSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const Reservation: Model<IReservation> =
  mongoose.models.Reservation || mongoose.model<IReservation>('Reservation', reservationSchema);
