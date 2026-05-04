import apiClient from './client';

export interface Product {
  id: number;
  name: string;
  code?: string;
  category?: string;
  unit?: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  code?: string;
  category?: string;
  unit?: string;
  price?: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  remark?: string;
}

export const productsApi = {
  getList: (params?: { page?: number; pageSize?: number; category?: string }) =>
    apiClient.get('/inventory/products', { params }),

  getById: (id: number) =>
    apiClient.get(`/inventory/products/${id}`),

  create: (data: CreateProductDto) =>
    apiClient.post('/inventory/products', data),

  update: (id: number, data: Partial<CreateProductDto>) =>
    apiClient.put(`/inventory/products/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/inventory/products/${id}`),

  getAlerts: () =>
    apiClient.get('/inventory/alerts'),
};
