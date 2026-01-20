import React, { useState } from 'react';
import { Photo } from '../api/types';
import ConfirmDialog from './ConfirmDialog';

interface PhotoThumbnailsProps {
  photos: Photo[];
  onDelete: (photoId: number) => void;
  onPhotoClick: (index: number) => void;
}

const PhotoThumbnails: React.FC<PhotoThumbnailsProps> = ({
  photos,
  onDelete,
  onPhotoClick,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, photo: Photo) => {
    e.stopPropagation();
    setDeleteTarget(photo);
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  if (photos.length === 0) {
    return (
      <div className="photo-grid-empty">
        <p>Нет загруженных фотографий</p>
      </div>
    );
  }

  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="photo-thumb"
            onClick={() => onPhotoClick(index)}
          >
            <img
              src={photo.thumbnail_path}
              alt={photo.filename}
              loading="lazy"
            />
            <button
              className="delete-btn"
              onClick={(e) => handleDeleteClick(e, photo)}
              title="Удалить фото"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Удалить фото?"
        message={`Вы уверены, что хотите удалить "${deleteTarget?.filename}"? Это действие нельзя отменить.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

export default PhotoThumbnails;
