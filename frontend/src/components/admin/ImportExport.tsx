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
        `Import successful: ${response.data.imported_categories} categories, ${response.data.imported_events} events`
      );
      onImportSuccess();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Failed to import file. Please check the format.');
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
      setError('Failed to export data');
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
      <h3>Import / Export</h3>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="import-section">
        <h4>Import from Excel</h4>
        <p className="warning-text">
          Warning: Importing will replace all existing events and categories!
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
            Are you sure you want to import "{selectedFile?.name}"?
            <br />
            <strong>This will delete all existing data!</strong>
          </p>
          <div className="confirm-actions">
            <button className="btn-secondary" onClick={cancelImport}>
              Cancel
            </button>
            <button className="btn-danger" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing...' : 'Yes, Import'}
            </button>
          </div>
        </div>
      )}

      <div className="export-section">
        <h4>Export to Excel</h4>
        <p>Download all events and categories as an Excel file.</p>
        <button className="btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>
    </div>
  );
}

export default ImportExport;
