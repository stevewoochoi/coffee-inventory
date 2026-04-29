import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getSupplierOrders } from '@/api/supplierPortal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SupplierOrder {
  id: number;
  storeName: string;
  status: string;
  deliveryDate: string | null;
  totalAmount: number;
  lineCount: number;
  createdAt: string;
}

const STATUS_TABS = ['all', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'];

export default function SupplierOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // For supplier portal, userId acts as supplierId or use a dedicated field
  const supplierId = user?.userId;

  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSupplierOrders(
        supplierId,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setOrders(result.data || []);
    } catch {
      toast.error(t('supplierPortal.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [supplierId, statusFilter, t]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <Badge className="bg-amber-100 text-amber-800">{t(`ordering.status.${status}`)}</Badge>;
      case 'DISPATCHED': return <Badge className="bg-blue-100 text-blue-800">{t(`ordering.status.${status}`)}</Badge>;
      case 'DELIVERED': return <Badge className="bg-green-100 text-green-800">{t(`ordering.status.${status}`)}</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">{t(`ordering.status.${status}`)}</Badge>;
      default: return <Badge variant="outline">{t(`ordering.status.${status}`)}</Badge>;
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('supplierPortal.title')}</h2>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] ${
              statusFilter === tab
                ? 'bg-[#0077cc] text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {tab === 'all' ? t('ordering.status.all') : t(`ordering.status.${tab}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('supplierPortal.noOrders')}</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => navigate(`/supplier-portal/orders/${order.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">#{order.id}</p>
                    <p className="text-sm text-gray-600">{order.storeName}</p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {order.deliveryDate && (
                    <span>{t('supplierPortal.deliveryDate')}: {order.deliveryDate}</span>
                  )}
                  <span>{order.lineCount} {t('supplierPortal.items')}</span>
                  <span className="font-medium text-gray-700">
                    {'\u00A5'}{(order.totalAmount ?? 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {t('ordering.created')}: {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
