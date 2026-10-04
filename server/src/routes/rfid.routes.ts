import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getRFIDCards, createRFIDCard, deleteRFIDCard, processRFIDTap } from '../controllers/rfid.controller.js';

const router = Router();

router.get('/rfid-cards', authenticate, getRFIDCards);
router.post('/rfid-cards', authenticate, createRFIDCard);
router.delete('/rfid-cards/:id', authenticate, deleteRFIDCard);
router.post('/rfid/tap', processRFIDTap);

export default router;
