import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { orderingApi, type OrderDetailedResponse, type HistoryLine } from '@/api/ordering';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CUTOFF_CLOSED: 'bg-purple-100 text-purple-800',
};

interface FlatLine extends HistoryLine {
  orderId: number;
  orderStatus: string;
  supplierName: string;
}

interface DateGroup {
  date: string;
  lines: FlatLine[];
  totalAmount: number;
  orderCount: number;
}

const MAX_PREVIEW = 3;

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderDetailedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();
  const storeId = user?.storeId;
  const { t } = useTranslation();

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderingApi.getPlansFiltered({ storeId });
      setOrders(res.data.data);
    } catch {
      toast.error(t('ordering.loadFailed'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const dateGroups: DateGroup[] = useMemo(() => {
    const groupMap = new Map<string, { orders: OrderDetailedResponse[] }>();

    for (const order of orders) {
      const dateKey = order.deliveryDate || order.createdAt?.split('T')[0] || 'unknown';
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, { orders: [] });
      }
      groupMap.get(dateKey)!.orders.push(order);
    }

    const groups: DateGroup[] = [];
    for (const [date, { orders: dateOrders }] of groupMap) {
      const lines: FlatLine[] = [];
      let totalAmount = 0;
      for (const order of dateOrders) {
        totalAmount += (order.totalAmount || 0) + (order.vatAmount || 0);
        for (const line of order.lines) {
          lines.push({
            ...line,
            orderId: order.id,
            orderStatus: order.status,
            supplierName: order.supplierName,
          });
        }
      }
      groups.push({
        date,
        lines,
        totalAmount,
        orderCount: dateOrders.length,
      });
    }

    groups.sort((a, b) => b.date.localeCompare(a.date));
    return groups;
  }, [orders]);

  function toggleExpand(date: string) {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function formatPrice(price: number) {
    return price.toLocaleString();
  }

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('ordering.historyPage.title')}</h2>
        <Button variant="outline" onClick={() => navigate('/store/ordering')}>
          {t('ordering.backToList')}
        </Button>
      </div>

      {dateGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('ordering.noOrdersFound')}</div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => {
            const isExpanded = expandedDates.has(group.date);
            const visibleLines = isExpanded ? group.lines : group.lines.slice(0, MAX_PREVIEW);
            const hasMore = group.lines.length > MAX_PREVIEW;

            return (
              <div key={group.date}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-[#69707d]">{group.date}</span>
                    <span className="font-semibold text-base">{t('ordering.historyPage.orderStatus')}</span>
                  </div>
                  {hasMore && (
                    <button
                      onClick={() => toggleExpand(group.date)}
                      className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
                    >
                      {isExpanded ? t('ordering.historyPage.collapse') : t('ordering.historyPage.viewDetail')}
                    </button>
                  )}
                </div>

                {/* Lines card */}
                <div className="bg-white rounded-xl border divide-y">
                  {visibleLines.map((line, idx) => (
                    <div
                      key={`${line.orderId}-${line.packagingId}-${idx}`}
                      className="px-4 py-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/store/ordering/${line.orderId}`)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className={`text-xs ${statusColor[line.orderStatus] || 'bg-gray-100 text-gray-800'}`}>
                          {t(`ordering.status.${line.orderStatus}`)}
                        </Badge>
                        <span className="text-xs text-gray-400">{line.supplierName}</span>
                      </div>
                      <div className="font-medium text-sm mb-1">{line.itemName}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{line.packName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            <span className="font-bold">{line.packQty}</span>
                            <span className="text-xs text-gray-500 ml-1">
                              {line.packName?.includes('PK') ? 'PK' : line.packName?.includes('EA') ? 'EA' : 'BOX'}
                            </span>
                          </span>
                          <span className="text-sm font-semibold">
                            {formatPrice(line.price * line.packQty)}
                            <span className="text-xs font-normal text-gray-500 ml-0.5">{t('ordering.historyPage.won')}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* View more button inside card */}
                  {hasMore && !isExpanded && (
                    <button
                      onClick={() => toggleExpand(group.date)}
                      className="w-full py-3 text-sm text-[#69707d] font-medium hover:bg-slate-50 transition-colors"
                    >
                      {t('ordering.historyPage.viewDetail')} ({group.lines.length - MAX_PREVIEW}{t('ordering.historyPage.moreItems')})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
