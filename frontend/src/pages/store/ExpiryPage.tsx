import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type ExpiryAlert } from '@/api/inventory';

function getStatusStyle(status: ExpiryAlert['alertStatus']) {
  switch (status) {
    case 'CRITICAL':
      return 'bg-red-50 border-red-400 text-red-800';
    case 'WARNING':
      return 'bg-yellow-50 border-yellow-400 text-yellow-800';
    case 'EXPIRED':
      return 'bg-gray-100 border-gray-400 text-gray-500 line-through';
    default:
      return 'bg-green-50 border-green-400 text-green-800';
  }
}

function getDaysUntilExpiry(expDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ExpiryPage() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const storeId = user?.storeId;
  const { t } = useTranslation();

  function getStatusBadge(status: ExpiryAlert['alertStatus']) {
    switch (status) {
      case 'CRITICAL':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-600 text-white">{t('expiry.statusCritical')}</span>;
      case 'WARNING':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-500 text-white">{t('expiry.statusWarning')}</span>;
      case 'EXPIRED':
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-500 text-white">{t('expiry.statusExpired')}</span>;
      default:
        return <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-500 text-white">{t('expiry.statusNormal')}</span>;
    }
  }

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getExpiryAlerts(storeId);
      setAlerts(res.data.data);
    } catch {
      toast.error(t('expiry.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { EXPIRED: 0, CRITICAL: 1, WARNING: 2, NORMAL: 3 };
    return order[a.alertStatus] - order[b.alertStatus];
  });

  const criticalCount = alerts.filter(a => a.alertStatus === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.alertStatus === 'WARNING').length;
  const expiredCount = alerts.filter(a => a.alertStatus === 'EXPIRED').length;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('expiry.title')}</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-sm text-red-600 font-medium">{t('expiry.critical')}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
          <div className="text-sm text-yellow-600 font-medium">{t('expiry.warning')}</div>
        </div>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-500">{expiredCount}</div>
          <div className="text-sm text-gray-500 font-medium">{t('expiry.expired')}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : sortedAlerts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
          {t('expiry.noAlerts')}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAlerts.map((alert) => {
            const daysLeft = getDaysUntilExpiry(alert.expDate);
            return (
              <div
                key={alert.id}
                className={`border-l-4 rounded-lg p-4 ${getStatusStyle(alert.alertStatus)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(alert.alertStatus)}
                    <span className="font-semibold text-lg">{t('expiry.itemPrefix', { id: alert.itemId })}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {daysLeft > 0 ? t('expiry.dMinus', { n: daysLeft }) : daysLeft === 0 ? t('expiry.dDay') : t('expiry.dPlus', { n: Math.abs(daysLeft) })}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-6 text-sm">
                  <span>{t('expiry.lot')}: {alert.lotNo || '-'}</span>
                  <span>{t('expiry.expDate')}: {alert.expDate}</span>
                  <span>{t('expiry.qty')}: {alert.qtyBaseUnit}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
