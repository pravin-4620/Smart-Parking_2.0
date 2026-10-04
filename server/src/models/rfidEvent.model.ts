import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { RFIDEventType } from '@smart-parking/shared';

export interface IRFIDEvent extends Document {
  uid: string;
  userId?: Types.ObjectId;
  parkingLocationId: Types.ObjectId;
  slotId?: Types.ObjectId;
  eventType: RFIDEventType;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rfidEventSchema = new Schema<IRFIDEvent>(
  {
    uid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    },
    eventType: {
      type: String,
      enum: Object.values(RFIDEventType),
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

rfidEventSchema.index({ parkingLocationId: 1, timestamp: -1 });

export const RFIDEvent: Model<IRFIDEvent> =
  mongoose.models.RFIDEvent || mongoose.model<IRFIDEvent>('RFIDEvent', rfidEventSchema);
