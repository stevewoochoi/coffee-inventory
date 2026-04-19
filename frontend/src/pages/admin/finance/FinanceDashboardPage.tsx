import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getMonthlyReport, getInventoryValuation } from '@/api/finance';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MonthlyData {
  month: string;
  purchaseAmount: number;
  inventoryValue: number;
}

export default function FinanceDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId ?? 1;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [trendData, setTrendData] = useState<MonthlyData[]>([]);
  const [totalPurchase, setTotalPurchase] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load monthly data for each month of the year
      const monthlyPromises = Array.from({ length: 12 }, (_, i) =>
        getMonthlyReport(brandId, year, i + 1).catch(() => null)
      );
      const valuationResult = await getInventoryValuation(brandId).catch(() => null);

      const results = await Promise.all(monthlyPromises);
      const data: MonthlyData[] = [];
      let totalPurch = 0;

      results.forEach((result, idx) => {
        const monthLabel = `${idx + 1}${t('common.month')}`;
        const report = result?.data || result;
        const purchaseAmt = report?.totalPurchaseAmount ?? 0;
        totalPurch += purchaseAmt;
        data.push({
          month: monthLabel,
          purchaseAmount: purchaseAmt,
          inventoryValue: report?.inventoryValue ?? 0,
        });
      });

      setTrendData(data);
      setTotalPurchase(totalPurch);
      setTotalInventoryValue(valuationResult?.data?.totalValue ?? 0);
    } catch {
      toast.error(t('finance.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [brandId, year, t]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('finance.dashboardTitle')}</h2>

      {/* Period selector */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => setYear(year - 1)}>{t('common.previous')}</Button>
        <span className="text-lg font-semibold">{year}{t('calendar.year')}</span>
        <Button variant="outline" onClick={() => setYear(year + 1)}>{t('common.next')}</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-gray-500 mb-1">{t('finance.totalPurchase')}</p>
                <p className="text-3xl font-bold text-[#343741]">
                  {'\u20A9'}{totalPurchase.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-sm text-gray-500 mb-1">{t('finance.totalInventoryValue')}</p>
                <p className="text-3xl font-bold text-green-700">
                  {'\u20A9'}{totalInventoryValue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly trend chart */}
          <Card>
            <CardContent className="py-6">
              <h3 className="text-lg font-semibold mb-4">{t('finance.monthlyTrend')}</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 10000)}${t('finance.manUnit')}`} />
                    <Tooltip
                      formatter={(value) => [`${'\u20A9'}${Number(value).toLocaleString()}`, '']}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="purchaseAmount"
                      stroke="#1e40af"
                      name={t('finance.purchaseAmount')}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="inventoryValue"
                      stroke="#15803d"
                      name={t('finance.inventoryValue')}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
