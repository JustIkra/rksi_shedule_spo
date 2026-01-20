import React, { useEffect, useCallback } from 'react';
import { Photo } from '../api/types';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const Lightbox: React.FC<LightboxProps> = ({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  const currentPhoto = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(currentIndex - 1);
    }
  }, [hasPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1);
    }
  }, [hasNext, currentIndex, onNavigate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    },
    [onClose, handlePrev, handleNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/uploads/${currentPhoto.original_path}`;
    link.download = currentPhoto.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentPhoto) return null;

  return (
    <div className="lightbox" onClick={handleBackdropClick}>
      {/* Close button */}
      <button className="lightbox-close" onClick={onClose} title="Закрыть (Esc)">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Download button */}
      <button
        className="lightbox-download"
        onClick={handleDownload}
        title="Скачать оригинал"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          className="lightbox-nav lightbox-prev"
          onClick={handlePrev}
          title="Предыдущее (←)"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {hasNext && (
        <button
          className="lightbox-nav lightbox-next"
          onClick={handleNext}
          title="Следующее (→)"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <img
        src={`/uploads/${currentPhoto.original_path}`}
        alt={currentPhoto.filename}
        className="lightbox-image"
      />

      {/* Counter */}
      <div className="lightbox-counter">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
};

export default Lightbox;
