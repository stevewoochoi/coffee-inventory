import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  getMonthlyCount,
  saveDailyCount,
  type ItemCountRow,
} from '@/api/dailyCount';

interface DateColumn {
  year: number;
  month: number;
  day: number;
  isPrevMonth: boolean;
  dateStr: string;
}

interface EditCell {
  itemId: number;
  itemName: string;
  itemNameJa: string;
  col: DateColumn;
}

const CELL_W = 48; // w-12 = 3rem = 48px
const CELL_H = 'h-11';
const CELL_BASE = `min-w-[3rem] w-12 ${CELL_H}`;

export default function DailyInventoryPage() {
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState<ItemCountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [editRowData, setEditRowData] = useState<ItemCountRow | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);

  const fixedBodyRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const dateColumns = useMemo<DateColumn[]>(() => {
    const cols: DateColumn[] = [];
    const prevDate = new Date(year, month - 1, 0);
    const prevYear = prevDate.getFullYear();
    const prevMo = prevDate.getMonth() + 1;
    const prevLastDay = prevDate.getDate();

    for (let d = prevLastDay - 1; d <= prevLastDay; d++) {
      cols.push({
        year: prevYear, month: prevMo, day: d, isPrevMonth: true,
        dateStr: `${prevYear}-${String(prevMo).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      cols.push({
        year, month, day: d, isPrevMonth: false,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    return cols;
  }, [year, month]);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMonthlyCount(storeId, year, month);
      setRows(data?.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, year, month]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-scroll to today
  useEffect(() => {
    if (!loading && scrollBodyRef.current) {
      const todayIndex = dateColumns.findIndex((c) => c.dateStr === todayStr);
      if (todayIndex >= 0) {
        const containerW = scrollBodyRef.current.clientWidth;
        const scrollTo = todayIndex * CELL_W - containerW / 2 + CELL_W / 2;
        scrollBodyRef.current.scrollLeft = Math.max(0, scrollTo);
        if (headerScrollRef.current) {
          headerScrollRef.current.scrollLeft = scrollBodyRef.current.scrollLeft;
        }
      }
    }
  }, [loading, dateColumns, todayStr]);

  // Sync: fixed body ↔ scroll body (vertical)
  const syncVerticalFromFixed = useCallback(() => {
    if (fixedBodyRef.current && scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = fixedBodyRef.current.scrollTop;
    }
  }, []);
  const syncFromScrollBody = useCallback(() => {
    if (scrollBodyRef.current) {
      // vertical sync
      if (fixedBodyRef.current) {
        fixedBodyRef.current.scrollTop = scrollBodyRef.current.scrollTop;
      }
      // horizontal sync: body → header
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = scrollBodyRef.current.scrollLeft;
      }
    }
  }, []);

  const handleCellTap = (row: ItemCountRow, col: DateColumn) => {
    if (col.isPrevMonth) return;
    const existing = row.dailyCounts[col.day];
    setEditCell({
      itemId: row.itemId,
      itemName: row.itemName,
      itemNameJa: row.itemNameJa,
      col,
    });
    setEditRowData(row);
    setInputVal(existing !== undefined && existing !== null ? String(existing) : '');
  };

  const handleSave = async () => {
    if (!editCell) return;
    const qty = parseFloat(inputVal);
    if (isNaN(qty) || qty < 0) {
      toast.error('유효한 수량을 입력해주세요');
      return;
    }
    const { itemId, col } = editCell;
    const prevRows = [...rows];

    setRows((prev) =>
      prev.map((r) =>
        r.itemId === itemId
          ? { ...r, dailyCounts: { ...r.dailyCounts, [col.day]: qty } }
          : r
      )
    );
    setEditCell(null);

    try {
      setSaving(true);
      const result = await saveDailyCount({ itemId, countDate: col.dateStr, qty }, storeId);
      // Update local state with variance info from server
      if (result && result.varianceQty !== undefined) {
        setRows((prev) =>
          prev.map((r) =>
            r.itemId === itemId
              ? {
                  ...r,
                  varianceQties: { ...r.varianceQties, [col.day]: result.varianceQty },
                  systemQties: { ...r.systemQties, [col.day]: result.systemQty },
                  appliedFlags: { ...r.appliedFlags, [col.day]: result.isApplied },
                  currentSystemQty: result.systemQty + result.varianceQty, // after adjustment
                }
              : r
          )
        );
      }
      const varianceMsg = result?.varianceQty && result.varianceQty !== 0
        ? ` (차이: ${result.varianceQty > 0 ? '+' : ''}${result.varianceQty} → 재고 조정됨)`
        : '';
      toast.success(`저장완료${varianceMsg}`);
    } catch {
      setRows(prevRows);
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const goToPrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const goToNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-110px)] bg-gray-50 -mx-4 -my-6">
      {/* 1. 페이지 헤더 — 월 이동 */}
      <div className="shrink-0 bg-white border-b px-3 py-2 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900">일별 재고실사</h1>
        <div className="flex items-center gap-1">
          <button onClick={goToPrevMonth} className="p-2 rounded-full active:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold min-w-[100px] text-center">
            {year}년 {month}월
          </span>
          <button onClick={goToNextMonth} className="p-2 rounded-full active:bg-gray-100">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* 2. 날짜 헤더 행 — 고정 (스크롤 안됨) */}
          <div className="shrink-0 flex border-b bg-gray-50">
            {/* 품목 헤더 셀 */}
            <div className={`shrink-0 w-24 ${CELL_H} flex items-center px-2 border-r text-[11px] font-semibold text-gray-500`}>
              품목
            </div>
            {/* 날짜 헤더 — 가로만 스크롤, 바디와 동기화 */}
            <div
              ref={headerScrollRef}
              className="flex-1 overflow-x-hidden flex"
            >
              {dateColumns.map((col) => {
                const isToday = col.dateStr === todayStr;
                return (
                  <div
                    key={col.dateStr}
                    className={`${CELL_BASE} shrink-0 flex flex-col items-center justify-center border-r text-[11px]
                      ${isToday ? 'bg-blue-600 text-white font-bold' : ''}
                      ${col.isPrevMonth ? 'bg-gray-100 text-gray-300' : ''}
                      ${!isToday && !col.isPrevMonth ? 'text-gray-600 font-medium' : ''}
                    `}
                  >
                    {isToday ? (
                      <>
                        <span className="text-[9px] leading-none">오늘</span>
                        <span className="leading-tight">{col.day}</span>
                      </>
                    ) : (
                      <span>{col.day}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. 데이터 영역 — 품목 고정 + 숫자 가로/세로 스크롤 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 품목 고정 열 */}
            <div
              ref={fixedBodyRef}
              className="shrink-0 w-24 overflow-y-auto border-r bg-white"
              onScroll={syncVerticalFromFixed}
              style={{ scrollbarWidth: 'none' }}
            >
              {rows.map((row) => (
                <div key={row.itemId} className={`${CELL_H} flex flex-col justify-center px-2 border-b`}>
                  <span className="text-[11px] font-medium text-gray-900 truncate leading-tight">
                    {row.itemName}
                  </span>
                  <span className="text-[9px] text-gray-400 truncate leading-tight">
                    {row.currentSystemQty != null ? `재고 ${row.currentSystemQty}${row.stockUnit || row.baseUnit || ''}` : ''}
                  </span>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="h-24 flex items-center justify-center text-xs text-gray-400">
                  데이터 없음
                </div>
              )}
            </div>

            {/* 숫자 데이터 — 가로+세로 스크롤 */}
            <div
              ref={scrollBodyRef}
              className="flex-1 overflow-auto"
              onScroll={syncFromScrollBody}
            >
              <div style={{ width: dateColumns.length * CELL_W }}>
                {rows.map((row) => (
                  <div key={row.itemId} className="flex">
                    {dateColumns.map((col) => {
                      const isToday = col.dateStr === todayStr;
                      const val = col.isPrevMonth ? undefined : row.dailyCounts[col.day];
                      const hasValue = val !== undefined && val !== null;
                      const variance = !col.isPrevMonth && row.varianceQties ? row.varianceQties[col.day] : undefined;
                      const hasVariance = variance !== undefined && variance !== null && variance !== 0;
                      return (
                        <div
                          key={col.dateStr}
                          onClick={() => handleCellTap(row, col)}
                          className={`${CELL_BASE} shrink-0 flex items-center justify-center border-b border-r select-none text-xs
                            ${!col.isPrevMonth ? 'cursor-pointer active:bg-blue-100' : 'cursor-default'}
                            ${isToday && !hasVariance ? 'bg-blue-50' : ''}
                            ${col.isPrevMonth ? 'bg-gray-50' : ''}
                            ${hasVariance && variance > 0 ? 'bg-green-50 text-green-700 font-bold' : ''}
                            ${hasVariance && variance < 0 ? 'bg-red-50 text-red-700 font-bold' : ''}
                            ${hasValue && !hasVariance ? 'font-bold text-gray-900' : ''}
                            ${!hasValue && !col.isPrevMonth ? 'text-gray-300' : ''}
                          `}
                        >
                          {col.isPrevMonth ? '' : hasValue ? val : '—'}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 수량 입력 모달 */}
      {editCell && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-black/40"
          onClick={() => setEditCell(null)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-5 pb-8 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editCell.itemName}
                {editCell.itemNameJa && (
                  <span className="text-sm text-gray-400 ml-2">{editCell.itemNameJa}</span>
                )}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {editCell.col.year}년 {editCell.col.month}월 {editCell.col.day}일
              </p>
              {editRowData && (
                <p className="text-sm text-blue-600 mt-1 font-medium">
                  시스템 재고: {editRowData.currentSystemQty ?? 0} {editRowData.stockUnit || editRowData.baseUnit || ''}
                </p>
              )}
            </div>

            <input
              type="number"
              inputMode="decimal"
              autoFocus
              className="w-full text-center text-3xl font-bold border-2 border-gray-300 rounded-xl py-4 px-4 focus:border-blue-600 focus:outline-none"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="0"
            />

            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={() => setEditCell(null)}
              >
                취소
              </Button>
              <Button
                className="flex-1 h-12 text-base bg-blue-700 hover:bg-blue-800"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
