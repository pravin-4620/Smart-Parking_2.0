import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { RFIDCard } from '../models/rfidCard.model.js';
import { Types } from 'mongoose';
import { RFIDService } from '../services/rfid.service.js';

export const getRFIDCards = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const cards = await RFIDCard.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
    res.status(200).json({ data: cards });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch RFID cards', message: err.message });
  }
};

export const createRFIDCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const uid = String(req.body.uid || req.body.cardNumber || '').trim().toUpperCase();
    if (uid.length < 4) {
      return res.status(400).json({ error: 'RFID UID must be at least 4 characters' });
    }

    const card = await RFIDCard.create({
      userId: new Types.ObjectId(userId),
      uid,
      isActive: true,
    });

    res.status(201).json({ message: 'RFID Card linked successfully', data: card });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to link RFID card', message: err.message });
  }
};

export const processRFIDTap = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await RFIDService.processRFIDTap(req.body);
    res.status(result.allowed ? 200 : 403).json({ data: result });
  } catch (err: unknown) {
    res.status(400).json({
      error: 'RFID event processing failed',
      message: err instanceof Error ? err.message : 'Unknown RFID error',
    });
  }
};

export const deleteRFIDCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const card = await RFIDCard.findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) });
    if (!card) {
      return res.status(404).json({ error: 'RFID card not found' });
    }

    res.status(200).json({ message: 'RFID Card unlinked successfully' });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to unlink RFID card', message: err.message });
  }
};
