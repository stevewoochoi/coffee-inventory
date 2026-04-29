import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { warehouseApi, type WarehouseOrderDetail } from '@/api/warehouse';
import { formatCurrency } from '@/lib/currency';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CUTOFF_CLOSED: 'bg-purple-100 text-purple-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
};

export default function WarehouseOrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const warehouseIdParam = searchParams.get('warehouseId');
  const warehouseId = warehouseIdParam ? Number(warehouseIdParam) : null;
  const { t } = useTranslation();

  const [order, setOrder] = useState<WarehouseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id || !warehouseId) return;
    setLoading(true);
    try {
      const res = await warehouseApi.getOrder(warehouseId, Number(id));
      setOrder(res.data.data);
    } catch {
      toast.error(t('warehouseOrder.loadFailed', { defaultValue: '발주를 불러올 수 없습니다' }));
    } finally {
      setLoading(false);
    }
  }, [id, warehouseId, t]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const formatDate = (s: string | null | undefined) => {
    if (!s) return '-';
    return new Date(s + (s.includes('T') ? '' : 'T00:00:00')).toLocaleDateString();
  };
  const formatDateTime = (s: string | null | undefined) => {
    if (!s) return '-';
    return new Date(s).toLocaleString();
  };

  const handleCancel = async () => {
    if (!warehouseId || !id) return;
    setCancelling(true);
    try {
      await warehouseApi.cancelOrder(warehouseId, Number(id));
      toast.success(t('warehouseOrder.cancelSuccess', { defaultValue: '발주가 취소되었습니다' }));
      setShowCancelDialog(false);
      loadOrder();
    } catch {
      toast.error(t('warehouseOrder.cancelFailed', { defaultValue: '발주 취소 실패' }));
    } finally {
      setCancelling(false);
    }
  };

  if (!warehouseId) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('warehouseOrder.warehouseIdMissing', { defaultValue: 'warehouseId 쿼리 파라미터가 필요합니다' })}
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading', { defaultValue: '로딩 중...' })}</div>;
  }
  if (!order) {
    return (
      <div className="text-center py-12 text-gray-400">
        {t('warehouseOrder.notFound', { defaultValue: '발주를 찾을 수 없습니다' })}
      </div>
    );
  }

  const lineTotal = order.lines.reduce((sum, l) => sum + l.price * l.packQty, 0);
  const vat = order.vatAmount ?? Math.round(lineTotal * 0.1);
  const total = (order.totalAmount ?? lineTotal) + vat;

  const canCancel = order.status === 'DRAFT' || order.status === 'CONFIRMED';
  const canReceive = order.status === 'DISPATCHED' || order.status === 'PARTIALLY_RECEIVED';

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/warehouse-inventory')}
          >
            {t('common.back', { defaultValue: '< 뒤로' })}
          </Button>
          <h2 className="text-xl font-bold">
            {t('warehouseOrder.detailTitle', { defaultValue: '발주' })} #{order.id}
          </h2>
          <Badge className={statusColor[order.status] || ''}>
            {t(`ordering.status.${order.status}`, { defaultValue: order.status })}
          </Badge>
        </div>
      </div>

      {/* Order info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {t('warehouseOrder.orderInfo', { defaultValue: '발주 정보' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500">
                {t('warehouseOrder.supplier', { defaultValue: '공급사' })}
              </span>
              <span className="font-medium">{order.supplierName}</span>
            </div>
            {order.deliveryDate && (
              <div className="flex flex-col">
                <span className="text-gray-500">
                  {t('orderAdmin.deliveryDate', { defaultValue: '납품일' })}
                </span>
                <span className="font-medium">{formatDate(order.deliveryDate)}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-gray-500">
                {t('ordering.created', { defaultValue: '생성' })}
              </span>
              <span className="font-medium">{formatDateTime(order.createdAt)}</span>
            </div>
            {order.cutoffAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">
                  {t('ordering.steps.cutoff', { defaultValue: '마감' })}
                </span>
                <span className="font-medium">{formatDateTime(order.cutoffAt)}</span>
              </div>
            )}
            {order.confirmedAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">
                  {t('ordering.confirmedAt', { defaultValue: '확정' })}
                </span>
                <span className="font-medium">{formatDateTime(order.confirmedAt)}</span>
              </div>
            )}
            {order.dispatchedAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">
                  {t('ordering.dispatchedAt', { defaultValue: '출고' })}
                </span>
                <span className="font-medium">{formatDateTime(order.dispatchedAt)}</span>
              </div>
            )}
            {order.receivedAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">
                  {t('ordering.receivedAt', { defaultValue: '입고' })}
                </span>
                <span className="font-medium">{formatDateTime(order.receivedAt)}</span>
              </div>
            )}
            {order.fulfillmentStatus && (
              <div className="flex flex-col">
                <span className="text-gray-500">
                  {t('ordering.detailPage.fulfillment', { defaultValue: '배송 상태' })}
                </span>
                <span className="font-medium">
                  {t(`ordering.fulfillment.${order.fulfillmentStatus}`, { defaultValue: order.fulfillmentStatus })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {t('ordering.detailPage.items', { defaultValue: '품목' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item', { defaultValue: '상품' })}</TableHead>
                  <TableHead>{t('ordering.pack', { defaultValue: '포장' })}</TableHead>
                  <TableHead className="text-right">{t('ordering.orderQty', { defaultValue: '수량' })}</TableHead>
                  <TableHead className="text-right">{t('items.price', { defaultValue: '단가' })}</TableHead>
                  <TableHead className="text-right">{t('ordering.cart.subtotal', { defaultValue: '소계' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{line.itemName}</TableCell>
                    <TableCell>{line.packName}</TableCell>
                    <TableCell className="text-right">{line.packQty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.price, line.currency)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(line.price * line.packQty, line.currency)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell colSpan={4} className="text-right">
                    {t('ordering.cart.total', { defaultValue: '합계' })}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(total, order.currency)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {order.lines.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{line.itemName}</p>
                  <p className="text-xs text-gray-500">{line.packName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">
                    {line.packQty} × {formatCurrency(line.price, line.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(line.packQty * line.price, line.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {t('ordering.cart.subtotal', { defaultValue: '소계' })}
              </span>
              <span>{formatCurrency(lineTotal, order.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {t('ordering.steps.vat', { defaultValue: '부가세' })}
              </span>
              <span>{formatCurrency(vat, order.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>{t('ordering.cart.total', { defaultValue: '합계' })}</span>
              <span>{formatCurrency(total, order.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {(canCancel || canReceive) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-2 justify-end">
              {canCancel && (
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancelDialog(true)}
                >
                  {t('warehouseOrder.cancelOrder', { defaultValue: '발주 취소' })}
                </Button>
              )}
              {canReceive && (
                <Button
                  className="bg-[#0077cc] hover:bg-[#005ea3]"
                  onClick={() => navigate(`/admin/warehouse-inventory/receiving/${order.id}?warehouseId=${warehouseId}`)}
                >
                  {t('warehouseOrder.goToReceiving', { defaultValue: '입고처리로 이동' })}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('warehouseOrder.cancelTitle', { defaultValue: '발주 취소' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('warehouseOrder.cancelDesc', { defaultValue: '이 발주를 취소하시겠습니까? 되돌릴 수 없습니다.' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', { defaultValue: '취소' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling
                ? t('common.processing', { defaultValue: '처리 중...' })
                : t('common.confirm', { defaultValue: '확인' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
