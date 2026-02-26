import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromConstraints(
        { audio: false, video: { facingMode: 'environment' } },
        videoRef.current!,
        (result, err) => {
          if (result) {
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            onScan(result.getText());
          }
          if (err && !(err instanceof TypeError)) {
            // NotFoundException is normal during scanning, ignore it
          }
        }
      )
      .catch(() => {
        setError(t('barcode.cameraDenied'));
        toast.error(t('barcode.accessDenied'));
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      });

    return () => {
      reader.reset();
    };
  }, [onScan, t]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <span className="text-white font-medium">{t('barcode.title')}</span>
        <Button variant="outline" size="sm" onClick={onClose} className="text-white border-white">
          {t('common.close')}
        </Button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-white text-center p-4">
          <div>
            <p className="text-lg mb-2">{error}</p>
            <p className="text-sm text-gray-400">{t('barcode.cameraHint')}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 border-2 border-white/60 rounded-lg">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
            </div>
          </div>
          <div className="absolute bottom-8 left-0 right-0 text-center">
            <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
              {t('barcode.instruction')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
