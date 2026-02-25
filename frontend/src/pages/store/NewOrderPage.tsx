import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // TODO: storeId는 실제 로그인한 사용자의 storeId 사용
  const storeId = 1;

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
      // handle error
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
      navigate('/store/ordering');
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">New Order</h2>
        <Button variant="outline" onClick={() => navigate('/store/ordering')}>
          Back
        </Button>
      </div>

      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-base">Supplier ID</Label>
          <Input
            type="number"
            placeholder="Enter supplier ID"
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setLoaded(false);
            }}
            className="w-48 h-12 text-base"
          />
        </div>
        <Button
          size="lg"
          className="bg-blue-800 hover:bg-blue-900 h-12 text-base"
          onClick={loadSuggestion}
          disabled={!supplierId}
        >
          Load Suggestion
        </Button>
      </div>

      {loaded && lines.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No items found for this supplier
        </div>
      )}

      {lines.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Avg/Day</TableHead>
                <TableHead className="text-right">Lead</TableHead>
                <TableHead className="text-right">Suggested</TableHead>
                <TableHead className="text-right">Order Qty</TableHead>
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

          <div className="flex justify-end">
            <Button
              size="lg"
              className="bg-blue-800 hover:bg-blue-900 text-base px-8 py-3"
              onClick={handleSubmit}
              disabled={submitting || lines.every((l) => l.editQty === 0)}
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
