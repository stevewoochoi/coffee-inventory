import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { warehouseApi, type Warehouse, type ForecastResponse, type StockLedgerEntry } from '@/api/warehouse';

type TabKey = 'inventory' | 'ledger';

export default function WarehouseInventoryPage() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('inventory');
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjForm, setAdjForm] = useState<{ itemId: number | undefined; qtyDelta: string; reason: string; memo: string }>({
    itemId: undefined, qtyDelta: '', reason: 'OTHER', memo: '',
  });

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseApi.list();
      const list = res.data.data || [];
      setWarehouses(list);
      if (list.length > 0 && selectedId == null) {
        setSelectedId(list[0].id);
      }
    } catch {
      toast.error(t('warehouse.loadFailed', { defaultValue: '창고 목록을 불러올 수 없습니다' }));
    } finally {
      setWarehousesLoaded(true);
    }
  }, [t, selectedId]);

  const loadInventory = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await warehouseApi.getInventory(selectedId);
      setForecast(res.data.data);
    } catch {
      toast.error(t('inventory.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedId, t]);

  const loadLedger = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await warehouseApi.getLedger(selectedId);
      setLedger(res.data.data.content || []);
    } catch {
      toast.error(t('inventory.loadFailed'));
    }
  }, [selectedId, t]);

  useEffect(() => { loadWarehouses(); }, [loadWarehouses]);
  useEffect(() => {
    if (!selectedId) return;
    if (tab === 'inventory') loadInventory();
    else if (tab === 'ledger') loadLedger();
  }, [selectedId, tab, loadInventory, loadLedger]);

  const summary = useMemo(() => {
    const items = forecast?.items || [];
    const total = items.length;
    const out = items.filter(i => Number(i.currentStock) <= 0).length;
    const low = items.filter(i => i.minStock > 0 && Number(i.currentStock) <= i.minStock && Number(i.currentStock) > 0).length;
    const normal = total - out - low;
    return { total, normal, low, out };
  }, [forecast]);

  const filteredItems = useMemo(() => {
    let result = forecast?.items || [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.itemName.toLowerCase().includes(q));
    }
    if (showLowOnly) {
      result = result.filter(i => i.minStock > 0 && Number(i.currentStock) <= i.minStock);
    }
    return [...result].sort((a, b) => Number(a.fillPercentage) - Number(b.fillPercentage));
  }, [forecast, search, showLowOnly]);

  const handleAdjust = async () => {
    if (!selectedId || !adjForm.itemId) return;
    const qty = parseFloat(adjForm.qtyDelta);
    if (Number.isNaN(qty) || qty === 0) {
      toast.error(t('warehouse.adjustQtyRequired', { defaultValue: '수량 입력 필요' }));
      return;
    }
    try {
      await warehouseApi.adjust(selectedId, {
        itemId: adjForm.itemId,
        qtyDelta: qty,
        reason: adjForm.reason,
        memo: adjForm.memo || undefined,
      });
      toast.success(t('warehouse.adjustSuccess', { defaultValue: '조정 완료' }));
      setAdjustOpen(false);
      setAdjForm({ itemId: undefined, qtyDelta: '', reason: 'OTHER', memo: '' });
      loadInventory();
    } catch {
      toast.error(t('warehouse.adjustFailed', { defaultValue: '조정 실패' }));
    }
  };

  if (warehousesLoaded && warehouses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('warehouse.empty', { defaultValue: '등록된 창고가 없습니다' })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">{t('nav.warehouseInventory', { defaultValue: '본사 창고 재고' })}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="border rounded-lg px-3 py-2 text-sm h-10"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)}>
            + {t('warehouse.quickAdjust', { defaultValue: '빠른 조정' })}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {forecast && summary.total > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-gray-500">{t('inventory.totalItems', { defaultValue: '총 품목' })}</div>
              <div className="text-xl font-bold">{summary.total}</div>
            </div>
            <div>
              <div className="text-gray-500">{t('dashboard.normal', { defaultValue: '정상' })}</div>
              <div className="text-xl font-bold text-green-600">{summary.normal}</div>
            </div>
            <div>
              <div className="text-gray-500">{t('dashboard.lowStock', { defaultValue: '부족' })}</div>
              <div className="text-xl font-bold text-amber-600">{summary.low}</div>
            </div>
            <div>
              <div className="text-gray-500">{t('dashboard.outOfStock', { defaultValue: '품절' })}</div>
              <div className="text-xl font-bold text-red-600">{summary.out}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['inventory', 'ledger'] as TabKey[]).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === key
                ? 'border-[#0077cc] text-[#0077cc]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {key === 'inventory'
              ? t('warehouse.tabInventory', { defaultValue: '재고현황' })
              : t('warehouse.tabLedger', { defaultValue: '변동이력' })}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t('inventory.search', { defaultValue: '품목명 검색' })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <button
              onClick={() => setShowLowOnly(!showLowOnly)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                showLowOnly ? 'bg-red-100 text-red-800' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {t('inventory.lowOnly', { defaultValue: '부족만' })}
              {summary.low > 0 && (
                <span className="ml-1 bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full text-xs">
                  {summary.low}
                </span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('items.category')}</TableHead>
                    <TableHead className="text-right">{t('ordering.stock', { defaultValue: '현재고' })}</TableHead>
                    <TableHead className="text-right hidden md:table-cell">{t('ordering.avgDay', { defaultValue: '일평균' })}</TableHead>
                    <TableHead className="text-right hidden md:table-cell">{t('inventory.forecast.sort.daysLeft', { defaultValue: '소진예상' })}</TableHead>
                    <TableHead className="text-center">{t('common.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => {
                    const isLow = item.minStock > 0 && Number(item.currentStock) <= item.minStock;
                    const isOut = Number(item.currentStock) <= 0;
                    return (
                      <TableRow key={item.itemId} className={isOut ? 'bg-red-50' : isLow ? 'bg-amber-50' : ''}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-gray-500">{item.category || '-'}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${isLow ? 'text-red-600' : ''}`}>
                            {Number(item.currentStock).toFixed(0)}
                          </span>
                          <span className="text-gray-400"> / {Number(item.minStock).toFixed(0)}</span>
                          <span className="text-xs text-gray-400 ml-1">{item.baseUnit}</span>
                        </TableCell>
                        <TableCell className="text-right text-gray-500 hidden md:table-cell">
                          {Number(item.avgDailyUsage).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell">
                          {Number(item.daysUntilEmpty) < 999
                            ? t('inventory.forecast.daysLeft', { days: Number(item.daysUntilEmpty).toFixed(0), defaultValue: `${Number(item.daysUntilEmpty).toFixed(0)}일후` })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {isOut ? (
                            <Badge className="bg-red-100 text-red-800">{t('inventory.out', { defaultValue: '품절' })}</Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-100 text-amber-800">{t('inventory.lowBadge', { defaultValue: '부족' })}</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">{t('dashboard.normal', { defaultValue: '정상' })}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                        {t('inventory.noData', { defaultValue: '데이터 없음' })}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {tab === 'ledger' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date', { defaultValue: '일시' })}</TableHead>
                <TableHead>{t('warehouse.type', { defaultValue: '유형' })}</TableHead>
                <TableHead>{t('common.itemId', { defaultValue: '품목ID' })}</TableHead>
                <TableHead className="text-right">{t('warehouse.qty', { defaultValue: '수량' })}</TableHead>
                <TableHead>{t('warehouse.lot', { defaultValue: 'LOT' })}</TableHead>
                <TableHead>{t('warehouse.memo', { defaultValue: '메모' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(l.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      l.type === 'SHIP_OUT' ? 'border-red-300 text-red-700' :
                      l.type === 'RECEIVE' ? 'border-green-300 text-green-700' :
                      l.type === 'ADJUST' ? 'border-amber-300 text-amber-700' : ''
                    }>
                      {l.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{l.itemId}</TableCell>
                  <TableCell className={`text-right font-medium ${Number(l.qtyBaseUnit) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Number(l.qtyBaseUnit) > 0 ? '+' : ''}{Number(l.qtyBaseUnit).toFixed(0)}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">{l.lotNo || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">{l.memo || '-'}</TableCell>
                </TableRow>
              ))}
              {ledger.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                    {t('inventory.noData', { defaultValue: '이력 없음' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Adjust dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('warehouse.quickAdjust', { defaultValue: '빠른 조정' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('common.itemId', { defaultValue: '품목 ID' })}</Label>
              <Input type="number" value={adjForm.itemId ?? ''}
                onChange={(e) => setAdjForm({ ...adjForm, itemId: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <Label>{t('warehouse.qtyDelta', { defaultValue: '수량 변화 (양수=증가, 음수=감소)' })}</Label>
              <Input type="number" step="0.01" value={adjForm.qtyDelta}
                onChange={(e) => setAdjForm({ ...adjForm, qtyDelta: e.target.value })} />
            </div>
            <div>
              <Label>{t('warehouse.reason', { defaultValue: '사유' })}</Label>
              <select
                className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                value={adjForm.reason}
                onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
              >
                <option value="DAMAGE">{t('warehouse.reason.damage', { defaultValue: '파손' })}</option>
                <option value="ERROR">{t('warehouse.reason.error', { defaultValue: '오류' })}</option>
                <option value="RECOUNT">{t('warehouse.reason.recount', { defaultValue: '재실사' })}</option>
                <option value="OTHER">{t('warehouse.reason.other', { defaultValue: '기타' })}</option>
              </select>
            </div>
            <div>
              <Label>{t('warehouse.memo', { defaultValue: '메모' })}</Label>
              <Input value={adjForm.memo}
                onChange={(e) => setAdjForm({ ...adjForm, memo: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAdjust}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
