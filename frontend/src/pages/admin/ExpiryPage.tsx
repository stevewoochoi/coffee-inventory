import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type ExpiryAlert } from '@/api/inventory';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function getStatusBadge(status: ExpiryAlert['alertStatus']) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    WARNING: 'bg-yellow-500 text-white',
    EXPIRED: 'bg-gray-500 text-white',
    NORMAL: 'bg-green-500 text-white',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function AdminExpiryPage() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const load = useCallback(async () => {
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

  useEffect(() => { load(); }, [load]);

  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { EXPIRED: 0, CRITICAL: 1, WARNING: 2, NORMAL: 3 };
    return order[a.alertStatus] - order[b.alertStatus];
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{t('expiry.overview')}</h2>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : sortedAlerts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">{t('expiry.noAlerts')}</div>
      ) : (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('ordering.store')}</TableHead>
                  <TableHead>{t('ordering.item')}</TableHead>
                  <TableHead>{t('expiry.lot')}</TableHead>
                  <TableHead>{t('expiry.expDate')}</TableHead>
                  <TableHead>{t('expiry.qty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAlerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    className={alert.alertStatus === 'EXPIRED' ? 'line-through text-gray-400' : ''}
                  >
                    <TableCell>{getStatusBadge(alert.alertStatus)}</TableCell>
                    <TableCell>{t('expiry.storePrefix', { id: alert.storeId })}</TableCell>
                    <TableCell className="font-medium">{t('expiry.itemPrefix', { id: alert.itemId })}</TableCell>
                    <TableCell>{alert.lotNo || '-'}</TableCell>
                    <TableCell>{alert.expDate}</TableCell>
                    <TableCell>{alert.qtyBaseUnit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden space-y-2">
            {sortedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg border p-4 ${alert.alertStatus === 'EXPIRED' ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(alert.alertStatus)}
                  <span className="text-sm text-gray-500">{alert.expDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t('expiry.itemPrefix', { id: alert.itemId })}</div>
                    <div className="text-sm text-gray-500">
                      {t('expiry.storePrefix', { id: alert.storeId })} · {t('expiry.lot')}: {alert.lotNo || '-'}
                    </div>
                  </div>
                  <span className="font-bold text-lg">{alert.qtyBaseUnit}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
