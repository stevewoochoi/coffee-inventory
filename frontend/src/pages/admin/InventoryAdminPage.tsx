import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type ItemForecast } from '@/api/inventory';
import { storeApi, type Store } from '@/api/store';
import { Badge } from '@/components/ui/badge';

export default function InventoryAdminPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId;

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');
  const [items, setItems] = useState<ItemForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);

  const loadStores = useCallback(async () => {
    try {
      const res = await storeApi.getStores(brandId);
      const storeList = (res.data.data || []).filter((s: Store) => s.status === 'ACTIVE');
      setStores(storeList);
    } catch {
      toast.error(t('stores.loadFailed'));
    }
  }, [brandId, t]);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      if (selectedStoreId === 'all') {
        const allItems: ItemForecast[] = [];
        for (const store of stores) {
          try {
            const res = await inventoryApi.getForecast(store.id, brandId);
            const storeItems = (res.data.data.items || []).map(item => ({
              ...item,
              itemName: `[${store.name}] ${item.itemName}`,
            }));
            allItems.push(...storeItems);
          } catch { /* skip failed store */ }
        }
        setItems(allItems);
      } else {
        const res = await inventoryApi.getForecast(selectedStoreId, brandId);
        setItems(res.data.data.items || []);
      }
    } catch {
      toast.error(t('inventory.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, stores, brandId, t]);

  useEffect(() => { loadStores(); }, [loadStores]);
  useEffect(() => {
    if (stores.length > 0) loadInventory();
  }, [stores, selectedStoreId, loadInventory]);

  const stockSummary = useMemo(() => {
    const total = items.length;
    const low = items.filter(i => i.minStock > 0 && i.currentStock <= i.minStock && i.currentStock > 0).length;
    const out = items.filter(i => i.currentStock <= 0).length;
    const normal = total - low - out;
    return { total, normal, low, out };
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(item => item.itemName.toLowerCase().includes(q));
    }
    if (showLowOnly) {
      result = result.filter(item => item.minStock > 0 && item.currentStock <= item.minStock);
    }
    return [...result].sort((a, b) => a.fillPercentage - b.fillPercentage);
  }, [items, search, showLowOnly]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('inventory.title')}</h2>
        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">{t('orderAdmin.allStores')}</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Stock summary */}
      {!loading && stockSummary.total > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('inventory.stockSummary')}</span>
            <span className="text-xs text-gray-400">{stockSummary.total} {t('inventory.totalItems')}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
            {stockSummary.normal > 0 && (
              <div className="bg-green-500 transition-all" style={{ width: `${(stockSummary.normal / stockSummary.total) * 100}%` }} />
            )}
            {stockSummary.low > 0 && (
              <div className="bg-amber-500 transition-all" style={{ width: `${(stockSummary.low / stockSummary.total) * 100}%` }} />
            )}
            {stockSummary.out > 0 && (
              <div className="bg-red-500 transition-all" style={{ width: `${(stockSummary.out / stockSummary.total) * 100}%` }} />
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              {t('dashboard.normal')} {stockSummary.normal}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              {t('dashboard.lowStock')} {stockSummary.low}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              {t('dashboard.outOfStock')} {stockSummary.out}
            </span>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t('inventory.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2.5 text-sm"
        />
        <button
          onClick={() => setShowLowOnly(!showLowOnly)}
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
            showLowOnly ? 'bg-red-100 text-red-800' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {t('inventory.lowOnly')}
          {stockSummary.low > 0 && (
            <span className="ml-1 bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full text-xs">
              {stockSummary.low}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{t('common.name')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('items.category')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('ordering.stock')}</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">{t('ordering.avgDay')}</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">{t('inventory.forecast.sort.daysLeft')}</th>
                <th className="text-center px-4 py-3 font-medium">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item, idx) => {
                const isLow = item.minStock > 0 && item.currentStock <= item.minStock;
                const isOut = item.currentStock <= 0;
                const fillPct = Math.min(100, Math.max(0, item.fillPercentage));
                const barColor = fillPct <= 25 ? 'bg-red-500' : fillPct <= 50 ? 'bg-amber-500' : 'bg-green-500';

                return (
                  <tr key={`${item.itemId}-${idx}`} className={isOut ? 'bg-red-50' : isLow ? 'bg-amber-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.itemName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${fillPct}%` }} />
                        </div>
                        <span className={`font-medium ${isLow ? 'text-red-600' : ''}`}>
                          {Number(item.currentStock).toFixed(0)}
                        </span>
                        <span className="text-gray-400">/ {Number(item.minStock).toFixed(0)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                      {Number(item.avgDailyUsage).toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {item.daysUntilEmpty < 999
                        ? t('inventory.forecast.daysLeft', { days: Number(item.daysUntilEmpty).toFixed(0) })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOut ? (
                        <Badge className="bg-red-100 text-red-800">{t('inventory.out')}</Badge>
                      ) : isLow ? (
                        <Badge className="bg-amber-100 text-amber-800">{t('inventory.lowBadge')}</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">{t('dashboard.normal')}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-12">
                    {t('inventory.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
