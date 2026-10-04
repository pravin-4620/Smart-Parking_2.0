import { Router } from 'express';
import { updateProfile, changePassword } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { updateProfileSchema, changePasswordSchema } from '@smart-parking/shared';

const router = Router();

router.patch('/profile', authenticate, validateRequest(updateProfileSchema), updateProfile);
router.patch('/password', authenticate, validateRequest(changePasswordSchema), changePassword);

export default router;
