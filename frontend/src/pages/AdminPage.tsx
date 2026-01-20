import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { adminApi, EventCreate, EventUpdate, CategoryCreate } from '../api/admin';
import { CategoryWithEvents, Category, Event } from '../api/types';
import EventEditModal from '../components/admin/EventEditModal';
import ImportExport from '../components/admin/ImportExport';
import SettingsPanel from '../components/admin/SettingsPanel';

type TabType = 'events' | 'import-export' | 'settings';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

function AdminPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [categories, setCategories] = useState<CategoryWithEvents[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [newEvent, setNewEvent] = useState<EventCreate>({
    category_id: 0,
    name: '',
    number: '',
    event_date: '',
    responsible: '',
    location: '',
    description: '',
    sort_order: 0,
  });

  const [newCategory, setNewCategory] = useState<CategoryCreate>({
    name: '',
    month: 1,
    sort_order: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllEvents();
      setCategories(response.data);
      // Extract unique categories
      const cats = response.data.map(({ events, ...cat }) => cat);
      setAllCategories(cats);
      if (cats.length > 0 && newEvent.category_id === 0) {
        setNewEvent(prev => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err) {
      setError('Не удалось загрузить данные');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [newEvent.category_id]);

  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/admin');
    } else if (isAuthenticated && !isAdmin) {
      navigate('/events');
    } else if (isAuthenticated && isAdmin) {
      loadData();
    }
  }, [isAuthenticated, isAdmin, navigate, loadData]);

  const handleUpdateEvent = async (id: number, data: EventUpdate) => {
    await adminApi.updateEvent(id, data);
    await loadData();
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

    try {
      await adminApi.deleteEvent(id);
      await loadData();
    } catch (err) {
      setError('Не удалось удалить мероприятие');
      console.error(err);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createEvent(newEvent);
      setShowAddEvent(false);
      setNewEvent({
        category_id: allCategories[0]?.id || 0,
        name: '',
        number: '',
        event_date: '',
        responsible: '',
        location: '',
        description: '',
        sort_order: 0,
      });
      await loadData();
    } catch (err) {
      setError('Не удалось добавить мероприятие');
      console.error(err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createCategory(newCategory);
      setShowAddCategory(false);
      setNewCategory({ name: '', month: 1, sort_order: 0 });
      await loadData();
    } catch (err) {
      setError('Не удалось добавить категорию');
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const category = allCategories.find(c => c.id === id);
    const eventsCount = categories.find(c => c.id === id)?.events.length || 0;

    if (!confirm(
      `Вы уверены, что хотите удалить категорию "${category?.name}"?\n` +
      `Это также удалит ${eventsCount} мероприятий в этой категории.`
    )) return;

    try {
      await adminApi.deleteCategory(id);
      await loadData();
    } catch (err) {
      setError('Не удалось удалить категорию');
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (isAuthenticated === null || loading) {
    return (
      <div className="admin-layout">
        <div className="admin-content">
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Панель администратора</h2>
          <p>Мероприятия СПО</p>
        </div>
        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Мероприятия
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'import-export' ? 'active' : ''}`}
            onClick={() => setActiveTab('import-export')}
          >
            Импорт / Экспорт
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Настройки
          </button>
        </nav>
        <div className="admin-sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        {activeTab === 'events' && (
          <div className="events-management">
            <div className="events-header">
              <h2>Управление мероприятиями</h2>
              <div className="events-actions">
                <button className="btn-primary" onClick={() => setShowAddEvent(true)}>
                  Добавить мероприятие
                </button>
                <button className="btn-secondary" onClick={() => setShowAddCategory(true)}>
                  Добавить категорию
                </button>
              </div>
            </div>

            {categories.map(category => (
              <div key={category.id} className="category-section">
                <div className="category-header">
                  <h3>
                    {category.name}
                    <span className="category-month">({MONTHS[category.month - 1]})</span>
                  </h3>
                  <button
                    className="btn-danger btn-small"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    Удалить категорию
                  </button>
                </div>

                <table className="events-table">
                  <thead>
                    <tr>
                      <th>№ п/п</th>
                      <th>Название</th>
                      <th>Дата</th>
                      <th>Ответственные</th>
                      <th>Место проведения</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.events.map(event => (
                      <tr key={event.id}>
                        <td>{event.number || '-'}</td>
                        <td>{event.name}</td>
                        <td>{event.event_date || '-'}</td>
                        <td>{event.responsible || '-'}</td>
                        <td>{event.location || '-'}</td>
                        <td className="actions-cell">
                          <button
                            className="btn-small"
                            onClick={() => setEditingEvent(event)}
                          >
                            Редактировать
                          </button>
                          <button
                            className="btn-danger btn-small"
                            onClick={() => handleDeleteEvent(event.id)}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                    {category.events.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          Нет мероприятий в этой категории
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}

            {categories.length === 0 && (
              <div className="empty-state">
                <p>Нет категорий. Начните с добавления категории.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'import-export' && (
          <ImportExport onImportSuccess={loadData} />
        )}

        {activeTab === 'settings' && <SettingsPanel />}
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventEditModal
          event={editingEvent}
          categories={allCategories}
          onSave={handleUpdateEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="modal-overlay" onClick={() => setShowAddEvent(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Добавить новое мероприятие</h2>
            <form onSubmit={handleAddEvent}>
              <div className="form-group">
                <label htmlFor="add-category">Категория</label>
                <select
                  id="add-category"
                  value={newEvent.category_id}
                  onChange={e => setNewEvent(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                  required
                >
                  {allCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({MONTHS[cat.month - 1]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="add-number">№ п/п</label>
                <input
                  id="add-number"
                  type="text"
                  value={newEvent.number}
                  onChange={e => setNewEvent(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="например, 1.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-name">Название *</label>
                <input
                  id="add-name"
                  type="text"
                  value={newEvent.name}
                  onChange={e => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-date">Дата</label>
                <input
                  id="add-date"
                  type="text"
                  value={newEvent.event_date}
                  onChange={e => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                  placeholder="например, 15-20 сентября"
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-responsible">Ответственные</label>
                <input
                  id="add-responsible"
                  type="text"
                  value={newEvent.responsible}
                  onChange={e => setNewEvent(prev => ({ ...prev, responsible: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-location">Место проведения</label>
                <input
                  id="add-location"
                  type="text"
                  value={newEvent.location}
                  onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="add-description">Пояснение</label>
                <textarea
                  id="add-description"
                  value={newEvent.description}
                  onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddEvent(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  Добавить мероприятие
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="modal-overlay" onClick={() => setShowAddCategory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Добавить новую категорию</h2>
            <form onSubmit={handleAddCategory}>
              <div className="form-group">
                <label htmlFor="cat-name">Название категории *</label>
                <input
                  id="cat-name"
                  type="text"
                  value={newCategory.name}
                  onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cat-month">Месяц *</label>
                <select
                  id="cat-month"
                  value={newCategory.month}
                  onChange={e => setNewCategory(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                  required
                >
                  {MONTHS.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cat-sort">Порядок сортировки</label>
                <input
                  id="cat-sort"
                  type="number"
                  value={newCategory.sort_order}
                  onChange={e => setNewCategory(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddCategory(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  Добавить категорию
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
