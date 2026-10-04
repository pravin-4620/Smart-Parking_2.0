import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { PaymentStatus } from '@smart-parking/shared';

export interface IPaymentTransaction extends Document {
  userId: Types.ObjectId;
  reservationId: Types.ObjectId;
  gateway: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      required: true,
      index: true,
    },
    gateway: {
      type: String,
      default: 'RAZORPAY_SANDBOX',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentTransaction: Model<IPaymentTransaction> =
  mongoose.models.PaymentTransaction || mongoose.model<IPaymentTransaction>('PaymentTransaction', paymentTransactionSchema);
