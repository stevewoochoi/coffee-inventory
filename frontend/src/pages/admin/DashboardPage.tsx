import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, type BrandDashboard } from '@/api/dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboardPage() {
  const [data, setData] = useState<BrandDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const brandId = 1; // TODO: from auth context

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dashboardApi.getBrandDashboard(brandId);
      setData(res.data.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  const chartData = data.storeSummaries.map(s => ({
    name: s.storeName,
    lowStock: s.lowStockCount,
    expiry: s.expiryAlertCount,
  }));

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Brand Dashboard</h2>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h3 className="font-bold mb-4">Store Status Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="lowStock" fill="#ef4444" name="Low Stock" />
            <Bar dataKey="expiry" fill="#f59e0b" name="Expiry Alerts" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.storeSummaries.map((store) => (
          <div key={store.storeId} className="bg-white rounded-lg border p-5">
            <h4 className="font-bold text-lg mb-3">{store.storeName}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Low Stock</span>
                <span className={`font-bold ${store.lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {store.lowStockCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expiry Alerts</span>
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
