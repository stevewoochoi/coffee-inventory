import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type Delivery, type DeliveryScan } from '@/api/inventory';
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

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

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
            ←
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
                  className="w-full h-14 text-lg bg-blue-800 hover:bg-blue-900"
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
                      className="h-12 px-6 bg-blue-800 hover:bg-blue-900"
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
        <Button onClick={() => setCreateOpen(true)} className="h-12 px-6 bg-blue-800 hover:bg-blue-900">
          {t('receiving.newDelivery')}
        </Button>
      </div>

      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
          {t('receiving.offlineMode')}
        </div>
      )}

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
        {deliveries.length === 0 && (
          <p className="text-center text-gray-500 py-12">{t('receiving.noDeliveries')}</p>
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
            <Button onClick={handleCreate} className="bg-blue-800 hover:bg-blue-900">{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
