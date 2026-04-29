import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { orderingApi, type OrderDetailedResponse } from '@/api/ordering';
import { formatCurrency } from '@/lib/currency';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CUTOFF_CLOSED: 'bg-purple-100 text-purple-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

export default function AdminOrderDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const cameFrom = (location.state as { from?: string } | null)?.from;
  const backTarget = cameFrom === 'calendar' ? '/admin/ordering/calendar' : '/admin/ordering';
  const [order, setOrder] = useState<OrderDetailedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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

  const formatDate = (s: string | null) => {
    if (!s) return '-';
    return new Date(s + (s.includes('T') ? '' : 'T00:00:00')).toLocaleDateString();
  };
  const formatDateTime = (s: string | null) => {
    if (!s) return '-';
    return new Date(s).toLocaleString();
  };

  const handleDownloadPdf = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const res = await orderingApi.downloadPdf(order.id);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${order.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch {
      toast.error(t('ordering.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  if (!order) return <div className="text-center py-12 text-gray-400">{t('ordering.detailPage.notFound', { defaultValue: '주문을 찾을 수 없습니다' })}</div>;

  const lineTotal = order.lines.reduce((sum, l) => sum + l.price * l.packQty, 0);
  const vat = order.vatAmount ?? Math.round(lineTotal * 0.1);
  const total = (order.totalAmount ?? lineTotal) + vat;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(backTarget)}>
            {t('common.back', { defaultValue: '뒤로' })}
          </Button>
          <h2 className="text-xl font-bold">{t('orderAdmin.orderDetail', { defaultValue: '발주 상세' })} #{order.id}</h2>
          <Badge className={statusColor[order.status] || ''}>
            {t(`ordering.status.${order.status}`, order.status)}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading}>
          {downloading ? t('common.loading') : 'PDF'}
        </Button>
      </div>

      {/* Order info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('orderAdmin.orderInfo', { defaultValue: '발주 정보' })}</CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500">{t('orderAdmin.storeName')}</span>
              <span className="font-medium">{order.storeName || `#${order.storeId}`}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">{t('orderAdmin.supplierName')}</span>
              <span className="font-medium">{order.supplierName}</span>
            </div>
            {order.deliveryDate && (
              <div className="flex flex-col">
                <span className="text-gray-500">{t('orderAdmin.deliveryDate')}</span>
                <span className="font-medium">{formatDate(order.deliveryDate)}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-gray-500">{t('ordering.created')}</span>
              <span className="font-medium">{formatDateTime(order.createdAt)}</span>
            </div>
            {order.cutoffAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">{t('ordering.steps.cutoff', { defaultValue: '마감' })}</span>
                <span className="font-medium">{formatDateTime(order.cutoffAt)}</span>
              </div>
            )}
            {order.fulfillmentStatus && (
              <div className="flex flex-col">
                <span className="text-gray-500">{t('ordering.detailPage.fulfillment', { defaultValue: '배송 상태' })}</span>
                <span className="font-medium">{t(`ordering.fulfillment.${order.fulfillmentStatus}`, order.fulfillmentStatus)}</span>
              </div>
            )}
            {order.confirmedAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">{t('ordering.confirmedAt', { defaultValue: '확정일시' })}</span>
                <span className="font-medium">{formatDateTime(order.confirmedAt)}</span>
              </div>
            )}
            {order.dispatchedAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">{t('ordering.dispatchedAt', { defaultValue: '출고일시' })}</span>
                <span className="font-medium">{formatDateTime(order.dispatchedAt)}</span>
              </div>
            )}
            {order.receivedAt && (
              <div className="flex flex-col">
                <span className="text-gray-500">{t('ordering.receivedAt', { defaultValue: '입고일시' })}</span>
                <span className="font-medium">{formatDateTime(order.receivedAt)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lines: desktop table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('ordering.detailPage.items', { defaultValue: '품목' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item', { defaultValue: '상품' })}</TableHead>
                  <TableHead>{t('ordering.pack', { defaultValue: '포장' })}</TableHead>
                  <TableHead className="text-right">{t('ordering.orderQty', { defaultValue: '수량' })}</TableHead>
                  <TableHead className="text-right">{t('items.price')}</TableHead>
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
                  <p className="text-sm font-medium">{line.packQty} × {formatCurrency(line.price, line.currency)}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(line.packQty * line.price, line.currency)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('ordering.cart.subtotal', { defaultValue: '소계' })}</span>
              <span>{formatCurrency(lineTotal, order.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('ordering.steps.vat', { defaultValue: '부가세' })}</span>
              <span>{formatCurrency(vat, order.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>{t('ordering.cart.total', { defaultValue: '합계' })}</span>
              <span>{formatCurrency(total, order.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
