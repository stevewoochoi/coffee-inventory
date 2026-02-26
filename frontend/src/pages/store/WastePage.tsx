import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type WasteRecord } from '@/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import SwipeableCard from '@/components/SwipeableCard';

export default function WastePage() {
  const [wastes, setWastes] = useState<WasteRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ itemId: '', qtyBaseUnit: '', reason: '' });
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const loadWastes = useCallback(async () => {
    try {
      const res = await inventoryApi.getWastes(storeId);
      setWastes(res.data.data);
    } catch { toast.error(t('waste.loadFailed')); }
  }, [storeId, t]);

  useEffect(() => { loadWastes(); }, [loadWastes]);

  const handleCreate = async () => {
    try {
      await inventoryApi.createWaste({
        storeId,
        itemId: Number(form.itemId),
        qtyBaseUnit: Number(form.qtyBaseUnit),
        reason: form.reason || undefined,
      });
      if (navigator.vibrate) navigator.vibrate(100);
      toast.success(t('waste.recorded'));
      setDialogOpen(false);
      setForm({ itemId: '', qtyBaseUnit: '', reason: '' });
      loadWastes();
    } catch {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      toast.error(t('waste.recordFailed'));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{t('waste.title')}</h2>
        <Button onClick={() => setDialogOpen(true)} className="h-12 px-6 bg-red-700 hover:bg-red-800">
          {t('waste.recordWaste')}
        </Button>
      </div>

      <div className="space-y-2">
        {wastes.map((w) => (
          <SwipeableCard
            key={w.id}
            leftLabel={t('common.delete')}
            leftColor="bg-red-500"
            onSwipeLeft={() => {
              if (navigator.vibrate) navigator.vibrate(30);
            }}
          >
            <Card>
              <CardContent className="py-4 flex justify-between items-center">
                <div>
                  <span className="font-bold">{t('inventory.itemPrefix', { id: w.itemId })}</span>
                  <span className="text-gray-500 ml-3">{w.qtyBaseUnit} units</span>
                  {w.reason && <span className="text-gray-400 ml-2 text-sm">({w.reason})</span>}
                </div>
                <Badge variant={w.wasteType === 'OPERATION' ? 'destructive' : 'secondary'}>
                  {w.wasteType}
                </Badge>
              </CardContent>
            </Card>
          </SwipeableCard>
        ))}
        {wastes.length === 0 && (
          <p className="text-center text-gray-500 py-12">{t('waste.noRecords')}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('waste.recordWasteTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('waste.itemId')}</Label>
              <Input value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                     className="h-12 text-lg" inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>{t('waste.quantity')}</Label>
              <Input type="number" value={form.qtyBaseUnit}
                     onChange={(e) => setForm({ ...form, qtyBaseUnit: e.target.value })}
                     className="h-12 text-lg" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>{t('waste.reason')}</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                     placeholder={t('waste.reasonPlaceholder')} className="h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreate} className="bg-red-700 hover:bg-red-800">{t('common.record')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
