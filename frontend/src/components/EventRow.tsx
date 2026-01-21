import { FC, useState, useRef, memo } from 'react';
import { EventWithRelations, Link, Photo } from '../api/types';
import EditableDescription from './EditableDescription';
import Lightbox from './Lightbox';
import ConfirmDialog from './ConfirmDialog';
import '../styles/components/EventRow.css';

interface EventRowProps {
  event: EventWithRelations;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
}

const EventRow: FC<EventRowProps> = memo(({
  event,
  onUpdateDescription,
  onAddLink,
  onDeleteLink,
  onUploadPhoto,
  onDeletePhoto,
  canEdit
}) => {
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [deletePhotoTarget, setDeletePhotoTarget] = useState<Photo | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<Link | null>(null);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;

    setAddingLink(true);
    try {
      await onAddLink(event.id, newLinkUrl.trim(), newLinkTitle.trim() || newLinkUrl.trim());
      setNewLinkUrl('');
      setNewLinkTitle('');
      setShowLinkForm(false);
    } catch (error) {
      console.error('Failed to add link:', error);
    } finally {
      setAddingLink(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await onUploadPhoto(event.id, file);
    } catch (error) {
      console.error('Failed to upload photo:', error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <tr className="events-table__row">
      {/* Name - Always visible */}
      <td className="events-table__cell events-table__cell--name">{event.name}</td>

      {/* Date - Always visible */}
      <td className="events-table__cell events-table__cell--date">{event.event_date || '-'}</td>

      {/* Responsible - Always visible */}
      <td className="events-table__cell events-table__cell--responsible">{event.responsible || '-'}</td>

      {/* Location - lg+ only (>=992px) */}
      <td className="events-table__cell events-table__cell--location hide-below-lg">
        {event.location || '-'}
      </td>

      {/* Description - xl only (>=1200px) */}
      <td className="events-table__cell events-table__cell--description hide-below-xl">
        {canEdit ? (
          <EditableDescription
            value={event.description}
            eventId={event.id}
            onSave={onUpdateDescription}
          />
        ) : (
          <span>{event.description || '-'}</span>
        )}
      </td>

      {/* Links - lg+ only (>=992px) */}
      <td className="events-table__cell events-table__cell--links hide-below-lg">
        <div className="event-row__links">
          {event.links.map((link: Link) => (
            <div key={link.id} className="event-row__link">
              <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
                {link.title || 'Ссылка'}
              </a>
              {canEdit && (
                <button
                  className="event-row__link-delete"
                  onClick={() => setDeleteLinkTarget(link)}
                  title="Удалить ссылку"
                  aria-label="Удалить ссылку"
                >
                  x
                </button>
              )}
            </div>
          ))}

          {canEdit && (
            <button
              className="event-row__link-add"
              onClick={() => setShowLinkForm(true)}
            >
              + Добавить
            </button>
          )}
        </div>
      </td>

      {/* Photos - Always visible */}
      <td className="events-table__cell events-table__cell--photos">
        <div className="event-row__photos">
          {event.photos.map((photo, photoIndex) => (
            <div key={photo.id} className="event-row__photo">
              <img
                src={`/uploads/${photo.thumbnail_path}`}
                alt="Фото"
                className="event-row__photo-thumb"
                onClick={() => setLightboxIndex(photoIndex)}
              />
              {canEdit && (
                <button
                  className="event-row__photo-delete"
                  onClick={() => setDeletePhotoTarget(photo)}
                  title="Удалить фото"
                  aria-label="Удалить фото"
                >
                  x
                </button>
              )}
            </div>
          ))}

          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                className="event-row__photo-add"
                onClick={() => fileInputRef.current?.click()}
                title="Загрузить фото"
                aria-label="Загрузить фото"
              >
                +
              </button>
            </>
          )}
        </div>
      </td>

      {lightboxIndex !== null && event.photos.length > 0 && (
        <Lightbox
          photos={event.photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      <ConfirmDialog
        isOpen={deletePhotoTarget !== null}
        title="Удалить фото?"
        message="Вы уверены, что хотите удалить это фото?"
        onConfirm={() => {
          if (deletePhotoTarget) {
            onDeletePhoto(event.id, deletePhotoTarget.id);
          }
          setDeletePhotoTarget(null);
        }}
        onCancel={() => setDeletePhotoTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteLinkTarget !== null}
        title="Удалить ссылку?"
        message={`Вы уверены, что хотите удалить ссылку "${deleteLinkTarget?.title || deleteLinkTarget?.url || ''}"?`}
        onConfirm={() => {
          if (deleteLinkTarget) {
            onDeleteLink(event.id, deleteLinkTarget.id);
          }
          setDeleteLinkTarget(null);
        }}
        onCancel={() => setDeleteLinkTarget(null)}
      />

      {/* Modal for adding links */}
      {showLinkForm && (
        <div className="link-modal-overlay" onClick={() => setShowLinkForm(false)}>
          <div className="link-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="link-modal__title">Добавить ссылку</h3>
            <form onSubmit={handleAddLink}>
              <div className="link-modal__field">
                <label className="link-modal__label" htmlFor={`link-url-${event.id}`}>
                  URL ссылки
                </label>
                <input
                  id={`link-url-${event.id}`}
                  type="url"
                  className="link-modal__input"
                  placeholder="https://example.com"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="link-modal__field">
                <label className="link-modal__label" htmlFor={`link-title-${event.id}`}>
                  Название (необязательно)
                </label>
                <input
                  id={`link-title-${event.id}`}
                  type="text"
                  className="link-modal__input"
                  placeholder="Название ссылки"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                />
              </div>
              <div className="link-modal__actions">
                <button
                  type="button"
                  className="link-modal__btn link-modal__btn--cancel"
                  onClick={() => setShowLinkForm(false)}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="link-modal__btn link-modal__btn--submit"
                  disabled={addingLink}
                >
                  {addingLink ? 'Добавление...' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </tr>
  );
});

EventRow.displayName = 'EventRow';

export default EventRow;
