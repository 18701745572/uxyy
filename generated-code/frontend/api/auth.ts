import apiClient from './client';

export interface LoginDto {
  phone: string;
  password: string;
}

export interface RegisterDto {
  phone: string;
  password: string;
  nickname?: string;
  enterpriseName?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: number;
    phone: string;
    nickname?: string;
  };
  enterprise: {
    id: number;
  } | null;
}

export const authApi = {
  login: (data: LoginDto) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterDto) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  refreshToken: (refreshToken: string) =>
    apiClient.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken }),

  getProfile: () =>
    apiClient.get('/auth/profile'),

  switchEnterprise: (enterpriseId: number) =>
    apiClient.put(`/auth/switch-enterprise/${enterpriseId}`, {}),
};
