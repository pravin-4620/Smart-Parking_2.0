import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { FineStatus } from '@smart-parking/shared';

export interface IOverstayFine extends Document {
  userId: Types.ObjectId;
  reservationId: Types.ObjectId;
  sessionId: Types.ObjectId;
  parkingLocationId: Types.ObjectId;
  slotId: Types.ObjectId;
  overstayMinutes: number;
  gracePeriodMinutes: number;
  intervalMinutes: number;
  intervalsCharged: number;
  amountPerInterval: number;
  amount: number;
  maximumAmount: number;
  currency: string;
  status: FineStatus;
  calculatedAt: Date;
  paidAt?: Date;
  paymentTransactionId?: Types.ObjectId;
}

const overstayFineSchema = new Schema<IOverstayFine>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
  sessionId: { type: Schema.Types.ObjectId, ref: 'ParkingSession', required: true, unique: true },
  parkingLocationId: { type: Schema.Types.ObjectId, ref: 'ParkingLocation', required: true, index: true },
  slotId: { type: Schema.Types.ObjectId, ref: 'ParkingSlot', required: true },
  overstayMinutes: { type: Number, required: true, min: 1 },
  gracePeriodMinutes: { type: Number, required: true, min: 0 },
  intervalMinutes: { type: Number, required: true, min: 1 },
  intervalsCharged: { type: Number, required: true, min: 1 },
  amountPerInterval: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  maximumAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'INR' },
  status: { type: String, enum: Object.values(FineStatus), required: true, default: FineStatus.DUE, index: true },
  calculatedAt: { type: Date, required: true, default: Date.now },
  paidAt: Date,
  paymentTransactionId: { type: Schema.Types.ObjectId, ref: 'PaymentTransaction' },
}, { timestamps: true });

overstayFineSchema.index({ parkingLocationId: 1, status: 1, calculatedAt: -1 });

export const OverstayFine: Model<IOverstayFine> =
  mongoose.models.OverstayFine || mongoose.model<IOverstayFine>('OverstayFine', overstayFineSchema);
