import React, { useState, useRef, useCallback } from 'react';
import { photosApi } from '../api/photos';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface PhotoUploaderProps {
  eventId: number;
  onUploadComplete: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  eventId,
  onUploadComplete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: FileList): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: неверный формат (только JPEG и PNG)`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: файл слишком большой (макс. 10MB)`);
      } else {
        valid.push(file);
      }
    });

    return { valid, errors };
  };

  const handleUpload = useCallback(
    async (files: FileList) => {
      const { valid, errors } = validateFiles(files);

      // Show validation errors
      const errorUploads: UploadProgress[] = errors.map((error) => ({
        filename: error.split(':')[0],
        progress: 0,
        status: 'error' as const,
        error: error.split(':')[1]?.trim(),
      }));

      if (valid.length === 0) {
        setUploads(errorUploads);
        return;
      }

      // Create FileList-like object with valid files
      const dataTransfer = new DataTransfer();
      valid.forEach((file) => dataTransfer.items.add(file));
      const validFileList = dataTransfer.files;

      // Initialize upload progress
      const uploadProgress: UploadProgress[] = valid.map((file) => ({
        filename: file.name,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploads([...errorUploads, ...uploadProgress]);
      setIsUploading(true);

      try {
        const response = await photosApi.upload(eventId, validFileList, (percent) => {
          // Update progress for all uploading files
          setUploads((prev) =>
            prev.map((upload) => {
              if (upload.status === 'uploading') {
                return { ...upload, progress: percent };
              }
              return upload;
            })
          );
        });

        // Update progress to success
        setUploads((prev) =>
          prev.map((upload) => {
            if (upload.status === 'uploading') {
              return { ...upload, progress: 100, status: 'success' as const };
            }
            return upload;
          })
        );

        // Handle server-side errors
        if (response.data.errors && response.data.errors.length > 0) {
          setUploads((prev) => [
            ...prev,
            ...response.data.errors.map((error) => ({
              filename: 'Server error',
              progress: 0,
              status: 'error' as const,
              error,
            })),
          ]);
        }

        // Notify parent
        onUploadComplete();

        // Clear success uploads after delay
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.status === 'error'));
        }, 3000);
      } catch (error) {
        setUploads((prev) =>
          prev.map((upload) => {
            if (upload.status === 'uploading') {
              return {
                ...upload,
                status: 'error' as const,
                error: 'Ошибка загрузки',
              };
            }
            return upload;
          })
        );
      } finally {
        setIsUploading(false);
      }
    },
    [eventId, onUploadComplete]
  );

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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="photo-uploader-container">
      <div
        className={`photo-uploader ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
        />
        <div className="photo-uploader-content">
          <svg
            className="photo-uploader-icon"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="photo-uploader-text">
            {isUploading
              ? 'Загрузка...'
              : 'Перетащите файлы или нажмите для выбора'}
          </p>
          <p className="photo-uploader-hint">JPEG или PNG, до 10MB</p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="upload-progress-list">
          {uploads.map((upload, index) => (
            <div key={index} className={`upload-progress-item ${upload.status}`}>
              <span className="upload-progress-filename">{upload.filename}</span>
              {upload.status === 'uploading' && (
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.status === 'success' && (
                <span className="upload-progress-status success">Загружено</span>
              )}
              {upload.status === 'error' && (
                <span className="upload-progress-status error">
                  {upload.error || 'Ошибка'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
