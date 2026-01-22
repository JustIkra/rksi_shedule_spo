import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/useMediaQuery';
import { eventsApi } from '../api/events';
import { CategoryWithEvents, EventWithRelations } from '../api/types';
import MonthTabs from '../components/MonthTabs';
import SearchInput from '../components/SearchInput';
import CategoryAccordion from '../components/CategoryAccordion';
import EventCard from '../components/EventCard';
import '../styles/pages/EventsPage.css';

// Helper to check if event matches search query
function eventMatchesSearch(event: EventWithRelations, query: string): boolean {
  const searchLower = query.toLowerCase();
  return (
    event.name.toLowerCase().includes(searchLower) ||
    (event.responsible?.toLowerCase().includes(searchLower) ?? false) ||
    (event.location?.toLowerCase().includes(searchLower) ?? false) ||
    (event.description?.toLowerCase().includes(searchLower) ?? false) ||
    (event.event_date?.toLowerCase().includes(searchLower) ?? false)
  );
}

function EventsPage() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [categories, setCategories] = useState<CategoryWithEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load events based on selected month (0 = all year)
  const loadEvents = useCallback(async (month: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = month === 0
        ? await eventsApi.getAll()
        : await eventsApi.getByMonth(month);
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

  // Filter categories and events based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }

    return categories
      .map(category => ({
        ...category,
        events: category.events.filter(event => eventMatchesSearch(event, searchQuery)),
      }))
      .filter(category => category.events.length > 0);
  }, [categories, searchQuery]);

  // Count total matching events
  const matchingEventsCount = useMemo(() => {
    return filteredCategories.reduce((sum, cat) => sum + cat.events.length, 0);
  }, [filteredCategories]);

  // Handlers for EventRow
  const handleUpdateDescription = async (eventId: number, description: string | null) => {
    await eventsApi.updateDescription(eventId, description);
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
    setCategories(prev => prev.map(cat => ({
      ...cat,
      events: cat.events.map(event =>
        event.id === eventId
          ? { ...event, photos: event.photos.filter(p => p.id !== photoId) }
          : event
      )
    })));
  };

  const canEdit = isAuthenticated === true;
  const pageTitle = isMobile ? 'План 2026' : 'План мероприятий СПО РО 2026';
  const isAllYear = selectedMonth === 0;

  if (isAuthenticated === null) {
    return (
      <div className="events-page">
        <div className="events-page__loading">
          <div className="events-page__loading-spinner" />
          <span className="events-page__loading-text">Проверка авторизации...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`events-page${isMobile ? ' events-page--mobile' : ''}`}>
      <header className="events-page__header">
        <h1 className="events-page__title">{pageTitle}</h1>
      </header>

      <MonthTabs
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <main className="events-page__content">
        <div className="events-page__toolbar">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Поиск по названию, организации, месту..."
          />
          {searchQuery && !loading && (
            <span className="events-page__search-results">
              Найдено: {matchingEventsCount}
            </span>
          )}
        </div>
        {loading && (
          <div className="events-page__loading">
            <div className="events-page__loading-spinner" />
            <span className="events-page__loading-text">Загрузка...</span>
          </div>
        )}

        {error && (
          <div className="events-page__error">
            <div className="events-page__error-message">{error}</div>
            <button
              className="events-page__error-retry"
              onClick={() => loadEvents(selectedMonth)}
            >
              Повторить
            </button>
          </div>
        )}

        {!loading && !error && filteredCategories.length === 0 && (
          <div className="events-page__empty">
            <p className="events-page__empty-text">
              {searchQuery
                ? 'Ничего не найдено по вашему запросу'
                : isAllYear
                  ? 'Нет мероприятий за год'
                  : 'Нет мероприятий в этом месяце'}
            </p>
            {searchQuery && (
              <button
                className="events-page__empty-clear"
                onClick={() => setSearchQuery('')}
              >
                Сбросить поиск
              </button>
            )}
          </div>
        )}

        {!loading && !error && (
          <div className="events-page__categories">
            {isMobile ? (
              filteredCategories.map(category => (
                <div key={category.id} className="events-page__category-section">
                  <CategoryAccordion
                    category={category}
                    defaultExpanded={true}
                    onUpdateDescription={handleUpdateDescription}
                    onAddLink={handleAddLink}
                    onDeleteLink={handleDeleteLink}
                    onUploadPhoto={handleUploadPhoto}
                    onDeletePhoto={handleDeletePhoto}
                    canEdit={canEdit}
                    showMonth={isAllYear}
                    renderContent={() => (
                      <div className="events-page__cards">
                        {category.events.map(event => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onUpdateDescription={handleUpdateDescription}
                            onAddLink={handleAddLink}
                            onDeleteLink={handleDeleteLink}
                            onUploadPhoto={handleUploadPhoto}
                            onDeletePhoto={handleDeletePhoto}
                            canEdit={canEdit}
                          />
                        ))}
                      </div>
                    )}
                  />
                </div>
              ))
            ) : (
              filteredCategories.map(category => (
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
                  showMonth={isAllYear}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default EventsPage;
