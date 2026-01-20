import { useState, useRef } from 'react';
import { adminApi } from '../../api/admin';

interface ImportExportProps {
  onImportSuccess: () => void;
}

function ImportExport({ onImportSuccess }: ImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirm(true);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setError(null);
    setSuccess(null);
    setShowConfirm(false);

    try {
      const response = await adminApi.importExcel(selectedFile);
      setSuccess(
        `Импорт выполнен успешно: ${response.data.imported_categories} категорий, ${response.data.imported_events} мероприятий`
      );
      onImportSuccess();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Не удалось импортировать файл. Пожалуйста, проверьте формат.');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const response = await adminApi.exportExcel();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `events_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Не удалось экспортировать данные');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const cancelImport = () => {
    setShowConfirm(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="import-export-panel">
      <h3>Импорт / Экспорт</h3>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="import-section">
        <h4>Импорт из Excel</h4>
        <p className="warning-text">
          Внимание: Импорт заменит все существующие мероприятия и категории!
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          disabled={importing}
        />
      </div>

      {showConfirm && (
        <div className="confirm-dialog">
          <p>
            Вы уверены, что хотите импортировать "{selectedFile?.name}"?
            <br />
            <strong>Это удалит все существующие данные!</strong>
          </p>
          <div className="confirm-actions">
            <button className="btn-secondary" onClick={cancelImport}>
              Отмена
            </button>
            <button className="btn-danger" onClick={handleImport} disabled={importing}>
              {importing ? 'Импорт...' : 'Да, импортировать'}
            </button>
          </div>
        </div>
      )}

      <div className="export-section">
        <h4>Экспорт в Excel</h4>
        <p>Скачать все мероприятия и категории в виде файла Excel.</p>
        <button className="btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Экспорт...' : 'Экспорт Excel'}
        </button>
      </div>
    </div>
  );
}

export default ImportExport;
