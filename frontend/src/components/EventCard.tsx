import { FC, useState, useRef, memo } from 'react';
import { EventWithRelations, Link, Photo } from '../api/types';
import EditableDescription from './EditableDescription';
import Lightbox from './Lightbox';
import ConfirmDialog from './ConfirmDialog';
import '../styles/components/EventCard.css';

interface EventCardProps {
  event: EventWithRelations;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
}

const EventCard: FC<EventCardProps> = memo(({
  event,
  onUpdateDescription,
  onAddLink,
  onDeleteLink,
  onUploadPhoto,
  onDeletePhoto,
  canEdit
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Delete confirmation state
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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const cardClassName = `event-card${isExpanded ? ' event-card--expanded' : ''}`;

  return (
    <article className={cardClassName}>
      {/* Always visible section */}
      <div className="event-card__header">
        <h3 className="event-card__title">
          {event.name}
        </h3>
        <div className="event-card__date">
          <span className="event-card__icon" aria-hidden="true">&#128197;</span>
          <span>{event.event_date || 'Дата не указана'}</span>
        </div>
      </div>

      {/* Expandable details section */}
      <div className="event-card__details" id={`event-card-details-${event.id}`}>
        <div className="event-card__divider" />

        {/* Responsible */}
        {event.responsible && (
          <div className="event-card__row">
            <span className="event-card__icon" aria-hidden="true">&#128100;</span>
            <div className="event-card__row-content">
              <span className="event-card__label">Ответственные</span>
              <span className="event-card__value">{event.responsible}</span>
            </div>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="event-card__row">
            <span className="event-card__icon" aria-hidden="true">&#128205;</span>
            <div className="event-card__row-content">
              <span className="event-card__label">Место</span>
              <span className="event-card__value">{event.location}</span>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="event-card__row">
          <span className="event-card__icon" aria-hidden="true">&#128221;</span>
          <div className="event-card__row-content">
            <span className="event-card__label">Пояснение</span>
            {canEdit ? (
              <EditableDescription
                value={event.description}
                eventId={event.id}
                onSave={onUpdateDescription}
              />
            ) : (
              <span className="event-card__value">{event.description || '-'}</span>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="event-card__row">
          <span className="event-card__icon" aria-hidden="true">&#128279;</span>
          <div className="event-card__row-content">
            <span className="event-card__label">Ссылки</span>
            <div className="event-card__links">
              {event.links.length > 0 ? (
                event.links.map((link: Link) => (
                  <div key={link.id} className="event-card__link-item">
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      {link.title || 'Ссылка'}
                    </a>
                    {canEdit && (
                      <button
                        className="event-card__link-delete"
                        onClick={() => setDeleteLinkTarget(link)}
                        aria-label={`Удалить ссылку ${link.title || link.url}`}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <span className="event-card__empty">Нет ссылок</span>
              )}

              {canEdit && (
                <div className="event-card__link-form-wrapper">
                  {!showLinkForm ? (
                    <button
                      className="event-card__add-btn"
                      onClick={() => setShowLinkForm(true)}
                    >
                      + Добавить ссылку
                    </button>
                  ) : (
                    <form className="event-card__link-form" onSubmit={handleAddLink}>
                      <input
                        type="url"
                        placeholder="https://example.com"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        required
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Название (необязательно)"
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                      />
                      <div className="event-card__link-form-actions">
                        <button type="button" onClick={() => setShowLinkForm(false)}>
                          Отмена
                        </button>
                        <button type="submit" disabled={addingLink}>
                          {addingLink ? '...' : 'Добавить'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="event-card__row">
          <span className="event-card__icon" aria-hidden="true">&#128247;</span>
          <div className="event-card__row-content">
            <span className="event-card__label">
              Фото {event.photos.length > 0 && `(${event.photos.length})`}
            </span>
            <div className="event-card__photos">
              {event.photos.length > 0 ? (
                event.photos.map((photo, photoIndex) => (
                  <div key={photo.id} className="event-card__photo-item">
                    <img
                      src={`/uploads/${photo.thumbnail_path}`}
                      alt="Фото"
                      className="event-card__photo-thumbnail"
                      onClick={() => setLightboxIndex(photoIndex)}
                    />
                    {canEdit && (
                      <button
                        className="event-card__photo-delete"
                        onClick={() => setDeletePhotoTarget(photo)}
                        aria-label="Удалить фото"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <span className="event-card__empty">Нет фото</span>
              )}

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
                    className="event-card__add-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Загрузить фото"
                  >
                    +
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expand/Collapse button */}
      <button
        className="event-card__expand-btn"
        onClick={toggleExpand}
        aria-expanded={isExpanded}
        aria-controls={`event-card-details-${event.id}`}
      >
        {isExpanded ? (
          <>
            <span className="event-card__expand-icon" aria-hidden="true">&#9650;</span>
            Скрыть
          </>
        ) : (
          <>
            <span className="event-card__expand-icon" aria-hidden="true">&#9660;</span>
            Подробнее
          </>
        )}
      </button>

      {/* Lightbox for viewing photos */}
      {lightboxIndex !== null && event.photos.length > 0 && (
        <Lightbox
          photos={event.photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Confirm dialog for deleting photo */}
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

      {/* Confirm dialog for deleting link */}
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
    </article>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
