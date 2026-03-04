import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getSupplierOrders, notifySupplier, getNotifications } from '@/api/supplierPortal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface OrderLine {
  packagingId: number;
  packName: string;
  itemName: string;
  packQty: number;
  unitsPerPack: number;
  price: number;
}

interface OrderDetail {
  id: number;
  storeName: string;
  status: string;
  deliveryDate: string | null;
  totalAmount: number;
  vatAmount: number;
  lines: OrderLine[];
  createdAt: string;
}

interface NotificationRecord {
  id: number;
  type: string;
  message: string;
  createdAt: string;
  sentBy: string;
}

const NOTIFICATION_TYPES = ['SHIPPING_UPDATE', 'DELAY_NOTICE', 'STOCK_ISSUE', 'GENERAL'];

export default function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const supplierId = user?.userId ?? 1;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyType, setNotifyType] = useState(NOTIFICATION_TYPES[0]);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Load all orders and find the specific one
      const result = await getSupplierOrders(supplierId);
      const orders = result.data || [];
      const found = orders.find((o: OrderDetail) => o.id === Number(id));
      setOrder(found || null);
    } catch {
      toast.error(t('supplierPortal.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, supplierId, t]);

  const loadNotifications = useCallback(async () => {
    if (!id) return;
    try {
      const result = await getNotifications(Number(id));
      setNotifications(result.data || []);
    } catch { /* non-critical */ }
  }, [id]);

  useEffect(() => { loadOrder(); loadNotifications(); }, [loadOrder, loadNotifications]);

  const handleNotify = async () => {
    if (!id || !notifyMessage.trim()) return;
    setSending(true);
    try {
      await notifySupplier(Number(id), supplierId, notifyType, notifyMessage);
      toast.success(t('supplierPortal.notifySuccess'));
      setNotifyDialogOpen(false);
      setNotifyMessage('');
      loadNotifications();
    } catch {
      toast.error(t('supplierPortal.notifyFailed'));
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <Badge className="bg-amber-100 text-amber-800">{t(`ordering.status.${status}`)}</Badge>;
      case 'DISPATCHED': return <Badge className="bg-blue-100 text-blue-800">{t(`ordering.status.${status}`)}</Badge>;
      case 'DELIVERED': return <Badge className="bg-green-100 text-green-800">{t(`ordering.status.${status}`)}</Badge>;
      default: return <Badge variant="outline">{t(`ordering.status.${status}`)}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('supplierPortal.orderNotFound')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/supplier-portal/orders')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {t('supplierPortal.orderDetail')} #{order.id}
        </h2>
        <Button variant="outline" onClick={() => navigate('/supplier-portal/orders')}>
          {t('common.back')}
        </Button>
      </div>

      {/* Order info */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('common.status')}</p>
              {getStatusBadge(order.status)}
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('ordering.store')}</p>
              <p className="font-medium">{order.storeName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('supplierPortal.deliveryDate')}</p>
              <p className="font-medium">{order.deliveryDate || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('ordering.cart.total')}</p>
              <p className="font-bold">{'\u20A9'}{(order.totalAmount ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order lines */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <h3 className="text-lg font-semibold mb-3">{t('supplierPortal.orderItems')}</h3>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item')}</TableHead>
                  <TableHead>{t('ordering.pack')}</TableHead>
                  <TableHead className="text-right">{t('ordering.orderQty')}</TableHead>
                  <TableHead className="text-right">{t('items.price')}</TableHead>
                  <TableHead className="text-right">{t('ordering.cart.subtotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.lines || []).map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{line.itemName}</TableCell>
                    <TableCell>{line.packName}</TableCell>
                    <TableCell className="text-right">{line.packQty}</TableCell>
                    <TableCell className="text-right">{'\u20A9'}{(line.price ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">
                      {'\u20A9'}{((line.price ?? 0) * line.packQty).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {(order.lines || []).map((line, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{line.itemName}</p>
                  <p className="text-xs text-gray-500">{line.packName} x {line.packQty}</p>
                </div>
                <span className="font-medium text-sm">
                  {'\u20A9'}{((line.price ?? 0) * line.packQty).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification button */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => setNotifyDialogOpen(true)}
          className="bg-blue-800 hover:bg-blue-900"
        >
          {t('supplierPortal.sendNotification')}
        </Button>
      </div>

      {/* Notification timeline */}
      {notifications.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="text-lg font-semibold mb-3">{t('supplierPortal.notificationHistory')}</h3>
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div key={notif.id} className="border-l-2 border-blue-300 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {t(`supplierPortal.notifyType.${notif.type}`)}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{notif.message}</p>
                  <p className="text-xs text-gray-400">{notif.sentBy}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send notification dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('supplierPortal.sendNotification')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('supplierPortal.notificationType')}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={notifyType}
                onChange={(e) => setNotifyType(e.target.value)}
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`supplierPortal.notifyType.${type}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('supplierPortal.message')}</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder={t('supplierPortal.messagePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleNotify}
              disabled={sending || !notifyMessage.trim()}
              className="bg-blue-800 hover:bg-blue-900"
            >
              {sending ? t('common.processing') : t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
