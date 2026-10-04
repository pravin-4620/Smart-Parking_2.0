import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { AllocationStrategy } from '@smart-parking/shared';

export interface IAllocationLog extends Document {
  reservationId?: Types.ObjectId;
  userId: Types.ObjectId;
  parkingLocationId: Types.ObjectId;
  allocatedSlotId: Types.ObjectId;
  strategy: AllocationStrategy;
  score?: number;
  factors?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const allocationLogSchema = new Schema<IAllocationLog>(
  {
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      index: true,
    },
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
    allocatedSlotId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingSlot',
      required: true,
    },
    strategy: {
      type: String,
      enum: Object.values(AllocationStrategy),
      default: AllocationStrategy.AUTO_OPTIMAL,
      required: true,
    },
    score: {
      type: Number,
    },
    factors: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const AllocationLog: Model<IAllocationLog> =
  mongoose.models.AllocationLog || mongoose.model<IAllocationLog>('AllocationLog', allocationLogSchema);
