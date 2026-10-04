import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPrediction extends Document {
  parkingLocationId: Types.ObjectId;
  timestamp: Date;
  horizon: number; // e.g. 15, 30, 60 minutes
  predictedOccupancy: number; // percentage 0 - 100
  predictedAvailableSlots: number;
  confidence: number; // 0 - 1
  modelVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const predictionSchema = new Schema<IPrediction>(
  {
    parkingLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'ParkingLocation',
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    horizon: {
      type: Number,
      required: true,
    },
    predictedOccupancy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    predictedAvailableSlots: {
      type: Number,
      required: true,
      min: 0,
    },
    confidence: {
      type: Number,
      default: 0.85,
      min: 0,
      max: 1,
    },
    modelVersion: {
      type: String,
      default: 'v1.0.0',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

predictionSchema.index({ parkingLocationId: 1, timestamp: -1, horizon: 1 });

export const Prediction: Model<IPrediction> =
  mongoose.models.Prediction || mongoose.model<IPrediction>('Prediction', predictionSchema);
