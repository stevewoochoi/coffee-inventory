import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  warehouseApi,
  type CycleCountSessionDetail,
  type CycleCountLine,
} from '@/api/warehouse';

export default function WarehouseCycleCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const warehouseIdParam = searchParams.get('warehouseId');
  const warehouseId = warehouseIdParam ? Number(warehouseIdParam) : null;

  const [session, setSession] = useState<CycleCountSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const loadSession = useCallback(async () => {
    if (!warehouseId || !sessionId) return;
    setLoading(true);
    try {
      const res = await warehouseApi.getCycleCount(warehouseId, sessionId);
      setSession(res.data.data);
    } catch {
      toast.error(t('common.error', { defaultValue: '오류가 발생했습니다' }));
    } finally {
      setLoading(false);
    }
  }, [warehouseId, sessionId, t]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const summary = useMemo(() => {
    if (!session) return { totalVariance: 0, varianceLines: 0 };
    const lines = session.lines || [];
    let totalVariance = 0;
    let varianceLines = 0;
    for (const line of lines) {
      const v = line.varianceQty;
      if (v != null && v !== 0) {
        totalVariance += v;
        varianceLines += 1;
      }
    }
    return { totalVariance, varianceLines };
  }, [session]);

  if (!warehouseId || Number.isNaN(warehouseId) || !sessionId || Number.isNaN(sessionId)) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/warehouse-inventory')}>
          {t('common.back', { defaultValue: '< 뒤로' })}
        </Button>
        <div className="text-center py-12 text-gray-500">
          {t('warehouse.warehouseIdRequired', { defaultValue: '창고 ID와 실사 ID가 필요합니다' })}
        </div>
      </div>
    );
  }

  const handleUpdateLine = async (
    line: CycleCountLine,
    countedRaw: string,
    noteRaw: string,
  ) => {
    if (!warehouseId) return;
    const trimmedCounted = countedRaw.trim();
    const trimmedNote = noteRaw.trim();

    const prevCounted = line.countedQty;
    const prevNote = line.note ?? '';
    const newCounted = trimmedCounted === '' ? undefined : Number(trimmedCounted);
    const newNote = trimmedNote === '' ? undefined : trimmedNote;

    // Skip if nothing changed
    const countedChanged =
      (prevCounted == null ? '' : String(prevCounted)) !== trimmedCounted;
    const noteChanged = prevNote !== trimmedNote;
    if (!countedChanged && !noteChanged) return;

    if (newCounted != null && Number.isNaN(newCounted)) {
      toast.error(t('warehouse.invalidQty', { defaultValue: '올바른 수량을 입력하세요' }));
      return;
    }

    try {
      await warehouseApi.updateCycleCountLine(warehouseId, line.id, newCounted, newNote);
      loadSession();
    } catch {
      toast.error(t('common.error', { defaultValue: '오류가 발생했습니다' }));
    }
  };

  const handleComplete = async () => {
    if (!warehouseId || !sessionId) return;
    setCompleting(true);
    try {
      await warehouseApi.completeCycleCount(warehouseId, sessionId, true);
      toast.success(
        t('cycleCount.completed', { defaultValue: '실사가 완료되었습니다' })
      );
      loadSession();
    } catch {
      toast.error(t('common.error', { defaultValue: '오류가 발생했습니다' }));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('common.loading', { defaultValue: '로딩 중...' })}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/warehouse-inventory?warehouseId=${warehouseId}`)}
        >
          {t('common.back', { defaultValue: '< 뒤로' })}
        </Button>
        <div className="text-center py-12 text-gray-500">
          {t('common.notFound', { defaultValue: '데이터를 찾을 수 없습니다' })}
        </div>
      </div>
    );
  }

  const isCompleted = session.status === 'COMPLETED';
  const lines = session.lines || [];

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/warehouse-inventory?warehouseId=${warehouseId}`)}
          >
            {t('common.back', { defaultValue: '< 뒤로' })}
          </Button>
          <h2 className="text-xl font-bold">
            {t('warehouse.cycleCountTitle', { defaultValue: '실사' })} #{session.id}
          </h2>
          <Badge
            className={
              isCompleted
                ? 'bg-green-100 text-green-800'
                : 'bg-amber-100 text-amber-800'
            }
          >
            {isCompleted
              ? t('cycleCount.completed', { defaultValue: 'COMPLETED' })
              : t('cycleCount.inProgress', { defaultValue: 'IN_PROGRESS' })}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl border p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
          <div>
            <div className="text-gray-500">
              {t('cycleCount.gradeFilter', { defaultValue: '등급' })}
            </div>
            <div className="font-medium">
              {session.gradeFilter || t('cycleCount.all', { defaultValue: '전체' })}
            </div>
          </div>
          <div>
            <div className="text-gray-500">
              {t('cycleCount.zoneFilter', { defaultValue: '구역' })}
            </div>
            <div className="font-medium">
              {session.zoneFilter || t('cycleCount.all', { defaultValue: '전체' })}
            </div>
          </div>
          <div>
            <div className="text-gray-500">
              {t('common.startedAt', { defaultValue: '시작일' })}
            </div>
            <div className="font-medium text-xs">
              {new Date(session.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-gray-500">
              {t('warehouse.totalLines', { defaultValue: '총 라인' })}
            </div>
            <div className="font-medium">{session.itemCount}</div>
          </div>
          <div>
            <div className="text-gray-500">
              {t('warehouse.completedLines', { defaultValue: '완료 라인' })}
            </div>
            <div className="font-medium">
              {session.completedCount}/{session.itemCount}
            </div>
          </div>
        </div>
      </div>

      {/* Completed summary */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="font-semibold text-green-800 mb-2">
            {t('warehouse.cycleCountResult', { defaultValue: '실사 결과 요약' })}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-600">
                {t('warehouse.totalVariance', { defaultValue: '총 차이' })}
              </div>
              <div
                className={`font-bold ${
                  summary.totalVariance < 0
                    ? 'text-red-600'
                    : summary.totalVariance > 0
                    ? 'text-green-600'
                    : ''
                }`}
              >
                {summary.totalVariance > 0 ? '+' : ''}
                {summary.totalVariance.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">
                {t('warehouse.adjustedLines', { defaultValue: 'ADJUST 라인 수' })}
              </div>
              <div className="font-bold">{summary.varianceLines}</div>
            </div>
          </div>
        </div>
      )}

      {/* Lines */}
      {lines.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          {t('warehouse.noLines', { defaultValue: '실사 라인이 없습니다' })}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name', { defaultValue: '품목명' })}</TableHead>
                  <TableHead>{t('items.category', { defaultValue: '카테고리' })}</TableHead>
                  <TableHead className="text-right">
                    {t('cycleCount.systemQty', { defaultValue: '시스템 수량' })}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('cycleCount.countedQty', { defaultValue: '실제 수량' })}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('cycleCount.variance', { defaultValue: '차이' })}
                  </TableHead>
                  <TableHead>{t('warehouse.memo', { defaultValue: '메모' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const variance = line.varianceQty ?? 0;
                  const hasVariance = variance !== 0;
                  return (
                    <TableRow
                      key={line.id}
                      className={hasVariance ? 'bg-amber-50' : ''}
                    >
                      <TableCell className="font-medium">{line.itemName}</TableCell>
                      <TableCell className="text-gray-500">
                        {line.category || '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {Number(line.systemQty).toFixed(1)}
                        {line.baseUnit && (
                          <span className="text-xs text-gray-400 ml-1">
                            {line.baseUnit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          className="w-24 h-9 text-right ml-auto"
                          placeholder="0"
                          defaultValue={line.countedQty?.toString() ?? ''}
                          disabled={isCompleted}
                          onBlur={(e) =>
                            handleUpdateLine(line, e.target.value, line.note ?? '')
                          }
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          variance < 0
                            ? 'text-red-600'
                            : variance > 0
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {line.countedQty == null
                          ? '-'
                          : `${variance > 0 ? '+' : ''}${variance.toFixed(1)}`}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          className="h-9 text-sm"
                          placeholder={t('warehouse.memo', { defaultValue: '메모' })}
                          defaultValue={line.note ?? ''}
                          disabled={isCompleted}
                          onBlur={(e) =>
                            handleUpdateLine(
                              line,
                              line.countedQty?.toString() ?? '',
                              e.target.value,
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {lines.map((line) => {
              const variance = line.varianceQty ?? 0;
              const hasVariance = variance !== 0;
              return (
                <Card
                  key={line.id}
                  className={`border ${hasVariance ? 'border-amber-300 bg-amber-50' : ''}`}
                >
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{line.itemName}</p>
                        <p className="text-xs text-gray-500">
                          {line.category || '-'}
                        </p>
                      </div>
                      <div
                        className={`text-sm font-semibold shrink-0 ${
                          variance < 0
                            ? 'text-red-600'
                            : variance > 0
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {line.countedQty == null
                          ? '-'
                          : `${variance > 0 ? '+' : ''}${variance.toFixed(1)}`}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          {t('cycleCount.systemQty', { defaultValue: '시스템' })}
                        </p>
                        <p className="text-sm font-medium">
                          {Number(line.systemQty).toFixed(1)}
                          {line.baseUnit && (
                            <span className="text-xs text-gray-400 ml-1">
                              {line.baseUnit}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          {t('cycleCount.countedQty', { defaultValue: '실제' })}
                        </p>
                        <Input
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          className="h-9 text-right"
                          placeholder="0"
                          defaultValue={line.countedQty?.toString() ?? ''}
                          disabled={isCompleted}
                          onBlur={(e) =>
                            handleUpdateLine(line, e.target.value, line.note ?? '')
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        {t('warehouse.memo', { defaultValue: '메모' })}
                      </p>
                      <Input
                        type="text"
                        className="h-9 text-sm"
                        placeholder={t('warehouse.memo', { defaultValue: '메모' })}
                        defaultValue={line.note ?? ''}
                        disabled={isCompleted}
                        onBlur={(e) =>
                          handleUpdateLine(
                            line,
                            line.countedQty?.toString() ?? '',
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Bottom action bar */}
      {!isCompleted && lines.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 -mx-4 px-4 z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
          <Button
            className="w-full h-12 bg-[#0077cc] hover:bg-[#005ea3] text-base"
            onClick={handleComplete}
            disabled={completing}
          >
            {completing
              ? t('common.processing', { defaultValue: '처리 중...' })
              : t('warehouse.completeAndAdjust', {
                  defaultValue: '완료 — 차이만 ADJUST 적용',
                })}
            {summary.varianceLines > 0 && ` (${summary.varianceLines})`}
          </Button>
        </div>
      )}
    </div>
  );
}
