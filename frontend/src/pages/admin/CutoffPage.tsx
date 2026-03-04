import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { executeCutoff, checkShortage, adjustOrderLine, dispatchAll } from '@/api/cutoff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface ShortageItem {
  planId: number;
  lineId: number;
  itemName: string;
  storeName: string;
  orderedQty: number;
  availableQty: number;
  shortageQty: number;
}

interface CutoffSummary {
  totalOrders: number;
  totalAmount: number;
  status: string;
}

export default function CutoffPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId ?? 1;

  const [deliveryDate, setDeliveryDate] = useState('');
  const [cutoffSummary, setCutoffSummary] = useState<CutoffSummary | null>(null);
  const [shortageItems, setShortageItems] = useState<ShortageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<ShortageItem | null>(null);
  const [adjustedQty, setAdjustedQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  const handleCutoff = useCallback(async () => {
    if (!deliveryDate) return;
    setLoading(true);
    try {
      const result = await executeCutoff(deliveryDate);
      setCutoffSummary(result.data || result);
      toast.success(t('cutoff.cutoffSuccess'));
    } catch {
      toast.error(t('cutoff.cutoffFailed'));
    } finally {
      setLoading(false);
    }
  }, [deliveryDate, t]);

  const handleShortageCheck = useCallback(async () => {
    if (!deliveryDate) return;
    setLoading(true);
    try {
      const result = await checkShortage(deliveryDate, brandId);
      setShortageItems(result.data || []);
    } catch {
      toast.error(t('cutoff.shortageFailed'));
    } finally {
      setLoading(false);
    }
  }, [deliveryDate, brandId, t]);

  const openAdjust = (item: ShortageItem) => {
    setSelectedLine(item);
    setAdjustedQty(item.availableQty);
    setAdjustReason('');
    setAdjustDialogOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedLine) return;
    try {
      await adjustOrderLine(selectedLine.planId, selectedLine.lineId, adjustedQty, adjustReason);
      toast.success(t('cutoff.adjustSuccess'));
      setAdjustDialogOpen(false);
      handleShortageCheck();
    } catch {
      toast.error(t('cutoff.adjustFailed'));
    }
  };

  const handleDispatchAll = async () => {
    if (!deliveryDate) return;
    if (!confirm(t('cutoff.dispatchConfirm'))) return;
    setLoading(true);
    try {
      await dispatchAll(deliveryDate);
      toast.success(t('cutoff.dispatchSuccess'));
    } catch {
      toast.error(t('cutoff.dispatchFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('cutoff.title')}</h2>

      {/* Date selector and action buttons */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>{t('cutoff.deliveryDate')}</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCutoff}
                disabled={!deliveryDate || loading}
                className="bg-blue-800 hover:bg-blue-900"
              >
                {t('cutoff.executeCutoff')}
              </Button>
              <Button
                variant="outline"
                onClick={handleShortageCheck}
                disabled={!deliveryDate || loading}
              >
                {t('cutoff.checkShortage')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cutoff Summary */}
      {cutoffSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-sm text-gray-500">{t('cutoff.totalOrders')}</p>
              <p className="text-2xl font-bold">{cutoffSummary.totalOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-sm text-gray-500">{t('cutoff.totalAmount')}</p>
              <p className="text-2xl font-bold">{'\u20A9'}{(cutoffSummary.totalAmount ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-sm text-gray-500">{t('common.status')}</p>
              <Badge className="text-base">{cutoffSummary.status}</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shortage Results Table */}
      {shortageItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('cutoff.shortageResults')}</h3>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('cutoff.storeName')}</TableHead>
                  <TableHead>{t('cutoff.itemName')}</TableHead>
                  <TableHead className="text-right">{t('cutoff.orderedQty')}</TableHead>
                  <TableHead className="text-right">{t('cutoff.availableQty')}</TableHead>
                  <TableHead className="text-right">{t('cutoff.shortageQty')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortageItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.storeName}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">{item.orderedQty}</TableCell>
                    <TableCell className="text-right">{item.availableQty}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{item.shortageQty}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openAdjust(item)}>
                        {t('cutoff.adjust')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {shortageItems.map((item, idx) => (
              <Card key={idx}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-gray-500">{item.storeName}</p>
                    </div>
                    <Badge variant="destructive">-{item.shortageQty}</Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>{t('cutoff.orderedQty')}: {item.orderedQty}</span>
                    <span>{t('cutoff.availableQty')}: {item.availableQty}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full min-h-[44px]" onClick={() => openAdjust(item)}>
                    {t('cutoff.adjust')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dispatch All Button */}
      {cutoffSummary && (
        <div className="flex justify-end">
          <Button
            onClick={handleDispatchAll}
            disabled={loading}
            className="bg-green-700 hover:bg-green-800 min-h-[44px]"
          >
            {t('cutoff.dispatchAll')}
          </Button>
        </div>
      )}

      {/* Adjust Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cutoff.adjustTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">{selectedLine?.itemName} - {selectedLine?.storeName}</p>
              <p className="text-sm">{t('cutoff.orderedQty')}: {selectedLine?.orderedQty}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('cutoff.adjustedQty')}</Label>
              <Input
                type="number"
                value={adjustedQty}
                onChange={(e) => setAdjustedQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('cutoff.reason')}</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder={t('cutoff.reasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAdjust} className="bg-blue-800 hover:bg-blue-900">{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
