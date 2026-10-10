import { apiClient } from './api.js';

export const iotService = {
  async listDevices() {
    const response = await apiClient.get('/iot/devices');
    return response.data.data;
  },

  async getDevices() {
    return this.listDevices();
  },
};
