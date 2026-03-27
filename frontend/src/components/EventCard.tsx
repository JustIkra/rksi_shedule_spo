import { FC, useState, memo } from 'react';
import { EventWithRelations, Link, Photo } from '../api/types';
import DescriptionCell from './DescriptionCell';
import Lightbox from './Lightbox';
import ConfirmDialog from './ConfirmDialog';
import PhotoUploadModal from './PhotoUploadModal';
import EventEditModal from './EventEditModal';
import '../styles/components/EventCard.css';
import '../styles/components/EventEditModal.css';

interface EventCardProps {
  event: EventWithRelations;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onPhotosAdded?: (eventId: number, photos: Photo[]) => void;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
}

const EventCard: FC<EventCardProps> = memo(({
  event,
  onUpdateDescription,
  onAddLink,
  onDeleteLink,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUploadPhoto: _onUploadPhoto,
  onPhotosAdded,
  onDeletePhoto,
  canEdit
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Delete confirmation state
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<Photo | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<Link | null>(null);

  const handlePhotosUploaded = (photos: Photo[]) => {
    if (onPhotosAdded) {
      onPhotosAdded(event.id, photos);
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

        {/* Description - read-only display */}
        <div className="event-card__row">
          <span className="event-card__icon" aria-hidden="true">&#128221;</span>
          <div className="event-card__row-content">
            <span className="event-card__label">Пояснение</span>
            <DescriptionCell
              value={event.description}
              eventId={event.id}
              eventName={event.name}
              onSave={onUpdateDescription}
              canEdit={false}
              previewLength={60}
              variant="card"
            />
          </div>
        </div>

        {/* Links - read-only display */}
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
                  </div>
                ))
              ) : (
                <span className="event-card__empty">Нет ссылок</span>
              )}
            </div>
          </div>
        </div>

        {/* Photos Gallery - read-only display */}
        <div className="event-card__row">
          <span className="event-card__icon" aria-hidden="true">&#128247;</span>
          <div className="event-card__row-content">
            <span className="event-card__label">Галерея</span>
            <div className="event-card__gallery">
              {event.photos.length > 0 ? (
                <div
                  className="event-card__gallery-preview"
                  onClick={() => setLightboxIndex(0)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(0)}
                  aria-label={`Открыть галерею (${event.photos.length} фото)`}
                >
                  <img
                    src={`/uploads/${event.photos[0].thumbnail_path}`}
                    alt="Превью галереи"
                    className="event-card__gallery-image"
                  />
                  {event.photos.length > 1 && (
                    <div className="event-card__gallery-overlay">
                      <span className="event-card__gallery-count">
                        +{event.photos.length - 1}
                      </span>
                    </div>
                  )}
                  <div className="event-card__gallery-badge">
                    <span className="event-card__gallery-badge-icon">&#128247;</span>
                    <span>{event.photos.length}</span>
                  </div>
                </div>
              ) : (
                <span className="event-card__empty">Нет фото</span>
              )}
            </div>
          </div>
        </div>

        {/* Edit button for canEdit mode */}
        {canEdit && (
          <div className="event-card__row event-card__row--edit">
            <button
              className="event-edit-btn"
              onClick={() => setShowEditModal(true)}
            >
              <span className="event-edit-btn__icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
              Редактировать
            </button>
          </div>
        )}
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
          canDelete={canEdit}
          onDelete={(photo) => setDeletePhotoTarget(photo)}
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
            if (event.photos.length <= 1) {
              setLightboxIndex(null);
            } else if (lightboxIndex !== null && lightboxIndex >= event.photos.length - 1) {
              setLightboxIndex(event.photos.length - 2);
            }
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

      {/* Combined edit modal */}
      <EventEditModal
        isOpen={showEditModal}
        event={event}
        onSaveDescription={onUpdateDescription}
        onAddLink={onAddLink}
        onDeleteLink={onDeleteLink}
        onPhotosAdded={onPhotosAdded}
        onDeletePhoto={onDeletePhoto}
        onClose={() => setShowEditModal(false)}
      />

      {/* Photo upload modal (kept for lightbox flow) */}
      <PhotoUploadModal
        eventId={event.id}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handlePhotosUploaded}
      />
    </article>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
