import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { warehouseApi, type Warehouse, type SupplierBrief } from '@/api/warehouse';
import { orderingApi, type CatalogItem } from '@/api/ordering';
import { formatCurrency } from '@/lib/currency';

interface CartLine {
  itemId: number;
  itemName: string;
  packagingId: number;
  packLabel: string;
  unitPrice: number;
  unitsPerPack: number;
  quantity: number;
  supplierId: number;
  supplierName: string;
  currency: string;
}

const STEP_LABELS: Array<{ key: string; defaultValue: string }> = [
  { key: 'warehouseOrder.steps.supplier', defaultValue: '공급사 선택' },
  { key: 'warehouseOrder.steps.products', defaultValue: '상품 선택' },
  { key: 'warehouseOrder.steps.confirm', defaultValue: '확정' },
];

export default function WarehouseOrderNewPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryWarehouseId = searchParams.get('warehouseId');

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(
    queryWarehouseId ? Number(queryWarehouseId) : null,
  );
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);

  const [step, setStep] = useState(1);

  // Step 1
  const [suppliers, setSuppliers] = useState<SupplierBrief[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierBrief | null>(null);

  // Step 2
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Step 3 / submit
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const currentWarehouse = warehouses.find(w => w.id === warehouseId) || null;

  // Load warehouses
  useEffect(() => {
    (async () => {
      try {
        const res = await warehouseApi.list();
        const list = res.data.data || [];
        setWarehouses(list);
        if (warehouseId == null && list.length > 0) {
          setWarehouseId(list[0].id);
        }
      } catch {
        toast.error(t('warehouse.loadFailed', { defaultValue: '창고 목록을 불러올 수 없습니다' }));
      } finally {
        setWarehousesLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load suppliers when warehouseId changes
  const loadSuppliers = useCallback(async () => {
    if (!warehouseId) return;
    setSuppliersLoading(true);
    try {
      const res = await warehouseApi.getExternalSuppliers(warehouseId);
      setSuppliers(res.data.data || []);
    } catch {
      toast.error(t('warehouseOrder.loadSuppliersFailed', { defaultValue: '공급사를 불러올 수 없습니다' }));
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  }, [warehouseId, t]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  // Load catalog when entering step 2
  const loadCatalog = useCallback(async () => {
    if (!warehouseId) return;
    setCatalogLoading(true);
    try {
      const res = await orderingApi.getCatalog({
        storeId: warehouseId,
        deliveryDate: '',
        categoryId: undefined,
        keyword: searchKeyword || undefined,
        lowStockOnly: false,
        page: 0,
        size: 50,
      });
      setCatalog(res.data.data.content || []);
    } catch {
      toast.error(t('warehouseOrder.loadCatalogFailed', { defaultValue: '카탈로그를 불러올 수 없습니다' }));
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [warehouseId, searchKeyword, t]);

  useEffect(() => {
    if (step !== 2) return;
    const timer = setTimeout(() => { loadCatalog(); }, 300);
    return () => clearTimeout(timer);
  }, [step, loadCatalog]);

  function getCartQty(itemId: number, packagingId: number): number {
    return cart.find(c => c.itemId === itemId && c.packagingId === packagingId)?.quantity ?? 0;
  }

  function updateCartQty(item: CatalogItem, pkgIdx: number, delta: number) {
    const pkg = item.packagings[pkgIdx];
    if (!pkg) return;
    const maxQty = pkg.maxOrderQty > 0 ? pkg.maxOrderQty : 9999;
    setCart(prev => {
      const existing = prev.find(c => c.itemId === item.itemId && c.packagingId === pkg.packagingId);
      if (existing) {
        const newQty = Math.max(0, Math.min(maxQty, existing.quantity + delta));
        if (newQty === 0) return prev.filter(c => !(c.itemId === item.itemId && c.packagingId === pkg.packagingId));
        return prev.map(c => c.itemId === item.itemId && c.packagingId === pkg.packagingId ? { ...c, quantity: newQty } : c);
      } else if (delta > 0) {
        return [...prev, {
          itemId: item.itemId,
          itemName: item.itemName,
          packagingId: pkg.packagingId,
          packLabel: pkg.label,
          unitPrice: pkg.unitPrice,
          unitsPerPack: pkg.unitsPerPack,
          quantity: Math.min(maxQty, delta),
          supplierId: pkg.supplierId,
          supplierName: pkg.supplierName,
          currency: item.currency || 'JPY',
        }];
      }
      return prev;
    });
  }

  // Filter catalog packagings by selected supplier (only show items that have a packaging from selected supplier)
  const filteredCatalog = useMemo(() => {
    if (!selectedSupplier) return [] as CatalogItem[];
    return catalog
      .map(item => ({
        ...item,
        packagings: item.packagings.filter(p => p.supplierId === selectedSupplier.id),
      }))
      .filter(item => item.packagings.length > 0);
  }, [catalog, selectedSupplier]);

  const totalQty = cart.reduce((s, c) => s + c.quantity, 0);
  const totalAmount = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const cartCurrency = cart[0]?.currency || 'JPY';
  const vat = Math.round(totalAmount * 0.1);
  const grandTotal = totalAmount + vat;

  async function handleSubmit() {
    if (!warehouseId || !selectedSupplier || cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await warehouseApi.createOrder(warehouseId, {
        supplierId: selectedSupplier.id,
        lines: cart.map(c => ({ packagingId: c.packagingId, packQty: c.quantity })),
      });
      const orderId = res.data.data.id;
      toast.success(t('warehouseOrder.createSuccess', { defaultValue: '발주가 생성되었습니다' }));
      navigate(`/admin/warehouse-inventory/order/${orderId}?warehouseId=${warehouseId}`);
    } catch {
      toast.error(t('warehouseOrder.createFailed', { defaultValue: '발주 생성 실패' }));
    } finally {
      setSubmitting(false);
      setShowConfirmDialog(false);
    }
  }

  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-4">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center flex-1">
          <div className={`flex items-center gap-2 ${s <= step ? 'text-[#343741]' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              s < step ? 'bg-[#0077cc] border-slate-700 text-white' :
              s === step ? 'border-slate-700 text-[#343741]' :
              'border-gray-300 text-gray-400'
            }`}>
              {s < step ? '✓' : s}
            </div>
            <span className="text-xs font-medium hidden sm:inline">
              {t(STEP_LABELS[s - 1].key, { defaultValue: STEP_LABELS[s - 1].defaultValue })}
            </span>
          </div>
          {s < 3 && <div className={`flex-1 h-0.5 mx-2 ${s < step ? 'bg-[#0077cc]' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );

  // Header
  const Header = () => (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => {
          if (step > 1) setStep(step - 1);
          else navigate('/admin/warehouse-inventory');
        }}>
          {step > 1
            ? t('common.previous', { defaultValue: '이전' })
            : t('common.back', { defaultValue: '< 뒤로' })}
        </Button>
        <h2 className="text-xl font-bold">
          {currentWarehouse?.name || t('warehouse.title', { defaultValue: '창고' })} {' '}
          {t('warehouseOrder.title', { defaultValue: '본사 발주' })}
        </h2>
      </div>
    </div>
  );

  // Loading guards
  if (!warehousesLoaded) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading', { defaultValue: '로딩 중...' })}</div>;
  }
  if (warehouses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('warehouse.empty', { defaultValue: '등록된 창고가 없습니다' })}
      </div>
    );
  }

  // STEP 1: SUPPLIER
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('warehouseOrder.step1Title', { defaultValue: '공급사를 선택하세요' })}
        </h3>
      </div>

      {suppliersLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading', { defaultValue: '로딩 중...' })}</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {t('warehouseOrder.noSuppliers', { defaultValue: '외부 공급사가 등록되어 있지 않습니다' })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suppliers.map(s => {
            const selected = selectedSupplier?.id === s.id;
            return (
              <Card
                key={s.id}
                className={`cursor-pointer transition-all border-2 ${
                  selected ? 'border-slate-700 bg-slate-50' : 'border-gray-200 hover:border-slate-400'
                }`}
                onClick={() => setSelectedSupplier(s)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      {(s.email || s.phone) && (
                        <p className="text-xs text-gray-500 truncate">
                          {[s.email, s.phone].filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </div>
                    {selected && (
                      <div className="w-6 h-6 bg-[#0077cc] rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-xs">{'✓'}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  // STEP 2: PRODUCTS
  const renderStep2 = () => (
    <div className="space-y-4 pb-24">
      {selectedSupplier && (
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-500">{t('warehouseOrder.supplier', { defaultValue: '공급사' })}: </span>
            <span className="font-bold">{selectedSupplier.name}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder={t('ordering.catalog.searchPlaceholder', { defaultValue: '품목 검색' })}
          className="h-11 flex-1"
        />
      </div>

      {catalogLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading', { defaultValue: '로딩 중...' })}</div>
      ) : filteredCatalog.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {t('warehouseOrder.noProducts', { defaultValue: '선택한 공급사의 상품이 없습니다' })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCatalog.map(item => {
            const pkg = item.packagings[0];
            if (!pkg) return null;
            const qty = getCartQty(item.itemId, pkg.packagingId);
            return (
              <Card key={`${item.itemId}-${pkg.packagingId}`} className="border-2 border-gray-200">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.itemName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pkg.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatCurrency(pkg.unitPrice, item.currency)} / {t('warehouseOrder.perPack', { defaultValue: '박스' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0 text-lg"
                        onClick={() => updateCartQty(item, 0, -1)} disabled={qty === 0}>-</Button>
                      <div className="flex flex-col items-center w-16">
                        <span className="text-sm font-bold">{qty}</span>
                        {qty > 0 && (
                          <span className="text-[10px] text-[#69707d]">
                            {qty} {t('warehouseOrder.pack', { defaultValue: '박스' })}
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0 text-lg"
                        onClick={() => updateCartQty(item, 0, 1)}>+</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating cart bar */}
      {totalQty > 0 && (
        <div
          className="sticky bottom-0 left-0 right-0 bg-[#0077cc] text-white p-4 shadow-lg cursor-pointer z-40"
          onClick={() => setStep(3)}
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <span className="font-bold">{t('warehouseOrder.cartTitle', { defaultValue: '장바구니' })}</span>
              <span className="ml-2 text-slate-100">
                {totalQty} {t('warehouseOrder.pack', { defaultValue: '박스' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold">{formatCurrency(totalAmount, cartCurrency)}</span>
              <span className="text-lg">{'→'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // STEP 3: CONFIRM
  const renderStep3 = () => (
    <div className="space-y-4 pb-6">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">
              {selectedSupplier?.name}
            </h4>
            <Badge variant="outline">
              {totalQty} {t('warehouseOrder.pack', { defaultValue: '박스' })}
            </Badge>
          </div>
          <div className="space-y-2">
            {cart.map(c => (
              <div key={`${c.itemId}-${c.packagingId}`} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.itemName}</p>
                  <p className="text-xs text-gray-500">
                    {c.packLabel} / {formatCurrency(c.unitPrice, c.currency)}{'×'}{c.quantity}
                  </p>
                </div>
                <span className="text-sm font-medium w-24 text-right">
                  {formatCurrency(c.unitPrice * c.quantity, c.currency)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-50">
        <CardContent className="py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t('ordering.cart.subtotal', { defaultValue: '소계' })}
            </span>
            <span>{formatCurrency(totalAmount, cartCurrency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {t('ordering.steps.vat', { defaultValue: '부가세' })}
            </span>
            <span>{formatCurrency(vat, cartCurrency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>{t('ordering.cart.total', { defaultValue: '합계' })}</span>
            <span>{formatCurrency(grandTotal, cartCurrency)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Header />
      <StepIndicator />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {/* Bottom action bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 -mx-4 px-4 z-30 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        <div className="flex gap-3 max-w-4xl mx-auto">
          {step > 1 && (
            <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(step - 1)}>
              {t('common.previous', { defaultValue: '이전' })}
            </Button>
          )}
          {step === 1 && (
            <Button
              className="flex-1 h-12 bg-[#0077cc] hover:bg-[#005ea3]"
              onClick={() => setStep(2)}
              disabled={!selectedSupplier}
            >
              {t('common.next', { defaultValue: '다음' })}
            </Button>
          )}
          {step === 2 && (
            <Button
              className="flex-1 h-12 bg-[#0077cc] hover:bg-[#005ea3]"
              onClick={() => setStep(3)}
              disabled={totalQty === 0}
            >
              {t('warehouseOrder.viewCart', { defaultValue: '장바구니 보기' })} ({totalQty})
            </Button>
          )}
          {step === 3 && (
            <Button
              className="flex-1 h-12 bg-[#0077cc] hover:bg-[#005ea3]"
              onClick={() => setShowConfirmDialog(true)}
              disabled={totalQty === 0 || submitting}
            >
              {submitting
                ? t('common.processing', { defaultValue: '처리 중...' })
                : t('warehouseOrder.confirmOrder', { defaultValue: '확정 발주' })}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('warehouseOrder.confirmTitle', { defaultValue: '발주 확정' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('warehouseOrder.confirmDesc', {
                defaultValue: `${selectedSupplier?.name || ''}에 ${cart.length}개 품목을 발주합니다. (총 ${grandTotal.toLocaleString()})`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', { defaultValue: '취소' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#0077cc] hover:bg-[#005ea3]"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? t('common.processing', { defaultValue: '처리 중...' })
                : t('common.confirm', { defaultValue: '확인' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
