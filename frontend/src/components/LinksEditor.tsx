import React, { useState } from 'react';
import { Link } from '../api/types';
import { linksApi } from '../api/links';
import ConfirmDialog from './ConfirmDialog';

interface LinksEditorProps {
  links: Link[];
  eventId: number;
  onUpdate: () => void;
}

const LinksEditor: React.FC<LinksEditorProps> = ({
  links,
  eventId,
  onUpdate,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Link | null>(null);

  const validateUrl = (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Введите URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('Введите корректный URL');
      return;
    }

    setIsSubmitting(true);

    try {
      await linksApi.create(eventId, {
        url: url.trim(),
        title: title.trim() || undefined,
      });
      setUrl('');
      setTitle('');
      onUpdate();
    } catch (err) {
      setError('Ошибка при добавлении ссылки');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (link: Link) => {
    setDeleteTarget(link);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await linksApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      onUpdate();
    } catch (err) {
      setError('Ошибка при удалении ссылки');
      setDeleteTarget(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  return (
    <div className="links-editor">
      <h3 className="links-editor-title">Ссылки</h3>

      {/* Links list */}
      {links.length > 0 ? (
        <ul className="links-list">
          {links.map((link) => (
            <li key={link.id} className="links-list-item">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="links-list-link"
              >
                {link.title || link.url}
              </a>
              <button
                className="links-list-delete"
                onClick={() => handleDeleteClick(link)}
                title="Удалить ссылку"
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
            </li>
          ))}
        </ul>
      ) : (
        <p className="links-empty">Нет добавленных ссылок</p>
      )}

      {/* Add link form */}
      <form className="links-form" onSubmit={handleSubmit}>
        <div className="links-form-fields">
          <input
            type="text"
            className="links-form-input"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting}
          />
          <input
            type="text"
            className="links-form-input links-form-title"
            placeholder="Название (опционально)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        {error && <p className="links-form-error">{error}</p>}
        <button
          type="submit"
          className="links-form-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Добавление...' : 'Добавить ссылку'}
        </button>
      </form>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Удалить ссылку?"
        message={`Вы уверены, что хотите удалить ссылку "${deleteTarget?.title || deleteTarget?.url}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default LinksEditor;
