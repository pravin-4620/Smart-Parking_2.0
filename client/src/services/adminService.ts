import { apiClient } from './api.js';

export const adminService = {
  getDashboard: async () => {
    const res = await apiClient.get('/admin/dashboard');
    return res.data.data;
  },

  getUsers: async () => {
    const res = await apiClient.get('/admin/users');
    return res.data.data;
  },

  updateUserRole: async (userId: string, role: string) => {
    const res = await apiClient.patch(`/admin/users/${userId}/role`, { role });
    return res.data.data;
  },

  getManagers: async () => {
    const res = await apiClient.get('/admin/managers');
    return res.data.data;
  },

  createManager: async (data: { name: string; email: string; phone?: string; password: string; parkingLocationId?: string }) => {
    const res = await apiClient.post('/admin/managers', data);
    return res.data.data;
  },

  assignManager: async (userId: string, parkingLocationId: string) => {
    const res = await apiClient.put(`/admin/managers/${userId}/assignment`, { parkingLocationId });
    return res.data.data;
  },

  getParking: async () => {
    const res = await apiClient.get('/admin/parking');
    return res.data.data;
  },

  createParking: async (data: Record<string, unknown>) => {
    const res = await apiClient.post('/admin/parking', data);
    return res.data.data;
  },

  updateParking: async (id: string, data: Record<string, unknown>) => {
    const res = await apiClient.patch(`/admin/parking/${id}`, data);
    return res.data.data;
  },

  getDevices: async () => {
    const res = await apiClient.get('/admin/devices');
    return res.data.data;
  },

  getPayments: async () => {
    const res = await apiClient.get('/admin/payments');
    return res.data.data;
  },
  getFines: async () => {
    const res = await apiClient.get('/admin/fines');
    return res.data.data;
  },

  getAnalytics: async () => {
    const res = await apiClient.get('/admin/analytics');
    return res.data.data;
  },

  getAuditLogs: async () => {
    const res = await apiClient.get('/admin/audit');
    return res.data.data;
  },

  getSlots: async (parkingLocationId?: string) => {
    const res = await apiClient.get('/manager/slots', { params: { parkingLocationId } });
    return res.data.data;
  },

  getParkingLocations: async () => {
    const res = await apiClient.get('/admin/parking');
    return res.data.data;
  },

  cancelReservation: async (reservationId: string) => {
    const res = await apiClient.patch(`/manager/reservations/${reservationId}/cancel`);
    return res.data.data;
  },
};

