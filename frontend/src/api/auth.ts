import api from './client';
import { LoginRequest, LoginResponse } from './types';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),

  adminLogin: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/admin/login', data),

  check: () =>
    api.get<{ valid: boolean; is_admin: boolean }>('/auth/check'),

  logout: () =>
    api.post('/auth/logout'),
};
