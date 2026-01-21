import React from 'react';
import { Photo } from '../api/types';
import '../styles/components/PhotoCounter.css';

interface PhotoCounterProps {
  photos: Photo[];
  onOpenGallery: (startIndex: number) => void;
}

const PhotoCounter: React.FC<PhotoCounterProps> = ({ photos, onOpenGallery }) => {
  if (photos.length === 0) {
    return null;
  }

  const handleClick = () => {
    onOpenGallery(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenGallery(0);
    }
  };

  return (
    <span
      className="photo-counter"
      role="button"
      tabIndex={0}
      aria-label="Просмотр фото"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <svg
        className="photo-counter__icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className="photo-counter__count">({photos.length})</span>
    </span>
  );
};

export default PhotoCounter;
