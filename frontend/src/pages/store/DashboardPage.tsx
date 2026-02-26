import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, type StoreDashboard } from '@/api/dashboard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ label, value, color, onClick }: {
  label: string; value: string | number; color: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border p-5 cursor-pointer hover:shadow-md transition-shadow ${color}`}
    >
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
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
    date: d.date.substring(5), // MM-DD
    qty: d.totalQty,
  }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{t('dashboard.storeTitle')}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('dashboard.todayReceives')}
          value={data.todayReceiveCount}
          color="bg-blue-50 text-blue-700 border-blue-200"
          onClick={() => navigate('/store/receiving')}
        />
        <StatCard
          label={t('dashboard.todayWaste')}
          value={data.todayWasteQty}
          color="bg-orange-50 text-orange-700 border-orange-200"
          onClick={() => navigate('/store/waste')}
        />
        <StatCard
          label={t('dashboard.lowStockItems')}
          value={data.lowStockCount}
          color={data.lowStockCount > 0
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-green-50 text-green-700 border-green-200'}
          onClick={() => navigate('/store/inventory')}
        />
        <StatCard
          label={t('dashboard.expiryAlerts')}
          value={data.expiryAlertCount}
          color={data.expiryAlertCount > 0
            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
            : 'bg-green-50 text-green-700 border-green-200'}
          onClick={() => navigate('/store/expiry')}
        />
      </div>

      <div className="bg-white rounded-lg border p-6 mb-8">
        <h3 className="font-bold mb-4">{t('dashboard.consumptionTrend')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="qty" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={() => navigate('/store/receiving')}
          className="p-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-center">
          {t('dashboard.quickReceiving')}
        </button>
        <button onClick={() => navigate('/store/waste')}
          className="p-4 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 text-center">
          {t('dashboard.quickWaste')}
        </button>
        <button onClick={() => navigate('/store/physical-count')}
          className="p-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 text-center">
          {t('dashboard.quickCount')}
        </button>
        <button onClick={() => navigate('/store/ordering/new')}
          className="p-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-center">
          {t('dashboard.quickOrder')}
        </button>
      </div>
    </div>
  );
}
