import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getParkingSessions } from '../controllers/session.controller.js';

const router = Router();

router.get('/parking-sessions', authenticate, getParkingSessions);

export default router;
