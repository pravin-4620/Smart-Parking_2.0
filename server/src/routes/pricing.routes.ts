import { Router } from 'express';
import {
  handleCalculatePricing,
  handleGetPricingForLocation,
  handleUpdatePricingForLocation,
} from '../controllers/pricing.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { calculatePricingSchema, UserRole } from '@smart-parking/shared';

const router = Router();

router.post(
  '/pricing/calculate',
  validateRequest(calculatePricingSchema),
  handleCalculatePricing
);

router.get(
  '/pricing/location/:parkingLocationId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER),
  handleGetPricingForLocation
);

router.put(
  '/pricing/location/:parkingLocationId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER),
  handleUpdatePricingForLocation
);

export default router;
