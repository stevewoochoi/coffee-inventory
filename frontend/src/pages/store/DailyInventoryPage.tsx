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
  month: number; // 1-based
  day: number;
  isPrevMonth: boolean;
  dateStr: string; // YYYY-MM-DD
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const fixedBodyRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  // Compute date columns: prev month last 2 days + current month all days
  const dateColumns = useMemo<DateColumn[]>(() => {
    const cols: DateColumn[] = [];

    // Previous month last 2 days
    const prevDate = new Date(year, month - 1, 0); // last day of prev month
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const prevLastDay = prevDate.getDate();

    for (let d = prevLastDay - 1; d <= prevLastDay; d++) {
      cols.push({
        year: prevYear,
        month: prevMonth,
        day: d,
        isPrevMonth: true,
        dateStr: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Current month all days
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      cols.push({
        year,
        month,
        day: d,
        isPrevMonth: false,
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
      // API not ready yet — show empty grid
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-scroll to today's column on load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const todayIndex = dateColumns.findIndex((c) => c.dateStr === todayStr);
      if (todayIndex >= 0) {
        const cellWidth = 56; // w-14 = 3.5rem = 56px
        const containerWidth = scrollRef.current.clientWidth;
        const scrollTo = todayIndex * cellWidth - containerWidth / 2 + cellWidth / 2;
        scrollRef.current.scrollLeft = Math.max(0, scrollTo);
      }
    }
  }, [loading, dateColumns, todayStr]);

  // Sync vertical scroll between fixed column and scrollable area
  const handleFixedScroll = useCallback(() => {
    if (fixedBodyRef.current && scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = fixedBodyRef.current.scrollTop;
    }
  }, []);

  const handleScrollableScroll = useCallback(() => {
    if (scrollBodyRef.current && fixedBodyRef.current) {
      fixedBodyRef.current.scrollTop = scrollBodyRef.current.scrollTop;
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

    // Optimistic update
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
      await saveDailyCount({
        itemId,
        countDate: col.dateStr,
        qty,
      });
      toast.success('저장되었습니다');
    } catch {
      // Rollback
      setRows(prevRows);
      toast.error('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const goToPrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const formatMonthLabel = (col: DateColumn) => {
    if (col.dateStr === todayStr) return '오늘';
    return String(col.day);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">일별 재고실사</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-semibold min-w-[120px] text-center">
            {year}년 {month}월
          </span>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Fixed item column */}
          <div className="flex-shrink-0 w-40 flex flex-col border-r bg-white">
            {/* Fixed header cell */}
            <div className="h-12 flex items-center px-3 border-b bg-gray-50 text-xs font-semibold text-gray-600">
              품목
            </div>
            {/* Fixed body rows */}
            <div
              ref={fixedBodyRef}
              className="flex-1 overflow-y-auto"
              onScroll={handleFixedScroll}
              style={{ scrollbarWidth: 'none' }}
            >
              {rows.map((row) => (
                <div
                  key={row.itemId}
                  className="h-12 flex flex-col justify-center px-3 border-b"
                >
                  <span className="text-xs font-medium text-gray-900 truncate">
                    {row.itemName}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {row.itemNameJa}
                  </span>
                </div>
              ))}
              {rows.length === 0 && (
                <div className="h-24 flex items-center justify-center text-xs text-gray-400">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* Scrollable date columns */}
          <div ref={scrollRef} className="flex-1 flex flex-col overflow-x-auto">
            {/* Date headers */}
            <div className="flex flex-shrink-0">
              {dateColumns.map((col) => {
                const isToday = col.dateStr === todayStr;
                return (
                  <div
                    key={col.dateStr}
                    className={`w-14 min-w-[3.5rem] h-12 flex flex-col items-center justify-center border-b border-r text-xs
                      ${isToday ? 'bg-blue-600 text-white font-bold' : ''}
                      ${col.isPrevMonth ? 'bg-gray-100 text-gray-300' : ''}
                      ${!isToday && !col.isPrevMonth ? 'bg-gray-50 text-gray-600 font-medium' : ''}
                    `}
                  >
                    <span>{formatMonthLabel(col)}</span>
                    {!isToday && <span className="text-[9px]">{col.day}</span>}
                  </div>
                );
              })}
            </div>
            {/* Data rows */}
            <div
              ref={scrollBodyRef}
              className="flex-1 overflow-y-auto"
              onScroll={handleScrollableScroll}
            >
              {rows.map((row) => (
                <div key={row.itemId} className="flex">
                  {dateColumns.map((col) => {
                    const isToday = col.dateStr === todayStr;
                    const val = col.isPrevMonth ? undefined : row.dailyCounts[col.day];
                    const hasValue = val !== undefined && val !== null;

                    return (
                      <div
                        key={col.dateStr}
                        className={`w-14 min-w-[3.5rem] h-12 flex items-center justify-center border-b border-r cursor-pointer
                          ${isToday ? 'bg-blue-50' : ''}
                          ${col.isPrevMonth ? 'bg-gray-100 cursor-default' : ''}
                        `}
                        onClick={() => handleCellTap(row, col)}
                      >
                        {col.isPrevMonth ? (
                          <span className="text-xs text-gray-300">-</span>
                        ) : hasValue ? (
                          <span className="text-sm font-bold text-gray-900">{val}</span>
                        ) : (
                          <span className="text-sm text-gray-300">&mdash;</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet modal for editing */}
      {editCell && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40"
          onClick={() => setEditCell(null)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editCell.itemName}{' '}
                <span className="text-sm text-gray-400">{editCell.itemNameJa}</span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              placeholder="0"
            />

            <div className="flex gap-3 mt-6">
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
