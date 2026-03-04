import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { orderingApi, type OrderDetailedResponse } from '@/api/ordering';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const WEEKDAYS_KEYS = ['calendar.sun', 'calendar.mon', 'calendar.tue', 'calendar.wed', 'calendar.thu', 'calendar.fri', 'calendar.sat'];

interface DayOrders {
  date: string;
  orders: OrderDetailedResponse[];
  totalAmount: number;
}

export default function OrderCalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId ?? 1;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [ordersByDate, setOrdersByDate] = useState<Map<string, DayOrders>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const res = await orderingApi.getAllPlans({ brandId, status: undefined });
      const orders: OrderDetailedResponse[] = res.data.data || [];

      const map = new Map<string, DayOrders>();
      orders.forEach((order) => {
        const dateStr = order.deliveryDate || order.createdAt?.substring(0, 10);
        if (!dateStr) return;
        if (dateStr < from || dateStr > to) return;

        if (!map.has(dateStr)) {
          map.set(dateStr, { date: dateStr, orders: [], totalAmount: 0 });
        }
        const dayData = map.get(dateStr)!;
        dayData.orders.push(order);
        dayData.totalAmount += order.totalAmount || 0;
      });

      setOrdersByDate(map);
    } catch {
      toast.error(t('ordering.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [brandId, year, month, t]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getDateString = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getStatusColor = (orders: OrderDetailedResponse[]) => {
    const hasConfirmed = orders.some(o => o.status === 'CONFIRMED');
    const hasDispatched = orders.some(o => o.status === 'DISPATCHED');
    const hasDelivered = orders.some(o => o.status === 'DELIVERED');
    if (hasDelivered) return 'bg-green-100 border-green-300';
    if (hasDispatched) return 'bg-blue-100 border-blue-300';
    if (hasConfirmed) return 'bg-amber-100 border-amber-300';
    return 'bg-gray-100 border-gray-300';
  };

  const selectedDayOrders = selectedDate ? ordersByDate.get(selectedDate) : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('calendar.title')}</h2>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={prevMonth}>{t('common.previous')}</Button>
        <h3 className="text-lg font-semibold">
          {year}{t('calendar.year')} {month + 1}{t('calendar.monthSuffix')}
        </h3>
        <Button variant="outline" onClick={nextMonth}>{t('common.next')}</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-6">
            {/* Weekday headers */}
            {WEEKDAYS_KEYS.map((key) => (
              <div key={key} className="text-center text-xs font-medium text-gray-500 py-2">
                {t(key)}
              </div>
            ))}

            {/* Day cells */}
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-24" />;
              }

              const dateStr = getDateString(day);
              const dayData = ordersByDate.get(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === today.toISOString().substring(0, 10);

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`h-16 sm:h-24 border rounded-lg p-1 cursor-pointer transition-all text-xs ${
                    isSelected ? 'ring-2 ring-blue-800 border-blue-800' :
                    isToday ? 'border-blue-400 bg-blue-50' :
                    dayData ? getStatusColor(dayData.orders) : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className={`font-medium ${isToday ? 'text-blue-800' : ''}`}>{day}</div>
                  {dayData && (
                    <div className="mt-0.5">
                      <span className="hidden sm:inline text-[10px] text-gray-600">
                        {dayData.orders.length}{t('calendar.ordersUnit')}
                      </span>
                      <div className="sm:hidden">
                        <div className={`w-2 h-2 rounded-full ${
                          dayData.orders.some(o => o.status === 'DELIVERED') ? 'bg-green-500' :
                          dayData.orders.some(o => o.status === 'DISPATCHED') ? 'bg-blue-500' :
                          'bg-amber-500'
                        }`} />
                      </div>
                      <div className="hidden sm:block text-[10px] text-gray-500 truncate">
                        {'\u20A9'}{Math.round(dayData.totalAmount / 1000)}K
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status legend */}
          <div className="flex gap-4 mb-6 text-xs text-gray-600">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-200" />{t('ordering.status.CONFIRMED')}</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-200" />{t('ordering.status.DISPATCHED')}</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-200" />{t('ordering.status.DELIVERED')}</div>
          </div>

          {/* Selected date details */}
          {selectedDate && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                {selectedDate} {t('calendar.orderDetail')}
              </h3>
              {selectedDayOrders && selectedDayOrders.orders.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayOrders.orders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">#{order.id} - {order.supplierName}</p>
                            <p className="text-sm text-gray-500">
                              {t('ordering.store')}: {order.storeId}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              order.status === 'DELIVERED' ? 'default' :
                              order.status === 'DISPATCHED' ? 'secondary' : 'outline'
                            }>
                              {t(`ordering.status.${order.status}`)}
                            </Badge>
                            <p className="text-sm font-medium mt-1">
                              {'\u20A9'}{(order.totalAmount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{t('calendar.noOrders')}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
