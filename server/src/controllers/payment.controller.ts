import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PaymentService } from '../services/payment.service.js';
import { CreatePaymentOrderInput, VerifyPaymentInput } from '@smart-parking/shared';

export const createPaymentOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input = req.body as CreatePaymentOrderInput;
    const order = await PaymentService.createOrder(input, req.user.id);

    res.status(201).json({
      message: 'Razorpay payment order created successfully',
      data: order,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: 'Payment order creation failed',
      message: error.message,
    });
  }
};

export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const input = req.body as VerifyPaymentInput;
    const receipt = await PaymentService.verifyPayment(input, req.user.id);

    res.status(200).json({
      message: 'Payment verified and reservation confirmed successfully',
      data: receipt,
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: 'Payment verification failed',
      message: error.message,
    });
  }
};

export const getPaymentReceipt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const receipt = await PaymentService.getPaymentReceipt(req.params.id, req.user.id);

    res.status(200).json({ data: receipt });
  } catch (error: any) {
    const statusCode = error.statusCode || 404;
    res.status(statusCode).json({
      error: 'Failed to fetch payment receipt',
      message: error.message,
    });
  }
};

export const handleWebhook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const result = await PaymentService.handleWebhook(req.body, signature);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message,
    });
  }
};
