import api from './client';
import { Link, LinkCreate } from './types';

export const linksApi = {
  getByEvent: (eventId: number) =>
    api.get<Link[]>(`/links/events/${eventId}/links`),

  create: (eventId: number, data: LinkCreate) =>
    api.post<Link>(`/links/events/${eventId}/links`, data),

  delete: (linkId: number) =>
    api.delete(`/links/${linkId}`),
};
