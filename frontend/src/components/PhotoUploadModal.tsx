import { useState, useRef, useCallback, useEffect } from 'react';
import { photosApi } from '../api/photos';
import { Photo } from '../api/types';
import '../styles/components/PhotoUploadModal.css';

interface PhotoUploadModalProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (photos: Photo[]) => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileWithPreview {
  file: File;
  preview: string;
  id: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  eventId,
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URLs on unmount or files change
  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Cleanup old previews
      files.forEach(f => URL.revokeObjectURL(f.preview));
      setFiles([]);
      setProgress(0);
      setStatus('idle');
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
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

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setStatus('uploading');
    setProgress(0);
    setError(null);

    try {
      // Create FileList-like object for batch upload
      const dataTransfer = new DataTransfer();
      files.forEach(f => dataTransfer.items.add(f.file));
      const fileList = dataTransfer.files;

      const response = await photosApi.upload(eventId, fileList, (percent) => {
        setProgress(percent);
      });

      const { photos, errors } = response.data;

      if (errors && errors.length > 0) {
        // Show errors but also process successful uploads
        setError(errors.join('; '));
      }

      if (photos && photos.length > 0) {
        setStatus('success');
        setProgress(100);

        // Notify parent and close after a short delay
        setTimeout(() => {
          onUploadComplete(photos);
          onClose();
        }, 500);
      } else if (errors && errors.length > 0) {
        // Only errors, no successful uploads
        setStatus('error');
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

        {/* Drop Zone */}
        <div
          className={`photo-upload-modal__dropzone ${isDragging ? 'photo-upload-modal__dropzone--dragging' : ''} ${files.length > 0 ? 'photo-upload-modal__dropzone--has-file' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            onChange={handleInputChange}
            hidden
          />

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
              {files.length > 0 ? 'Добавить ещё фото' : 'Перетащите фото или нажмите для выбора'}
            </p>
            <p className="photo-upload-modal__formats">JPEG или PNG (можно несколько)</p>
          </div>
        </div>

        {/* Previews Grid */}
        {files.length > 0 && (
          <div className="photo-upload-modal__previews">
            {files.map(f => (
              <div key={f.id} className="photo-upload-modal__preview-item">
                <img src={f.preview} alt={f.file.name} />
                {status === 'idle' && (
                  <button
                    className="photo-upload-modal__remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(f.id);
                    }}
                    aria-label="Удалить"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
            disabled={files.length === 0 || status === 'uploading' || status === 'success'}
          >
            {status === 'uploading'
              ? 'Загрузка...'
              : files.length > 1
                ? `Загрузить (${files.length})`
                : 'Загрузить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoUploadModal;
