import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ParkingSession } from '../models/parkingSession.model.js';
import { Types } from 'mongoose';
import { OverstayFine } from '../models/overstayFine.model.js';

export const getParkingSessions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const sessions = await ParkingSession.find({ userId: new Types.ObjectId(userId) })
      .populate('parkingLocationId', 'name address city')
      .populate('slotId', 'slotNumber slotType')
      .sort({ checkInTime: -1 }).lean();

    const fines = await OverstayFine.find({ sessionId: { $in: sessions.map((session) => session._id) } }).lean();
    const fineBySession = new Map(fines.map((fine) => [fine.sessionId.toString(), fine]));

    res.status(200).json({ data: sessions.map((session) => ({ ...session, fine: fineBySession.get(session._id.toString()) || null })) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch parking sessions', message: err.message });
  }
};
