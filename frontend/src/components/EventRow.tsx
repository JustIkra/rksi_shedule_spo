import { FC, useState, memo } from 'react';
import { EventWithRelations, Link, Photo } from '../api/types';
import DescriptionCell from './DescriptionCell';
import Lightbox from './Lightbox';
import ConfirmDialog from './ConfirmDialog';
import PhotoUploadModal from './PhotoUploadModal';
import EventEditModal from './EventEditModal';
import '../styles/components/EventRow.css';
import '../styles/components/EventEditModal.css';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [deletePhotoTarget, setDeletePhotoTarget] = useState<Photo | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<Link | null>(null);

  const handlePhotosUploaded = (photos: Photo[]) => {
    if (onPhotosAdded) {
      onPhotosAdded(event.id, photos);
    }
  };

  return (
    <tr className="events-table__row">
      {/* Name */}
      <td className="events-table__cell events-table__cell--name">{event.name}</td>

      {/* Date */}
      <td className="events-table__cell events-table__cell--date">{event.event_date || '-'}</td>

      {/* Responsible */}
      <td className="events-table__cell events-table__cell--responsible">{event.responsible || '-'}</td>

      {/* Location */}
      <td className="events-table__cell events-table__cell--location">
        {event.location || '-'}
      </td>

      {/* Description - read-only display */}
      <td className="events-table__cell events-table__cell--description">
        <DescriptionCell
          value={event.description}
          eventId={event.id}
          eventName={event.name}
          onSave={onUpdateDescription}
          canEdit={false}
          previewLength={40}
          variant="table"
        />
      </td>

      {/* Links - read-only display */}
      <td className="events-table__cell events-table__cell--links">
        <div className="event-row__links">
          {event.links.map((link: Link) => (
            <div key={link.id} className="event-row__link">
              <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
                {link.title || 'Ссылка'}
              </a>
            </div>
          ))}
          {event.links.length === 0 && (
            <span className="event-row__empty">-</span>
          )}
        </div>
      </td>

      {/* Photos Gallery - read-only display */}
      <td className="events-table__cell events-table__cell--photos">
        <div className="event-row__gallery">
          {event.photos.length > 0 ? (
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
          ) : (
            <span className="event-row__empty">-</span>
          )}
        </div>
      </td>

      {/* Edit button column */}
      {canEdit && (
        <td className="events-table__cell events-table__cell--actions">
          <button
            className="event-edit-btn"
            onClick={() => setShowEditModal(true)}
            title="Редактировать"
          >
            <span className="event-edit-btn__icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
          </button>
        </td>
      )}

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

      {/* Photo upload modal (kept for lightbox delete flow) */}
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
