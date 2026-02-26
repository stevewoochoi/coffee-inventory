import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, type StoreDashboard } from '@/api/dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getStoreDashboard(storeId);
      setData(res.data.data);
    } catch { toast.error(t('dashboard.loadFailed')); }
    finally { setLoading(false); }
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  const chartData = data.dailyConsumption.map(d => ({
    date: d.date.substring(5),
    qty: Number(d.totalQty),
  }));

  const stockStatus = data.stockStatus;
  const totalStockItems = stockStatus ? stockStatus.totalItems : 0;
  const normalPct = totalStockItems > 0 ? Math.round((stockStatus!.normalCount / totalStockItems) * 100) : 0;
  const lowPct = totalStockItems > 0 ? Math.round((stockStatus!.lowStockCount / totalStockItems) * 100) : 0;
  const outPct = totalStockItems > 0 ? Math.round((stockStatus!.outOfStockCount / totalStockItems) * 100) : 0;

  const today = new Date();
  const greeting = today.getHours() < 12 ? t('dashboard.goodMorning') : today.getHours() < 18 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{greeting}</h2>
        <p className="text-gray-500 text-sm mt-1">
          {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's Tasks */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('dashboard.todayTasks')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <TaskCard
            label={t('dashboard.urgentOrders')}
            count={data.urgentOrderCount}
            color={data.urgentOrderCount > 0 ? 'text-red-700 border-red-300' : 'text-gray-500 border-gray-200'}
            bgColor={data.urgentOrderCount > 0 ? 'bg-red-50' : 'bg-gray-50'}
            onClick={() => navigate('/store/ordering/new')}
          />
          <TaskCard
            label={t('dashboard.recommendedOrders')}
            count={data.recommendedOrderCount}
            color={data.recommendedOrderCount > 0 ? 'text-amber-700 border-amber-300' : 'text-gray-500 border-gray-200'}
            bgColor={data.recommendedOrderCount > 0 ? 'bg-amber-50' : 'bg-gray-50'}
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
          </div>
          <div className="flex gap-6 mt-3 text-sm">
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

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('dashboard.quickActions')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        </div>
      </div>
    </div>
  );
}
