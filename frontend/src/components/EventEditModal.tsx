import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { EventWithRelations, Link, Photo } from '../api/types';
import { photosApi } from '../api/photos';
import { eventsApi } from '../api/events';
import '../styles/components/EventEditModal.css';

interface EventEditModalProps {
  isOpen: boolean;
  event: EventWithRelations;
  onSaveDescription: (eventId: number, description: string | null) => Promise<void>;
  onAddLink: (eventId: number, url: string, title: string) => Promise<void>;
  onDeleteLink: (eventId: number, linkId: number) => Promise<void>;
  onPhotosAdded?: (eventId: number, photos: Photo[]) => void;
  onDeletePhoto: (eventId: number, photoId: number) => Promise<void>;
  onClose: () => void;
}

const MIN_DESCRIPTION_LENGTH = 50;

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const EventEditModal: FC<EventEditModalProps> = ({
  isOpen,
  event,
  onSaveDescription,
  onAddLink,
  onDeleteLink,
  onPhotosAdded,
  onDeletePhoto,
  onClose,
}) => {
  // Description state
  const [description, setDescription] = useState(event.description || '');

  // Links state
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  // Photo upload state
  const [pendingFiles, setPendingFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track what has been modified
  const [descriptionDirty, setDescriptionDirty] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription(event.description || '');
      setNewLinkUrl('');
      setNewLinkTitle('');
      setAddingLink(false);
      pendingFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setPendingFiles([]);
      setIsDragging(false);
      setUploadProgress(0);
      setUploading(false);
      setSaving(false);
      setError(null);
      setDescriptionDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, event.id]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      pendingFiles.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, [pendingFiles]);

  // Auto-focus textarea
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !saving && !uploading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, uploading, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // --- Validation ---
  const descriptionTrimmed = description.trim();
  const descriptionValid = descriptionTrimmed.length >= MIN_DESCRIPTION_LENGTH;
  const hasLinks = event.links.length > 0;
  const hasPhotos = event.photos.length > 0 || pendingFiles.length > 0;
  const allValid = descriptionValid && hasLinks && hasPhotos;

  // --- Description ---
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setDescriptionDirty(true);
  };

  // --- Links ---
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;

    setAddingLink(true);
    setError(null);
    try {
      await onAddLink(event.id, newLinkUrl.trim(), newLinkTitle.trim() || newLinkUrl.trim());
      setNewLinkUrl('');
      setNewLinkTitle('');
    } catch {
      setError('Не удалось добавить ссылку');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (link: Link) => {
    try {
      await onDeleteLink(event.id, link.id);
    } catch {
      setError('Не удалось удалить ссылку');
    }
  };

  // --- Photos ---
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Поддерживаются только JPEG и PNG';
    }
    return null;
  };

  const handleFilesSelect = useCallback((selectedFiles: File[]) => {
    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    selectedFiles.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
          id: `${file.name}-${Date.now()}-${Math.random()}`,
        });
      }
    });

    if (errors.length > 0) {
      setError(errors.join('; '));
    }

    if (validFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFilesSelect(Array.from(selectedFiles));
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFilesSelect(Array.from(droppedFiles));
    }
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) URL.revokeObjectURL(fileToRemove.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const handleDeletePhoto = async (photo: Photo) => {
    try {
      await onDeletePhoto(event.id, photo.id);
    } catch {
      setError('Не удалось удалить фото');
    }
  };

  // --- Save all ---
  const handleSave = useCallback(async () => {
    if (!allValid) return;

    setSaving(true);
    setError(null);

    try {
      // Save description if changed
      if (descriptionDirty && descriptionTrimmed !== (event.description || '')) {
        await onSaveDescription(event.id, descriptionTrimmed || null);
      }

      // Upload pending photos
      if (pendingFiles.length > 0) {
        setUploading(true);
        const dataTransfer = new DataTransfer();
        pendingFiles.forEach(f => dataTransfer.items.add(f.file));
        const fileList = dataTransfer.files;

        const response = await photosApi.upload(event.id, fileList, (percent) => {
          setUploadProgress(percent);
        });

        const { photos, errors } = response.data;
        if (errors && errors.length > 0) {
          setError(errors.join('; '));
        }
        if (photos && photos.length > 0 && onPhotosAdded) {
          onPhotosAdded(event.id, photos);
        }
        setUploading(false);
      }

      // Publish to WordPress (non-blocking — save is already done)
      try {
        await eventsApi.publishToWP(event.id);
      } catch (wpError) {
        console.error('WordPress publish failed:', wpError);
      }

      onClose();
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      setSaving(false);
      setUploading(false);
    }
  }, [allValid, descriptionDirty, descriptionTrimmed, event, onSaveDescription, pendingFiles, onPhotosAdded, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving && !uploading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isBusy = saving || uploading;

  return (
    <div className="event-edit-modal__overlay" onClick={handleOverlayClick}>
      <div className="event-edit-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="event-edit-modal__close"
          onClick={onClose}
          disabled={isBusy}
          aria-label="Закрыть"
        >
          &times;
        </button>

        <div className="event-edit-modal__header">
          <h2 className="event-edit-modal__title">Редактирование</h2>
          <p className="event-edit-modal__subtitle">{event.name}</p>
        </div>

        <div className="event-edit-modal__body">
          {/* === DESCRIPTION SECTION === */}
          <div className="event-edit-modal__section">
            <div className="event-edit-modal__section-header">
              <h3 className="event-edit-modal__section-title">Пояснение</h3>
              <span className={`event-edit-modal__counter ${descriptionValid ? 'event-edit-modal__counter--valid' : ''}`}>
                {descriptionTrimmed.length} / {MIN_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              ref={textareaRef}
              className={`event-edit-modal__textarea ${descriptionDirty && !descriptionValid ? 'event-edit-modal__textarea--error' : ''}`}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="Введите пояснение к мероприятию (минимум 50 символов)..."
              disabled={isBusy}
            />
            {descriptionDirty && !descriptionValid && (
              <p className="event-edit-modal__field-error">
                Минимум {MIN_DESCRIPTION_LENGTH} символов (сейчас {descriptionTrimmed.length})
              </p>
            )}
          </div>

          {/* === LINKS SECTION === */}
          <div className="event-edit-modal__section">
            <div className="event-edit-modal__section-header">
              <h3 className="event-edit-modal__section-title">Ссылки</h3>
              {!hasLinks && (
                <span className="event-edit-modal__required-hint">Обязательно</span>
              )}
            </div>

            {event.links.length > 0 && (
              <div className="event-edit-modal__links-list">
                {event.links.map((link: Link) => (
                  <div key={link.id} className="event-edit-modal__link-item">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" title={link.url}>
                      {link.title || link.url}
                    </a>
                    <button
                      className="event-edit-modal__link-delete"
                      onClick={() => handleDeleteLink(link)}
                      disabled={isBusy}
                      aria-label="Удалить ссылку"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form className="event-edit-modal__link-form" onSubmit={handleAddLink}>
              <div className="event-edit-modal__link-inputs">
                <input
                  type="url"
                  className="event-edit-modal__input"
                  placeholder="https://example.com"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  required
                  disabled={isBusy}
                />
                <input
                  type="text"
                  className="event-edit-modal__input"
                  placeholder="Название (необязательно)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  disabled={isBusy}
                />
              </div>
              <button
                type="submit"
                className="event-edit-modal__link-add-btn"
                disabled={addingLink || isBusy || !newLinkUrl.trim()}
              >
                {addingLink ? '...' : '+ Добавить'}
              </button>
            </form>
          </div>

          {/* === PHOTOS SECTION === */}
          <div className="event-edit-modal__section">
            <div className="event-edit-modal__section-header">
              <h3 className="event-edit-modal__section-title">Фото</h3>
              {!hasPhotos && (
                <span className="event-edit-modal__required-hint">Обязательно</span>
              )}
            </div>

            {/* Existing photos */}
            {event.photos.length > 0 && (
              <div className="event-edit-modal__photos-grid">
                {event.photos.map((photo: Photo) => (
                  <div key={photo.id} className="event-edit-modal__photo-item">
                    <img
                      src={`/uploads/${photo.thumbnail_path}`}
                      alt={photo.filename}
                      className="event-edit-modal__photo-img"
                    />
                    <button
                      className="event-edit-modal__photo-delete"
                      onClick={() => handleDeletePhoto(photo)}
                      disabled={isBusy}
                      aria-label="Удалить фото"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending file previews */}
            {pendingFiles.length > 0 && (
              <div className="event-edit-modal__photos-grid event-edit-modal__photos-grid--pending">
                {pendingFiles.map(f => (
                  <div key={f.id} className="event-edit-modal__photo-item event-edit-modal__photo-item--pending">
                    <img src={f.preview} alt={f.file.name} className="event-edit-modal__photo-img" />
                    <button
                      className="event-edit-modal__photo-delete"
                      onClick={() => removePendingFile(f.id)}
                      disabled={isBusy}
                      aria-label="Убрать"
                    >
                      &times;
                    </button>
                    <span className="event-edit-modal__photo-badge">Новое</span>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              className={`event-edit-modal__dropzone ${isDragging ? 'event-edit-modal__dropzone--dragging' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isBusy && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={handleInputChange}
                hidden
              />
              <svg
                className="event-edit-modal__dropzone-icon"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="event-edit-modal__dropzone-text">
                Перетащите фото или нажмите для выбора
              </p>
              <p className="event-edit-modal__dropzone-formats">JPEG или PNG</p>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="event-edit-modal__progress">
                <div className="event-edit-modal__progress-bar">
                  <div
                    className="event-edit-modal__progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="event-edit-modal__progress-text">{uploadProgress}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="event-edit-modal__status event-edit-modal__status--error">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="event-edit-modal__actions">
          <button
            className="event-edit-modal__btn event-edit-modal__btn--secondary"
            onClick={onClose}
            disabled={isBusy}
          >
            Отмена
          </button>
          <button
            className="event-edit-modal__btn event-edit-modal__btn--primary"
            onClick={handleSave}
            disabled={!allValid || isBusy}
            title={!allValid ? 'Заполните все обязательные поля' : undefined}
          >
            {isBusy ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventEditModal;
