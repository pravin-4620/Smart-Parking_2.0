import { HealthCheckResponse } from '@smart-parking/shared';
import { apiClient } from './api';

export const fetchHealthStatus = async (): Promise<HealthCheckResponse> => {
  const response = await apiClient.get<HealthCheckResponse>('/health');
  return response.data;
};
