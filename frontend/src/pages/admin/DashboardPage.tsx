import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { dashboardApi, type BrandDashboard } from '@/api/dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboardPage() {
  const [data, setData] = useState<BrandDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const brandId = user?.brandId;
  const { t } = useTranslation();

  const load = useCallback(async () => {
    if (!brandId) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await dashboardApi.getBrandDashboard(brandId);
      setData(res.data.data);
    } catch { toast.error(t('dashboard.loadFailed')); }
    finally { setLoading(false); }
  }, [brandId, t]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-lg border p-6 h-[300px] flex items-center justify-center">
          <div className="h-full w-full bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">{t('dashboard.brandTitle')}</p>
        <p className="text-sm text-gray-400">데이터를 불러올 수 없습니다.</p>
        <button onClick={load} className="mt-3 px-4 py-2 bg-[#0077cc] text-white rounded-lg text-sm hover:bg-[#005ea3]">
          다시 시도
        </button>
      </div>
    );
  }

  const chartData = data.storeSummaries.map(s => ({
    name: s.storeName,
    lowStock: s.lowStockCount,
    expiry: s.expiryAlertCount,
  }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{t('dashboard.brandTitle')}</h2>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h3 className="font-bold mb-4">{t('dashboard.storeComparison')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="lowStock" fill="#ef4444" name={t('dashboard.lowStock')} />
            <Bar dataKey="expiry" fill="#f59e0b" name={t('dashboard.expiryAlerts')} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.storeSummaries.map((store) => (
          <div key={store.storeId} className="bg-white rounded-lg border p-5">
            <h4 className="font-bold text-lg mb-3">{store.storeName}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('dashboard.lowStock')}</span>
                <span className={`font-bold ${store.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {store.lowStockCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('dashboard.expiryAlerts')}</span>
                <span className={`font-bold ${store.expiryAlertCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {store.expiryAlertCount}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
