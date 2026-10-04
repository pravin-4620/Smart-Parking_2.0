import { Router } from 'express';
import { getParkingPrediction } from '../controllers/prediction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/predictions/:parkingId
router.get('/predictions/:parkingId', authenticate, getParkingPrediction);

export default router;
