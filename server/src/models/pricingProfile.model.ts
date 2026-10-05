import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPricingProfile extends Document {
  parkingLocationId: Types.ObjectId;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  basePrice: number;
  baseHourlyRate: number;
  minimumCharge: number;
  maximumDailyCharge: number;
  createdAt: Date;
  updatedAt: Date;
}

const pricingProfileSchema = new Schema<IPricingProfile>(
  {
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
    description: {
      type: String,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    baseHourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumDailyCharge: {
      type: Number,
      default: 500,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

pricingProfileSchema.index({ parkingLocationId: 1, version: 1 }, { unique: true });

export const PricingProfile: Model<IPricingProfile> =
  mongoose.models.PricingProfile || mongoose.model<IPricingProfile>('PricingProfile', pricingProfileSchema);
