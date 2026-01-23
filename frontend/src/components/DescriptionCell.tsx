import { FC, useState, memo } from 'react';
import DescriptionEditorModal from './DescriptionEditorModal';
import '../styles/components/DescriptionCell.css';

interface DescriptionCellProps {
  value: string | null;
  eventId: number;
  eventName: string;
  onSave: (eventId: number, description: string | null) => Promise<void>;
  canEdit: boolean;
  /** Maximum number of characters to show in preview (default: 50) */
  previewLength?: number;
  /** Variant for different contexts: 'table' for EventRow, 'card' for EventCard */
  variant?: 'table' | 'card';
}

const DescriptionCell: FC<DescriptionCellProps> = memo(({
  value,
  eventId,
  eventName,
  onSave,
  canEdit,
  previewLength = 50,
  variant = 'table',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasDescription = value && value.trim().length > 0;
  const previewText = hasDescription
    ? value.length > previewLength
      ? `${value.slice(0, previewLength).trim()}...`
      : value
    : null;

  const handleOpenModal = () => {
    if (canEdit) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const cellClassName = `description-cell description-cell--${variant}`;

  // Read-only mode: just show text or dash
  if (!canEdit) {
    return (
      <div className={cellClassName}>
        <span className="description-cell__text description-cell__text--readonly">
          {hasDescription ? previewText : '-'}
        </span>
      </div>
    );
  }

  // Edit mode: show button or clickable preview
  return (
    <div className={cellClassName}>
      {hasDescription ? (
        <button
          type="button"
          className="description-cell__preview"
          onClick={handleOpenModal}
          title="Нажмите для редактирования"
        >
          <span className="description-cell__text">{previewText}</span>
          <span className="description-cell__edit-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="description-cell__add-btn"
          onClick={handleOpenModal}
        >
          + Добавить
        </button>
      )}

      <DescriptionEditorModal
        isOpen={isModalOpen}
        initialValue={value}
        eventId={eventId}
        eventName={eventName}
        onSave={onSave}
        onClose={handleCloseModal}
      />
    </div>
  );
});

DescriptionCell.displayName = 'DescriptionCell';

export default DescriptionCell;
