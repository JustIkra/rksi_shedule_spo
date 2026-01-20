import { useState, useEffect } from 'react';
import { Event, Category } from '../../api/types';
import { EventUpdate } from '../../api/admin';

interface EventEditModalProps {
  event: Event | null;
  categories: Category[];
  onSave: (id: number, data: EventUpdate) => Promise<void>;
  onClose: () => void;
}

function EventEditModal({ event, categories, onSave, onClose }: EventEditModalProps) {
  const [formData, setFormData] = useState<EventUpdate>({
    category_id: event?.category_id,
    number: event?.number || '',
    name: event?.name || '',
    event_date: event?.event_date || '',
    responsible: event?.responsible || '',
    location: event?.location || '',
    description: event?.description || '',
    sort_order: event?.sort_order,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setFormData({
        category_id: event.category_id,
        number: event.number || '',
        name: event.name || '',
        event_date: event.event_date || '',
        responsible: event.responsible || '',
        location: event.location || '',
        description: event.description || '',
        sort_order: event.sort_order,
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setSaving(true);
    setError(null);

    try {
      await onSave(event.id, formData);
      onClose();
    } catch (err) {
      setError('Failed to save event');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof EventUpdate, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!event) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Edit Event</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={formData.category_id}
              onChange={e => handleChange('category_id', parseInt(e.target.value))}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} (Month {cat.month})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="number">Number</label>
            <input
              id="number"
              type="text"
              value={formData.number}
              onChange={e => handleChange('number', e.target.value)}
              placeholder="e.g. 1.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event_date">Date</label>
            <input
              id="event_date"
              type="text"
              value={formData.event_date}
              onChange={e => handleChange('event_date', e.target.value)}
              placeholder="e.g. 15-20 September"
            />
          </div>

          <div className="form-group">
            <label htmlFor="responsible">Responsible</label>
            <input
              id="responsible"
              type="text"
              value={formData.responsible}
              onChange={e => handleChange('responsible', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={e => handleChange('location', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sort_order">Sort Order</label>
            <input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={e => handleChange('sort_order', parseInt(e.target.value))}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventEditModal;
