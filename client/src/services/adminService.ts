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

  assignManager: async (userId: string, parkingLocationId: string) => {
    const res = await apiClient.post('/admin/managers/assign', { userId, parkingLocationId });
    return res.data.data;
  },

  getPayments: async () => {
    const res = await apiClient.get('/admin/payments');
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
};

