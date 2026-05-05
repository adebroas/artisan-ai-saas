import { apiClient } from './client';
import { CallSession, PaginatedResponse } from '@/types';

export const callsApi = {
  findAll: async (
    businessId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      urgencyLevel?: string;
      from?: string;
      to?: string;
    },
  ) => {
    const { data } = await apiClient.get<PaginatedResponse<CallSession>>(
      `/businesses/${businessId}/calls`,
      { params },
    );
    return data;
  },

  findOne: async (businessId: string, id: string) => {
    const { data } = await apiClient.get<CallSession>(
      `/businesses/${businessId}/calls/${id}`,
    );
    return data;
  },
};