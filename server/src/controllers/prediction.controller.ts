import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { PredictionService } from '../services/prediction/prediction.service.js';

export const getParkingPrediction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { parkingId } = req.params;
    const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 12;
    const engine = (req.query.engine as 'baseline' | 'ml') || 'baseline';

    if (!parkingId) {
      res.status(400).json({ error: 'Missing parking location ID parameter' });
      return;
    }

    const prediction = await PredictionService.getOccupancyPrediction(
      parkingId,
      isNaN(hours) ? 12 : hours,
      engine
    );

    res.status(200).json({
      status: 'success',
      data: prediction,
    });
  } catch (error: any) {
    if (error.message && error.message.includes('not found')) {
      res.status(404).json({ error: 'Not Found', message: error.message });
      return;
    }
    next(error);
  }
};
