import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { PricingRuleType } from '@smart-parking/shared';

export interface IPricingRule extends Document {
  pricingProfileId: Types.ObjectId;
  ruleName: string;
  ruleType: PricingRuleType;
  multiplier: number;
  fixedFee: number;
  startTime?: string; // HH:mm format
  endTime?: string;   // HH:mm format
  daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pricingRuleSchema = new Schema<IPricingRule>(
  {
    pricingProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'PricingProfile',
      required: true,
      index: true,
    },
    ruleName: {
      type: String,
      required: true,
      trim: true,
    },
    ruleType: {
      type: String,
      enum: Object.values(PricingRuleType),
      required: true,
    },
    multiplier: {
      type: Number,
      default: 1.0,
      min: 0,
    },
    fixedFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    startTime: {
      type: String, // HH:mm format
    },
    endTime: {
      type: String, // HH:mm format
    },
    daysOfWeek: [
      {
        type: Number,
        min: 0,
        max: 6,
      },
    ],
    priority: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PricingRule: Model<IPricingRule> =
  mongoose.models.PricingRule || mongoose.model<IPricingRule>('PricingRule', pricingRuleSchema);
