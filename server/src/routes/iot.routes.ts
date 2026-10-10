import { Router } from 'express';
import { IoTController } from '../controllers/iot.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { UserRole } from '@smart-parking/shared';

const router = Router();

// List IoT Devices
router.get('/devices', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), IoTController.listDevices);

export const iotRouter = router;
