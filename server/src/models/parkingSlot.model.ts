import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { SlotStatus, SlotType } from '@smart-parking/shared';

export interface IParkingSlot extends Document {
  parkingLocationId: Types.ObjectId;
  slotNumber: string;
  status: SlotStatus;
  slotType: SlotType;
  hourlyRateOverride?: number;
  sensorId?: string;
  deviceId?: Types.ObjectId;
  isActive: boolean;
  maintenanceReason?: string;
  lastSensorUpdate?: Date;
  currentReservationId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const parkingSlotSchema = new Schema<IParkingSlot>(
  {
    parkingLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
      index: true,
    },
    slotNumber: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SlotStatus),
      default: SlotStatus.AVAILABLE,
      required: true,
      index: true,
    },
    slotType: {
      type: String,
      enum: Object.values(SlotType),
      default: SlotType.REGULAR,
      required: true,
    },
    hourlyRateOverride: {
      type: Number,
      min: 0,
    },
    sensorId: {
      type: String,
      trim: true,
      index: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'IoTDevice',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    maintenanceReason: {
      type: String,
      trim: true,
    },
    lastSensorUpdate: {
      type: Date,
    },
    currentReservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for slotNumber within a parking location
parkingSlotSchema.index({ parkingLocationId: 1, slotNumber: 1 }, { unique: true });
parkingSlotSchema.index({ parkingLocationId: 1, status: 1, isActive: 1 });

export const ParkingSlot: Model<IParkingSlot> =
  mongoose.models.ParkingSlot || mongoose.model<IParkingSlot>('ParkingSlot', parkingSlotSchema);
