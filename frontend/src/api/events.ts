import api from './client';
import { CategoryWithEvents, EventWithRelations, Link, LinkCreate, Photo } from './types';

export const eventsApi = {
  // Получить мероприятия по месяцу
  getByMonth: (month: number) =>
    api.get<CategoryWithEvents[]>('/events/', { params: { month } }),

  // Получить все мероприятия за год
  getAll: () =>
    api.get<CategoryWithEvents[]>('/events/all'),

  // Получить мероприятие по ID
  getById: (id: number) =>
    api.get<EventWithRelations>(`/events/${id}`),

  // Обновить пояснение к мероприятию
  updateDescription: (id: number, description: string | null) =>
    api.patch<EventWithRelations>(`/events/${id}`, { description }),

  // Добавить ссылку к мероприятию
  addLink: (eventId: number, data: LinkCreate) =>
    api.post<Link>(`/links/events/${eventId}/links`, data),

  // Удалить ссылку
  deleteLink: (_eventId: number, linkId: number) =>
    api.delete(`/links/${linkId}`),

  // Загрузить фото
  uploadPhoto: (eventId: number, file: File) => {
    const formData = new FormData();
    formData.append('files', file);
    return api.post<{ photos: Photo[]; errors: string[] }>(`/photos/events/${eventId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Загрузить фото с отслеживанием прогресса
  uploadPhotoWithProgress: (eventId: number, file: File, onProgress: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('files', file);
    return api.post<{ photos: Photo[]; errors: string[] }>(`/photos/events/${eventId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  },

  // Удалить фото
  deletePhoto: (_eventId: number, photoId: number) =>
    api.delete(`/photos/${photoId}`),
};
