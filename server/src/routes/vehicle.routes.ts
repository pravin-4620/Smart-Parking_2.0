import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from '../controllers/vehicle.controller.js';

const router = Router();

router.get('/vehicles', authenticate, getVehicles);
router.post('/vehicles', authenticate, createVehicle);
router.patch('/vehicles/:id', authenticate, updateVehicle);
router.delete('/vehicles/:id', authenticate, deleteVehicle);

export default router;
