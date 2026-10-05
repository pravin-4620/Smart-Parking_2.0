import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ParkingStatus } from '@smart-parking/shared';

export interface IParkingLocation extends Document {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  geoLocation: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  operatingHours: {
    openTime: string;
    closeTime: string;
    is24x7: boolean;
  };
  features: string[];
  status: ParkingStatus;
  managerIds: Types.ObjectId[];
  pricingProfileId?: Types.ObjectId;
  overstayConfig?: {
    gracePeriodMinutes: number;
    fineIntervalMinutes: number;
    fineAmountPerInterval: number;
    maximumFineAmount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const parkingLocationSchema = new Schema<IParkingLocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: 'India',
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    operatingHours: {
      openTime: { type: String, default: '00:00' },
      closeTime: { type: String, default: '23:59' },
      is24x7: { type: Boolean, default: true },
    },
    features: [{ type: String }],
    status: {
      type: String,
      enum: Object.values(ParkingStatus),
      default: ParkingStatus.ACTIVE,
      required: true,
    },
    managerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pricingProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'PricingProfile',
    },
    overstayConfig: {
      gracePeriodMinutes: { type: Number, default: 10 },
      fineIntervalMinutes: { type: Number, default: 15 },
      fineAmountPerInterval: { type: Number, default: 20 },
      maximumFineAmount: { type: Number, default: 500 },
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere spatial index for nearby location queries
parkingLocationSchema.index({ geoLocation: '2dsphere' });

export const ParkingLocation: Model<IParkingLocation> =
  mongoose.models.ParkingLocation || mongoose.model<IParkingLocation>('ParkingLocation', parkingLocationSchema);
