import { FC, useState, useRef } from 'react';
import { EventWithRelations, Link, Photo } from '../api/types';
import EditableDescription from './EditableDescription';
import Lightbox from './Lightbox';
import ConfirmDialog from './ConfirmDialog';

interface EventRowProps {
  event: EventWithRelations;
  index: number;
  onUpdateDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onUploadPhoto: (eventId: number, file: File) => Promise<void>;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  canEdit: boolean;
}

const EventRow: FC<EventRowProps> = ({
  event,
  index,
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

    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <tr className="event-row">
      {/* N п/п */}
      <td className="cell-number">{event.number || index + 1}</td>

      {/* Наименование */}
      <td className="cell-name">{event.name}</td>

      {/* Дата */}
      <td className="cell-date">{formatDate(event.event_date)}</td>

      {/* Ответственные */}
      <td className="cell-responsible">{event.responsible || '-'}</td>

      {/* Место */}
      <td className="cell-location">{event.location || '-'}</td>

      {/* Пояснение */}
      <td className="cell-description">
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

      {/* Ссылки */}
      <td className="cell-links">
        <div className="links-container">
          {event.links.map((link: Link) => (
            <div key={link.id} className="link-item">
              <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
                {link.title || 'Ссылка'}
              </a>
              {canEdit && (
                <button
                  className="btn-delete-link"
                  onClick={() => setDeleteLinkTarget(link)}
                  title="Удалить ссылку"
                >
                  x
                </button>
              )}
            </div>
          ))}

          {canEdit && (
            <>
              {showLinkForm ? (
                <form className="link-form" onSubmit={handleAddLink}>
                  <input
                    type="url"
                    placeholder="URL"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Название"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                  />
                  <div className="link-form-buttons">
                    <button type="submit" disabled={addingLink}>
                      {addingLink ? '...' : 'OK'}
                    </button>
                    <button type="button" onClick={() => setShowLinkForm(false)}>
                      Отмена
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className="btn-add-link"
                  onClick={() => setShowLinkForm(true)}
                >
                  + Добавить
                </button>
              )}
            </>
          )}
        </div>
      </td>

      {/* Фото */}
      <td className="cell-photos">
        <div className="photos-container">
          {event.photos.map((photo, photoIndex) => (
            <div key={photo.id} className="photo-item">
              <img
                src={`/uploads/${photo.thumbnail_path}`}
                alt="Фото"
                className="photo-thumbnail"
                onClick={() => setLightboxIndex(photoIndex)}
              />
              {canEdit && (
                <button
                  className="btn-delete-photo"
                  onClick={() => setDeletePhotoTarget(photo)}
                  title="Удалить фото"
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
                className="btn-add-photo"
                onClick={() => fileInputRef.current?.click()}
                title="Загрузить фото"
              >
                +
              </button>
            </>
          )}
        </div>
      </td>

      {/* Lightbox для просмотра фото */}
      {lightboxIndex !== null && event.photos.length > 0 && (
        <Lightbox
          photos={event.photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Диалог подтверждения удаления фото */}
      <ConfirmDialog
        isOpen={deletePhotoTarget !== null}
        title="Удалить фото?"
        message={`Вы уверены, что хотите удалить фото "${deletePhotoTarget?.filename || ''}"?`}
        onConfirm={() => {
          if (deletePhotoTarget) {
            onDeletePhoto(event.id, deletePhotoTarget.id);
          }
          setDeletePhotoTarget(null);
        }}
        onCancel={() => setDeletePhotoTarget(null)}
      />

      {/* Диалог подтверждения удаления ссылки */}
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
    </tr>
  );
};

export default EventRow;
