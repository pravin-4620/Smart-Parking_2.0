import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { SessionStatus } from '@smart-parking/shared';

export interface IParkingSession extends Document {
  userId: Types.ObjectId;
  reservationId?: Types.ObjectId;
  parkingLocationId: Types.ObjectId;
  slotId: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  rfidCardId?: Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  exitVerifiedAt?: Date;
  durationMinutes?: number;
  status: SessionStatus;
  overstayMinutes: number;
  overstayFee: number;
  createdAt: Date;
  updatedAt: Date;
}

const parkingSessionSchema = new Schema<IParkingSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
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
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    rfidCardId: {
      type: Schema.Types.ObjectId,
      ref: 'RFIDCard',
    },
    checkInTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    checkOutTime: {
      type: Date,
    },
    exitVerifiedAt: Date,
    durationMinutes: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.ACTIVE,
      required: true,
      index: true,
    },
    overstayMinutes: {
      type: Number,
      default: 0,
    },
    overstayFee: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

parkingSessionSchema.index({ slotId: 1, status: 1 });
parkingSessionSchema.index({ userId: 1, status: 1 });
parkingSessionSchema.index(
  { slotId: 1 },
  { name: 'unique_active_session_per_slot', unique: true, partialFilterExpression: { status: { $in: [SessionStatus.ACTIVE, SessionStatus.CHECKOUT_PENDING, SessionStatus.OVERSTAY] } } }
);

export const ParkingSession: Model<IParkingSession> =
  mongoose.models.ParkingSession || mongoose.model<IParkingSession>('ParkingSession', parkingSessionSchema);
