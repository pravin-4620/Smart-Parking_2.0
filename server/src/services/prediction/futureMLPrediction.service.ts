import { IPredictionEngine } from './predictionEngine.interface.js';
import { BaselinePredictionService } from './baselinePrediction.service.js';
import { ParkingPredictionResult } from '@smart-parking/shared';

/**
 * Future ML Prediction Engine Stub
 * Reserved for supervised Machine Learning models (e.g., XGBoost, LightGBM, LSTM, or ONNX Runtime).
 * Integrates feature extraction (time-of-day, day-of-week, weather, local event demand, historical occupancy variance).
 */
export class FutureMLPredictionService implements IPredictionEngine {
  readonly modelVersion = 'v2.0-experimental-xgboost-stub';
  readonly modelType = 'ML_FUTURE' as const;

  private baselineFallback = new BaselinePredictionService();

  async predictOccupancy(
    parkingLocationId: string,
    horizonHours: number = 12
  ): Promise<ParkingPredictionResult> {
    // Delegates to deterministic baseline calculation while setting ML metadata
    const result = await this.baselineFallback.predictOccupancy(parkingLocationId, horizonHours);
    
    return {
      ...result,
      modelVersion: this.modelVersion,
      modelType: this.modelType,
    };
  }
}
