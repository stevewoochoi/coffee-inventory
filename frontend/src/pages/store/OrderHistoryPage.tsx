import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { orderingApi, type OrderDetailedResponse } from '@/api/ordering';

const STATUS_TABS = ['all', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const;

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

const fulfillmentColor: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PREPARING: 'bg-amber-100 text-amber-800',
  SHIPPING: 'bg-blue-100 text-blue-800',
  DELIVERED: 'bg-green-100 text-green-800',
};


export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderDetailedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { storeId };
      if (activeTab !== 'all') params.status = activeTab;
      const res = await orderingApi.getPlansFiltered(params as { storeId: number; status?: string });
      setOrders(res.data.data);
    } catch {
      toast.error(t('common.loadError'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, activeTab]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('ordering.historyPage.title')}</h2>
        <Button variant="outline" onClick={() => navigate('/store/ordering')}>
          {t('ordering.backToList')}
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'all' ? orders.length : (statusCounts[tab] || 0);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-1 transition-colors min-h-[44px] ${
                activeTab === tab ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`ordering.status.${tab}`)}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-blue-700' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('ordering.noOrdersFound')}</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/store/ordering/${order.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">#{order.id}</span>
                    <Badge className={statusColor[order.status] || ''}>
                      {t(`ordering.status.${order.status}`)}
                    </Badge>
                    {order.fulfillmentStatus && (
                      <Badge className={fulfillmentColor[order.fulfillmentStatus] || 'bg-gray-100 text-gray-700'}>
                        {t(`ordering.fulfillment.${order.fulfillmentStatus}`)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    <span>{order.supplierName}</span>
                    {order.deliveryDate && (
                      <span className="ml-3 text-gray-400">
                        {t('ordering.historyPage.delivery')}: {formatDate(order.deliveryDate)}
                      </span>
                    )}
                  </div>
                  {order.totalAmount != null && (
                    <span className="font-medium">
                      {'\u20A9'}{((order.totalAmount || 0) + (order.vatAmount || 0)).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {order.lines.map(l => `${l.itemName} x${l.packQty}`).join(', ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
