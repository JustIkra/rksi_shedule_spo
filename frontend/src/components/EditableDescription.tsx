import { FC, useState, useRef, useEffect } from 'react';

interface EditableDescriptionProps {
  value: string | null;
  eventId: number;
  onSave: (eventId: number, description: string | null) => Promise<void>;
  disabled?: boolean;
}

const EditableDescription: FC<EditableDescriptionProps> = ({
  value,
  eventId,
  onSave,
  disabled = false
}) => {
  const [text, setText] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const originalValue = useRef(value || '');

  useEffect(() => {
    setText(value || '');
    originalValue.current = value || '';
  }, [value]);

  const handleBlur = async () => {
    const trimmedText = text.trim();
    const newValue = trimmedText || null;

    // Проверяем, изменилось ли значение
    if (trimmedText === originalValue.current) {
      return;
    }

    setSaving(true);
    try {
      await onSave(eventId, newValue);
      originalValue.current = trimmedText;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save description:', error);
      // Восстанавливаем предыдущее значение при ошибке
      setText(originalValue.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editable-description">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        disabled={disabled || saving}
        placeholder="Добавить пояснение..."
        rows={2}
        className="description-textarea"
      />
      {saving && <span className="save-indicator saving">Сохранение...</span>}
      {saved && <span className="save-indicator saved">Сохранено</span>}
    </div>
  );
};

export default EditableDescription;
