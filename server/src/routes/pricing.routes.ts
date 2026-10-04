import { Router } from 'express';
import { handleCalculatePricing } from '../controllers/pricing.controller.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { calculatePricingSchema } from '@smart-parking/shared';

const router = Router();

router.post(
  '/pricing/calculate',
  validateRequest(calculatePricingSchema),
  handleCalculatePricing
);

export default router;

