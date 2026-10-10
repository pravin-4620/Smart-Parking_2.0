import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { UserRole } from '@smart-parking/shared';
import { RFIDCard } from '../models/rfidCard.model.js';
import { RFIDInventoryService } from '../services/rfidInventory.service.js';
import { getRFIDCards, createRFIDCard, deleteRFIDCard, processRFIDTap } from '../controllers/rfid.controller.js';

const router = Router();

router.get('/rfid-cards', authenticate, getRFIDCards);
router.post('/rfid-cards', authenticate, createRFIDCard);
router.delete('/rfid-cards/:id', authenticate, deleteRFIDCard);
router.post('/rfid/tap', processRFIDTap);
router.get('/admin/rfid-inventory', authenticate, authorize(UserRole.ADMIN), async (_req, res) => {
  res.json({ data: await RFIDCard.find().populate('userId', 'name email').populate('vehicleId', 'licensePlate').sort({ createdAt: 1 }) });
});
router.post('/admin/rfid-inventory', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  const uid = String(req.body.uid || '').trim().toUpperCase();
  if (!/^(?:[0-9A-F]{2}:){3,9}[0-9A-F]{2}$/.test(uid)) return res.status(400).json({ error: 'A colon-separated physical RFID UID is required' });
  try {
    const card = await RFIDCard.create({ uid, isActive: true });
    res.status(201).json({ data: card });
  } catch (error: any) {
    res.status(409).json({ error: 'RFID UID already exists in inventory', message: error.message });
  }
});
router.post('/admin/rfid-inventory/:id/release', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
  const card = await RFIDInventoryService.release(req.params.id);
  if (!card) return res.status(404).json({ error: 'RFID card not found' });
  res.json({ data: card });
});

export default router;
