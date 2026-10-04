import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISensorEvent extends Document {
  deviceId: string;
  parkingLocationId: Types.ObjectId;
  slotId: Types.ObjectId;
  occupied: boolean;
  timestamp: Date;
  payload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const sensorEventSchema = new Schema<ISensorEvent>(
  {
    deviceId: {
      type: String,
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
    occupied: {
      type: Boolean,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

sensorEventSchema.index({ slotId: 1, timestamp: -1 });

export const SensorEvent: Model<ISensorEvent> =
  mongoose.models.SensorEvent || mongoose.model<ISensorEvent>('SensorEvent', sensorEventSchema);
