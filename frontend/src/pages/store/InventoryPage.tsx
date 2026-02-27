import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type ItemForecast } from '@/api/inventory';
import { categoryApi, type ItemCategory } from '@/api/category';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SortKey = 'name' | 'lowStock' | 'daysLeft';

export default function InventoryPage() {
  const [items, setItems] = useState<ItemForecast[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('lowStock');
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [adjustItem, setAdjustItem] = useState<ItemForecast | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustMemo, setAdjustMemo] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const brandId = user?.brandId;
  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [forecastRes, catRes] = await Promise.all([
        inventoryApi.getForecast(storeId, brandId),
        brandId ? categoryApi.getCategories(brandId) : Promise.resolve({ data: { data: [] } }),
      ]);
      setItems(forecastRes.data.data.items || []);
      setCategories((catRes as any).data.data || []);
    } catch { toast.error(t('inventory.loadFailed')); }
    finally { setLoading(false); }
  }, [storeId, brandId, t]);

  useEffect(() => { load(); }, [load]);

  const stockSummary = useMemo(() => {
    const total = items.length;
    const low = items.filter(i => i.minStock > 0 && i.currentStock <= i.minStock).length;
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

    if (activeCategory !== 'all') {
      result = result.filter(item => item.category === activeCategory);
    }

    if (showLowOnly) {
      result = result.filter(item => item.minStock > 0 && item.currentStock <= item.minStock);
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'lowStock') return a.fillPercentage - b.fillPercentage;
      if (sortBy === 'daysLeft') return a.daysUntilEmpty - b.daysUntilEmpty;
      return a.itemName.localeCompare(b.itemName);
    });

    return result;
  }, [items, search, activeCategory, showLowOnly, sortBy]);

  async function handleAdjust() {
    if (!adjustItem || !adjustQty) return;
    try {
      await inventoryApi.adjustStock({
        storeId,
        itemId: adjustItem.itemId,
        newQtyBaseUnit: parseFloat(adjustQty),
        memo: adjustMemo || undefined,
      });
      toast.success(t('inventory.adjust.success'));
      setAdjustItem(null);
      setAdjustQty('');
      setAdjustMemo('');
      load();
    } catch {
      toast.error(t('inventory.adjust.failed'));
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  const allCategories = [...new Set(items.map(i => i.category).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('inventory.title')}</h2>
        <Button
          className="bg-blue-800 hover:bg-blue-900"
          onClick={() => navigate('/store/ordering/new')}
        >
          {t('inventory.createOrder')}
        </Button>
      </div>

      {/* Stock summary bar */}
      {stockSummary.total > 0 && (
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

      {/* Search */}
      <input
        type="text"
        placeholder={t('inventory.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2.5 text-sm"
      />

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[40px] ${
            activeCategory === 'all' ? 'bg-blue-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {t('ordering.catalog.allCategories')}
        </button>
        {(categories.length > 0 ? categories.map(c => c.name) : allCategories).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[40px] ${
              activeCategory === cat ? 'bg-blue-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sort & filter controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['name', 'lowStock', 'daysLeft'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded text-xs font-medium min-h-[36px] ${
                sortBy === key ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {t(`inventory.forecast.sort.${key}`)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowLowOnly(!showLowOnly)}
          className={`px-3 py-1.5 rounded text-xs font-medium min-h-[36px] ${
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

      {/* Item cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map(item => {
          const isLow = item.minStock > 0 && item.currentStock <= item.minStock;
          const isOut = item.currentStock <= 0;
          const fillPct = Math.min(100, Math.max(0, item.fillPercentage));
          const barColor = fillPct <= 25 ? 'bg-red-500' : fillPct <= 50 ? 'bg-amber-500' : 'bg-green-500';

          return (
            <div
              key={item.itemId}
              className={`bg-white rounded-xl border-2 p-4 ${
                isOut ? 'border-red-400 bg-red-50' : isLow ? 'border-amber-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm truncate">{item.itemName}</h3>
                <div className="flex items-center gap-1">
                  {isOut && <Badge className="bg-red-100 text-red-800 text-xs">{t('inventory.out')}</Badge>}
                  {isLow && !isOut && <Badge className="bg-amber-100 text-amber-800 text-xs">{t('inventory.lowBadge')}</Badge>}
                  <span className="text-xs text-gray-400">{item.category}</span>
                </div>
              </div>

              {/* Gauge bar */}
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${fillPct}%` }} />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>
                    {Number(item.currentStock).toFixed(0)}
                  </span>
                  <span className="text-gray-400"> / {Number(item.minStock).toFixed(0)} {item.baseUnit}</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {item.trend === 'UP' && <span className="text-red-500">&#9650;</span>}
                  {item.trend === 'DOWN' && <span className="text-green-500">&#9660;</span>}
                  {item.trend === 'STABLE' && <span className="text-gray-400">&#8212;</span>}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>
                  {item.daysUntilEmpty < 999
                    ? t('inventory.forecast.daysLeft', { days: Number(item.daysUntilEmpty).toFixed(0) })
                    : t('inventory.forecast.noUsage')}
                </span>
                <span>{t('inventory.forecast.avgUsage', { qty: Number(item.avgDailyUsage).toFixed(0) })}/{t('common.day', { defaultValue: 'day' })}</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setAdjustItem(item); setAdjustQty(String(Number(item.currentStock).toFixed(0))); }}
                  className="flex-1 text-center text-xs py-2.5 border rounded-lg hover:bg-gray-50 font-medium min-h-[40px]"
                >
                  {t('inventory.adjust.button')}
                </button>
                {isLow && (
                  <button
                    onClick={() => navigate('/store/ordering/new')}
                    className="flex-1 text-center text-xs py-2.5 bg-blue-800 text-white rounded-lg hover:bg-blue-900 font-medium min-h-[40px]"
                  >
                    {t('inventory.orderNow')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-12 bg-white rounded-lg border">
            {t('inventory.noData')}
          </div>
        )}
      </div>

      {/* Adjust Dialog */}
      {adjustItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">{t('inventory.adjust.title')}</h3>
            <p className="text-sm text-gray-600 mb-4">{adjustItem.itemName}</p>
            <div className="mb-3">
              <label className="text-sm font-medium block mb-1">{t('inventory.adjust.currentQty')}</label>
              <p className="text-lg font-bold">{Number(adjustItem.currentStock).toFixed(0)} {adjustItem.baseUnit}</p>
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium block mb-1">{t('inventory.adjust.actualQty')}</label>
              <input
                type="number"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="w-full border rounded px-3 py-2 min-h-[44px]"
              />
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium block mb-1">{t('inventory.adjust.memo')}</label>
              <input
                value={adjustMemo}
                onChange={e => setAdjustMemo(e.target.value)}
                className="w-full border rounded px-3 py-2 min-h-[44px]"
                placeholder={t('inventory.adjust.memoPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdjust} className="flex-1 bg-blue-800 hover:bg-blue-900 min-h-[48px]">
                {t('common.confirm')}
              </Button>
              <Button variant="outline" onClick={() => setAdjustItem(null)} className="flex-1 min-h-[48px]">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
