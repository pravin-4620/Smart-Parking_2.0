import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getNotifications, markNotificationRead } from '../controllers/notification.controller.js';

const router = Router();

router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markNotificationRead);

export default router;
