import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRFIDCard extends Document {
  userId?: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  uid: string;
  isActive: boolean;
  assignedAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rfidCardSchema = new Schema<IRFIDCard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    uid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedAt: Date,
    releasedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const RFIDCard: Model<IRFIDCard> =
  mongoose.models.RFIDCard || mongoose.model<IRFIDCard>('RFIDCard', rfidCardSchema);
