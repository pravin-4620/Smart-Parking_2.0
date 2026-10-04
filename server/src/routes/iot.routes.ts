import { Router } from 'express';
import { IoTController } from '../controllers/iot.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { UserRole } from '@smart-parking/shared';

const router = Router();

// REST Telemetry ingestion endpoint for hardware or local bridge
router.post('/telemetry', IoTController.processTelemetry);

// Publish endpoint for Admin/Simulator UI
router.post('/publish', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), IoTController.publishTelemetry);

// List IoT Devices
router.get('/devices', authenticate, authorize(UserRole.ADMIN, UserRole.PARKING_MANAGER), IoTController.listDevices);

export const iotRouter = router;

