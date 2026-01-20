import React, { useState, useRef, useCallback } from 'react';
import { photosApi } from '../api/photos';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'success' | 'error' | 'retrying';
  error?: string;
  retryAttempt?: number;
}

interface PhotoUploaderProps {
  eventId: number;
  onUploadComplete: () => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500; // 1.5 seconds between retries

// Helper to detect network errors
const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;

  // Axios network error
  if (typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      return true;
    }
  }

  // Generic network error detection
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')
    );
  }

  return false;
};

// Helper to wait for a specified delay
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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

      let attempt = 1;
      let lastError: unknown = null;

      while (attempt <= MAX_RETRY_ATTEMPTS) {
        try {
          // Update status to show retry attempt (for attempts > 1)
          if (attempt > 1) {
            setUploads((prev) =>
              prev.map((upload) => {
                if (upload.status === 'uploading' || upload.status === 'retrying') {
                  return {
                    ...upload,
                    status: 'retrying' as const,
                    progress: 0,
                    retryAttempt: attempt,
                  };
                }
                return upload;
              })
            );
          }

          const response = await photosApi.upload(eventId, validFileList, (percent) => {
            // Update progress for all uploading/retrying files
            setUploads((prev) =>
              prev.map((upload) => {
                if (upload.status === 'uploading' || upload.status === 'retrying') {
                  return { ...upload, progress: percent };
                }
                return upload;
              })
            );
          });

          // Update progress to success
          setUploads((prev) =>
            prev.map((upload) => {
              if (upload.status === 'uploading' || upload.status === 'retrying') {
                return {
                  ...upload,
                  progress: 100,
                  status: 'success' as const,
                  retryAttempt: undefined,
                };
              }
              return upload;
            })
          );

          // Handle server-side errors
          if (response.data.errors && response.data.errors.length > 0) {
            setUploads((prev) => [
              ...prev,
              ...response.data.errors.map((err) => ({
                filename: 'Server error',
                progress: 0,
                status: 'error' as const,
                error: err,
              })),
            ]);
          }

          // Notify parent
          onUploadComplete();

          // Clear success uploads after delay
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.status === 'error'));
          }, 3000);

          // Upload succeeded, exit the retry loop
          setIsUploading(false);
          return;
        } catch (err) {
          lastError = err;

          // Check if it's a network error and we have retries left
          if (isNetworkError(err) && attempt < MAX_RETRY_ATTEMPTS) {
            attempt++;
            // Wait before retrying
            await delay(RETRY_DELAY_MS);
            continue;
          }

          // Not a network error or no retries left - fail immediately
          break;
        }
      }

      // All retries exhausted or non-network error
      setUploads((prev) =>
        prev.map((upload) => {
          if (upload.status === 'uploading' || upload.status === 'retrying') {
            return {
              ...upload,
              status: 'error' as const,
              retryAttempt: undefined,
              error: isNetworkError(lastError)
                ? 'Ошибка сети. Попробуйте позже.'
                : 'Ошибка загрузки',
            };
          }
          return upload;
        })
      );
      setIsUploading(false);
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
          <p className="photo-uploader-hint">JPEG или PNG</p>
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
              {upload.status === 'retrying' && (
                <>
                  <span className="upload-progress-status retrying">
                    Повторная попытка ({upload.retryAttempt}/{MAX_RETRY_ATTEMPTS})...
                  </span>
                  <div className="upload-progress-bar">
                    <div
                      className="upload-progress-fill retrying"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                </>
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
