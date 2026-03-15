import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { orderingApi, type OrderDetailedResponse } from '@/api/ordering';
import OrderTimeline from '@/components/store/OrderTimeline';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

const fulfillmentSteps = ['PENDING', 'PREPARING', 'SHIPPING', 'DELIVERED'];

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetailedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await orderingApi.getPlanDetail(Number(id));
      setOrder(res.data.data);
    } catch {
      toast.error(t('ordering.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  async function handleCancel() {
    if (!order) return;
    setCancelling(true);
    try {
      await orderingApi.cancelPlan(order.id);
      toast.success(t('ordering.detailPage.cancelSuccess'));
      loadOrder();
    } catch {
      toast.error(t('ordering.detailPage.cancelFailed'));
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  }

  async function handleReorder() {
    if (!order) return;
    try {
      await orderingApi.reorder(order.id, storeId);
      toast.success(t('ordering.history.reorderSuccess'));
      navigate('/store/ordering/new');
    } catch {
      toast.error(t('ordering.history.reorderFailed'));
    }
  }

  async function handleDownloadPdf() {
    if (!order) return;
    try {
      const res = await orderingApi.downloadPdf(order.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-${order.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('ordering.downloadFailed'));
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const canEdit = order?.status === 'CONFIRMED' && order.cutoffAt && new Date(order.cutoffAt) > new Date();
  const canCancel = (order?.status === 'CONFIRMED' || order?.status === 'DRAFT') && (!order?.cutoffAt || new Date(order.cutoffAt) > new Date());

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  if (!order) return <div className="text-center py-12 text-gray-400">{t('ordering.detailPage.notFound')}</div>;

  const lineTotal = order.lines.reduce((sum, l) => sum + l.price * l.packQty, 0);
  const vat = order.vatAmount ?? Math.round(lineTotal * 0.1);
  const total = (order.totalAmount ?? lineTotal) + vat;

  const fulfillmentIndex = order.fulfillmentStatus ? fulfillmentSteps.indexOf(order.fulfillmentStatus) : -1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t('common.back')}
          </Button>
          <h2 className="text-xl font-bold">#{order.id}</h2>
          <Badge className={statusColor[order.status] || ''}>
            {t(`ordering.status.${order.status}`)}
          </Badge>
        </div>
      </div>

      {/* Order Timeline */}
      <Card>
        <CardContent className="py-4">
          <OrderTimeline
            status={order.status}
            createdAt={order.createdAt}
            confirmedAt={order.confirmedAt}
            dispatchedAt={order.dispatchedAt}
            receivedAt={order.receivedAt}
          />
        </CardContent>
      </Card>

      {/* Fulfillment status tracker */}
      {order.fulfillmentStatus && order.status !== 'CANCELLED' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('ordering.detailPage.fulfillment')}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center justify-between">
              {fulfillmentSteps.map((step, idx) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx <= fulfillmentIndex ? 'bg-slate-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {idx <= fulfillmentIndex ? '\u2713' : idx + 1}
                    </div>
                    <span className={`text-xs mt-1 ${idx <= fulfillmentIndex ? 'text-slate-700 font-medium' : 'text-gray-400'}`}>
                      {t(`ordering.fulfillment.${step}`)}
                    </span>
                  </div>
                  {idx < fulfillmentSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${idx < fulfillmentIndex ? 'bg-slate-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order info */}
      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('ordering.supplier')}</span>
            <span className="font-medium">{order.supplierName}</span>
          </div>
          {order.deliveryDate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('ordering.steps.deliveryDate')}</span>
              <span className="font-medium">{formatDate(order.deliveryDate)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('ordering.created')}</span>
            <span className="font-medium">{formatDateTime(order.createdAt)}</span>
          </div>
          {order.cutoffAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('ordering.steps.cutoff')}</span>
              <span className={`font-medium ${canEdit ? 'text-amber-600' : 'text-gray-500'}`}>
                {formatDateTime(order.cutoffAt)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('ordering.detailPage.items')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {order.lines.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{line.itemName}</p>
                  <p className="text-xs text-gray-500">{line.packName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">{line.packQty} x {'\u20A9'}{line.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{'\u20A9'}{(line.packQty * line.price).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('ordering.cart.subtotal')}</span>
              <span>{'\u20A9'}{lineTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('ordering.steps.vat')}</span>
              <span>{'\u20A9'}{vat.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>{t('ordering.cart.total')}</span>
              <span>{'\u20A9'}{total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canCancel && (
          <Button variant="outline" className="min-h-[44px] text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setShowCancelDialog(true)}>
            {t('ordering.detailPage.cancel')}
          </Button>
        )}
        <Button variant="outline" className="min-h-[44px]" onClick={handleDownloadPdf}>
          {t('ordering.downloadPdf')}
        </Button>
        <Button variant="outline" className="min-h-[44px]" onClick={handleReorder}>
          {t('ordering.history.reorder')}
        </Button>
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('ordering.detailPage.cancelTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('ordering.detailPage.cancelDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.no')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? t('common.processing') : t('common.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
