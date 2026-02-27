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

// TODO: Remove mock data when backend APIs are ready
function generateMockDeliveryDates(): AvailableDateResponse {
  const dates: AvailableDate[] = [];
  const today = new Date();
  const deliveryDays = [1, 3, 5]; // MON, WED, FRI
  for (let i = 2; i <= 16; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (deliveryDays.includes(d.getDay())) {
      dates.push({
        date: d.toISOString().split('T')[0],
        dayOfWeek: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()],
        isRecommended: dates.length === 0,
        orderDeadline: new Date(d.getTime() - 2 * 86400000).toISOString().replace(/\.\d+Z$/, ''),
      });
    }
  }
  return {
    availableDates: dates,
    storeDeliveryType: 'MON_WED_FRI',
    cutoffTime: '09:00',
    maxDisplayDays: 14,
  };
}

const MOCK_CATEGORIES: CategoryNode[] = [
  { id: 1, name: '\uC6D0\uB450', displayOrder: 1 },
  { id: 2, name: '\uC720\uC81C\uD488', displayOrder: 2 },
  { id: 3, name: '\uC2DC\uB7FD', displayOrder: 3 },
  { id: 4, name: '\uCEF5/\uD3EC\uC7A5\uC7AC', displayOrder: 4 },
  { id: 5, name: '\uB514\uC800\uD2B8', displayOrder: 5 },
];

const MOCK_CATALOG: CatalogItem[] = [
  { itemId: 1, itemName: '\uC5D0\uD2F0\uC624\uD53C\uC544 \uC608\uAC00\uCCB4\uD504 \uC6D0\uB450', itemCode: 'CF-001', categoryId: 1, categoryName: '\uC6D0\uB450', imageUrl: null, temperatureZone: 'AMBIENT', currentStock: 2.5, unit: 'kg', minStock: 5.0, isLowStock: true, packagings: [{ packagingId: 7, label: '1kg x 1\uBD09', unitsPerPack: 1.0, unitPrice: 25000, supplierId: 1, supplierName: '\uC6D0\uB450\uC0C1\uC0AC', maxOrderQty: 50 }], lastOrder: { date: '2026-02-20', quantity: 3 }, suggestedQty: 3, suggestedByAi: false, daysUntilEmpty: 2.1 },
  { itemId: 2, itemName: '\uCF5C\uB86C\uBE44\uC544 \uC218\uD504\uB9AC\uBAA8 \uC6D0\uB450', itemCode: 'CF-002', categoryId: 1, categoryName: '\uC6D0\uB450', imageUrl: null, temperatureZone: 'AMBIENT', currentStock: 8.0, unit: 'kg', minStock: 5.0, isLowStock: false, packagings: [{ packagingId: 8, label: '1kg x 1\uBD09', unitsPerPack: 1.0, unitPrice: 22000, supplierId: 1, supplierName: '\uC6D0\uB450\uC0C1\uC0AC', maxOrderQty: 50 }], lastOrder: null, suggestedQty: 0, suggestedByAi: false, daysUntilEmpty: 8.5 },
  { itemId: 3, itemName: '\uC6B0\uC720 1L', itemCode: 'DY-001', categoryId: 2, categoryName: '\uC720\uC81C\uD488', imageUrl: null, temperatureZone: 'COLD', currentStock: 5.0, unit: 'L', minStock: 10.0, isLowStock: true, packagings: [{ packagingId: 10, label: '1L x 12\uD329', unitsPerPack: 12.0, unitPrice: 18000, supplierId: 2, supplierName: '\uC11C\uC6B8\uC720\uC5C5', maxOrderQty: 20 }], lastOrder: { date: '2026-02-25', quantity: 2 }, suggestedQty: 2, suggestedByAi: false, daysUntilEmpty: 1.5 },
  { itemId: 4, itemName: '\uBC14\uB2D0\uB77C \uC2DC\uB7FD', itemCode: 'SY-001', categoryId: 3, categoryName: '\uC2DC\uB7FD', imageUrl: null, temperatureZone: 'AMBIENT', currentStock: 3.0, unit: 'bottle', minStock: 2.0, isLowStock: false, packagings: [{ packagingId: 15, label: '750ml x 1\uBCD1', unitsPerPack: 1.0, unitPrice: 12000, supplierId: 3, supplierName: '\uC2DC\uB7FD\uCF54\uB9AC\uC544', maxOrderQty: 30 }], lastOrder: null, suggestedQty: 0, suggestedByAi: false, daysUntilEmpty: 15.0 },
  { itemId: 5, itemName: '\uD14C\uC774\uD06C\uC544\uC6C3 \uCEF5 12oz', itemCode: 'CU-001', categoryId: 4, categoryName: '\uCEF5/\uD3EC\uC7A5\uC7AC', imageUrl: null, temperatureZone: 'AMBIENT', currentStock: 100, unit: 'ea', minStock: 200, isLowStock: true, packagings: [{ packagingId: 20, label: '50ea x 1\uBC15\uC2A4', unitsPerPack: 50, unitPrice: 8000, supplierId: 4, supplierName: '\uD3EC\uC7A5\uC7AC\uB9C8\uD2B8', maxOrderQty: 100 }], lastOrder: { date: '2026-02-22', quantity: 4 }, suggestedQty: 4, suggestedByAi: false, daysUntilEmpty: 3.0 },
  { itemId: 6, itemName: '\uCE74\uB77C\uBA5C \uC2DC\uB7FD', itemCode: 'SY-002', categoryId: 3, categoryName: '\uC2DC\uB7FD', imageUrl: null, temperatureZone: 'AMBIENT', currentStock: 1.0, unit: 'bottle', minStock: 2.0, isLowStock: true, packagings: [{ packagingId: 16, label: '750ml x 1\uBCD1', unitsPerPack: 1.0, unitPrice: 13000, supplierId: 3, supplierName: '\uC2DC\uB7FD\uCF54\uB9AC\uC544', maxOrderQty: 30 }], lastOrder: null, suggestedQty: 2, suggestedByAi: false, daysUntilEmpty: 4.0 },
];

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

  useEffect(() => {
    loadDeliveryDates();
  }, []);

  async function loadDeliveryDates() {
    try {
      const res = await orderingApi.getDeliveryDates(storeId);
      setDeliveryData(res.data.data);
    } catch {
      // TODO: Remove mock fallback when backend is ready
      setDeliveryData(generateMockDeliveryDates());
    }
  }

  useEffect(() => {
    if (step === 2) {
      loadCategories();
      loadCatalog();
    }
  }, [step]);

  async function loadCategories() {
    if (!brandId) {
      setCategories(MOCK_CATEGORIES);
      return;
    }
    try {
      const res = await orderingApi.getOrderingCategories(brandId);
      setCategories(res.data.data);
    } catch {
      setCategories(MOCK_CATEGORIES);
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
      // TODO: Remove mock fallback when backend is ready
      let items = [...MOCK_CATALOG];
      if (activeCategory) items = items.filter(i => i.categoryId === activeCategory);
      if (searchKeyword) items = items.filter(i => i.itemName.toLowerCase().includes(searchKeyword.toLowerCase()));
      if (lowStockOnly) items = items.filter(i => i.isLowStock);
      items.sort((a, b) => {
        if (a.isLowStock && !b.isLowStock) return -1;
        if (!a.isLowStock && b.isLowStock) return 1;
        return a.itemName.localeCompare(b.itemName);
      });
      setCatalog(items);
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
    setLocalCart(prev => {
      const existing = prev.find(c => c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId);
      if (existing) {
        const newQty = Math.max(0, Math.min(pkg.maxOrderQty, existing.quantity + delta));
        if (newQty === 0) return prev.filter(c => !(c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId));
        return prev.map(c => c.itemId === catalogItem.itemId && c.packagingId === pkg.packagingId ? { ...c, quantity: newQty } : c);
      } else if (delta > 0) {
        return [...prev, {
          itemId: catalogItem.itemId, itemName: catalogItem.itemName,
          packagingId: pkg.packagingId, packLabel: pkg.label,
          unitPrice: pkg.unitPrice, unitsPerPack: pkg.unitsPerPack,
          quantity: Math.min(pkg.maxOrderQty, delta),
          supplierId: pkg.supplierId, supplierName: pkg.supplierName,
        }];
      }
      return prev;
    });
  }

  function setCartQty(catalogItem: CatalogItem, packagingIdx: number, qty: number) {
    const pkg = catalogItem.packagings[packagingIdx];
    if (!pkg) return;
    setLocalCart(prev => {
      const clamped = Math.max(0, Math.min(pkg.maxOrderQty, qty));
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
      // TODO: Remove mock fallback when backend is ready
      setConfirmResult({ orderPlanIds: [Math.floor(Math.random() * 1000) + 100], orderCount: supplierGroups.length });
      toast.success(t('ordering.cart.orderConfirmed'));
      setStep(4);
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
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0 text-lg"
                        onClick={() => updateCartQty(item, 0, -1)} disabled={qty === 0}>-</Button>
                      <Input type="number" value={qty}
                        onChange={(e) => setCartQty(item, 0, parseInt(e.target.value) || 0)}
                        className="w-14 h-10 text-center text-sm" min={0} max={pkg.maxOrderQty} />
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0 text-lg"
                        onClick={() => {
                          if (qty === 0 && item.suggestedQty > 0) setCartQty(item, 0, item.suggestedQty);
                          else updateCartQty(item, 0, 1);
                        }}>+</Button>
                    </div>
                  </div>
                  {item.suggestedQty > 0 && qty === 0 && (
                    <button className="text-xs text-blue-600 mt-1 hover:underline"
                      onClick={() => setCartQty(item, 0, item.suggestedQty)}>
                      {t('ordering.steps.addSuggested', { qty: item.suggestedQty })}
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
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => updateCartQty(item, 0, -1)} disabled={qty === 0}>-</Button>
                    <span className="w-8 text-center text-sm font-bold">{qty}</span>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => {
                      if (qty === 0 && item.suggestedQty > 0) setCartQty(item, 0, item.suggestedQty);
                      else updateCartQty(item, 0, 1);
                    }}>+</Button>
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
