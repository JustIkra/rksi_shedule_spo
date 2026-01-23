import { FC, useState, useRef, useEffect, useCallback } from 'react';
import '../styles/components/DescriptionEditorModal.css';

interface DescriptionEditorModalProps {
  isOpen: boolean;
  initialValue: string | null;
  eventId: number;
  eventName: string;
  onSave: (eventId: number, description: string | null) => Promise<void>;
  onClose: () => void;
}

const DescriptionEditorModal: FC<DescriptionEditorModalProps> = ({
  isOpen,
  initialValue,
  eventId,
  eventName,
  onSave,
  onClose,
}) => {
  const [text, setText] = useState(initialValue || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalValue = useRef(initialValue || '');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setText(initialValue || '');
      originalValue.current = initialValue || '';
      setSaving(false);
      setSaved(false);
      setError(null);
    }
  }, [isOpen, initialValue]);

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      // Place cursor at end of text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !saving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSave = useCallback(async () => {
    const trimmedText = text.trim();
    const newValue = trimmedText || null;

    // Check if value actually changed
    if (trimmedText === originalValue.current) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(eventId, newValue);
      originalValue.current = trimmedText;
      setSaved(true);

      // Close modal after short delay to show success state
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to save description:', err);
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      setSaving(false);
    }
  }, [text, eventId, onSave, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (!saving) {
      onClose();
    }
  };

  // Handle Ctrl+Enter to save
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  const hasChanges = text.trim() !== originalValue.current;

  return (
    <div className="description-modal__overlay" onClick={handleOverlayClick}>
      <div className="description-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="description-modal__close"
          onClick={handleCancel}
          disabled={saving}
          aria-label="Закрыть"
        >
          &times;
        </button>

        <div className="description-modal__header">
          <h2 className="description-modal__title">Пояснение</h2>
          <p className="description-modal__subtitle">{eventName}</p>
        </div>

        <div className="description-modal__content">
          <textarea
            ref={textareaRef}
            className="description-modal__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите пояснение к мероприятию..."
            disabled={saving}
          />
          <p className="description-modal__hint">
            Ctrl+Enter для сохранения
          </p>
        </div>

        {/* Status indicators */}
        {error && (
          <div className="description-modal__status description-modal__status--error">
            {error}
          </div>
        )}

        {saved && (
          <div className="description-modal__status description-modal__status--success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Сохранено
          </div>
        )}

        <div className="description-modal__actions">
          <button
            className="description-modal__btn description-modal__btn--secondary"
            onClick={handleCancel}
            disabled={saving}
          >
            Отмена
          </button>
          <button
            className="description-modal__btn description-modal__btn--primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DescriptionEditorModal;
