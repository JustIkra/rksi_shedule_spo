import api from './client';
import { CategoryWithEvents, Category, Event } from './types';

export interface EventCreate {
  category_id: number;
  number?: string;
  name: string;
  event_date?: string;
  responsible?: string;
  location?: string;
  description?: string;
  sort_order?: number;
}

export interface EventUpdate {
  category_id?: number;
  number?: string;
  name?: string;
  event_date?: string;
  responsible?: string;
  location?: string;
  description?: string;
  sort_order?: number;
}

export interface CategoryCreate {
  name: string;
  month: number;
  sort_order?: number;
}

export const adminApi = {
  getAllEvents: () =>
    api.get<CategoryWithEvents[]>('/admin/events'),

  createEvent: (data: EventCreate) =>
    api.post<Event>('/admin/events', data),

  updateEvent: (id: number, data: EventUpdate) =>
    api.put<Event>(`/admin/events/${id}`, data),

  deleteEvent: (id: number) =>
    api.delete(`/admin/events/${id}`),

  createCategory: (data: CategoryCreate) =>
    api.post<Category>('/admin/categories', data),

  deleteCategory: (id: number) =>
    api.delete(`/admin/categories/${id}`),

  previewImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{
      categories_count: number;
      events_count: number;
      months_found: string[];
      warnings: string[];
    }>(
      '/admin/import/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  importExcel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ imported_events: number; imported_categories: number }>(
      '/admin/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  exportExcel: () =>
    api.get('/admin/export', { responseType: 'blob' }),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/admin/settings/password', { old_password: oldPassword, new_password: newPassword }),

  changeAdminPassword: (oldPassword: string, newPassword: string) =>
    api.put('/admin/settings/admin-password', { old_password: oldPassword, new_password: newPassword }),
};
