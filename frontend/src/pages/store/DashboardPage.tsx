import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, type StoreDashboard } from '@/api/dashboard';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

function TaskCard({ label, count, color, bgColor, onClick }: {
  label: string; count: number; color: string; bgColor: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border-2 p-4 cursor-pointer hover:shadow-lg transition-all ${bgColor} ${color}`}
    >
      <div className="text-3xl font-bold">{count}</div>
      <div className="text-sm mt-1 font-medium">{label}</div>
    </div>
  );
}

export default function StoreDashboardPage() {
  const [data, setData] = useState<StoreDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await dashboardApi.getStoreDashboard(storeId);
      setData(res.data.data);
    } catch {
      setError(true);
      toast.error(t('dashboard.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('common.retry') ?? '다시 시도'}
        </button>
      </div>
    );
  }

  const chartData = data.dailyConsumption.map(d => ({
    date: d.date.substring(5),
    qty: Number(d.totalQty),
  }));

  const stockStatus = data.stockStatus;
  const totalStockItems = stockStatus ? stockStatus.totalItems : 0;
  const expiringCount = stockStatus?.expiringCount ?? 0;
  const normalPct = totalStockItems > 0 ? Math.round((stockStatus!.normalCount / totalStockItems) * 100) : 0;
  const lowPct = totalStockItems > 0 ? Math.round((stockStatus!.lowStockCount / totalStockItems) * 100) : 0;
  const outPct = totalStockItems > 0 ? Math.round((stockStatus!.outOfStockCount / totalStockItems) * 100) : 0;
  const expiringPct = totalStockItems > 0 ? Math.round((expiringCount / totalStockItems) * 100) : 0;

  const today = new Date();
  const greeting = today.getHours() < 12 ? t('dashboard.goodMorning') : today.getHours() < 18 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');

  // Safe defaults for new fields (backward compatible with older API responses)
  const pendingCartCount = data.pendingCartCount ?? 0;
  const pendingClaimCount = data.pendingClaimCount ?? 0;
  const recentOrders = data.recentOrders ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{greeting}</h2>
        <p className="text-gray-500 text-sm mt-1">
          {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's Tasks - 5 cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('dashboard.todayTasks')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <TaskCard
            label={t('dashboard.urgentOrders')}
            count={data.urgentOrderCount}
            color={data.urgentOrderCount > 0 ? 'text-red-700 border-red-300' : 'text-gray-500 border-gray-200'}
            bgColor={data.urgentOrderCount > 0 ? 'bg-red-50' : 'bg-gray-50'}
            onClick={() => navigate('/store/ordering/new')}
          />
          <TaskCard
            label={t('dashboard.pendingCart')}
            count={pendingCartCount}
            color={pendingCartCount > 0 ? 'text-amber-700 border-amber-300' : 'text-gray-500 border-gray-200'}
            bgColor={pendingCartCount > 0 ? 'bg-amber-50' : 'bg-gray-50'}
            onClick={() => navigate('/store/ordering/new')}
          />
          <TaskCard
            label={t('dashboard.pendingReceiving')}
            count={data.pendingReceivingCount}
            color={data.pendingReceivingCount > 0 ? 'text-blue-700 border-blue-300' : 'text-gray-500 border-gray-200'}
            bgColor={data.pendingReceivingCount > 0 ? 'bg-blue-50' : 'bg-gray-50'}
            onClick={() => navigate('/store/receiving')}
          />
          <TaskCard
            label={t('dashboard.expiryAlerts')}
            count={data.expiryAlertCount}
            color={data.expiryAlertCount > 0 ? 'text-yellow-700 border-yellow-300' : 'text-gray-500 border-gray-200'}
            bgColor={data.expiryAlertCount > 0 ? 'bg-yellow-50' : 'bg-gray-50'}
            onClick={() => navigate('/store/expiry')}
          />
          <TaskCard
            label={t('dashboard.pendingClaims')}
            count={pendingClaimCount}
            color={pendingClaimCount > 0 ? 'text-purple-700 border-purple-300' : 'text-gray-500 border-gray-200'}
            bgColor={pendingClaimCount > 0 ? 'bg-purple-50' : 'bg-gray-50'}
            onClick={() => navigate('/store/claims')}
          />
        </div>
      </div>

      {/* Stock Status */}
      {stockStatus && totalStockItems > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-3">{t('dashboard.stockOverview')}</h3>
          <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
            {normalPct > 0 && <div className="bg-green-500 transition-all" style={{ width: `${normalPct}%` }} />}
            {lowPct > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${lowPct}%` }} />}
            {outPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${outPct}%` }} />}
            {expiringPct > 0 && <div className="bg-orange-400 transition-all" style={{ width: `${expiringPct}%` }} />}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              {t('dashboard.normal')} {stockStatus.normalCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              {t('dashboard.lowStock')} {stockStatus.lowStockCount}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              {t('dashboard.outOfStock')} {stockStatus.outOfStockCount}
            </span>
            {expiringCount > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />
                {t('dashboard.expiring')} {expiringCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('dashboard.recentOrders')}</h3>
            <button
              onClick={() => navigate('/store/ordering/history')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('dashboard.viewAll')}
            </button>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/store/ordering/${order.id}`)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">#{order.id}</span>
                  <div>
                    <p className="text-sm font-medium">{order.supplierName}</p>
                    <p className="text-xs text-gray-500">
                      {order.itemCount} {t('dashboard.items')}
                      {order.deliveryDate && ` | ${t('dashboard.delivery')}: ${order.deliveryDate}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{'\u20A9'}{order.totalAmount.toLocaleString()}</span>
                  <Badge className={statusColor[order.status] || ''}>
                    {t(`ordering.status.${order.status}`)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-day consumption bar chart */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">{t('dashboard.consumptionTrend')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="qty" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 consumption ranking */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold mb-4">{t('dashboard.topConsumption')}</h3>
          {data.topConsumption && data.topConsumption.length > 0 ? (
            <div className="space-y-3">
              {data.topConsumption.map((item, idx) => {
                const maxQty = data.topConsumption[0]?.totalQty || 1;
                const pct = Math.round((item.totalQty / maxQty) * 100);
                return (
                  <div key={item.itemId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        <span className="text-gray-400 mr-2">#{idx + 1}</span>
                        {item.itemName}
                      </span>
                      <span className="text-gray-600">{Number(item.totalQty).toFixed(0)} {item.baseUnit}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">{t('common.noData')}</p>
          )}
        </div>
      </div>

      {/* Quick Actions - 5 buttons */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('dashboard.quickActions')}</h3>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          <button onClick={() => navigate('/store/ordering/new')}
            className="p-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 text-center min-h-[60px]">
            {t('dashboard.quickOrder')}
          </button>
          <button onClick={() => navigate('/store/receiving')}
            className="p-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 text-center min-h-[60px]">
            {t('dashboard.quickReceiving')}
          </button>
          <button onClick={() => navigate('/store/physical-count')}
            className="p-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 text-center min-h-[60px]">
            {t('dashboard.quickCount')}
          </button>
          <button onClick={() => navigate('/store/waste')}
            className="p-4 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 text-center min-h-[60px]">
            {t('dashboard.quickWaste')}
          </button>
          <button onClick={() => navigate('/store/claims')}
            className="p-4 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 text-center min-h-[60px]">
            {t('dashboard.quickClaims')}
          </button>
        </div>
      </div>
    </div>
  );
}
