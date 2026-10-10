import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { DeviceStatus } from '@smart-parking/shared';

export interface IIoTDevice extends Document {
  deviceId: string;
  parkingLocationId: Types.ObjectId;
  name: string;
  status: DeviceStatus;
  lastHeartbeat?: Date;
  lastMessageAt?: Date;
  thingName: string;
  isActive: boolean;
  lastCommandRevision?: number;
  lastCommandId?: string;
  lastCommandAt?: Date;
  lastAckRevision?: number;
  lastAckCommandId?: string;
  lastAckAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ioTDeviceSchema = new Schema<IIoTDevice>(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    parkingLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(DeviceStatus),
      default: DeviceStatus.OFFLINE,
      required: true,
      index: true,
    },
    lastHeartbeat: {
      type: Date,
    },
    lastMessageAt: {
      type: Date,
    },
    thingName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastCommandRevision: Number,
    lastCommandId: String,
    lastCommandAt: Date,
    lastAckRevision: Number,
    lastAckCommandId: String,
    lastAckAt: Date,
  },
  {
    timestamps: true,
  }
);

export const IoTDevice: Model<IIoTDevice> =
  mongoose.models.IoTDevice || mongoose.model<IIoTDevice>('IoTDevice', ioTDeviceSchema);
