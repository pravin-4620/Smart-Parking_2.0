import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { VehicleType } from '@smart-parking/shared';

export interface IVehicleData {
  userId: Types.ObjectId;
  licensePlate: string;
  make?: string;
  model?: string;
  color?: string;
  vehicleType: VehicleType;
  rfidCardId?: Types.ObjectId;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IVehicle = IVehicleData & Omit<Document, 'model'>;

const vehicleSchema = new Schema<IVehicle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    licensePlate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    make: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      default: VehicleType.CAR,
      required: true,
    },
    rfidCardId: {
      type: Schema.Types.ObjectId,
      ref: 'RFIDCard',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.index({ userId: 1, licensePlate: 1 }, { unique: true });

export const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', vehicleSchema);
