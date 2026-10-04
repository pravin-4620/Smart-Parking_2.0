import crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { seedDatabase } from '../utils/seed.js';
import { ParkingLocation } from '../models/parkingLocation.model.js';
import { ParkingSlot } from '../models/parkingSlot.model.js';
import { Reservation } from '../models/reservation.model.js';
import { PaymentTransaction } from '../models/paymentTransaction.model.js';
import { SlotType, ReservationStatus, PaymentStatus, SlotStatus } from '@smart-parking/shared';

const app = createApp();
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'mocksecret123';

describe('Phase 7: Razorpay Sandbox Payment Integration Tests', () => {
  let userToken: string;
  let parkingLocationId: string;
  let targetSlotId: string;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_parking_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await seedDatabase();

    const location = await ParkingLocation.findOne({ name: 'Central Mall Smart Parking' });
    expect(location).toBeDefined();
    parkingLocationId = location!._id.toString();

    const slot = await ParkingSlot.findOne({
      parkingLocationId: location!._id,
      slotType: SlotType.REGULAR,
    });
    expect(slot).toBeDefined();
    targetSlotId = slot!._id.toString();

    const userRes = await request(app).post('/api/auth/login').send({
      email: 'user@smartpark.com',
      password: 'password123',
    });
    expect(userRes.status).toBe(200);
    userToken = userRes.body.accessToken;
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('1. Create Razorpay Payment Order for pending reservation', async () => {
    // Step A: Create Pending Reservation
    const startTime = '2026-11-01T10:00:00.000Z';
    const endTime = '2026-11-01T12:00:00.000Z';

    const reservRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    expect(reservRes.status).toBe(201);
    const reservationId = reservRes.body.data._id;
    const totalAmountINR = reservRes.body.data.pricingSnapshot.totalAmount;

    // Step B: Create Payment Order
    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reservationId });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.orderId).toBeDefined();
    expect(orderRes.body.data.amount).toBe(Math.round(totalAmountINR * 100)); // in paise
    expect(orderRes.body.data.currency).toBe('INR');
  });

  it('2. Verify Razorpay Payment Signature and transition states', async () => {
    // Create reservation and payment order
    const startTime = '2026-11-02T10:00:00.000Z';
    const endTime = '2026-11-02T12:00:00.000Z';

    const reservRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    const reservationId = reservRes.body.data._id;

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reservationId });

    const razorpayOrderId = orderRes.body.data.orderId;
    const razorpayPaymentId = `pay_test_${Date.now()}`;

    // Compute HMAC SHA256 Signature
    const razorpaySignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // Verify Payment
    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reservationId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe(PaymentStatus.COMPLETED);
    expect(verifyRes.body.data.receiptId).toBeDefined();

    // Verify database mutations
    const updatedReservation = await Reservation.findById(reservationId);
    expect(updatedReservation!.status).toBe(ReservationStatus.CONFIRMED);

    const updatedSlot = await ParkingSlot.findById(targetSlotId);
    expect(updatedSlot!.status).toBe(SlotStatus.RESERVED);
  });

  it('3. Reject invalid Razorpay payment signature', async () => {
    const startTime = '2026-11-03T10:00:00.000Z';
    const endTime = '2026-11-03T12:00:00.000Z';

    const reservRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    const reservationId = reservRes.body.data._id;

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reservationId });

    const razorpayOrderId = orderRes.body.data.orderId;
    const razorpayPaymentId = `pay_test_${Date.now()}`;
    const invalidSignature = 'corrupted_forged_signature_hex';

    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reservationId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: invalidSignature,
      });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error).toBe('Payment verification failed');

    const updatedReservation = await Reservation.findById(reservationId);
    expect(updatedReservation!.status).toBe(ReservationStatus.PAYMENT_FAILED);
  });

  it('4. Idempotency protection: Duplicate payment callback returns clean response', async () => {
    const startTime = '2026-11-04T10:00:00.000Z';
    const endTime = '2026-11-04T12:00:00.000Z';

    const reservRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    const reservationId = reservRes.body.data._id;

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reservationId });

    const razorpayOrderId = orderRes.body.data.orderId;
    const razorpayPaymentId = `pay_test_${Date.now()}`;
    const razorpaySignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // First Verification Call
    const firstRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reservationId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
    expect(firstRes.status).toBe(200);

    // Duplicate Verification Call (Identical payload)
    const secondRes = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        reservationId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.receiptId).toBe(firstRes.body.data.receiptId);
  });

  it('5. Guard: Reject payment attempt on expired reservation', async () => {
    const startTime = '2026-11-05T10:00:00.000Z';
    const endTime = '2026-11-05T12:00:00.000Z';

    const reservRes = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        parkingLocationId,
        slotId: targetSlotId,
        startTime,
        endTime,
      });

    const reservationId = reservRes.body.data._id;

    // Mutate reservation to EXPIRED
    await Reservation.updateOne(
      { _id: reservationId },
      { $set: { status: ReservationStatus.EXPIRED } }
    );

    const orderRes = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ reservationId });

    expect(orderRes.status).toBe(400);
  });

  it('6. Process Razorpay Webhook Event (payment.captured)', async () => {
    const webhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_test',
            order_id: 'order_webhook_test',
            amount: 12000,
            status: 'captured',
          },
        },
      },
    };

    const webhookRes = await request(app)
      .post('/api/payments/webhook')
      .set('x-razorpay-signature', 'mock_webhook_signature')
      .send(webhookPayload);

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.status).toBe('ok');
  });
});
