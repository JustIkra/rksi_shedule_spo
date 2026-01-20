import api from './client';
import { Photo } from './types';

export const photosApi = {
  getByEvent: (eventId: number) =>
    api.get<Photo[]>(`/photos/events/${eventId}/photos`),

  upload: (eventId: number, files: FileList, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));
    return api.post<{ photos: Photo[]; errors: string[] }>(
      `/photos/events/${eventId}/photos`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      }
    );
  },

  delete: (photoId: number) =>
    api.delete(`/photos/${photoId}`),

  downloadZip: (eventId: number) =>
    api.get(`/photos/events/${eventId}/zip`, { responseType: 'blob' }),
};
