import { FC, useState, memo } from 'react';
import { EventWithRelations, Link, Photo } from '../api/types';
import DescriptionCell from './DescriptionCell';
import Lightbox from './Lightbox';
import ConfirmDialog from './ConfirmDialog';
import PhotoUploadModal from './PhotoUploadModal';
import '../styles/components/EventRow.css';
import '../styles/components/DescriptionCell.css';

interface EventRowProps {
  event: EventWithRelations;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onPhotosAdded?: (eventId: number, photos: Photo[]) => void;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
}

const EventRow: FC<EventRowProps> = memo(({
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
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const handlePhotosUploaded = (photos: Photo[]) => {
    if (onPhotosAdded) {
      onPhotosAdded(event.id, photos);
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

      {/* Location */}
      <td className="events-table__cell events-table__cell--location">
        {event.location || '-'}
      </td>

      {/* Description */}
      <td className="events-table__cell events-table__cell--description">
        <DescriptionCell
          value={event.description}
          eventId={event.id}
          eventName={event.name}
          onSave={onUpdateDescription}
          canEdit={canEdit}
          previewLength={40}
          variant="table"
        />
      </td>

      {/* Links */}
      <td className="events-table__cell events-table__cell--links">
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
              className="description-cell__add-btn"
              onClick={() => setShowLinkForm(true)}
            >
              + Добавить
            </button>
          )}
        </div>
      </td>

      {/* Photos Gallery */}
      <td className="events-table__cell events-table__cell--photos">
        <div className="event-row__gallery">
          {event.photos.length > 0 && (
            <div
              className="event-row__gallery-preview"
              onClick={() => setLightboxIndex(0)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(0)}
              title={`Открыть галерею (${event.photos.length} фото)`}
            >
              <img
                src={`/uploads/${event.photos[0].thumbnail_path}`}
                alt="Превью галереи"
                className="event-row__gallery-image"
              />
              {event.photos.length > 1 && (
                <div className="event-row__gallery-overlay">
                  <span>+{event.photos.length - 1}</span>
                </div>
              )}
              <div className="event-row__gallery-badge">{event.photos.length}</div>
            </div>
          )}

          {canEdit && (
            <button
              className="event-row__photo-add"
              onClick={() => setShowUploadModal(true)}
              title="Загрузить фото"
              aria-label="Загрузить фото"
            >
              +
            </button>
          )}
        </div>
      </td>

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

      <ConfirmDialog
        isOpen={deletePhotoTarget !== null}
        title="Удалить фото?"
        message="Вы уверены, что хотите удалить это фото?"
        onConfirm={() => {
          if (deletePhotoTarget) {
            onDeletePhoto(event.id, deletePhotoTarget.id);
            // Close lightbox if deleting the last photo or adjust index
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

      {/* Photo upload modal */}
      <PhotoUploadModal
        eventId={event.id}
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handlePhotosUploaded}
      />
    </tr>
  );
});

EventRow.displayName = 'EventRow';

export default EventRow;
