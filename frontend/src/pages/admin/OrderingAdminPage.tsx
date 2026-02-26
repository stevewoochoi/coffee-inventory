import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { orderingApi, type OrderPlan } from '@/api/ordering';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrderingAdminPage() {
  const [plans, setPlans] = useState<OrderPlan[]>([]);
  const [storeId, setStoreId] = useState('1');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await orderingApi.getPlans(Number(storeId));
      setPlans(res.data.data);
    } catch {
      toast.error(t('ordering.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t('ordering.allOrders')}</h2>

      <div className="flex items-center gap-3">
        <input
          type="number"
          placeholder={t('ordering.storeIdPlaceholder')}
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="border rounded px-3 py-1.5 w-32 text-sm"
        />
        <button
          onClick={loadPlans}
          className="px-4 py-1.5 bg-blue-800 text-white rounded text-sm hover:bg-blue-900"
        >
          {t('common.search')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-gray-400">{t('ordering.noOrdersFound')}</div>
      ) : (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.id')}</TableHead>
                  <TableHead>{t('ordering.store')}</TableHead>
                  <TableHead>{t('ordering.supplier')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('ordering.ai')}</TableHead>
                  <TableHead>{t('ordering.created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">#{plan.id}</TableCell>
                    <TableCell>{plan.storeId}</TableCell>
                    <TableCell>{plan.supplierId}</TableCell>
                    <TableCell>
                      <Badge className={statusColor[plan.status] || ''}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.recommendedByAi ? t('common.yes') : '-'}</TableCell>
                    <TableCell>{new Date(plan.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">#{plan.id}</span>
                  <Badge className={statusColor[plan.status] || ''}>
                    {plan.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <div className="text-gray-500">{t('ordering.store')}: {plan.storeId}</div>
                  <div className="text-gray-500">{t('ordering.supplier')}: {plan.supplierId}</div>
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-gray-400">{new Date(plan.createdAt).toLocaleDateString()}</span>
                  {plan.recommendedByAi && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{t('ordering.ai')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
