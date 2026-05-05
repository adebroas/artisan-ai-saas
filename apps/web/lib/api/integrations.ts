import { apiClient } from './client';
import { Integration, IntegrationType, IntegrationStatus } from '@/types';

export const integrationsApi = {
  findAll: async (businessId: string) => {
    const { data } = await apiClient.get<Integration[]>(
      `/businesses/${businessId}/integrations`,
    );
    return data;
  },

  upsert: async (
    businessId: string,
    payload: { type: IntegrationType; status?: IntegrationStatus; label?: string; config?: Record<string, any> },
  ) => {
    const { data } = await apiClient.post<Integration>(
      `/businesses/${businessId}/integrations`,
      payload,
    );
    return data;
  },

  toggle: async (businessId: string, id: string) => {
    const { data } = await apiClient.put<Integration>(
      `/businesses/${businessId}/integrations/${id}/toggle`,
    );
    return data;
  },

  remove: async (businessId: string, id: string) => {
    await apiClient.delete(`/businesses/${businessId}/integrations/${id}`);
  },
};