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

const STATUS_TABS = ['DRAFT', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'all'] as const;

const tabLabels: Record<string, string> = {
  DRAFT: 'ordering.tabs.draft',
  CONFIRMED: 'ordering.tabs.confirmed',
  DISPATCHED: 'ordering.tabs.shipping',
  DELIVERED: 'ordering.tabs.delivered',
  all: 'ordering.tabs.all',
};

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
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('store.orderingView') : null;
    return saved === 'list' ? 'list' : 'calendar';
  });
  const [calMonth, setCalMonth] = useState<{ y: number; m: number }>(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem('store.orderingView', viewMode); } catch { /* storage disabled */ }
  }, [viewMode]);
  const { user } = useAuthStore();
  const storeId = user?.storeId;
  const userId = user?.id;
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
      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // iOS Safari doesn't support link.click() for blob downloads
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
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

  // Group plans by date key (deliveryDate or createdAt fallback)
  function dateKey(plan: OrderPlan): string {
    if (plan.deliveryDate) return plan.deliveryDate;
    return new Date(plan.createdAt).toISOString().slice(0, 10);
  }

  const renderCalendarView = (planList: OrderPlan[]) => {
    const byDate = new Map<string, OrderPlan[]>();
    for (const p of planList) {
      const k = dateKey(p);
      if (!byDate.has(k)) byDate.set(k, []);
      byDate.get(k)!.push(p);
    }

    const { y: year, m: month } = calMonth;
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const cells: Array<{ key: string; day: number | null; dateStr?: string }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ key: `pad-${i}`, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ key: dateStr, day: d, dateStr });
    }
    while (cells.length % 7 !== 0) cells.push({ key: `tail-${cells.length}`, day: null });

    const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    const goPrev = () => {
      const m = month - 1;
      if (m < 0) setCalMonth({ y: year - 1, m: 11 });
      else setCalMonth({ y: year, m });
    };
    const goNext = () => {
      const m = month + 1;
      if (m > 11) setCalMonth({ y: year + 1, m: 0 });
      else setCalMonth({ y: year, m });
    };

    const dayOrders = selectedCalDate ? (byDate.get(selectedCalDate) || []) : [];

    return (
      <div className="space-y-3">
        <div className="bg-white border rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={goPrev} className="px-3 py-1.5 rounded hover:bg-gray-100 text-lg" aria-label="prev">‹</button>
            <span className="font-semibold">{monthLabel}</span>
            <button type="button" onClick={goNext} className="px-3 py-1.5 rounded hover:bg-gray-100 text-lg" aria-label="next">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((label, i) => (
              <div key={label} className={`py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}`}>{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map(cell => {
              if (cell.day === null) return <div key={cell.key} className="h-14" />;
              const orders = cell.dateStr ? (byDate.get(cell.dateStr) || []) : [];
              const hasOrders = orders.length > 0;
              const isSelected = cell.dateStr === selectedCalDate;
              const isToday = cell.dateStr === todayKey;
              const dow = new Date(cell.dateStr + 'T00:00:00').getDay();
              const baseTextColor = dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : '';

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedCalDate(cell.dateStr || null)}
                  className={`h-14 rounded-lg flex flex-col items-center justify-center text-sm transition-colors relative
                    ${isSelected
                      ? 'bg-[#0077cc] text-white font-bold'
                      : hasOrders
                        ? `bg-blue-50 hover:bg-blue-100 ${baseTextColor || 'text-gray-900'} font-medium`
                        : `${baseTextColor || 'text-gray-400'} hover:bg-gray-50`}
                    ${isToday && !isSelected ? 'ring-2 ring-[#0077cc] ring-inset' : ''}
                  `}
                >
                  <span>{cell.day}</span>
                  {hasOrders && (
                    <span className={`text-[10px] mt-0.5 px-1 rounded ${
                      isSelected ? 'bg-white/30' : 'bg-[#0077cc] text-white'
                    }`}>
                      {orders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-50 border border-blue-100 inline-block" />
              {t('ordering.calendarLegendHasOrders', { defaultValue: '발주 있음' })}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-[#0077cc] inline-block" />
              {t('ordering.steps.calendarLegendSelected', { defaultValue: '선택' })}
            </span>
          </div>
        </div>

        {selectedCalDate && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              {new Date(selectedCalDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
              <span className="text-gray-400 ml-2">({dayOrders.length})</span>
            </h3>
            {dayOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{t('ordering.noOrdersFound')}</p>
            ) : (
              <div className="space-y-2">
                {dayOrders.map(p => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    onClick={() => navigate(`/store/ordering/${p.id}`)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-600 underline">#{p.id} - {p.supplierName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={statusColor[p.status] || ''}>
                            {t(`ordering.status.${p.status}`)}
                          </Badge>
                          {p.totalAmount != null && (
                            <p className="text-sm font-medium mt-1">
                              {formatCurrency(p.totalAmount, undefined)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">{t('ordering.title')}</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-white overflow-hidden text-sm">
            <button
              type="button"
              className={`px-3 py-1.5 ${viewMode === 'calendar' ? 'bg-[#0077cc] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setViewMode('calendar')}
            >
              {t('ordering.steps.calendarView', { defaultValue: '달력' })}
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 border-l ${viewMode === 'list' ? 'bg-[#0077cc] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setViewMode('list')}
            >
              {t('ordering.steps.listView', { defaultValue: '리스트' })}
            </button>
          </div>
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => navigate('/store/ordering/history')}
          >
            {t('ordering.historyPage.title')}
          </Button>
          <Button
            size="lg"
            className="bg-[#0077cc] hover:bg-[#005ea3] text-base px-6 py-3"
            onClick={() => navigate('/store/ordering/new')}
          >
            {t('ordering.newOrder')}
          </Button>
        </div>
      </div>

      {/* Cart status card */}
      {cartInfo && cartInfo.totalItems > 0 && (
        <Card className="border-slate-300 bg-slate-50 cursor-pointer" onClick={() => navigate('/store/ordering/new')}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#343741]">{t('ordering.main.cartPending')}</p>
                <p className="text-sm text-[#69707d]">
                  {t('ordering.cart.items', { count: cartInfo.totalItems })} | {formatCurrency(cartInfo.grandTotal, cartInfo.supplierGroups[0]?.items[0]?.currency)}
                </p>
              </div>
              <Button size="sm" className="bg-[#0077cc] hover:bg-[#005ea3] min-h-[44px]">
                {t('ordering.main.continueOrder')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low stock alerts */}
      {lowStockCount > 0 && (
        <Card className="border-red-200 bg-red-50 cursor-pointer" onClick={() => navigate('/store/ordering/new')}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-red-800">{t('ordering.main.lowStockAlert')}</p>
                <p className="text-sm text-red-600">
                  {t('ordering.main.lowStockDesc', { count: lowStockCount })}
                </p>
              </div>
              <Badge className="bg-red-100 text-red-800">{lowStockCount}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

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
                  ? 'bg-[#0077cc] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(tabLabels[tab])}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-[#0077cc]' : 'bg-gray-200'
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

      {/* Order list / calendar */}
      {viewMode === 'calendar' ? (
        renderCalendarView(filteredPlans)
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('ordering.noOrdersFound')}</div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className={`overflow-hidden ${plan.status === 'DRAFT' ? 'border-amber-300' : ''}`}>
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

                {/* DRAFT orders show quick action buttons */}
                {plan.status === 'DRAFT' && expandedPlan !== plan.id && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[36px]"
                        onClick={(e) => { e.stopPropagation(); navigate(`/store/ordering/${plan.id}`); }}
                      >
                        {t('common.edit')}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#0077cc] hover:bg-[#005ea3] min-h-[36px]"
                      onClick={(e) => { e.stopPropagation(); handleConfirm(plan.id); }}
                    >
                      {t('ordering.sendOrder')}
                    </Button>
                  </div>
                )}

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

                    {/* Supplier & delivery info */}
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('ordering.supplier')}</span>
                        <span className="font-medium">{detailedPlan.supplierName}</span>
                      </div>
                      {detailedPlan.deliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('ordering.steps.deliveryDate')}</span>
                          <span className="font-medium">{new Date(detailedPlan.deliveryDate + 'T00:00:00').toLocaleDateString()}</span>
                        </div>
                      )}
                      {detailedPlan.cutoffAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('ordering.steps.cutoff')}</span>
                          <span className={`font-medium ${new Date(detailedPlan.cutoffAt) > new Date() ? 'text-amber-600' : 'text-gray-400'}`}>
                            {new Date(detailedPlan.cutoffAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
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
                        <>
                          <Button
                            size="sm"
                            className="bg-[#0077cc] hover:bg-[#005ea3] min-h-[44px]"
                            onClick={() => handleConfirm(plan.id)}
                          >
                            {t('ordering.sendOrder')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => navigate(`/store/ordering/${plan.id}`)}
                          >
                            {t('common.edit')}
                          </Button>
                        </>
                      )}
                      {plan.status === 'CONFIRMED' && user?.role !== 'STORE_MANAGER' && user?.role !== 'JP_ORDERER' && (
                        <Button
                          size="sm"
                          className="bg-[#0077cc] hover:bg-[#005ea3] min-h-[44px]"
                          onClick={() => handleDispatch(plan.id)}
                        >
                          {t('ordering.dispatch')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[44px]"
                        onClick={() => navigate(`/store/ordering/${plan.id}`)}
                      >
                        {t('common.view')}
                      </Button>
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
