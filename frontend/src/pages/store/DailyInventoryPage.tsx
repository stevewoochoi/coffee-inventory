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

export default function DailyInventoryPage() {
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState<ItemCountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);

  const fixedBodyRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
    if (!loading && scrollAreaRef.current) {
      const todayIndex = dateColumns.findIndex((c) => c.dateStr === todayStr);
      if (todayIndex >= 0) {
        const cellW = 48; // w-12
        const containerW = scrollAreaRef.current.clientWidth;
        scrollAreaRef.current.scrollLeft = Math.max(0, todayIndex * cellW - containerW / 2 + cellW / 2);
      }
    }
  }, [loading, dateColumns, todayStr]);

  // Sync vertical scroll: fixed col ↔ scrollable area
  const syncScrollFromFixed = useCallback(() => {
    if (fixedBodyRef.current && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = fixedBodyRef.current.scrollTop;
    }
  }, []);
  const syncScrollFromScrollable = useCallback(() => {
    if (scrollAreaRef.current && fixedBodyRef.current) {
      fixedBodyRef.current.scrollTop = scrollAreaRef.current.scrollTop;
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
      await saveDailyCount({ itemId, countDate: col.dateStr, qty });
      toast.success('저장완료');
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

  const CELL = 'w-12 min-w-[3rem] h-11';

  return (
    <div className="flex flex-col h-full bg-gray-50 -mx-4 -my-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b px-3 py-2 flex items-center justify-between">
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
        <div className="flex-1 flex overflow-hidden">
          {/* Fixed item column — header + body 수직 동기화 */}
          <div className="flex-shrink-0 w-28 flex flex-col border-r bg-white z-10">
            {/* Fixed header */}
            <div className={`${CELL} flex items-center px-2 border-b bg-gray-50 text-[11px] font-semibold text-gray-500`}>
              품목
            </div>
            {/* Fixed body */}
            <div
              ref={fixedBodyRef}
              className="flex-1 overflow-y-auto"
              onScroll={syncScrollFromFixed}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {rows.map((row) => (
                <div key={row.itemId} className={`${CELL} flex flex-col justify-center px-2 border-b`}>
                  <span className="text-[11px] font-medium text-gray-900 truncate leading-tight">
                    {row.itemName}
                  </span>
                  {row.itemNameJa && (
                    <span className="text-[9px] text-gray-400 truncate leading-tight">
                      {row.itemNameJa}
                    </span>
                  )}
                </div>
              ))}
              {rows.length === 0 && (
                <div className="h-24 flex items-center justify-center text-xs text-gray-400">
                  데이터 없음
                </div>
              )}
            </div>
          </div>

          {/* Scrollable area — header + body 함께 가로 스크롤 */}
          <div
            ref={scrollAreaRef}
            className="flex-1 overflow-x-auto overflow-y-auto"
            onScroll={syncScrollFromScrollable}
          >
            {/* 날짜 헤더 + 데이터를 하나의 table로 묶어서 가로 스크롤 동기화 */}
            <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  {dateColumns.map((col) => {
                    const isToday = col.dateStr === todayStr;
                    return (
                      <th
                        key={col.dateStr}
                        className={`${CELL} text-center text-[11px] border-b border-r
                          ${isToday ? 'bg-blue-600 text-white font-bold' : ''}
                          ${col.isPrevMonth ? 'bg-gray-100 text-gray-300' : ''}
                          ${!isToday && !col.isPrevMonth ? 'bg-gray-50 text-gray-600 font-medium' : ''}
                        `}
                      >
                        {isToday ? (
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-[10px]">오늘</span>
                            <span>{col.day}</span>
                          </div>
                        ) : (
                          <span>{col.day}</span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.itemId}>
                    {dateColumns.map((col) => {
                      const isToday = col.dateStr === todayStr;
                      const val = col.isPrevMonth ? undefined : row.dailyCounts[col.day];
                      const hasValue = val !== undefined && val !== null;
                      return (
                        <td
                          key={col.dateStr}
                          onClick={() => handleCellTap(row, col)}
                          className={`${CELL} text-center text-xs border-b border-r select-none
                            ${!col.isPrevMonth ? 'cursor-pointer active:bg-blue-100' : 'cursor-default'}
                            ${isToday ? 'bg-blue-50' : ''}
                            ${col.isPrevMonth ? 'bg-gray-50' : ''}
                            ${hasValue ? 'font-bold text-gray-900' : 'text-gray-300'}
                          `}
                        >
                          {col.isPrevMonth ? '' : hasValue ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 수량 입력 모달 — z-[100]으로 하단탭(z-50) 위에 표시 */}
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
