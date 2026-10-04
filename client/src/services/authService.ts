import { apiClient } from './api';
import {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateProfileInput,
  ChangePasswordInput,
  AuthResponse,
} from '@smart-parking/shared';

export const loginApi = async (data: LoginInput): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const registerApi = async (data: RegisterInput): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const forgotPasswordApi = async (data: ForgotPasswordInput): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/auth/forgot-password', data);
  return response.data;
};

export const resetPasswordApi = async (data: ResetPasswordInput): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/auth/reset-password', data);
  return response.data;
};

export const getMeApi = async (): Promise<{ user: AuthResponse['user'] }> => {
  const response = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me');
  return response.data;
};

export const updateProfileApi = async (data: UpdateProfileInput): Promise<{ user: AuthResponse['user']; message: string }> => {
  const response = await apiClient.patch<{ user: AuthResponse['user']; message: string }>('/users/profile', data);
  return response.data;
};

export const changePasswordApi = async (data: ChangePasswordInput): Promise<{ message: string }> => {
  const response = await apiClient.patch<{ message: string }>('/users/password', data);
  return response.data;
};

export const logoutApi = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};
