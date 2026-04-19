import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type Delivery, type DeliveryScan, type PendingOrder } from '@/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import SwipeableCard from '@/components/SwipeableCard';

const BarcodeScanner = lazy(() => import('@/components/BarcodeScanner'));
import {
  savePendingScan,
  getPendingScans,
  removePendingScan,
  type PendingScan,
} from '@/lib/offlineSync';

interface ReceiveLine {
  packagingId: number;
  packQty: number;
  lotNo: string;
  expDate: string;
}

export default function ReceivingPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [scans, setScans] = useState<DeliveryScan[]>([]);
  const [scanInput, setScanInput] = useState({ packagingId: '', packCount: '1' });
  const [createOpen, setCreateOpen] = useState(false);
  const [newDelivery, setNewDelivery] = useState({ supplierId: '' });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingScans, setPendingScans] = useState<PendingScan[]>([]);

  // Order receiving state
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [receiveLines, setReceiveLines] = useState<ReceiveLine[]>([]);
  const [receiving, setReceiving] = useState(false);

  // History filter state
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [dateFrom, setDateFrom] = useState(weekAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [historyDeliveries, setHistoryDeliveries] = useState<Delivery[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncPendingScans(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending scans from localStorage
  useEffect(() => {
    setPendingScans(getPendingScans());
  }, []);

  const loadDeliveries = useCallback(async () => {
    try {
      const res = await inventoryApi.getDeliveries(storeId);
      setDeliveries(res.data.data);
    } catch { toast.error(t('receiving.loadFailed')); }
  }, [storeId, t]);

  const loadPendingOrders = useCallback(async () => {
    try {
      const res = await inventoryApi.getPendingOrders(storeId);
      setPendingOrders(res.data.data);
    } catch { toast.error(t('receiving.fromOrder.loadFailed')); }
  }, [storeId, t]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await inventoryApi.getDeliveryHistory(storeId, dateFrom, dateTo, statusFilter || undefined);
      setHistoryDeliveries(res.data.data);
    } catch { /* silent */ }
  }, [storeId, dateFrom, dateTo, statusFilter]);

  useEffect(() => { loadDeliveries(); loadPendingOrders(); }, [loadDeliveries, loadPendingOrders]);

  const openScanView = async (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    try {
      const res = await inventoryApi.getScans(delivery.id);
      setScans(res.data.data);
    } catch { toast.error(t('receiving.scanLoadFailed')); }
  };

  const handleScan = async (barcode?: string) => {
    const packagingId = barcode || scanInput.packagingId;
    if (!selectedDelivery || !packagingId) return;

    const packCount = Number(scanInput.packCount) || 1;

    if (!isOnline) {
      savePendingScan({
        deliveryId: selectedDelivery.id,
        packagingId: Number(packagingId),
        packCountScanned: packCount,
      });
      setPendingScans(getPendingScans());
      setScanInput({ packagingId: '', packCount: '1' });
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      return;
    }

    try {
      await inventoryApi.addScan(selectedDelivery.id, {
        packagingId: Number(packagingId),
        packCountScanned: packCount,
      });
      if (navigator.vibrate) navigator.vibrate(100);
      setScanInput({ packagingId: '', packCount: '1' });
      const res = await inventoryApi.getScans(selectedDelivery.id);
      setScans(res.data.data);
      loadDeliveries();
    } catch {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      toast.error(t('receiving.scanAddFailed'));
    }
  };

  const handleBarcodeScan = (result: string) => {
    setScannerOpen(false);
    handleScan(result);
  };

  const syncPendingScans = async () => {
    const pending = getPendingScans();
    for (const scan of pending) {
      try {
        await inventoryApi.addScan(scan.deliveryId, {
          packagingId: scan.packagingId,
          packCountScanned: scan.packCountScanned,
        });
        removePendingScan(scan.id);
      } catch {
        // keep for next sync
      }
    }
    setPendingScans(getPendingScans());
    if (selectedDelivery) {
      const res = await inventoryApi.getScans(selectedDelivery.id);
      setScans(res.data.data);
    }
    loadDeliveries();
  };

  const handleConfirm = async () => {
    if (!selectedDelivery) return;
    if (!confirm(t('receiving.confirmQuestion'))) return;
    try {
      await inventoryApi.confirmDelivery(selectedDelivery.id);
      if (navigator.vibrate) navigator.vibrate(200);
      toast.success(t('receiving.confirmed'));
      setSelectedDelivery(null);
      loadDeliveries();
    } catch { toast.error(t('receiving.confirmFailed')); }
  };

  const handleCreate = async () => {
    try {
      await inventoryApi.createDelivery({
        storeId,
        supplierId: Number(newDelivery.supplierId),
      });
      toast.success(t('receiving.created'));
      setCreateOpen(false);
      loadDeliveries();
    } catch { toast.error(t('receiving.createFailed')); }
  };

  // Open order receiving view
  const openOrderReceive = (order: PendingOrder) => {
    setSelectedOrder(order);
    setReceiveLines(order.lines.map(line => ({
      packagingId: line.packagingId,
      packQty: line.orderedPackQty,
      lotNo: '',
      expDate: '',
    })));
  };

  const updateReceiveLine = (index: number, field: keyof ReceiveLine, value: string | number) => {
    setReceiveLines(prev => prev.map((line, i) =>
      i === index ? { ...line, [field]: value } : line
    ));
  };

  const handleReceiveFromOrder = async () => {
    if (!selectedOrder) return;
    const validLines = receiveLines.filter(l => l.packQty > 0);
    if (validLines.length === 0) return;

    setReceiving(true);
    try {
      await inventoryApi.receiveFromOrder(selectedOrder.orderPlanId, {
        lines: validLines.map(l => ({
          packagingId: l.packagingId,
          packQty: l.packQty,
          ...(l.lotNo ? { lotNo: l.lotNo } : {}),
          ...(l.expDate ? { expDate: l.expDate } : {}),
        })),
      });
      if (navigator.vibrate) navigator.vibrate(200);
      toast.success(t('receiving.fromOrder.success'));
      setSelectedOrder(null);
      loadDeliveries();
      loadPendingOrders();
    } catch {
      toast.error(t('receiving.fromOrder.failed'));
    } finally {
      setReceiving(false);
    }
  };

  // Order receive view
  if (selectedOrder) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="lg" onClick={() => setSelectedOrder(null)}>
            &larr;
          </Button>
          <h2 className="text-xl font-bold flex-1">{t('receiving.fromOrder.receiveOrder')}</h2>
          <Badge>{selectedOrder.status}</Badge>
        </div>

        <Card className="mb-4">
          <CardContent className="py-3">
            <p className="text-sm text-gray-500">{t('ordering.supplier')}</p>
            <p className="font-medium">{selectedOrder.supplierName}</p>
          </CardContent>
        </Card>

        <div className="space-y-3 mb-6">
          {selectedOrder.lines.map((line, idx) => {
            const receiveLine = receiveLines[idx];
            const isMatch = receiveLine && receiveLine.packQty === line.orderedPackQty;
            const isPartial = receiveLine && receiveLine.packQty > 0 && receiveLine.packQty < line.orderedPackQty;

            return (
              <Card key={line.packagingId} className={`border-2 ${isMatch ? 'border-green-300' : isPartial ? 'border-yellow-300' : 'border-gray-200'}`}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{line.itemName}</p>
                      <p className="text-sm text-gray-500">{line.packName}</p>
                    </div>
                    <div className="text-right">
                      {isMatch && <Badge className="bg-green-100 text-green-800">{t('receiving.fromOrder.match')}</Badge>}
                      {isPartial && <Badge className="bg-yellow-100 text-yellow-800">{t('receiving.fromOrder.partial')}</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">{t('receiving.fromOrder.ordered')}</Label>
                      <div className="text-lg font-bold text-gray-600">{line.orderedPackQty}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">{t('receiving.fromOrder.received')}</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-10 p-0 text-lg font-bold shrink-0"
                          onClick={() => updateReceiveLine(idx, 'packQty', Math.max(0, (receiveLine?.packQty ?? 0) - 1))}
                        >-</Button>
                        <Input
                          type="number"
                          value={receiveLine?.packQty ?? 0}
                          onChange={(e) => updateReceiveLine(idx, 'packQty', Math.max(0, Number(e.target.value)))}
                          className="h-10 text-lg font-bold text-center"
                          inputMode="numeric"
                          min={0}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-10 p-0 text-lg font-bold shrink-0"
                          onClick={() => updateReceiveLine(idx, 'packQty', (receiveLine?.packQty ?? 0) + 1)}
                        >+</Button>
                      </div>
                    </div>
                  </div>
                  {/* Quick quantity buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {[0, 1, 3, 5, 10].map(q => (
                      <Button
                        key={q}
                        type="button"
                        variant={receiveLine?.packQty === q ? 'default' : 'outline'}
                        size="sm"
                        className="min-h-[36px] min-w-[44px]"
                        onClick={() => updateReceiveLine(idx, 'packQty', q)}
                      >{q === line.orderedPackQty ? `${q} (${t('receiving.fromOrder.match')})` : q}</Button>
                    ))}
                    {!([0, 1, 3, 5, 10].includes(line.orderedPackQty)) && (
                      <Button
                        type="button"
                        variant={receiveLine?.packQty === line.orderedPackQty ? 'default' : 'outline'}
                        size="sm"
                        className="min-h-[36px]"
                        onClick={() => updateReceiveLine(idx, 'packQty', line.orderedPackQty)}
                      >{line.orderedPackQty} ({t('receiving.fromOrder.match')})</Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">LOT No.</Label>
                      <Input
                        value={receiveLine?.lotNo ?? ''}
                        onChange={(e) => updateReceiveLine(idx, 'lotNo', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">{t('expiry.expDate')}</Label>
                      <Input
                        type="date"
                        value={receiveLine?.expDate ?? ''}
                        onChange={(e) => updateReceiveLine(idx, 'expDate', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          onClick={handleReceiveFromOrder}
          className="w-full h-14 text-lg bg-green-700 hover:bg-green-800"
          disabled={receiving || receiveLines.every(l => l.packQty === 0)}
        >
          {receiving ? t('common.processing') : t('receiving.fromOrder.confirmReceive')}
        </Button>
      </div>
    );
  }

  // Delivery scan view
  if (selectedDelivery) {
    const deliveryPending = pendingScans.filter(
      (s) => s.deliveryId === selectedDelivery.id
    );

    return (
      <div>
        {scannerOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white">{t('common.loading')}</div>}>
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onClose={() => setScannerOpen(false)}
            />
          </Suspense>
        )}

        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="lg" onClick={() => setSelectedDelivery(null)}>
            &larr;
          </Button>
          <h2 className="text-xl font-bold flex-1">{t('receiving.deliveryPrefix', { id: selectedDelivery.id })}</h2>
          <Badge>{selectedDelivery.status}</Badge>
        </div>

        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
            {t('receiving.offlineMsg')}
          </div>
        )}

        {selectedDelivery.status !== 'COMPLETED' && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('receiving.scanItem')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => setScannerOpen(true)}
                  className="w-full h-14 text-lg bg-[#0077cc] hover:bg-[#005ea3]"
                >
                  {t('receiving.openScanner')}
                </Button>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500">{t('receiving.packagingId')}</Label>
                    <Input
                      value={scanInput.packagingId}
                      onChange={(e) => setScanInput({ ...scanInput, packagingId: e.target.value })}
                      placeholder={t('receiving.enterManually')}
                      className="text-lg h-12"
                      inputMode="numeric"
                      onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs text-gray-500">{t('receiving.count')}</Label>
                    <Input
                      type="number"
                      value={scanInput.packCount}
                      onChange={(e) => setScanInput({ ...scanInput, packCount: e.target.value })}
                      className="text-lg h-12"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => handleScan()}
                      className="h-12 px-6 bg-[#0077cc] hover:bg-[#005ea3]"
                    >
                      {t('common.add')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {deliveryPending.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-yellow-700 mb-2">
              {t('receiving.pendingSync', { count: deliveryPending.length })}
            </p>
            {deliveryPending.map((scan) => (
              <Card key={scan.id} className="mb-1 border-yellow-200 bg-yellow-50">
                <CardContent className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-medium">Packaging #{scan.packagingId}</span>
                    <span className="text-yellow-600 text-xs ml-2">(pending)</span>
                  </div>
                  <Badge variant="outline" className="border-yellow-400">x{scan.packCountScanned}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-1 mb-6">
          {scans.map((scan) => (
            <Card key={scan.id}>
              <CardContent className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-medium">Packaging #{scan.packagingId}</span>
                  {scan.lotNo && <span className="text-gray-500 text-sm ml-2">{t('expiry.lot')}: {scan.lotNo}</span>}
                </div>
                <Badge variant="outline">x{scan.packCountScanned}</Badge>
              </CardContent>
            </Card>
          ))}
          {scans.length === 0 && deliveryPending.length === 0 && (
            <p className="text-center text-gray-500 py-8">{t('receiving.noScans')}</p>
          )}
        </div>

        {selectedDelivery.status !== 'COMPLETED' && (scans.length > 0 || deliveryPending.length > 0) && (
          <Button
            onClick={handleConfirm}
            className="w-full h-14 text-lg bg-green-700 hover:bg-green-800"
            disabled={deliveryPending.length > 0}
          >
            {deliveryPending.length > 0
              ? t('receiving.syncFirst', { count: deliveryPending.length })
              : t('receiving.confirmDelivery')}
          </Button>
        )}
      </div>
    );
  }

  // Delivery list view
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{t('receiving.title')}</h2>
        <Button onClick={() => setCreateOpen(true)} className="h-12 px-6 bg-[#0077cc] hover:bg-[#005ea3]">
          {t('receiving.newDelivery')}
        </Button>
      </div>

      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
          {t('receiving.offlineMode')}
        </div>
      )}

      {/* Pending Orders Section */}
      {pendingOrders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('receiving.fromOrder.title')}</h3>
          <div className="space-y-2">
            {pendingOrders.map((order) => (
              <Card key={order.orderPlanId} className="border-slate-300 bg-slate-50 cursor-pointer" onClick={() => openOrderReceive(order)}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-bold">#{order.orderPlanId}</span>
                      <span className="text-gray-600 ml-2">{order.supplierName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{t(`ordering.status.${order.status}`)}</Badge>
                      <Button size="sm" className="bg-[#0077cc] hover:bg-[#005ea3]">
                        {t('receiving.fromOrder.receive')}
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.lines.map(l => `${l.itemName} x${l.orderedPackQty}`).join(', ')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Existing deliveries */}
      <div className="space-y-2">
        {deliveries.map((d) => (
          <SwipeableCard key={d.id} onSwipeRight={() => openScanView(d)} rightLabel="Open">
            <Card className="cursor-pointer" onClick={() => openScanView(d)}>
              <CardContent className="py-4 flex justify-between items-center">
                <div>
                  <span className="font-bold text-lg">{t('receiving.deliveryPrefix', { id: d.id })}</span>
                  <span className="text-gray-500 ml-3">{t('ordering.supplier')} #{d.supplierId}</span>
                </div>
                <Badge variant={d.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {d.status}
                </Badge>
              </CardContent>
            </Card>
          </SwipeableCard>
        ))}
        {deliveries.length === 0 && pendingOrders.length === 0 && (
          <p className="text-center text-gray-500 py-12">{t('receiving.noDeliveries')}</p>
        )}
      </div>

      {/* Delivery History Section */}
      <div className="mt-6">
        <div
          className="flex items-center justify-between cursor-pointer mb-3"
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
        >
          <h3 className="text-lg font-semibold">{t('receiving.history')}</h3>
          <span className="text-gray-400 text-sm">{showHistory ? '▲' : '▼'}</span>
        </div>
        {showHistory && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs text-gray-500">{t('common.from')}</Label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 w-36" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">{t('common.to')}</Label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 w-36" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">{t('common.status')}</Label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-10 rounded-md border border-input px-3 text-sm bg-background"
                >
                  <option value="">{t('ordering.status.all')}</option>
                  <option value="COMPLETED">{t('receiving.statusFilter.confirmed')}</option>
                  <option value="PENDING">{t('receiving.statusFilter.unconfirmed')}</option>
                  <option value="IN_PROGRESS">{t('receiving.statusFilter.ordered')}</option>
                  <option value="CANCELLED">{t('receiving.statusFilter.returned')}</option>
                </select>
              </div>
              <Button onClick={loadHistory} className="h-10 min-h-[40px]">{t('common.search')}</Button>
            </div>

            <div className="space-y-2">
              {historyDeliveries.map((d) => {
                const statusBadge: Record<string, string> = {
                  COMPLETED: 'bg-green-100 text-green-800',
                  PENDING: 'bg-yellow-100 text-yellow-800',
                  IN_PROGRESS: 'bg-slate-100 text-[#343741]',
                  CANCELLED: 'bg-red-100 text-red-800',
                };
                return (
                  <Card key={d.id} className="cursor-pointer" onClick={() => openScanView(d)}>
                    <CardContent className="py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold">{t('receiving.deliveryPrefix', { id: d.id })}</span>
                          <span className="text-gray-500 ml-2">{t('ordering.supplier')} #{d.supplierId}</span>
                        </div>
                        <Badge className={statusBadge[d.status] || 'bg-gray-100'}>
                          {d.status === 'COMPLETED' ? t('receiving.statusFilter.confirmed') :
                           d.status === 'PENDING' ? t('receiving.statusFilter.unconfirmed') :
                           d.status === 'IN_PROGRESS' ? t('receiving.statusFilter.ordered') :
                           t('receiving.statusFilter.returned')}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(d.createdAt).toLocaleDateString()}
                        {d.expectedAt && ` | ${t('ordering.steps.deliveryDate')}: ${d.expectedAt}`}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {historyDeliveries.length === 0 && (
                <p className="text-center text-gray-400 py-6">{t('receiving.noDeliveries')}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('receiving.newDeliveryTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('receiving.supplierId')}</Label>
              <Input
                value={newDelivery.supplierId}
                onChange={(e) => setNewDelivery({ ...newDelivery, supplierId: e.target.value })}
                className="h-12 text-lg"
                inputMode="numeric"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} className="bg-[#0077cc] hover:bg-[#005ea3]">{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
