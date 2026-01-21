import { useState, useRef } from 'react';
import { adminApi } from '../../api/admin';

interface ImportExportProps {
  onImportSuccess: () => void;
}

interface PreviewData {
  categories_count: number;
  events_count: number;
  months_found: string[];
  warnings: string[];
}

function ImportExport({ onImportSuccess }: ImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
    setPreviewData(null);
    setPreviewing(true);

    try {
      const response = await adminApi.previewImport(file);
      setPreviewData(response.data);
      setShowConfirm(true);
    } catch (err) {
      setError('Не удалось прочитать файл. Пожалуйста, проверьте формат.');
      console.error(err);
      resetFileInput();
    } finally {
      setPreviewing(false);
    }
  };

  const resetFileInput = () => {
    setSelectedFile(null);
    setPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      resetFileInput();
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
    resetFileInput();
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
          disabled={importing || previewing}
        />
        {previewing && <p>Анализ файла...</p>}
      </div>

      {showConfirm && previewData && (
        <div className="confirm-dialog">
          <p style={{ marginBottom: '12px' }}>
            <strong>Предпросмотр импорта "{selectedFile?.name}"</strong>
          </p>
          <div style={{ marginBottom: '12px', fontSize: '14px' }}>
            <p>Будет импортировано:</p>
            <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
              <li>Категорий: <strong>{previewData.categories_count}</strong></li>
              <li>Мероприятий: <strong>{previewData.events_count}</strong></li>
              <li>Месяцев найдено: <strong>{previewData.months_found.length}</strong> ({previewData.months_found.join(', ')})</li>
            </ul>
          </div>

          {previewData.warnings.length > 0 && (
            <div style={{ marginBottom: '12px', padding: '8px', background: '#fff3e0', borderRadius: '4px' }}>
              <p style={{ color: '#e65100', fontWeight: '500', marginBottom: '4px' }}>
                Предупреждения ({previewData.warnings.length}):
              </p>
              <ul style={{ marginLeft: '20px', fontSize: '13px', color: '#e65100' }}>
                {previewData.warnings.slice(0, 5).map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
                {previewData.warnings.length > 5 && (
                  <li>...и ещё {previewData.warnings.length - 5} предупреждений</li>
                )}
              </ul>
            </div>
          )}

          <p style={{ color: '#d32f2f', marginBottom: '12px' }}>
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
