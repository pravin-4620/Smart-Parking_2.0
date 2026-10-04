import { Router } from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentReceipt,
  handleWebhook,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createPaymentOrderSchema, verifyPaymentSchema } from '@smart-parking/shared';

const router = Router();

router.post(
  '/payments/create-order',
  authenticate,
  validateRequest(createPaymentOrderSchema),
  createPaymentOrder
);

router.post(
  '/payments/verify',
  authenticate,
  validateRequest(verifyPaymentSchema),
  verifyPayment
);

router.get('/payments/:id', authenticate, getPaymentReceipt);

router.post('/payments/webhook', handleWebhook);

export default router;
