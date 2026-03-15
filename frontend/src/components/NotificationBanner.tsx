import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { subscribeToPush } from '@/api/push';
import { useAuthStore } from '@/store/authStore';

export default function NotificationBanner() {
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const { t } = useTranslation();

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'default') {
      const dismissed = sessionStorage.getItem('push-banner-dismissed');
      if (!dismissed) {
        setVisible(true);
      }
    }
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setStatus('loading');
    const success = await subscribeToPush(user?.userId ?? 0);
    if (success) {
      setStatus('done');
      setTimeout(() => setVisible(false), 1500);
    } else {
      setStatus('idle');
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('push-banner-dismissed', '1');
    setVisible(false);
  };

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
      <p className="text-sm text-slate-700">
        {status === 'done'
          ? t('notification.enabled')
          : t('notification.prompt')}
      </p>
      {status !== 'done' && (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
          >
            {t('common.later')}
          </Button>
          <Button
            size="sm"
            className="bg-slate-700 hover:bg-slate-800"
            onClick={handleEnable}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? t('common.enabling') : t('notification.enableBtn')}
          </Button>
        </div>
      )}
    </div>
  );
}
