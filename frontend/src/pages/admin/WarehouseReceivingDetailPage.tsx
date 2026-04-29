import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  warehouseApi,
  type PendingReceipt,
  type ReceiveLineRequest,
} from '@/api/warehouse';

interface ReceiveLineForm {
  packagingId: number;
  itemName: string;
  packName: string;
  orderedPackQty: number;
  receivedPackQty: number;
  expDate: string;
  lotNo: string;
}

export default function WarehouseReceivingDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId: orderIdParam } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const warehouseIdParam = searchParams.get('warehouseId');

  const orderId = useMemo(() => Number(orderIdParam), [orderIdParam]);
  const warehouseId = useMemo(
    () => (warehouseIdParam ? Number(warehouseIdParam) : NaN),
    [warehouseIdParam]
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingReceipt | null>(null);
  const [lines, setLines] = useState<ReceiveLineForm[]>([]);

  const loadPending = useCallback(async () => {
    if (!warehouseId || Number.isNaN(warehouseId) || !orderId || Number.isNaN(orderId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await warehouseApi.pendingReceipts(warehouseId);
      const list = res.data.data || [];
      const matched = list.find((p) => p.orderPlanId === orderId) || null;
      setPending(matched);
      if (matched) {
        setLines(
          matched.lines.map((l) => ({
            packagingId: l.packagingId,
            itemName: l.itemName,
            packName: l.packName,
            orderedPackQty: l.orderedPackQty,
            receivedPackQty: l.orderedPackQty,
            expDate: '',
            lotNo: '',
          }))
        );
      } else {
        setLines([]);
      }
    } catch {
      toast.error(
        t('warehouse.receiving.loadFailed', {
          defaultValue: '입고 대기 정보를 불러올 수 없습니다',
        })
      );
    } finally {
      setLoading(false);
    }
  }, [warehouseId, orderId, t]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const updateLine = (
    index: number,
    field: 'receivedPackQty' | 'expDate' | 'lotNo',
    value: string | number
  ) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const handleConfirm = async () => {
    if (!pending) return;
    if (Number.isNaN(warehouseId) || Number.isNaN(orderId)) return;

    const validLines: ReceiveLineRequest[] = lines
      .filter((l) => Number(l.receivedPackQty) > 0)
      .map((l) => ({
        packagingId: l.packagingId,
        receivedPackQty: Number(l.receivedPackQty),
        ...(l.expDate ? { expDate: l.expDate } : {}),
        ...(l.lotNo ? { lotNo: l.lotNo } : {}),
      }));

    if (validLines.length === 0) {
      toast.error(
        t('warehouse.receiving.noLines', {
          defaultValue: '입고 수량을 입력해 주세요',
        })
      );
      return;
    }

    setSubmitting(true);
    try {
      const receiveResp = await warehouseApi.receiveFromOrder(
        warehouseId,
        orderId,
        { lines: validLines }
      );
      const deliveryId = receiveResp.data.data.id;
      await warehouseApi.confirmDelivery(warehouseId, deliveryId);
      toast.success(
        t('warehouse.receiving.success', {
          defaultValue: '입고가 확정되었습니다',
        })
      );
      navigate(
        `/admin/warehouse-inventory/order/${orderId}?warehouseId=${warehouseId}`
      );
    } catch {
      toast.error(
        t('warehouse.receiving.failed', {
          defaultValue: '입고 처리에 실패했습니다',
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (!Number.isNaN(warehouseId) && !Number.isNaN(orderId)) {
      navigate(
        `/admin/warehouse-inventory/order/${orderId}?warehouseId=${warehouseId}`
      );
    } else {
      navigate(-1);
    }
  };

  if (Number.isNaN(warehouseId)) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('warehouse.receiving.warehouseRequired', {
          defaultValue: 'warehouseId 쿼리 파라미터가 필요합니다',
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('common.loading', { defaultValue: '로딩중...' })}
      </div>
    );
  }

  if (!pending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBack}>
            &larr; {t('common.back', { defaultValue: '뒤로' })}
          </Button>
          <h2 className="text-xl font-bold">
            {t('warehouse.receiving.title', { defaultValue: '입고 처리' })} #
            {orderId}
          </h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          {t('warehouse.receiving.noPending', {
            defaultValue: '해당 발주의 입고 대기 항목이 없습니다',
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleBack}>
          &larr; {t('common.back', { defaultValue: '뒤로' })}
        </Button>
        <h2 className="text-xl font-bold flex-1">
          {t('warehouse.receiving.title', { defaultValue: '입고 처리' })} #
          {orderId}
        </h2>
        <Badge variant="secondary">{pending.status}</Badge>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">
                {t('ordering.supplier', { defaultValue: '공급사' })}
              </div>
              <div className="font-medium">{pending.supplierName}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">
                {t('warehouse.receiving.lineCount', {
                  defaultValue: '발주 라인 수',
                })}
              </div>
              <div className="font-medium">{pending.lines.length}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">
                {t('warehouse.receiving.expectedAt', {
                  defaultValue: '예상 도착일',
                })}
              </div>
              <div className="font-medium">
                {pending.expectedAt
                  ? new Date(pending.expectedAt).toLocaleDateString()
                  : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const isMatch =
            Number(line.receivedPackQty) === Number(line.orderedPackQty);
          const isPartial =
            Number(line.receivedPackQty) > 0 &&
            Number(line.receivedPackQty) < Number(line.orderedPackQty);
          return (
            <Card
              key={line.packagingId}
              className={`border-2 ${
                isMatch
                  ? 'border-green-300'
                  : isPartial
                  ? 'border-yellow-300'
                  : 'border-gray-200'
              }`}
            >
              <CardContent className="py-4 space-y-3">
                {/* Item info */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{line.itemName}</p>
                    <p className="text-sm text-gray-500">{line.packName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {isMatch && (
                      <Badge className="bg-green-100 text-green-800">
                        {t('warehouse.receiving.match', {
                          defaultValue: '일치',
                        })}
                      </Badge>
                    )}
                    {isPartial && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {t('warehouse.receiving.partial', {
                          defaultValue: '부분',
                        })}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Inputs grid: 4 columns on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">
                      {t('warehouse.receiving.ordered', {
                        defaultValue: '발주 수량',
                      })}
                    </Label>
                    <div className="h-11 px-3 flex items-center rounded-md border bg-gray-50 text-base font-bold text-gray-700">
                      {line.orderedPackQty}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">
                      {t('warehouse.receiving.received', {
                        defaultValue: '실수량',
                      })}
                    </Label>
                    <Input
                      type="number"
                      value={line.receivedPackQty}
                      onChange={(e) =>
                        updateLine(
                          idx,
                          'receivedPackQty',
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      className="h-11 text-base font-bold"
                      inputMode="numeric"
                      min={0}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">
                      {t('expiry.expDate', { defaultValue: '유통기한' })}
                    </Label>
                    <Input
                      type="date"
                      value={line.expDate}
                      onChange={(e) =>
                        updateLine(idx, 'expDate', e.target.value)
                      }
                      className="h-11 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">
                      {t('warehouse.lot', { defaultValue: 'LOT 번호' })}
                    </Label>
                    <Input
                      value={line.lotNo}
                      onChange={(e) => updateLine(idx, 'lotNo', e.target.value)}
                      className="h-11 text-sm"
                      placeholder={t('common.optional', {
                        defaultValue: '선택',
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sticky bottom confirm button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10">
        <div className="max-w-5xl mx-auto">
          <Button
            onClick={handleConfirm}
            disabled={
              submitting || lines.every((l) => Number(l.receivedPackQty) === 0)
            }
            className="w-full h-14 text-lg bg-green-700 hover:bg-green-800"
          >
            {submitting
              ? t('common.processing', { defaultValue: '처리중...' })
              : t('warehouse.receiving.confirm', {
                  defaultValue: '입고 확정',
                })}
          </Button>
        </div>
      </div>
    </div>
  );
}
