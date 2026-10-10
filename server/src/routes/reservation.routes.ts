import { Router } from 'express';
import {
  createReservation,
  getReservationById,
  listReservations,
  cancelReservation,
} from '../controllers/reservation.controller.js';
import { handleAutoAllocateSlot } from '../controllers/allocation.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { createReservationSchema, autoAllocateSlotSchema, UserRole } from '@smart-parking/shared';

const router = Router();

router.post(
  '/reservations',
  authenticate,
  authorize(UserRole.USER),
  validateRequest(createReservationSchema),
  createReservation
);

router.get('/reservations', authenticate, listReservations);

router.get('/reservations/:id', authenticate, getReservationById);

router.patch('/reservations/:id/cancel', authenticate, cancelReservation);

router.post(
  '/allocation',
  authenticate,
  authorize(UserRole.USER),
  validateRequest(autoAllocateSlotSchema),
  handleAutoAllocateSlot
);

export default router;
