import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { orderingApi, type OrderPlan, type OrderHistory } from '@/api/ordering';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

export default function OrderingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<OrderPlan[]>([]);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  useEffect(() => {
    loadPlans();
    loadHistory();
  }, []);

  async function loadPlans() {
    try {
      const res = await orderingApi.getPlans(storeId);
      setPlans(res.data.data);
    } catch {
      toast.error(t('ordering.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    try {
      const res = await orderingApi.getOrderHistory(storeId, 5);
      setHistory(res.data.data);
    } catch {
      // silently fail for history
    }
  }

  async function handleConfirm(id: number) {
    try {
      await orderingApi.confirmPlan(id);
      toast.success(t('ordering.orderConfirmed'));
      loadPlans();
    } catch { toast.error(t('ordering.confirmFailed')); }
  }

  async function handleDispatch(id: number) {
    try {
      await orderingApi.dispatchPlan(id);
      toast.success(t('ordering.orderDispatched'));
      loadPlans();
    } catch { toast.error(t('ordering.dispatchFailed')); }
  }

  async function handleDownloadPdf(id: number) {
    try {
      const res = await orderingApi.downloadPdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('ordering.downloadFailed'));
    }
  }

  async function handleReorder(orderId: number) {
    try {
      await orderingApi.reorder(orderId, storeId);
      toast.success(t('ordering.history.reorderSuccess'));
      navigate('/store/ordering/new');
    } catch {
      toast.error(t('ordering.history.reorderFailed'));
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('ordering.title')}</h2>
        <Button
          size="lg"
          className="bg-blue-800 hover:bg-blue-900 text-base px-6 py-3"
          onClick={() => navigate('/store/ordering/new')}
        >
          {t('ordering.newOrder')}
        </Button>
      </div>

      {/* Recent Orders - Quick Reorder */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t('ordering.history.title')}</CardTitle>
              <span className="text-gray-400 text-sm">{showHistory ? '▲' : '▼'}</span>
            </div>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-2">
              {history.map((order) => (
                <div key={order.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold">#{order.id}</span>
                      <span className="text-gray-500 ml-2">{order.supplierName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor[order.status] || ''}>
                        {t(`ordering.status.${order.status}`)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[36px]"
                        onClick={() => handleReorder(order.id)}
                      >
                        {t('ordering.history.reorder')}
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.lines.map(l => `${l.itemName} x${l.packQty}`).join(', ')}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {plans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('ordering.noOrders')}</div>
      ) : (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.id')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('ordering.created')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">#{plan.id}</TableCell>
                    <TableCell>
                      <Badge className={statusColor[plan.status] || ''}>
                        {t(`ordering.status.${plan.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(plan.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2">
                      {plan.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfirm(plan.id)}
                        >
                          {t('common.confirm')}
                        </Button>
                      )}
                      {plan.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          className="bg-blue-800 hover:bg-blue-900"
                          onClick={() => handleDispatch(plan.id)}
                        >
                          {t('ordering.dispatch')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPdf(plan.id)}
                      >
                        {t('ordering.downloadPdf')}
                      </Button>
                    </TableCell>
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
                    {t(`ordering.status.${plan.status}`)}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500 mb-3">
                  {new Date(plan.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {plan.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-[44px]"
                      onClick={() => handleConfirm(plan.id)}
                    >
                      {t('common.confirm')}
                    </Button>
                  )}
                  {plan.status === 'CONFIRMED' && (
                    <Button
                      size="sm"
                      className="bg-blue-800 hover:bg-blue-900 min-h-[44px]"
                      onClick={() => handleDispatch(plan.id)}
                    >
                      {t('ordering.dispatch')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => handleDownloadPdf(plan.id)}
                  >
                    {t('ordering.downloadPdf')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
