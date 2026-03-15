import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { downloadTemplate, uploadFile, confirmBatch, getUploadHistory } from '@/api/bulkUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface ValidationResult {
  batchId: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

interface UploadRecord {
  id: number;
  type: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  status: string;
  createdAt: string;
}

const UPLOAD_TYPES = ['ITEMS', 'PACKAGINGS', 'SUPPLIERS', 'INVENTORY'];

export default function BulkUploadPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadType, setUploadType] = useState(UPLOAD_TYPES[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const result = await getUploadHistory();
      setHistory(result.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTemplate(uploadType);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${uploadType.toLowerCase()}_template.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('bulkUpload.downloadFailed'));
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setValidationResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const result = await uploadFile(selectedFile, uploadType);
      setValidationResult(result.data || result);
      if ((result.data?.errorRows ?? result?.errorRows ?? 0) === 0) {
        toast.success(t('bulkUpload.validationSuccess'));
      } else {
        toast.warning(t('bulkUpload.validationWarning'));
      }
    } catch {
      toast.error(t('bulkUpload.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!validationResult) return;
    setConfirming(true);
    try {
      await confirmBatch(validationResult.batchId);
      toast.success(t('bulkUpload.confirmSuccess'));
      setValidationResult(null);
      setSelectedFile(null);
      loadHistory();
    } catch {
      toast.error(t('bulkUpload.confirmFailed'));
    } finally {
      setConfirming(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge className="bg-green-100 text-green-800">{t('bulkUpload.statusCompleted')}</Badge>;
      case 'PARTIAL': return <Badge className="bg-amber-100 text-amber-800">{t('bulkUpload.statusPartial')}</Badge>;
      case 'FAILED': return <Badge variant="destructive">{t('bulkUpload.statusFailed')}</Badge>;
      case 'PENDING': return <Badge variant="outline">{t('bulkUpload.statusPending')}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('bulkUpload.title')}</h2>

      {/* Upload type selection */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold mb-3">{t('bulkUpload.selectType')}</h3>
          <div className="flex flex-wrap gap-3">
            {UPLOAD_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="uploadType"
                  value={type}
                  checked={uploadType === type}
                  onChange={() => setUploadType(type)}
                  className="w-4 h-4 text-slate-700"
                />
                <span className="text-sm">{t(`bulkUpload.type.${type}`)}</span>
              </label>
            ))}
          </div>

          {/* Template download */}
          <Button variant="outline" onClick={handleDownloadTemplate} className="mt-4">
            {t('bulkUpload.downloadTemplate')}
          </Button>
        </CardContent>
      </Card>

      {/* File drop zone */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-slate-700 bg-slate-50' : 'border-gray-300 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />
            <div className="text-4xl text-gray-300 mb-2">{'\u2B06'}</div>
            <p className="text-sm text-gray-500">{t('bulkUpload.dropzone')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('bulkUpload.fileHint')}</p>
          </div>

          {selectedFile && (
            <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-slate-700 hover:bg-slate-800"
              >
                {uploading ? t('common.processing') : t('bulkUpload.upload')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation results */}
      {validationResult && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <h3 className="text-lg font-semibold mb-3">{t('bulkUpload.validationResults')}</h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{validationResult.totalRows}</p>
                <p className="text-xs text-gray-500">{t('bulkUpload.totalRows')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{validationResult.validRows}</p>
                <p className="text-xs text-gray-500">{t('bulkUpload.validRows')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{validationResult.errorRows}</p>
                <p className="text-xs text-gray-500">{t('bulkUpload.errorRows')}</p>
              </div>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 mb-4 max-h-48 overflow-y-auto">
                {validationResult.errors.map((err, idx) => (
                  <p key={idx} className="text-sm text-red-600">
                    {t('bulkUpload.errorLine', { row: err.row })}: [{err.field}] {err.message}
                  </p>
                ))}
              </div>
            )}

            {validationResult.validRows > 0 && (
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full bg-green-700 hover:bg-green-800 min-h-[44px]"
              >
                {confirming ? t('common.processing') : t('bulkUpload.confirmUpload', { count: validationResult.validRows })}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload history */}
      {history.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('bulkUpload.history')}</h3>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bulkUpload.typeLabel')}</TableHead>
                  <TableHead>{t('bulkUpload.fileName')}</TableHead>
                  <TableHead className="text-right">{t('bulkUpload.totalRows')}</TableHead>
                  <TableHead className="text-right">{t('bulkUpload.successRows')}</TableHead>
                  <TableHead className="text-right">{t('bulkUpload.errorRows')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('bulkUpload.uploadedAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{t(`bulkUpload.type.${record.type}`)}</TableCell>
                    <TableCell className="font-medium">{record.fileName}</TableCell>
                    <TableCell className="text-right">{record.totalRows}</TableCell>
                    <TableCell className="text-right text-green-700">{record.successRows}</TableCell>
                    <TableCell className="text-right text-red-600">{record.errorRows}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(record.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {history.map((record) => (
              <Card key={record.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{record.fileName}</p>
                      <p className="text-xs text-gray-500">{t(`bulkUpload.type.${record.type}`)}</p>
                    </div>
                    {getStatusBadge(record.status)}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{t('bulkUpload.totalRows')}: {record.totalRows}</span>
                    <span className="text-green-700">{t('bulkUpload.successRows')}: {record.successRows}</span>
                    <span className="text-red-600">{t('bulkUpload.errorRows')}: {record.errorRows}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
