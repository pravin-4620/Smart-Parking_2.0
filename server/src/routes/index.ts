import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import adminRoutes from './admin.routes.js';
import parkingRoutes from './parking.routes.js';
import pricingRoutes from './pricing.routes.js';
import reservationRoutes from './reservation.routes.js';
import paymentRoutes from './payment.routes.js';
import vehicleRoutes from './vehicle.routes.js';
import rfidRoutes from './rfid.routes.js';
import notificationRoutes from './notification.routes.js';
import sessionRoutes from './session.routes.js';
import predictionRoutes from './prediction.routes.js';
import { iotRouter } from './iot.routes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/', adminRoutes);
router.use('/', parkingRoutes);
router.use('/', pricingRoutes);
router.use('/', reservationRoutes);
router.use('/', paymentRoutes);
router.use('/', vehicleRoutes);
router.use('/', rfidRoutes);
router.use('/', notificationRoutes);
router.use('/', sessionRoutes);
router.use('/', predictionRoutes);
router.use('/iot', iotRouter);

export default router;
