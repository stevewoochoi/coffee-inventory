import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { orderingApi, type SuggestionLine, type OrderLineDto } from '@/api/ordering';

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<(SuggestionLine & { editQty: number })[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  async function loadSuggestion() {
    if (!supplierId) return;
    try {
      const res = await orderingApi.getSuggestion(storeId, Number(supplierId));
      const suggestion = res.data.data;
      setLines(
        suggestion.lines.map((l) => ({
          ...l,
          editQty: l.suggestedPackQty,
        }))
      );
      setLoaded(true);
    } catch {
      toast.error(t('ordering.suggestionFailed'));
    }
  }

  function updateQty(index: number, qty: number) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, editQty: qty } : l))
    );
  }

  async function handleSubmit() {
    const orderLines: OrderLineDto[] = lines
      .filter((l) => l.editQty > 0)
      .map((l) => ({
        packagingId: l.packagingId,
        packQty: l.editQty,
      }));

    if (orderLines.length === 0) return;

    setSubmitting(true);
    try {
      await orderingApi.createPlan({
        storeId,
        supplierId: Number(supplierId),
        lines: orderLines,
      });
      toast.success(t('ordering.orderCreated'));
      navigate('/store/ordering');
    } catch {
      toast.error(t('ordering.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('ordering.newOrderTitle')}</h2>
        <Button variant="outline" onClick={() => navigate('/store/ordering')}>
          {t('ordering.backToList')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1 flex-1 sm:flex-none">
          <Label className="text-base">{t('ordering.supplierIdLabel')}</Label>
          <Input
            type="number"
            placeholder={t('ordering.supplierIdPlaceholder')}
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setLoaded(false);
            }}
            className="w-full sm:w-48 h-12 text-base"
          />
        </div>
        <Button
          size="lg"
          className="bg-blue-800 hover:bg-blue-900 h-12 text-base w-full sm:w-auto"
          onClick={loadSuggestion}
          disabled={!supplierId}
        >
          {t('ordering.loadSuggestion')}
        </Button>
      </div>

      {loaded && lines.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          {t('ordering.noItemsForSupplier')}
        </div>
      )}

      {lines.length > 0 && (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordering.item')}</TableHead>
                  <TableHead>{t('ordering.pack')}</TableHead>
                  <TableHead className="text-right">{t('ordering.stock')}</TableHead>
                  <TableHead className="text-right">{t('ordering.avgDay')}</TableHead>
                  <TableHead className="text-right">{t('ordering.lead')}</TableHead>
                  <TableHead className="text-right">{t('ordering.suggested')}</TableHead>
                  <TableHead className="text-right">{t('ordering.orderQty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={line.packagingId}>
                    <TableCell className="font-medium">{line.itemName}</TableCell>
                    <TableCell>{line.packName}</TableCell>
                    <TableCell className="text-right">
                      {Number(line.currentStock).toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(line.avgDailyDemand).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">{line.leadTimeDays}d</TableCell>
                    <TableCell className="text-right font-semibold text-blue-800">
                      {line.suggestedPackQty}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        value={line.editQty}
                        onChange={(e) => updateQty(idx, parseInt(e.target.value) || 0)}
                        className="w-20 h-10 text-right text-base ml-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden space-y-3">
            {lines.map((line, idx) => (
              <div key={line.packagingId} className="bg-white rounded-lg border p-4">
                <div className="font-semibold mb-1">{line.itemName}</div>
                <div className="text-sm text-gray-500 mb-3">{line.packName}</div>
                <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                  <div>
                    <div className="text-gray-400">{t('ordering.stock')}</div>
                    <div className="font-medium">{Number(line.currentStock).toFixed(0)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">{t('ordering.avgDay')}</div>
                    <div className="font-medium">{Number(line.avgDailyDemand).toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">{t('ordering.lead')}</div>
                    <div className="font-medium">{line.leadTimeDays}d</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="text-gray-400">{t('ordering.suggested')}: </span>
                    <span className="font-semibold text-blue-800">{line.suggestedPackQty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">{t('ordering.orderQty')}</span>
                    <Input
                      type="number"
                      min={0}
                      value={line.editQty}
                      onChange={(e) => updateQty(idx, parseInt(e.target.value) || 0)}
                      className="w-20 h-12 text-right text-base"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit button - sticky on mobile */}
          <div className="md:flex md:justify-end sticky bottom-0 bg-white py-3 md:static md:bg-transparent md:py-0">
            <Button
              size="lg"
              className="bg-blue-800 hover:bg-blue-900 text-base px-8 py-3 w-full md:w-auto min-h-[48px]"
              onClick={handleSubmit}
              disabled={submitting || lines.every((l) => l.editQty === 0)}
            >
              {submitting ? t('common.creating') : t('ordering.createOrder')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
