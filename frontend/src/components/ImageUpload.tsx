import { useState, useRef, type ChangeEvent } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '@/api/upload';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  onUploadComplete?: (fileUrl: string) => void;
  currentImageUrl?: string;
  className?: string;
}

export default function ImageUpload({ onUploadComplete, currentImageUrl, className = '' }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const { t } = useTranslation();

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('imageUpload.invalidType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t('imageUpload.tooLarge'));
      return;
    }

    setError(null);
    selectedFileRef.current = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    const file = selectedFileRef.current;
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const res = await uploadApi.getPresignedUrl(file.name, file.type);
      const { uploadUrl, fileUrl } = res.data.data;

      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      onUploadComplete?.(fileUrl);
      selectedFileRef.current = null;
    } catch {
      setError(t('imageUpload.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-slate-400 transition-colors min-h-[120px] flex items-center justify-center"
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="max-h-40 max-w-full object-contain rounded"
          />
        ) : (
          <div className="text-gray-400">
            <p className="text-sm">{t('imageUpload.selectImage')}</p>
            <p className="text-xs mt-1">{t('imageUpload.fileHint')}</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#0077cc] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {selectedFileRef.current && !uploading && (
        <Button
          size="sm"
          className="w-full bg-[#0077cc] hover:bg-[#005ea3]"
          onClick={handleUpload}
        >
          {t('imageUpload.uploadBtn')}
        </Button>
      )}

      {uploading && (
        <p className="text-sm text-gray-500 text-center">{t('imageUpload.uploading', { percent: progress })}</p>
      )}
    </div>
  );
}
