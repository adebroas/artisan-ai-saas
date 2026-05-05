import { apiClient } from './client';
import { Customer, PaginatedResponse } from '@/types';

export const customersApi = {
  findAll: async (businessId: string, params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get<PaginatedResponse<Customer>>(
      `/businesses/${businessId}/customers`,
      { params },
    );
    return data;
  },

  findOne: async (businessId: string, id: string) => {
    const { data } = await apiClient.get<Customer>(
      `/businesses/${businessId}/customers/${id}`,
    );
    return data;
  },

  create: async (businessId: string, payload: Partial<Customer>) => {
    const { data } = await apiClient.post<Customer>(
      `/businesses/${businessId}/customers`,
      payload,
    );
    return data;
  },

  update: async (businessId: string, id: string, payload: Partial<Customer>) => {
    const { data } = await apiClient.put<Customer>(
      `/businesses/${businessId}/customers/${id}`,
      payload,
    );
    return data;
  },

  remove: async (businessId: string, id: string) => {
    await apiClient.delete(`/businesses/${businessId}/customers/${id}`);
  },
};