import { Types } from 'mongoose';
import { IPredictionEngine } from './predictionEngine.interface.js';
import { BaselinePredictionService } from './baselinePrediction.service.js';
import { FutureMLPredictionService } from './futureMLPrediction.service.js';
import { Prediction } from '../../models/prediction.model.js';
import { emitPredictionUpdated } from '../../sockets/index.js';
import { ParkingPredictionResult } from '@smart-parking/shared';

export class PredictionService {
  private static baselineEngine: IPredictionEngine = new BaselinePredictionService();
  private static mlEngine: IPredictionEngine = new FutureMLPredictionService();

  static getEngine(engineType: 'baseline' | 'ml' = 'baseline'): IPredictionEngine {
    return engineType === 'ml' ? this.mlEngine : this.baselineEngine;
  }

  static async getOccupancyPrediction(
    parkingLocationId: string,
    horizonHours: number = 12,
    engineType: 'baseline' | 'ml' = 'baseline'
  ): Promise<ParkingPredictionResult> {
    const engine = this.getEngine(engineType);
    const predictionResult = await engine.predictOccupancy(parkingLocationId, horizonHours);

    // Persist predictions to MongoDB Prediction collection for historical tracking & evaluation
    try {
      const locationObjId = new Types.ObjectId(parkingLocationId);
      const docsToInsert = predictionResult.predictions.map((p) => ({
        parkingLocationId: locationObjId,
        timestamp: new Date(p.time),
        horizon: horizonHours,
        predictedOccupancy: p.predictedOccupancyPercentage,
        predictedAvailableSlots: p.predictedAvailableSlots,
        confidence: p.confidenceScore,
        modelVersion: predictionResult.modelVersion,
      }));

      await Prediction.insertMany(docsToInsert);
    } catch (err) {
      // Non-blocking error logging
      console.error('Failed to log prediction snapshot to MongoDB:', err);
    }

    // Broadcast real-time Socket.IO prediction update
    emitPredictionUpdated(predictionResult);

    return predictionResult;
  }
}
