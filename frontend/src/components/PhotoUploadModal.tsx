import { useState, useRef, useCallback, useEffect } from 'react';
import { eventsApi } from '../api/events';
import { Photo } from '../api/types';
import '../styles/components/PhotoUploadModal.css';

interface PhotoUploadModalProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (photos: Photo[]) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  eventId,
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setPreview(null);
      setProgress(0);
      setStatus('idle');
      setError(null);
    }
  }, [isOpen]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Поддерживаются только JPEG и PNG';
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Create preview
    const previewUrl = URL.createObjectURL(selectedFile);
    setPreview(previewUrl);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
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

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);
    setError(null);

    try {
      const response = await eventsApi.uploadPhotoWithProgress(eventId, file, (percent) => {
        setProgress(percent);
      });

      const { photos, errors } = response.data;

      if (errors && errors.length > 0) {
        setStatus('error');
        setError(errors[0]);
        return;
      }

      if (photos && photos.length > 0) {
        setStatus('success');
        setProgress(100);

        // Notify parent and close after a short delay
        setTimeout(() => {
          onUploadComplete(photos);
          onClose();
        }, 500);
      }
    } catch (err) {
      setStatus('error');
      setError('Ошибка загрузки. Попробуйте ещё раз.');
      console.error('Upload error:', err);
    }
  };

  const handleClose = () => {
    if (status === 'uploading') return; // Prevent closing during upload
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="photo-upload-modal__overlay" onClick={handleOverlayClick}>
      <div className="photo-upload-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="photo-upload-modal__close"
          onClick={handleClose}
          disabled={status === 'uploading'}
          aria-label="Закрыть"
        >
          &times;
        </button>

        <h2 className="photo-upload-modal__title">Загрузить фото</h2>

        {/* Drop Zone / Preview */}
        <div
          className={`photo-upload-modal__dropzone ${isDragging ? 'photo-upload-modal__dropzone--dragging' : ''} ${file ? 'photo-upload-modal__dropzone--has-file' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            hidden
          />

          {file && preview ? (
            <div className="photo-upload-modal__preview">
              <img src={preview} alt="Предпросмотр" />
              {status === 'idle' && (
                <button
                  className="photo-upload-modal__remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                  }}
                  aria-label="Удалить"
                >
                  &times;
                </button>
              )}
            </div>
          ) : (
            <div className="photo-upload-modal__placeholder">
              <svg
                className="photo-upload-modal__icon"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="photo-upload-modal__hint">
                Перетащите фото или нажмите для выбора
              </p>
              <p className="photo-upload-modal__formats">JPEG или PNG</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {status === 'uploading' && (
          <div className="photo-upload-modal__progress">
            <div className="photo-upload-modal__progress-bar">
              <div
                className="photo-upload-modal__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="photo-upload-modal__progress-text">{progress}%</span>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="photo-upload-modal__status photo-upload-modal__status--success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Загружено</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="photo-upload-modal__status photo-upload-modal__status--error">
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="photo-upload-modal__actions">
          <button
            className="photo-upload-modal__btn photo-upload-modal__btn--secondary"
            onClick={handleClose}
            disabled={status === 'uploading'}
          >
            Отмена
          </button>
          <button
            className="photo-upload-modal__btn photo-upload-modal__btn--primary"
            onClick={handleUpload}
            disabled={!file || status === 'uploading' || status === 'success'}
          >
            {status === 'uploading' ? 'Загрузка...' : 'Загрузить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadModal;
