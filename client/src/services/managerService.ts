import { apiClient } from './api.js';

export const managerService = {
  getDashboard: async () => {
    const res = await apiClient.get('/manager/dashboard');
    return res.data.data;
  },

  getAssignedParking: async () => {
    const res = await apiClient.get('/manager/parking');
    return res.data.data;
  },

  getSlots: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/slots', { params: { parkingLocationId } });
    return res.data.data;
  },

  createSlot: async (data: any) => {
    const res = await apiClient.post('/manager/slots', data);
    return res.data.data;
  },

  updateSlotStatus: async (slotId: string, status: string) => {
    const res = await apiClient.patch(`/manager/slots/${slotId}`, { status });
    return res.data.data;
  },

  getReservations: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/reservations', { params: { parkingLocationId } });
    return res.data.data;
  },

  getSessions: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/sessions', { params: { parkingLocationId } });
    return res.data.data;
  },

  getDevices: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/devices', { params: { parkingLocationId } });
    return res.data.data;
  },

  getPricing: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/pricing', { params: { parkingLocationId } });
    return res.data.data;
  },

  getAnalytics: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/analytics', { params: { parkingLocationId } });
    return res.data.data;
  },

  getReport: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/reports', { params: { parkingLocationId } });
    return res.data.data;
  },
};

