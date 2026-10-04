import { Router, Response } from 'express';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRole } from '@smart-parking/shared';
import { ParkingLocation } from '../models/parkingLocation.model.js';

const router = Router();

router.get('/manager/dashboard', authenticate, authorize(UserRole.PARKING_MANAGER, UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    data: {
      occupancyRate: 72.5,
      activeReservations: 14,
      deviceHealth: 'ONLINE',
    },
  });
});

router.get('/manager/parking', authenticate, authorize(UserRole.PARKING_MANAGER, UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  const locations = await ParkingLocation.find();
  res.status(200).json({ data: locations });
});

export default router;

