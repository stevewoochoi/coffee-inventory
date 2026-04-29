import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  warehouseApi,
  type Warehouse,
  type ItemForecast,
  type ForecastResponse,
  type StockLedgerEntry,
  type WarehouseOrder,
  type PendingReceipt,
  type CycleCountSession,
} from '@/api/warehouse';
import { formatCurrency } from '@/lib/currency';

type TabKey = 'inventory' | 'orders' | 'receiving' | 'cycle' | 'ledger';

const orderStatusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CUTOFF_CLOSED: 'bg-purple-100 text-purple-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

const cycleStatusColor: Record<string, string> = {
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function WarehouseInventoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [pending, setPending] = useState<PendingReceipt[]>([]);
  const [cycleSessions, setCycleSessions] = useState<CycleCountSession[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('inventory');
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjForm, setAdjForm] = useState<{ itemId: number | undefined; itemName?: string; qtyDelta: string; reason: string; memo: string }>({
    itemId: undefined, qtyDelta: '', reason: 'OTHER', memo: '',
  });
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseApi.list();
      const list = res.data.data || [];
      setWarehouses(list);
      if (list.length > 0 && selectedId == null) setSelectedId(list[0].id);
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

  const loadOrders = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await warehouseApi.listOrders(selectedId);
      setOrders(res.data.data || []);
    } catch {
      toast.error(t('warehouse.ordersLoadFailed', { defaultValue: '발주 목록 로드 실패' }));
    }
  }, [selectedId, t]);

  const loadPending = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await warehouseApi.pendingReceipts(selectedId);
      setPending(res.data.data || []);
    } catch {
      toast.error(t('warehouse.pendingLoadFailed', { defaultValue: '입고 대기 로드 실패' }));
    }
  }, [selectedId, t]);

  const loadCycleSessions = useCallback(async () => {
    if (!selectedId) return;
    try {
      const [active, history] = await Promise.all([
        warehouseApi.listActiveCycleCounts(selectedId).catch(() => ({ data: { data: [] as CycleCountSession[] } })),
        warehouseApi.cycleCountHistory(selectedId, 0, 20).catch(() => ({ data: { data: { content: [] as CycleCountSession[] } } })),
      ]);
      const activeList = active.data.data || [];
      const historyList = history.data.data?.content || [];
      const merged = [...activeList];
      const seenIds = new Set(activeList.map(s => s.id));
      for (const s of historyList) {
        if (!seenIds.has(s.id)) merged.push(s);
      }
      setCycleSessions(merged);
    } catch {
      toast.error(t('warehouse.cycleLoadFailed', { defaultValue: '실사 목록 로드 실패' }));
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
    else if (tab === 'orders') loadOrders();
    else if (tab === 'receiving') loadPending();
    else if (tab === 'cycle') loadCycleSessions();
    else if (tab === 'ledger') loadLedger();
  }, [selectedId, tab, loadInventory, loadOrders, loadPending, loadCycleSessions, loadLedger]);

  // Always load inventory on warehouse change for summary cards
  useEffect(() => {
    if (selectedId && tab !== 'inventory') loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const summary = useMemo(() => {
    const items = forecast?.items || [];
    const total = items.length;
    const out = items.filter(i => Number(i.currentStock) <= 0).length;
    const low = items.filter(i => i.minStock > 0 && Number(i.currentStock) <= i.minStock && Number(i.currentStock) > 0).length;
    const normal = total - out - low;
    const today = new Date();
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);
    const expiring = items.filter(i => {
      if (!i.nearestExpDate || Number(i.currentStock) <= 0) return false;
      const exp = new Date(i.nearestExpDate + 'T00:00:00');
      return exp <= sevenDays;
    }).length;
    const totalValue = items.reduce((s, i) => s + Number(i.stockValue || 0), 0);
    return { total, normal, low, out, expiring, totalValue };
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

  const openAdjustForItem = (item: ItemForecast) => {
    setAdjForm({ itemId: item.itemId, itemName: item.itemName, qtyDelta: '', reason: 'OTHER', memo: '' });
    setAdjustOpen(true);
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold">{t('nav.warehouseInventory', { defaultValue: '본사 창고 재고' })}</h2>
          {warehouses.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm h-10 font-medium"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-[#0077cc] hover:bg-[#005ea3]"
            onClick={() => navigate(`/admin/warehouse-inventory/order/new?warehouseId=${selectedId ?? ''}`)}
            disabled={!selectedId}
          >
            + {t('warehouse.newOrder', { defaultValue: '발주하기' })}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAdjustOpen(true)} disabled={!selectedId}>
            + {t('warehouse.quickAdjust', { defaultValue: '빠른 조정' })}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/warehouse-inventory/cycle-count/new?warehouseId=${selectedId ?? ''}`)}
            disabled={!selectedId}
          >
            + {t('warehouse.newCycleCount', { defaultValue: '실사' })}
          </Button>
        </div>
      </div>

      {/* Summary cards (6) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-gray-500">{t('inventory.totalItems', { defaultValue: '총 품목' })}</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-gray-500">{t('dashboard.normal', { defaultValue: '정상' })}</div>
            <div className="text-2xl font-bold text-green-600">{summary.normal}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-gray-500">{t('dashboard.lowStock', { defaultValue: '부족' })}</div>
            <div className="text-2xl font-bold text-amber-600">{summary.low}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-gray-500">{t('dashboard.outOfStock', { defaultValue: '품절' })}</div>
            <div className="text-2xl font-bold text-red-600">{summary.out}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-gray-500">{t('warehouse.expiringSoon', { defaultValue: '만료임박(7일)' })}</div>
            <div className="text-2xl font-bold text-orange-600">{summary.expiring}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <div className="text-xs text-gray-500">{t('warehouse.stockValue', { defaultValue: '재고가치' })}</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(summary.totalValue, undefined)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {([
          { k: 'inventory', label: t('warehouse.tabInventory', { defaultValue: '재고현황' }) },
          { k: 'orders', label: t('warehouse.tabOrders', { defaultValue: '발주관리' }) },
          { k: 'receiving', label: t('warehouse.tabReceiving', { defaultValue: '입고처리' }) },
          { k: 'cycle', label: t('warehouse.tabCycle', { defaultValue: '실사' }) },
          { k: 'ledger', label: t('warehouse.tabLedger', { defaultValue: '변동이력' }) },
        ] as const).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
              tab === k
                ? 'border-[#0077cc] text-[#0077cc]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Inventory tab — rich card view */}
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
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              {t('inventory.noData', { defaultValue: '데이터 없음' })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => {
                const isLow = item.minStock > 0 && Number(item.currentStock) <= item.minStock;
                const isOut = Number(item.currentStock) <= 0;
                const fillPct = Math.min(100, Math.max(0, Number(item.fillPercentage)));
                const barColor = fillPct <= 25 ? 'bg-red-500' : fillPct <= 50 ? 'bg-amber-500' : 'bg-green-500';
                const expanded = expandedItem === item.itemId;
                return (
                  <Card
                    key={item.itemId}
                    className={`${isOut ? 'border-red-200 bg-red-50/30' : isLow ? 'border-amber-200 bg-amber-50/30' : ''}`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{item.itemName}</span>
                            <span className="text-xs text-gray-400">{item.category || '-'}</span>
                            {isOut ? (
                              <Badge className="bg-red-100 text-red-800">{t('inventory.out', { defaultValue: '품절' })}</Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-100 text-amber-800">{t('inventory.lowBadge', { defaultValue: '부족' })}</Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-sm flex-wrap">
                            <span>
                              <span className="text-gray-500">{t('warehouse.current', { defaultValue: '현재고' })}: </span>
                              <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>
                                {Number(item.currentStock).toFixed(0)}
                              </span>
                              <span className="text-gray-400"> / {Number(item.minStock).toFixed(0)} {item.baseUnit}</span>
                            </span>
                            {Number(item.daysUntilEmpty) < 999 && (
                              <span className="text-gray-500">
                                {t('warehouse.daysLeft', { defaultValue: '소진예상' })}: <span className="font-medium">{Number(item.daysUntilEmpty).toFixed(0)}일</span>
                              </span>
                            )}
                            {item.nearestExpDate && (
                              <span className="text-gray-500">
                                {t('warehouse.nearestExp', { defaultValue: '최단유통' })}: <span className="font-medium">{item.nearestExpDate}</span>
                              </span>
                            )}
                            {Number(item.stockValue) > 0 && (
                              <span className="text-gray-500">
                                {t('warehouse.value', { defaultValue: '가치' })}: <span className="font-medium">{formatCurrency(Number(item.stockValue), undefined)}</span>
                              </span>
                            )}
                          </div>
                          {/* Fill bar */}
                          <div className="mt-2 max-w-md h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full ${barColor}`} style={{ width: `${fillPct}%` }} />
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline"
                            onClick={() => navigate(`/admin/warehouse-inventory/order/new?warehouseId=${selectedId}&itemId=${item.itemId}`)}>
                            {t('warehouse.order', { defaultValue: '발주' })}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAdjustForItem(item)}>
                            {t('warehouse.adjust', { defaultValue: '조정' })}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedItem(expanded ? null : item.itemId)}
                          >
                            {expanded ? '▲' : '▼'}
                          </Button>
                        </div>
                      </div>
                      {expanded && (
                        <div className="mt-3 pl-2 text-xs text-gray-500 border-l-2 border-gray-200">
                          <ItemLotPanel warehouseId={selectedId!} itemId={item.itemId} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('common.date', { defaultValue: '생성일' })}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('orderAdmin.deliveryDate', { defaultValue: '납품일' })}</TableHead>
                <TableHead className="text-right">{t('orderAdmin.totalAmount', { defaultValue: '금액' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/admin/warehouse-inventory/order/${o.id}?warehouseId=${selectedId}`)}
                >
                  <TableCell className="font-medium text-blue-600 underline">#{o.id}</TableCell>
                  <TableCell className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={orderStatusColor[o.status] || ''}>
                      {t(`ordering.status.${o.status}`, o.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{o.deliveryDate || '-'}</TableCell>
                  <TableCell className="text-right">{o.totalAmount != null ? formatCurrency(Number(o.totalAmount), undefined) : '-'}</TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-12">
                    {t('warehouse.noOrders', { defaultValue: '발주 없음' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Receiving tab */}
      {tab === 'receiving' && (
        <div className="space-y-2">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border">
              {t('warehouse.noPending', { defaultValue: '입고 대기 발주 없음' })}
            </div>
          ) : (
            pending.map(p => (
              <Card key={p.orderPlanId}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">#{p.orderPlanId} — {p.supplierName}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('orderAdmin.deliveryDate', { defaultValue: '납품예정' })}: {p.expectedAt || '-'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {(p.lines || []).map(l => `${l.itemName} × ${l.orderedPackQty}`).join(', ')}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#0077cc] hover:bg-[#005ea3]"
                      onClick={() => navigate(`/admin/warehouse-inventory/receiving/${p.orderPlanId}?warehouseId=${selectedId}`)}
                    >
                      {t('warehouse.processReceiving', { defaultValue: '입고처리 →' })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Cycle count tab */}
      {tab === 'cycle' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('common.date', { defaultValue: '시작일' })}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('warehouse.gradeFilter', { defaultValue: '등급' })}</TableHead>
                <TableHead>{t('warehouse.zoneFilter', { defaultValue: '구역' })}</TableHead>
                <TableHead className="text-right">{t('warehouse.cycleProgress', { defaultValue: '진행' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycleSessions.map(s => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/admin/warehouse-inventory/cycle-count/${s.id}?warehouseId=${selectedId}`)}
                >
                  <TableCell className="font-medium text-blue-600 underline">#{s.id}</TableCell>
                  <TableCell className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={cycleStatusColor[s.status] || ''}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>{s.gradeFilter || '-'}</TableCell>
                  <TableCell>{s.zoneFilter || '-'}</TableCell>
                  <TableCell className="text-right">{s.completedCount} / {s.itemCount}</TableCell>
                </TableRow>
              ))}
              {cycleSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                    {t('warehouse.noCycleSessions', { defaultValue: '실사 세션 없음' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Ledger tab */}
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
                  <TableCell className="text-xs text-gray-500">{new Date(l.createdAt).toLocaleString()}</TableCell>
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
            <DialogTitle>
              {t('warehouse.quickAdjust', { defaultValue: '빠른 조정' })}
              {adjForm.itemName ? ` — ${adjForm.itemName}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!adjForm.itemName && (
              <div>
                <Label>{t('common.itemId', { defaultValue: '품목 ID' })}</Label>
                <Input type="number" value={adjForm.itemId ?? ''}
                  onChange={(e) => setAdjForm({ ...adjForm, itemId: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
            )}
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

function ItemLotPanel({ warehouseId, itemId }: { warehouseId: number; itemId: number }) {
  const { t } = useTranslation();
  const [lots, setLots] = useState<{ id: number; qtyBaseUnit: number; lotNo?: string | null; expDate?: string | null }[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    warehouseApi.getLots(warehouseId, itemId)
      .then(res => { if (!cancelled) setLots(res.data.data || []); })
      .catch(() => { if (!cancelled) setLots([]); });
    return () => { cancelled = true; };
  }, [warehouseId, itemId]);

  if (lots == null) return <div>...</div>;
  if (lots.length === 0) return <div>{t('warehouse.noLots', { defaultValue: 'LOT 없음' })}</div>;

  return (
    <div className="space-y-1">
      {lots.map(l => (
        <div key={l.id}>
          {t('warehouse.lot', { defaultValue: 'LOT' })}: <span className="font-medium">{l.lotNo || '-'}</span>
          {' · '}
          {Number(l.qtyBaseUnit).toFixed(0)}{l.expDate ? ` · ${l.expDate} ${t('warehouse.expires', { defaultValue: '만료' })}` : ''}
        </div>
      ))}
    </div>
  );
}
