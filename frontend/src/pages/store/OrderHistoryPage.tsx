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

// TODO: Remove mock data when backend API is ready
function generateMockOrders(): OrderDetailedResponse[] {
  return [
    { id: 101, storeId: 1, supplierId: 1, supplierName: '\uC6D0\uB450\uC0C1\uC0AC', status: 'CONFIRMED', fulfillmentStatus: 'PENDING', deliveryDate: '2026-03-02', cutoffAt: '2026-02-28T09:00:00', totalAmount: 75000, vatAmount: 7500, recommendedByAi: false, lines: [{ packagingId: 7, packName: '1kg x 1\uBD09', itemId: 1, itemName: '\uC5D0\uD2F0\uC624\uD53C\uC544 \uC608\uAC00\uCCB4\uD504 \uC6D0\uB450', packQty: 3, unitsPerPack: 1.0, price: 25000 }], createdAt: '2026-02-26T14:30:00', confirmedAt: '2026-02-26T14:30:00', dispatchedAt: null, receivedAt: null },
    { id: 102, storeId: 1, supplierId: 2, supplierName: '\uC11C\uC6B8\uC720\uC5C5', status: 'DISPATCHED', fulfillmentStatus: 'SHIPPING', deliveryDate: '2026-02-28', cutoffAt: '2026-02-26T09:00:00', totalAmount: 36000, vatAmount: 3600, recommendedByAi: false, lines: [{ packagingId: 10, packName: '1L x 12\uD329', itemId: 3, itemName: '\uC6B0\uC720 1L', packQty: 2, unitsPerPack: 12.0, price: 18000 }], createdAt: '2026-02-24T10:00:00', confirmedAt: '2026-02-24T10:00:00', dispatchedAt: '2026-02-25T09:00:00', receivedAt: null },
    { id: 100, storeId: 1, supplierId: 1, supplierName: '\uC6D0\uB450\uC0C1\uC0AC', status: 'DELIVERED', fulfillmentStatus: 'DELIVERED', deliveryDate: '2026-02-25', cutoffAt: '2026-02-23T09:00:00', totalAmount: 44000, vatAmount: 4400, recommendedByAi: false, lines: [{ packagingId: 8, packName: '1kg x 1\uBD09', itemId: 2, itemName: '\uCF5C\uB86C\uBE44\uC544 \uC218\uD504\uB9AC\uBAA8 \uC6D0\uB450', packQty: 2, unitsPerPack: 1.0, price: 22000 }], createdAt: '2026-02-21T11:00:00', confirmedAt: '2026-02-21T11:00:00', dispatchedAt: '2026-02-22T09:00:00', receivedAt: '2026-02-25T08:30:00' },
    { id: 99, storeId: 1, supplierId: 3, supplierName: '\uC2DC\uB7FD\uCF54\uB9AC\uC544', status: 'CANCELLED', fulfillmentStatus: null, deliveryDate: null, cutoffAt: null, totalAmount: 25000, vatAmount: 2500, recommendedByAi: false, lines: [{ packagingId: 15, packName: '750ml x 1\uBCD1', itemId: 4, itemName: '\uBC14\uB2D0\uB77C \uC2DC\uB7FD', packQty: 2, unitsPerPack: 1.0, price: 12000 }], createdAt: '2026-02-20T09:00:00', confirmedAt: null, dispatchedAt: null, receivedAt: null },
  ];
}

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
      // TODO: Remove mock fallback when backend is ready
      let mockOrders = generateMockOrders();
      if (activeTab !== 'all') mockOrders = mockOrders.filter(o => o.status === activeTab);
      setOrders(mockOrders);
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
