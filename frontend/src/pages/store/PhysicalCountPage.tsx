import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { physicalCountApi, type PhysicalCount } from '@/api/physicalCount';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function getStatusBadge(status: PhysicalCount['status']) {
  const styles: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-500 text-white',
    COMPLETED: 'bg-green-500 text-white',
    CANCELLED: 'bg-gray-500 text-white',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function PhysicalCountPage() {
  const [counts, setCounts] = useState<PhysicalCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await physicalCountApi.getHistory(storeId);
      setCounts(res.data.data);
    } catch {
      toast.error(t('physicalCount.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    try {
      setStarting(true);
      const res = await physicalCountApi.start(storeId, user?.userId ?? 1);
      navigate(`/store/physical-count/${res.data.data.id}`);
    } catch {
      toast.error(t('physicalCount.startFailed'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">{t('physicalCount.title')}</h2>
        <button
          onClick={handleStart}
          disabled={starting}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg"
        >
          {starting ? t('physicalCount.starting') : t('physicalCount.newCount')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : counts.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">{t('physicalCount.noRecords')}</div>
      ) : (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.id')}</TableHead>
                  <TableHead>{t('physicalCount.date')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('physicalCount.items')}</TableHead>
                  <TableHead>{t('physicalCount.completed')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/store/physical-count/${c.id}`)}>
                    <TableCell className="font-medium">#{c.id}</TableCell>
                    <TableCell>{c.countDate}</TableCell>
                    <TableCell>{getStatusBadge(c.status)}</TableCell>
                    <TableCell>{c.lines.length} {t('physicalCount.items').toLowerCase()}</TableCell>
                    <TableCell className="text-gray-500">
                      {c.completedAt ? new Date(c.completedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-600 text-sm">{t('common.view')}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden space-y-2">
            {counts.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-lg border p-4 cursor-pointer active:bg-gray-50"
                onClick={() => navigate(`/store/physical-count/${c.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">#{c.id}</span>
                  {getStatusBadge(c.status)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{c.countDate}</span>
                  <span className="text-gray-500">{c.lines.length} {t('physicalCount.items').toLowerCase()}</span>
                </div>
                {c.completedAt && (
                  <div className="text-xs text-gray-400 mt-1">
                    {t('physicalCount.completed')}: {new Date(c.completedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
