import apiClient from './client';

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  name: string;
  phone?: string;
  remark?: string;
}

export const customersApi = {
  getList: (params?: { page?: number; pageSize?: number; keyword?: string }) =>
    apiClient.get('/crm/customers', { params }),

  getById: (id: number) =>
    apiClient.get(`/crm/customers/${id}`),

  create: (data: CreateCustomerDto) =>
    apiClient.post('/crm/customers', data),

  update: (id: number, data: Partial<CreateCustomerDto>) =>
    apiClient.put(`/crm/customers/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/crm/customers/${id}`),
};
