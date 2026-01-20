import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { eventsApi } from '../api/events';
import { CategoryWithEvents } from '../api/types';
import MonthTabs from '../components/MonthTabs';
import CategoryAccordion from '../components/CategoryAccordion';

function EventsPage() {
  const { isAuthenticated } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [categories, setCategories] = useState<CategoryWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при смене месяца
  const loadEvents = useCallback(async (month: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await eventsApi.getByMonth(month);
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Не удалось загрузить мероприятия');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents(selectedMonth);
  }, [selectedMonth, loadEvents]);

  // Обработчики для EventRow
  const handleUpdateDescription = async (eventId: number, description: string | null) => {
    await eventsApi.updateDescription(eventId, description);
    // Обновляем локальный стейт
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId ? { ...event, description } : event
      )
    })));
  };

  const handleAddLink = async (eventId: number, url: string, title: string) => {
    const response = await eventsApi.addLink(eventId, { url, title });
    const newLink = response.data;
    // Обновляем локальный стейт
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId
          ? { ...event, links: [...event.links, newLink] }
          : event
      )
    })));
  };

  const handleDeleteLink = async (eventId: number, linkId: number) => {
    await eventsApi.deleteLink(eventId, linkId);
    // Обновляем локальный стейт
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId
          ? { ...event, links: event.links.filter(l => l.id !== linkId) }
          : event
      )
    })));
  };

  const handleUploadPhoto = async (eventId: number, file: File) => {
    const response = await eventsApi.uploadPhoto(eventId, file);
    const { photos: newPhotos } = response.data;
    // Обновляем локальный стейт
    if (newPhotos && newPhotos.length > 0) {
      setCategories(prev => prev.map(cat => ({
        ...cat,
        events: cat.events.map(event =>
          event.id === eventId
            ? { ...event, photos: [...event.photos, ...newPhotos] }
            : event
        )
      })));
    }
  };

  const handleDeletePhoto = async (eventId: number, photoId: number) => {
    await eventsApi.deletePhoto(eventId, photoId);
    // Обновляем локальный стейт
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId
          ? { ...event, photos: event.photos.filter(p => p.id !== photoId) }
          : event
      )
    })));
  };

  // Пользователь может редактировать если он авторизован
  const canEdit = isAuthenticated === true;

  // Показываем загрузку только при первичной загрузке
  if (isAuthenticated === null) {
    return (
      <div className="events-page">
        <div className="loading">Проверка авторизации...</div>
      </div>
    );
  }

  return (
    <div className="events-page">
      <header className="header">
        <h1>План мероприятий СПО РО 2026</h1>
      </header>

      <MonthTabs
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <main className="main-content">
        {loading && <div className="loading">Загрузка...</div>}

        {error && <div className="error">{error}</div>}

        {!loading && !error && categories.length === 0 && (
          <div className="no-data">Нет мероприятий в этом месяце</div>
        )}

        {!loading && !error && categories.map(category => (
          <CategoryAccordion
            key={category.id}
            category={category}
            defaultExpanded={true}
            onUpdateDescription={handleUpdateDescription}
            onAddLink={handleAddLink}
            onDeleteLink={handleDeleteLink}
            onUploadPhoto={handleUploadPhoto}
            onDeletePhoto={handleDeletePhoto}
            canEdit={canEdit}
          />
        ))}
      </main>
    </div>
  );
}

export default EventsPage
