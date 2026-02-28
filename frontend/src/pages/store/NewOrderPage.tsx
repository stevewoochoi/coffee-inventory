import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  orderingApi,
  type AvailableDate,
  type AvailableDateResponse,
  type CatalogItem,
  type CategoryNode,
  type ConfirmResponse,
} from '@/api/ordering';


interface CartItem {
  itemId: number;
  itemName: string;
  packagingId: number;
  packLabel: string;
  unitPrice: number;
  unitsPerPack: number;
  quantity: number;
  supplierId: number;
  supplierName: string;
}

const STEP_LABELS_KEYS = ['ordering.steps.deliveryDate', 'ordering.steps.products', 'ordering.steps.confirm'];

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const brandId = user?.brandId;
  const { t } = useTranslation();

  const [step, setStep] = useState(1);

  // Step 1
  const [deliveryData, setDeliveryData] = useState<AvailableDateResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateInfo, setSelectedDateInfo] = useState<AvailableDate | null>(null);

  // Step 2
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [localCart, setLocalCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'photo'>('list');
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Step 3
  const [confirming, setConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);

  // Suggestion dialog
  const [suggestionItem, setSuggestionItem] = useState<CatalogItem | null>(null);

  useEffect(() => {
    loadDeliveryDates();
  }, []);

  async function loadDeliveryDates() {
    try {
      const res = await orderingApi.getDeliveryDates(storeId);
      setDeliveryData(res.data.data);
    } catch {
      toast.error(t('common.loadError'));
    }
  }

  useEffect(() => {
    if (step === 2) {
      loadCategories();
      loadCatalog();
    }
  }, [step]);

  async function loadCategories() {
    if (!brandId) return;
    try {
      const res = await orderingApi.getOrderingCategories(brandId);
      setCategories(res.data.data);
    } catch {
      toast.error(t('common.loadError'));
    }
  }

  const loadCatalog = useCallback(async () => {
    if (!selectedDate) return;
    setCatalogLoading(true);
    try {
      const res = await orderingApi.getCatalog({
        storeId,
        deliveryDate: selectedDate,
        categoryId: activeCategory ?? undefined,
        keyword: searchKeyword || undefined,
        lowStockOnly: lowStockOnly || undefined,
      });
      setCatalog(res.data.data.content);
    } catch {
      toast.error(t('common.loadError'));
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [storeId, selectedDate, activeCategory, searchKeyword, lowStockOnly]);

  useEffect(() => {
    if (step !== 2) return;
    const timer = setTimeout(() => { loadCatalog(); }, 300);
    return () => clearTimeout(timer);
  }, [activeCategory, searchKeyword, lowStockOnly, loadCatalog, step]);

  function getCartQty(itemId: number, packagingId: number): number {
    return localCart.find(c => c.itemId === itemId && c.packagingId === packagingId)?.quantity ?? 0;
  }

  function updateCartQty(catalogItem: CatalogItem, packagingIdx: number, delta: number) {
    const pkg = catalogItem.packagings[packagingIdx];
    if (!pkg) return;
    const maxQty = pkg.maxOrderQty > 0 ? pkg.maxOrderQty : 9999;
    setLocalCart(prev => {
      const existing = prev.find(c => c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId);
      if (existing) {
        const newQty = Math.max(0, Math.min(maxQty, existing.quantity + delta));
        if (newQty === 0) return prev.filter(c => !(c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId));
        return prev.map(c => c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId ? { ...c, quantity: newQty } : c);
      } else if (delta > 0) {
        return [...prev, {
          itemId: catalogItem.itemId, itemName: catalogItem.itemName,
          packagingId: pkg.packagingId, packLabel: pkg.label,
          unitPrice: pkg.unitPrice, unitsPerPack: pkg.unitsPerPack,
          quantity: Math.min(maxQty, delta),
          supplierId: pkg.supplierId, supplierName: pkg.supplierName,
        }];
      }
      return prev;
    });
  }

  function setCartQty(catalogItem: CatalogItem, packagingIdx: number, qty: number) {
    const pkg = catalogItem.packagings[packagingIdx];
    if (!pkg) return;
    const maxQty = pkg.maxOrderQty > 0 ? pkg.maxOrderQty : 9999;
    setLocalCart(prev => {
      const clamped = Math.max(0, Math.min(maxQty, qty));
      if (clamped === 0) return prev.filter(c => !(c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId));
      const existing = prev.find(c => c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId);
      if (existing) {
        return prev.map(c => c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId ? { ...c, quantity: clamped } : c);
      }
      return [...prev, {
        itemId: catalogItem.itemId, itemName: catalogItem.itemName,
        packagingId: pkg.packagingId, packLabel: pkg.label,
        unitPrice: pkg.unitPrice, unitsPerPack: pkg.unitsPerPack,
        quantity: clamped,
        supplierId: pkg.supplierId, supplierName: pkg.supplierName,
      }];
    });
  }

  function handlePlusClick(item: CatalogItem, packagingIdx: number) {
    const pkg = item.packagings[packagingIdx];
    if (!pkg) return;
    const qty = getCartQty(item.itemId, pkg.packagingId);
    if (qty === 0 && item.suggestedQty > 0) {
      setSuggestionItem(item);
    } else {
      updateCartQty(item, packagingIdx, 1);
    }
  }

  function formatPackUnit(unitsPerPack: number, unit: string): string {
    const formatted = Number.isInteger(unitsPerPack)
      ? unitsPerPack.toString()
      : parseFloat(unitsPerPack.toFixed(2)).toString();
    return `${formatted}${unit}`;
  }

  const totalCartItems = localCart.reduce((sum, c) => sum + c.quantity, 0);
  const totalCartAmount = localCart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  const supplierGroups = useMemo(() => {
    const groups = new Map<number, { supplierId: number; supplierName: string; items: CartItem[]; subtotal: number }>();
    for (const item of localCart) {
      if (!groups.has(item.supplierId)) {
        groups.set(item.supplierId, { supplierId: item.supplierId, supplierName: item.supplierName, items: [], subtotal: 0 });
      }
      const g = groups.get(item.supplierId)!;
      g.items.push(item);
      g.subtotal += item.unitPrice * item.quantity;
    }
    return Array.from(groups.values());
  }, [localCart]);

  const vatAmount = Math.round(totalCartAmount * 0.1);
  const totalWithVat = totalCartAmount + vatAmount;

  async function handleConfirmOrder() {
    setConfirming(true);
    try {
      const cartData = {
        storeId,
        deliveryDate: selectedDate!,
        items: localCart.map(c => ({ itemId: c.itemId, packagingId: c.packagingId, quantity: c.quantity })),
      };
      const cartRes = await orderingApi.createCartWithDate(cartData);
      const cartId = cartRes.data.data.cartId;
      if (cartId) {
        const confirmRes = await orderingApi.confirmCartById(cartId);
        setConfirmResult(confirmRes.data.data);
      }
      toast.success(t('ordering.cart.orderConfirmed'));
      setStep(4);
    } catch {
      toast.error(t('common.saveError'));
    } finally {
      setConfirming(false);
      setShowConfirmDialog(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
  }

  function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // ===== STEP INDICATOR =====
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`flex items-center gap-2 ${s <= step ? 'text-blue-800' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              s < step ? 'bg-blue-800 border-blue-800 text-white' :
              s === step ? 'border-blue-800 text-blue-800' :
              'border-gray-300 text-gray-400'
            }`}>
              {s < step ? '\u2713' : s}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{t(STEP_LABELS_KEYS[s - 1])}</span>
          </div>
          {s < 3 && <div className={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-blue-800' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  // ===== STEP 4: COMPLETE =====
  if (step === 4) {
    return (
      <div className="max-w-lg mx-auto text-center py-8 space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl text-green-600">{'\u2713'}</span>
        </div>
        <h2 className="text-2xl font-bold">{t('ordering.complete.title')}</h2>
        <p className="text-gray-500">{t('ordering.complete.description')}</p>

        {confirmResult && (
          <Card>
            <CardContent className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('ordering.complete.orderCount')}</span>
                <span className="font-bold">{confirmResult.orderCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('ordering.complete.orderIds')}</span>
                <span className="font-bold">#{confirmResult.orderPlanIds.join(', #')}</span>
              </div>
              {selectedDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('ordering.steps.deliveryDate')}</span>
                  <span className="font-bold">{formatDate(selectedDate)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('ordering.cart.total')}</span>
                <span className="font-bold">{'\u20A9'}{totalWithVat.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12" onClick={() => navigate('/store/ordering')}>
            {t('ordering.complete.viewOrders')}
          </Button>
          <Button className="flex-1 h-12 bg-blue-800 hover:bg-blue-900" onClick={() => navigate('/store/dashboard')}>
            {t('ordering.complete.goToMain')}
          </Button>
        </div>
      </div>
    );
  }

  // ===== STEP 1: DELIVERY DATE =====
  const renderStep1 = () => {
    if (!deliveryData) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t('ordering.steps.selectDate')}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Badge variant="outline">{deliveryData.storeDeliveryType.replace(/_/g, ' / ')}</Badge>
            <span>{t('ordering.steps.cutoff')}: {deliveryData.cutoffTime}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {deliveryData.availableDates.map((dateInfo) => {
            const isSelected = selectedDate === dateInfo.date;
            return (
              <Card
                key={dateInfo.date}
                className={`cursor-pointer transition-all border-2 ${
                  isSelected ? 'border-blue-800 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => { setSelectedDate(dateInfo.date); setSelectedDateInfo(dateInfo); }}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-sm font-bold ${
                        isSelected ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <span className="text-xs">{dateInfo.dayOfWeek}</span>
                        <span>{new Date(dateInfo.date + 'T00:00:00').getDate()}</span>
                      </div>
                      <div>
                        <p className="font-medium">{formatDate(dateInfo.date)}</p>
                        <p className="text-xs text-gray-500">
                          {t('ordering.steps.deadlineBy')} {formatDateTime(dateInfo.orderDeadline)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dateInfo.isRecommended && (
                        <Badge className="bg-green-100 text-green-800">{t('ordering.steps.recommended')}</Badge>
                      )}
                      {isSelected && (
                        <div className="w-6 h-6 bg-blue-800 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">{'\u2713'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {deliveryData.availableDates.length === 0 && (
          <div className="text-center py-12 text-gray-400">{t('ordering.steps.noDates')}</div>
        )}
      </div>
    );
  };

  // ===== STEP 2: PRODUCTS =====
  const renderStep2 = () => (
    <div className="space-y-4 pb-24">
      {selectedDateInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">{t('ordering.steps.deliveryDate')}: </span>
            <span className="text-blue-800 font-bold">{formatDate(selectedDate!)}</span>
          </div>
          <span className="text-xs text-gray-500">
            {t('ordering.steps.deadlineBy')} {formatDateTime(selectedDateInfo.orderDeadline)}
          </span>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] ${
            activeCategory === null ? 'bg-blue-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {t('ordering.catalog.allCategories')}
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[44px] ${
              activeCategory === cat.id ? 'bg-blue-800 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex gap-2">
        <Input
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder={t('ordering.catalog.searchPlaceholder')}
          className="h-11 flex-1"
        />
        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          className={`h-11 whitespace-nowrap ${lowStockOnly ? 'bg-red-600 hover:bg-red-700' : ''}`}
          onClick={() => setLowStockOnly(!lowStockOnly)}
        >
          {t('ordering.steps.lowStockFilter')}
        </Button>
        <Button
          variant="outline"
          className="h-11 px-3"
          onClick={() => setViewMode(viewMode === 'list' ? 'photo' : 'list')}
          title={viewMode === 'list' ? 'Grid view' : 'List view'}
        >
          {viewMode === 'list' ? '\u25A3' : '\u2630'}
        </Button>
      </div>

      {catalogLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : catalog.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('ordering.steps.noProducts')}</div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {catalog.map(item => {
            const pkg = item.packagings[0];
            if (!pkg) return null;
            const qty = getCartQty(item.itemId, pkg.packagingId);
            const fillPct = item.minStock > 0 ? Math.min(100, Math.max(0, (item.currentStock / item.minStock) * 100)) : 100;
            const barColor = fillPct <= 25 ? 'bg-red-500' : fillPct <= 50 ? 'bg-amber-500' : 'bg-green-500';

            return (
              <Card key={item.itemId} className={`border-2 ${item.isLowStock ? 'border-red-200' : 'border-gray-200'}`}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{item.itemName}</span>
                        {item.isLowStock && <Badge className="bg-red-100 text-red-800 text-xs">{t('inventory.lowBadge')}</Badge>}
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1 max-w-[120px]">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${fillPct}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{item.currentStock.toFixed(0)}/{item.minStock.toFixed(0)} {item.unit}</span>
                        {item.daysUntilEmpty != null && item.daysUntilEmpty < 999 && (
                          <span className={item.daysUntilEmpty <= 3 ? 'text-red-600 font-medium' : ''}>
                            {t('inventory.forecast.daysLeft', { days: item.daysUntilEmpty.toFixed(0) })}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {pkg.label} / {'\u20A9'}{pkg.unitPrice.toLocaleString()}
                        <span className="ml-1.5 text-blue-600 font-medium">(1팩={formatPackUnit(pkg.unitsPerPack, item.unit)})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0 text-lg"
                        onClick={() => updateCartQty(item, 0, -1)} disabled={qty === 0}>-</Button>
                      <Input type="number" value={qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (pkg.maxOrderQty > 0 && val > pkg.maxOrderQty) {
                            toast.error(`최대 주문 수량은 ${pkg.maxOrderQty}개입니다.`);
                          }
                          setCartQty(item, 0, val < 1 ? 1 : val);
                        }}
                        className="w-14 h-10 text-center text-sm" min={1} max={pkg.maxOrderQty > 0 ? pkg.maxOrderQty : undefined} />
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0 text-lg"
                        onClick={() => handlePlusClick(item, 0)}>+</Button>
                    </div>
                  </div>
                  {item.suggestedQty > 0 && qty === 0 && (
                    <button className="text-xs text-blue-600 mt-1 hover:underline"
                      onClick={() => setSuggestionItem(item)}>
                      AI 추천: {item.suggestedQty}팩
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {catalog.map(item => {
            const pkg = item.packagings[0];
            if (!pkg) return null;
            const qty = getCartQty(item.itemId, pkg.packagingId);
            return (
              <Card key={item.itemId} className={`border-2 ${item.isLowStock ? 'border-red-200' : 'border-gray-200'}`}>
                <CardContent className="p-3 space-y-2">
                  <div className="h-20 bg-gray-100 rounded flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="h-full object-contain" />
                    ) : (
                      <span className="text-2xl text-gray-300">{item.categoryName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-xs truncate">{item.itemName}</p>
                    <p className="text-xs text-gray-500">{'\u20A9'}{pkg.unitPrice.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 font-medium">1팩={formatPackUnit(pkg.unitsPerPack, item.unit)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => updateCartQty(item, 0, -1)} disabled={qty === 0}>-</Button>
                    <span className="w-8 text-center text-sm font-bold">{qty}</span>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => handlePlusClick(item, 0)}>+</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating cart bar */}
      {totalCartItems > 0 && (
        <div
          className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-blue-800 text-white p-4 shadow-lg cursor-pointer z-40"
          onClick={() => setStep(3)}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <span className="font-bold">{t('ordering.cart.title')}</span>
              <span className="ml-2 text-blue-200">{t('ordering.cart.items', { count: totalCartItems })}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold">{'\u20A9'}{totalCartAmount.toLocaleString()}</span>
              <span className="text-lg">{'\u2192'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ===== STEP 3: CART & CONFIRM =====
  const renderStep3 = () => (
    <div className="space-y-4 pb-6">
      {selectedDateInfo && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-800">{t('ordering.steps.deadlineNotice')}</p>
          <p className="text-amber-700 mt-1">
            {t('ordering.steps.deliveryDate')}: <span className="font-bold">{formatDate(selectedDate!)}</span>
            {' | '}
            {t('ordering.steps.deadlineBy')} <span className="font-bold">{formatDateTime(selectedDateInfo.orderDeadline)}</span>
          </p>
        </div>
      )}

      {supplierGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('ordering.cart.empty')}</div>
      ) : (
        <div className="space-y-4">
          {supplierGroups.map(group => (
            <Card key={group.supplierId}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">{group.supplierName}</h4>
                  <span className="text-sm text-gray-500">
                    {t('ordering.cart.subtotal')}: {'\u20A9'}{group.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div key={`${item.itemId}-${item.packagingId}`} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.itemName}</p>
                        <p className="text-xs text-gray-500">{item.packLabel} / {'\u20A9'}{item.unitPrice.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="h-9 w-9 p-0"
                          onClick={() => setLocalCart(prev => {
                            const newQty = item.quantity - 1;
                            if (newQty <= 0) return prev.filter(c => !(c.itemId === item.itemId && c.packagingId === item.packagingId));
                            return prev.map(c => c.itemId === item.itemId && c.packagingId === item.packagingId ? { ...c, quantity: newQty } : c);
                          })}>-</Button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <Button size="sm" variant="outline" className="h-9 w-9 p-0"
                          onClick={() => setLocalCart(prev =>
                            prev.map(c => c.itemId === item.itemId && c.packagingId === item.packagingId ? { ...c, quantity: c.quantity + 1 } : c)
                          )}>+</Button>
                        <span className="text-sm font-medium w-20 text-right">
                          {'\u20A9'}{(item.unitPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-gray-50">
            <CardContent className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('ordering.cart.subtotal')}</span>
                <span>{'\u20A9'}{totalCartAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('ordering.steps.vat')}</span>
                <span>{'\u20A9'}{vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>{t('ordering.cart.total')}</span>
                <span>{'\u20A9'}{totalWithVat.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('ordering.newOrderTitle')}</h2>
        <Button variant="outline" onClick={() => {
          if (step > 1) setStep(step - 1);
          else navigate('/store/ordering');
        }}>
          {step > 1 ? t('common.previous') : t('ordering.backToList')}
        </Button>
      </div>

      <StepIndicator />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {step < 4 && (
        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(step - 1)}>
              {t('common.previous')}
            </Button>
          )}
          {step === 1 && (
            <Button className="flex-1 h-12 bg-blue-800 hover:bg-blue-900" onClick={() => setStep(2)} disabled={!selectedDate}>
              {t('common.next')}
            </Button>
          )}
          {step === 2 && (
            <Button className="flex-1 h-12 bg-blue-800 hover:bg-blue-900" onClick={() => setStep(3)} disabled={totalCartItems === 0}>
              {t('ordering.steps.viewCart')} ({totalCartItems})
            </Button>
          )}
          {step === 3 && (
            <Button className="flex-1 h-12 bg-blue-800 hover:bg-blue-900"
              onClick={() => setShowConfirmDialog(true)} disabled={totalCartItems === 0 || confirming}>
              {confirming ? t('common.processing') : t('ordering.cart.confirmOrder')}
            </Button>
          )}
        </div>
      )}

      {/* Suggestion Dialog */}
      <AlertDialog open={!!suggestionItem} onOpenChange={(open) => { if (!open) setSuggestionItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI 추천 수량 안내</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p className="font-semibold text-base text-foreground">{suggestionItem?.itemName}</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">현재 재고</span>
                    <span className="font-medium">{suggestionItem?.currentStock.toFixed(0)} {suggestionItem?.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">최소 재고</span>
                    <span className="font-medium">{suggestionItem?.minStock.toFixed(0)} {suggestionItem?.unit}</span>
                  </div>
                  {suggestionItem?.daysUntilEmpty != null && suggestionItem.daysUntilEmpty < 999 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">예상 소진</span>
                      <span className={`font-medium ${suggestionItem.daysUntilEmpty <= 3 ? 'text-red-600' : ''}`}>
                        {suggestionItem.daysUntilEmpty.toFixed(0)}일 후
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-gray-500">패킹 단위</span>
                    <span className="font-medium text-blue-600">
                      1팩 = {suggestionItem && formatPackUnit(suggestionItem.packagings[0]?.unitsPerPack ?? 0, suggestionItem.unit)}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <span className="text-gray-600">AI 추천 수량: </span>
                  <span className="text-blue-800 font-bold text-lg">{suggestionItem?.suggestedQty}팩</span>
                  {suggestionItem && suggestionItem.packagings[0] && (
                    <span className="text-gray-500 text-xs block mt-0.5">
                      ({formatPackUnit(suggestionItem.packagings[0].unitsPerPack * suggestionItem.suggestedQty, suggestionItem.unit)})
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-center">추천 수량으로 추가하시겠습니까?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (suggestionItem) {
                updateCartQty(suggestionItem, 0, 1);
              }
              setSuggestionItem(null);
            }}>1팩만 추가</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-800 hover:bg-blue-900" onClick={() => {
              if (suggestionItem) {
                setCartQty(suggestionItem, 0, suggestionItem.suggestedQty);
              }
              setSuggestionItem(null);
            }}>추천 수량 추가 ({suggestionItem?.suggestedQty}팩)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('ordering.steps.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('ordering.steps.confirmDesc', {
                count: totalCartItems,
                suppliers: supplierGroups.length,
                total: totalWithVat.toLocaleString(),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-blue-800 hover:bg-blue-900" onClick={handleConfirmOrder} disabled={confirming}>
              {confirming ? t('common.processing') : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
