import { apiClient } from './client';
import { DashboardStats, RecentActivity } from '@/types';

export const dashboardApi = {
  getStats: async (businessId: string) => {
    const { data } = await apiClient.get<DashboardStats>(
      `/businesses/${businessId}/dashboard/stats`,
    );
    return data;
  },

  getActivity: async (businessId: string) => {
    const { data } = await apiClient.get<RecentActivity>(
      `/businesses/${businessId}/dashboard/activity`,
    );
    return data;
  },
};