import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { orderingApi, type OrderPlan, type OrderHistory, type OrderDetailedResponse, type CartResponse, type OrderNeedsResponse } from '@/api/ordering';
import OrderTimeline from '@/components/store/OrderTimeline';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

const STATUS_TABS = ['all', 'DRAFT', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'] as const;

export default function OrderingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<OrderPlan[]>([]);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<OrderDetailedResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [cartInfo, setCartInfo] = useState<CartResponse | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const userId = user?.id ?? 1;
  const brandId = user?.brandId;
  const { t } = useTranslation();

  useEffect(() => {
    loadPlans();
    loadHistory();
    loadCartInfo();
    loadLowStockCount();
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
      // silently fail
    }
  }

  async function loadCartInfo() {
    try {
      const res = await orderingApi.getCart(storeId, userId);
      setCartInfo(res.data.data);
    } catch {
      // silently fail
    }
  }

  async function loadLowStockCount() {
    try {
      const res = await orderingApi.getOrderNeeds(storeId, brandId);
      const needs: OrderNeedsResponse = res.data.data;
      setLowStockCount(needs.urgent.length + needs.recommended.length);
    } catch {
      // silently fail
    }
  }

  async function handleConfirm(id: number) {
    try {
      await orderingApi.confirmPlan(id);
      toast.success(t('ordering.orderConfirmed'));
      loadPlans();
      if (expandedPlan === id) loadDetail(id);
    } catch { toast.error(t('ordering.confirmFailed')); }
  }

  async function handleDispatch(id: number) {
    try {
      await orderingApi.dispatchPlan(id);
      toast.success(t('ordering.orderDispatched'));
      loadPlans();
      if (expandedPlan === id) loadDetail(id);
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

  async function loadDetail(id: number) {
    try {
      const res = await orderingApi.getPlanDetail(id);
      setDetailedPlan(res.data.data);
    } catch {
      setDetailedPlan(null);
    }
  }

  function toggleExpand(id: number) {
    if (expandedPlan === id) {
      setExpandedPlan(null);
      setDetailedPlan(null);
    } else {
      setExpandedPlan(id);
      loadDetail(id);
    }
  }

  const filteredPlans = activeTab === 'all'
    ? plans
    : plans.filter(p => p.status === activeTab);

  const statusCounts = plans.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'all' ? plans.length : (statusCounts[tab] || 0);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-1 transition-colors ${
                activeTab === tab
                  ? 'bg-blue-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Order list */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('ordering.noOrdersFound')}</div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              <CardContent className="py-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(plan.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">#{plan.id}</span>
                    <Badge className={statusColor[plan.status] || ''}>
                      {t(`ordering.status.${plan.status}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-gray-400">{expandedPlan === plan.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedPlan === plan.id && detailedPlan && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Timeline */}
                    <OrderTimeline
                      status={detailedPlan.status}
                      createdAt={detailedPlan.createdAt}
                      confirmedAt={detailedPlan.confirmedAt}
                      dispatchedAt={detailedPlan.dispatchedAt}
                      receivedAt={detailedPlan.receivedAt}
                    />

                    {/* Supplier */}
                    <div className="text-sm">
                      <span className="text-gray-500">{t('ordering.supplier')}: </span>
                      <span className="font-medium">{detailedPlan.supplierName}</span>
                    </div>

                    {/* Lines table */}
                    {detailedPlan.lines.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-gray-500">
                              <th className="text-left py-2">{t('ordering.item')}</th>
                              <th className="text-left py-2">{t('ordering.pack')}</th>
                              <th className="text-right py-2">{t('ordering.orderQty')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailedPlan.lines.map((line, idx) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="py-2">{line.itemName}</td>
                                <td className="py-2 text-gray-500">{line.packName}</td>
                                <td className="py-2 text-right font-medium">{line.packQty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Actions */}
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[44px]"
                        onClick={() => handleReorder(plan.id)}
                      >
                        {t('ordering.history.reorder')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
