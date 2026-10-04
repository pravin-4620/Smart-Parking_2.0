import { ParkingPredictionResult } from '@smart-parking/shared';

export interface IPredictionEngine {
  readonly modelVersion: string;
  readonly modelType: 'BASELINE' | 'ML_FUTURE';

  predictOccupancy(
    parkingLocationId: string,
    horizonHours?: number
  ): Promise<ParkingPredictionResult>;
}
