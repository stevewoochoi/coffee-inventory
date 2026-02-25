import { useState, useEffect, useCallback } from 'react';
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
  const storeId = 1; // TODO: from auth context

  const loadWastes = useCallback(async () => {
    try {
      const res = await inventoryApi.getWastes(storeId);
      setWastes(res.data.data);
    } catch { /* handled */ }
  }, []);

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
      setDialogOpen(false);
      setForm({ itemId: '', qtyBaseUnit: '', reason: '' });
      loadWastes();
    } catch {
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Waste</h2>
        <Button onClick={() => setDialogOpen(true)} className="h-12 px-6 bg-red-700 hover:bg-red-800">
          + Record Waste
        </Button>
      </div>

      <div className="space-y-2">
        {wastes.map((w) => (
          <SwipeableCard
            key={w.id}
            leftLabel="Delete"
            leftColor="bg-red-500"
            onSwipeLeft={() => {
              // Waste records are typically not deletable, but this shows the swipe pattern
              if (navigator.vibrate) navigator.vibrate(30);
            }}
          >
            <Card>
              <CardContent className="py-4 flex justify-between items-center">
                <div>
                  <span className="font-bold">Item #{w.itemId}</span>
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
          <p className="text-center text-gray-500 py-12">No waste records</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Waste</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item ID</Label>
              <Input value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                     className="h-12 text-lg" inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={form.qtyBaseUnit}
                     onChange={(e) => setForm({ ...form, qtyBaseUnit: e.target.value })}
                     className="h-12 text-lg" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                     placeholder="e.g. expired, dropped" className="h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-red-700 hover:bg-red-800">Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
