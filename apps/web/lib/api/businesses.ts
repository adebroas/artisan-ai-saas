import { apiClient } from './client';
import { Business, PaginatedResponse } from '@/types';

export const businessesApi = {
  findAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get<PaginatedResponse<Business>>('/businesses', { params });
    return data;
  },

  findOne: async (id: string) => {
    const { data } = await apiClient.get<Business>(`/businesses/${id}`);
    return data;
  },

  create: async (payload: Partial<Business>) => {
    const { data } = await apiClient.post<Business>('/businesses', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Business>) => {
    const { data } = await apiClient.put<Business>(`/businesses/${id}`, payload);
    return data;
  },
};