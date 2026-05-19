import axios from 'axios';
import { Entry, EntryFormData, Employee, Allocation, AssetRequest, AuditLog } from '@/types';

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

export const employeesApi = {
  list: (params?: { search?: string; status?: string; department?: string }) =>
    api.get<Employee[]>('/employees', { params }),
  create: (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'allocations'>) =>
    api.post<Employee>('/employees', data),
  update: (id: number, data: Partial<Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'allocations'>>) =>
    api.put<Employee>(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
};

export const allocationsApi = {
  list: (params?: { status?: string; employeeId?: number; assetId?: number }) =>
    api.get<Allocation[]>('/allocations', { params }),
  create: (data: { assetId: number; employeeId: number; notes?: string; allocatedAt?: string }) =>
    api.post<Allocation>('/allocations', data),
  return: (id: number, data?: { returnNotes?: string }) =>
    api.put<Allocation>(`/allocations/${id}/return`, data || {}),
};

export const requestsApi = {
  list: (params?: { status?: string; requestType?: string }) =>
    api.get<AssetRequest[]>('/requests', { params }),
  create: (data: { requestType: string; requestedBy: string; description: string; priority?: string; assetId?: number }) =>
    api.post<AssetRequest>('/requests', data),
  approve: (id: number, data?: { approvedBy?: string; comments?: string }) =>
    api.put<AssetRequest>(`/requests/${id}/approve`, data || {}),
  reject: (id: number, data?: { rejectedBy?: string; comments?: string }) =>
    api.put<AssetRequest>(`/requests/${id}/reject`, data || {}),
  delete: (id: number) => api.delete(`/requests/${id}`),
};

export const auditApi = {
  list: (params?: { entityType?: string; limit?: number }) =>
    api.get<AuditLog[]>('/audit', { params }),
};

export default api;
