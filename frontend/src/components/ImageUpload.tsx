import { useState, useRef, type ChangeEvent } from 'react';
import axios from 'axios';
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

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
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
      // 1. Get presigned URL from our backend
      const res = await uploadApi.getPresignedUrl(file.name, file.type);
      const { uploadUrl, fileUrl } = res.data.data;

      // 2. Upload directly to the presigned URL
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      // 3. Notify parent of successful upload
      onUploadComplete?.(fileUrl);
      selectedFileRef.current = null;
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Clickable area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors min-h-[120px] flex items-center justify-center"
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
            <p className="text-sm">Click to select an image</p>
            <p className="text-xs mt-1">JPG, PNG up to 5MB</p>
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

      {/* Progress bar */}
      {uploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Upload button */}
      {selectedFileRef.current && !uploading && (
        <Button
          size="sm"
          className="w-full bg-blue-800 hover:bg-blue-900"
          onClick={handleUpload}
        >
          Upload Image
        </Button>
      )}

      {uploading && (
        <p className="text-sm text-gray-500 text-center">{progress}% uploaded...</p>
      )}
    </div>
  );
}
