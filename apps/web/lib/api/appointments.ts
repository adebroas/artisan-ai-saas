import { apiClient } from './client';
import { Appointment, PaginatedResponse } from '@/types';

export const appointmentsApi = {
  findAll: async (
    businessId: string,
    params?: { page?: number; limit?: number; status?: string; from?: string; to?: string },
  ) => {
    const { data } = await apiClient.get<PaginatedResponse<Appointment>>(
      `/businesses/${businessId}/appointments`,
      { params },
    );
    return data;
  },

  findOne: async (businessId: string, id: string) => {
    const { data } = await apiClient.get<Appointment>(
      `/businesses/${businessId}/appointments/${id}`,
    );
    return data;
  },

  create: async (businessId: string, payload: Partial<Appointment>) => {
    const { data } = await apiClient.post<Appointment>(
      `/businesses/${businessId}/appointments`,
      payload,
    );
    return data;
  },

  update: async (businessId: string, id: string, payload: Partial<Appointment>) => {
    const { data } = await apiClient.put<Appointment>(
      `/businesses/${businessId}/appointments/${id}`,
      payload,
    );
    return data;
  },
};