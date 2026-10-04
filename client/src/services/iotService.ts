import { apiClient } from './api.js';

export const iotService = {
  async publishTelemetry(payload: any) {
    const response = await apiClient.post('/iot/publish', payload);
    return response.data;
  },

  async sendDirectTelemetry(payload: any) {
    const response = await apiClient.post('/iot/telemetry', payload);
    return response.data;
  },

  async listDevices() {
    const response = await apiClient.get('/iot/devices');
    return response.data.data;
  },

  async getDevices() {
    return this.listDevices();
  },
};
