import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  reportApi,
  type ConsumptionReport,
  type WasteReport,
  type LossRateReport,
  type OrderCostReport,
} from '@/api/report';

type ReportTab = 'consumption' | 'waste' | 'loss-rate' | 'order-cost';

export default function ReportsPage() {
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();
  const today = new Date();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const firstDay = `${monthStr}-01`;
  const lastDay = today.toISOString().split('T')[0];

  const [tab, setTab] = useState<ReportTab>('consumption');
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const [month, setMonth] = useState(monthStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [consumption, setConsumption] = useState<ConsumptionReport | null>(null);
  const [waste, setWaste] = useState<WasteReport | null>(null);
  const [lossRate, setLossRate] = useState<LossRateReport | null>(null);
  const [orderCost, setOrderCost] = useState<OrderCostReport | null>(null);

  async function loadReport() {
    setLoading(true);
    setError(false);
    try {
      switch (tab) {
        case 'consumption': {
          const res = await reportApi.getConsumption(storeId, from, to);
          setConsumption(res.data.data);
          break;
        }
        case 'waste': {
          const res = await reportApi.getWaste(storeId, from, to);
          setWaste(res.data.data);
          break;
        }
        case 'loss-rate': {
          const res = await reportApi.getLossRate(storeId);
          setLossRate(res.data.data);
          break;
        }
        case 'order-cost': {
          const res = await reportApi.getOrderCost(storeId, month);
          setOrderCost(res.data.data);
          break;
        }
      }
    } catch {
      setError(true);
      toast.error(t('reports.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const params: Record<string, string> = { tab };
      if (tab === 'order-cost') {
        params.month = month;
      } else if (tab !== 'loss-rate') {
        params.from = from;
        params.to = to;
      }
      const res = await reportApi.downloadPdf(storeId, params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${tab}-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setDownloading(false);
    }
  }

  const tabs: { key: ReportTab; labelKey: string }[] = [
    { key: 'consumption', labelKey: 'reports.consumption' },
    { key: 'waste', labelKey: 'reports.wastTab' },
    { key: 'loss-rate', labelKey: 'reports.lossRate' },
    { key: 'order-cost', labelKey: 'reports.orderCost' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t('reports.title')}</h2>

      {/* Tab buttons */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <Button
            key={item.key}
            size="lg"
            variant={tab === item.key ? 'default' : 'outline'}
            className={tab === item.key ? 'bg-blue-800 hover:bg-blue-900' : ''}
            onClick={() => setTab(item.key)}
          >
            {t(item.labelKey)}
          </Button>
        ))}
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-end gap-3">
        {tab === 'order-cost' ? (
          <label className="flex flex-col text-sm font-medium text-gray-700">
            {t('common.month')}
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </label>
        ) : tab !== 'loss-rate' ? (
          <>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              {t('common.from')}
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-base"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              {t('common.to')}
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-base"
              />
            </label>
          </>
        ) : null}
        <Button
          size="lg"
          className="bg-blue-800 hover:bg-blue-900 text-base px-6 py-3"
          onClick={loadReport}
          disabled={loading}
        >
          {loading ? t('common.loading') : t('common.loadReport')}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="text-base px-6 py-3"
          onClick={handleDownloadPdf}
          disabled={downloading || loading}
        >
          {downloading ? t('common.loading') ?? '다운로드 중...' : 'PDF'}
        </Button>
      </div>

      {/* Error fallback */}
      {error && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 mb-4">보고서를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.</p>
          <Button onClick={loadReport} className="bg-blue-800 hover:bg-blue-900">
            {t('common.retry') ?? '다시 시도'}
          </Button>
        </div>
      )}

      {/* Report content */}
      {!error && tab === 'consumption' && consumption && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {t('reports.totalConsumption')} <span className="font-bold text-gray-900">{consumption.totalQty}</span>
          </p>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item')}</TableHead>
                  <TableHead className="text-right">{t('expiry.qty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consumption.items.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">{item.totalQty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {consumption.items.map((item) => (
              <div key={item.itemId} className="bg-white rounded-lg border p-3 flex items-center justify-between">
                <span className="font-medium">{item.itemName}</span>
                <span className="font-bold">{item.totalQty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && tab === 'waste' && waste && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {t('reports.totalWaste')} <span className="font-bold text-gray-900">{waste.totalQty}</span>
          </p>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item')}</TableHead>
                  <TableHead className="text-right">{t('expiry.qty')}</TableHead>
                  <TableHead>{t('reports.topReason')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waste.items.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">{item.totalQty}</TableCell>
                    <TableCell>{item.topReason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {waste.items.map((item) => (
              <div key={item.itemId} className="bg-white rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.itemName}</span>
                  <span className="font-bold">{item.totalQty}</span>
                </div>
                {item.topReason && (
                  <div className="text-sm text-gray-500 mt-1">{item.topReason}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!error && tab === 'loss-rate' && lossRate && (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item')}</TableHead>
                  <TableHead className="text-right">{t('reports.received')}</TableHead>
                  <TableHead className="text-right">{t('reports.wasted')}</TableHead>
                  <TableHead className="text-right">{t('reports.lossRateCol')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lossRate.items.map((item) => (
                  <TableRow key={item.itemId}>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">{item.receivedQty}</TableCell>
                    <TableCell className="text-right">{item.wastedQty}</TableCell>
                    <TableCell className="text-right">
                      {(item.lossRate * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {lossRate.items.map((item) => (
              <div key={item.itemId} className="bg-white rounded-lg border p-3">
                <div className="font-medium mb-2">{item.itemName}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-gray-400">{t('reports.received')}</div>
                    <div className="font-medium">{item.receivedQty}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">{t('reports.wasted')}</div>
                    <div className="font-medium">{item.wastedQty}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">{t('reports.lossRateCol')}</div>
                    <div className="font-bold text-red-600">{(item.lossRate * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!error && tab === 'order-cost' && orderCost && (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm text-gray-500">
            <span>{t('reports.orders')} <span className="font-bold text-gray-900">{orderCost.totalOrders}</span></span>
            <span>{t('reports.totalCost')} <span className="font-bold text-gray-900">¥{orderCost.totalCost.toLocaleString()}</span></span>
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item')}</TableHead>
                  <TableHead>{t('ordering.pack')}</TableHead>
                  <TableHead className="text-right">{t('expiry.qty')}</TableHead>
                  <TableHead className="text-right">{t('reports.unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('reports.cost')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderCost.lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell>{line.itemName}</TableCell>
                    <TableCell>{line.packName}</TableCell>
                    <TableCell className="text-right">{line.totalPackQty}</TableCell>
                    <TableCell className="text-right">¥{line.unitPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">¥{line.lineCost.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {orderCost.lines.map((line, i) => (
              <div key={i} className="bg-white rounded-lg border p-3">
                <div className="font-medium">{line.itemName}</div>
                <div className="text-sm text-gray-500 mb-2">{line.packName}</div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('expiry.qty')}: {line.totalPackQty}</span>
                  <span className="font-bold">¥{line.lineCost.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
