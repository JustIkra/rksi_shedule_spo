import api from './client';
import { CategoryWithEvents, EventWithRelations, Link, LinkCreate, Photo } from './types';

export const eventsApi = {
  // Получить мероприятия по месяцу
  getByMonth: (month: number) =>
    api.get<CategoryWithEvents[]>('/events', { params: { month } }),

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

  // Удалить фото
  deletePhoto: (_eventId: number, photoId: number) =>
    api.delete(`/photos/${photoId}`),
};
