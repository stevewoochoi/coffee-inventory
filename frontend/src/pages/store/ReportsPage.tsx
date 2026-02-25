import { useState } from 'react';
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
  const storeId = 1;
  const today = new Date();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const firstDay = `${monthStr}-01`;
  const lastDay = today.toISOString().split('T')[0];

  const [tab, setTab] = useState<ReportTab>('consumption');
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const [month, setMonth] = useState(monthStr);
  const [loading, setLoading] = useState(false);

  const [consumption, setConsumption] = useState<ConsumptionReport | null>(null);
  const [waste, setWaste] = useState<WasteReport | null>(null);
  const [lossRate, setLossRate] = useState<LossRateReport | null>(null);
  const [orderCost, setOrderCost] = useState<OrderCostReport | null>(null);

  async function loadReport() {
    setLoading(true);
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
      // handle error
    } finally {
      setLoading(false);
    }
  }

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'consumption', label: 'Consumption' },
    { key: 'waste', label: 'Waste' },
    { key: 'loss-rate', label: 'Loss Rate' },
    { key: 'order-cost', label: 'Order Cost' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Reports</h2>

      {/* Tab buttons */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="lg"
            variant={tab === t.key ? 'default' : 'outline'}
            className={tab === t.key ? 'bg-blue-800 hover:bg-blue-900' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-end gap-3">
        {tab === 'order-cost' ? (
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Month
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
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-base"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-gray-700">
              To
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
          {loading ? 'Loading...' : 'Load Report'}
        </Button>
      </div>

      {/* Report content */}
      {tab === 'consumption' && consumption && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Total consumption: <span className="font-bold text-gray-900">{consumption.totalQty}</span>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
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
      )}

      {tab === 'waste' && waste && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Total waste: <span className="font-bold text-gray-900">{waste.totalQty}</span>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Top Reason</TableHead>
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
      )}

      {tab === 'loss-rate' && lossRate && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Wasted</TableHead>
              <TableHead className="text-right">Loss Rate</TableHead>
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
      )}

      {tab === 'order-cost' && orderCost && (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Orders: <span className="font-bold text-gray-900">{orderCost.totalOrders}</span></span>
            <span>Total Cost: <span className="font-bold text-gray-900">¥{orderCost.totalCost.toLocaleString()}</span></span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
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
      )}
    </div>
  );
}
