import axios from 'axios';
import { Entry, EntryFormData } from '@/types';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; username: string }>('/auth/login', { username, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const entriesApi = {
  list: (params?: { search?: string; category?: string; criticality?: string }) =>
    api.get<Entry[]>('/entries', { params }),
  get: (id: number) => api.get<Entry>(`/entries/${id}`),
  create: (data: EntryFormData) => api.post<Entry>('/entries', data),
  update: (id: number, data: EntryFormData) => api.put<Entry>(`/entries/${id}`, data),
  delete: (id: number) => api.delete(`/entries/${id}`),
  export: () => api.get<Entry[]>('/entries/export'),
};

export default api;
