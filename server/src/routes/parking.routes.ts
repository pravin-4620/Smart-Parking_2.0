import { Router } from 'express';
import {
  getNearbyParking,
  getAllParkingLocations,
  getParkingLocationDetails,
  handleCreateParkingLocation,
  handleUpdateParkingLocation,
  handleDeleteParkingLocation,
  handleGetSlots,
  handleCreateSlot,
  handleBatchCreateSlots,
  handleUpdateSlot,
} from '../controllers/parking.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import {
  createParkingLocationSchema,
  updateParkingLocationSchema,
  createParkingSlotSchema,
  createBatchParkingSlotsSchema,
  updateParkingSlotSchema,
  UserRole,
} from '@smart-parking/shared';

const router = Router();

// Nearby geolocation endpoint
router.get('/parking/nearby', getNearbyParking);

// Parking location management
router.get('/parking-locations', getAllParkingLocations);
router.get('/parking-locations/:id', getParkingLocationDetails);

router.post(
  '/parking-locations',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest(createParkingLocationSchema),
  handleCreateParkingLocation
);

router.patch(
  '/parking-locations/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER),
  validateRequest(updateParkingLocationSchema),
  handleUpdateParkingLocation
);

router.delete(
  '/parking-locations/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  handleDeleteParkingLocation
);

// Parking Slot management
router.get('/parking-locations/:locationId/slots', handleGetSlots);

router.post(
  '/parking-locations/:locationId/slots',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER),
  validateRequest(createParkingSlotSchema),
  handleCreateSlot
);

router.post(
  '/parking-locations/:locationId/slots/batch',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER),
  validateRequest(createBatchParkingSlotsSchema),
  handleBatchCreateSlots
);

router.patch(
  '/parking-slots/:slotId',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER),
  validateRequest(updateParkingSlotSchema),
  handleUpdateSlot
);

export default router;
