import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { Types } from 'mongoose';

export const getParkingSessions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const sessions = await ParkingSession.find({ userId: new Types.ObjectId(userId) })
      .populate('parkingLocationId', 'name address city')
      .populate('slotId', 'slotNumber slotType')
      .sort({ checkInTime: -1 });

    res.status(200).json({ data: sessions });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch parking sessions', message: err.message });
  }
};
