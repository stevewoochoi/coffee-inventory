import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  orderingApi,
  type NeedsItem,
  type OrderNeedsResponse,
  type CartResponse,
} from '@/api/ordering';

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const brandId = user?.brandId;
  const userId = user?.id ?? 1;
  const { t } = useTranslation();

  // Recommendations
  const [needs, setNeeds] = useState<OrderNeedsResponse | null>(null);

  // Cart
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadNeeds = useCallback(async () => {
    try {
      const res = await orderingApi.getOrderNeeds(storeId, brandId);
      setNeeds(res.data.data);
    } catch {
      toast.error(t('ordering.needs.loadFailed'));
    }
  }, [storeId, brandId, t]);

  const loadCart = useCallback(async () => {
    try {
      const res = await orderingApi.getCart(storeId, userId);
      setCart(res.data.data);
    } catch {
      // silently fail
    }
  }, [storeId, userId]);

  useEffect(() => {
    loadNeeds();
    loadCart();
  }, [loadNeeds, loadCart]);

  const addToCart = async (item: NeedsItem) => {
    if (item.suppliers.length === 0 || item.suppliers[0].packagings.length === 0) return;
    const supplier = item.suppliers[0];
    const pkg = supplier.packagings[0];
    try {
      const res = await orderingApi.addToCart(storeId, userId, {
        packagingId: pkg.packagingId,
        supplierId: supplier.supplierId,
        packQty: pkg.suggestedPackQty || 1,
      });
      setCart(res.data.data);
      toast.success(t('ordering.cart.addedToCart'));
    } catch {
      toast.error(t('ordering.createFailed'));
    }
  };

  const updateCartItemQty = async (itemId: number, qty: number) => {
    if (qty <= 0) {
      try {
        const res = await orderingApi.removeCartItem(storeId, userId, itemId);
        setCart(res.data.data);
      } catch { /* ignore */ }
    } else {
      try {
        const res = await orderingApi.updateCartItem(storeId, userId, itemId, { packQty: qty });
        setCart(res.data.data);
      } catch { /* ignore */ }
    }
  };

  const handleConfirmCart = async () => {
    setConfirming(true);
    try {
      await orderingApi.confirmCart(storeId, userId);
      toast.success(t('ordering.cart.orderConfirmed'));
      navigate('/store/ordering');
    } catch {
      toast.error(t('ordering.cart.confirmFailed'));
    } finally {
      setConfirming(false);
    }
  };

  const handleClearCart = async () => {
    try {
      const res = await orderingApi.clearCart(storeId, userId);
      setCart(res.data.data);
    } catch { /* ignore */ }
  };

  const totalCartItems = cart?.totalItems ?? 0;

  const NeedsSection = ({ items, level }: { items: NeedsItem[]; level: 'urgent' | 'recommended' | 'predicted' }) => {
    if (items.length === 0) return null;
    const colors = {
      urgent: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800' },
      recommended: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800' },
      predicted: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
    };
    const c = colors[level];

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={c.badge}>{t(`ordering.needs.${level}`)}</Badge>
          <span className="text-sm text-gray-500">{t(`ordering.needs.${level}Desc`)}</span>
        </div>
        {items.map((item) => (
          <Card key={item.itemId} className={`${c.border} ${c.bg}`}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{item.itemName}</p>
                  <div className="text-sm text-gray-500 mt-1">
                    <span>{t('ordering.needs.currentStock')}: {item.currentStock.toFixed(0)} {item.baseUnit}</span>
                    <span className="mx-2">|</span>
                    <span>{t('ordering.needs.minStock')}: {item.minStock.toFixed(0)}</span>
                    {item.daysUntilEmpty >= 0 && item.daysUntilEmpty < 999 && (
                      <>
                        <span className="mx-2">|</span>
                        <span>{t('ordering.needs.daysLeft')}: {item.daysUntilEmpty.toFixed(0)}</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="min-h-[44px] bg-blue-800 hover:bg-blue-900"
                  onClick={() => addToCart(item)}
                  disabled={item.suppliers.length === 0}
                >
                  {t('ordering.needs.addToCart')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('ordering.newOrderTitle')}</h2>
        <Button variant="outline" onClick={() => navigate('/store/ordering')}>
          {t('ordering.backToList')}
        </Button>
      </div>

      {/* Section 1: Recommendations */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('ordering.needs.title')}</h3>
        {needs && (needs.urgent.length > 0 || needs.recommended.length > 0 || needs.predicted.length > 0) ? (
          <div className="space-y-4">
            <NeedsSection items={needs.urgent} level="urgent" />
            <NeedsSection items={needs.recommended} level="recommended" />
            <NeedsSection items={needs.predicted} level="predicted" />
          </div>
        ) : (
          <p className="text-center text-gray-400 py-4">{t('ordering.needs.noNeeds')}</p>
        )}
      </div>

      {/* Section 2: Legacy supplier-based order (kept for manual ordering) */}
      <LegacySupplierOrder storeId={storeId} />

      {/* Floating cart summary */}
      {totalCartItems > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-blue-800 text-white p-4 shadow-lg cursor-pointer z-40"
          onClick={() => setCartOpen(true)}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <span className="font-bold text-lg">{t('ordering.cart.title')}</span>
              <span className="ml-2 text-blue-200">{t('ordering.cart.items', { count: totalCartItems })}</span>
            </div>
            <span className="text-lg">▲</span>
          </div>
        </div>
      )}

      {/* Cart dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('ordering.cart.title')}</DialogTitle>
          </DialogHeader>

          {cart && cart.supplierGroups.length > 0 ? (
            <div className="space-y-4">
              {cart.supplierGroups.map((group) => (
                <div key={group.supplierId}>
                  <p className="font-semibold text-sm text-gray-600 mb-2">{group.supplierName}</p>
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.packName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateCartItemQty(item.id, item.packQty - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-bold">{item.packQty}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => updateCartItemQty(item.id, item.packQty + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-4">{t('ordering.cart.empty')}</p>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleClearCart}>{t('ordering.cart.clearCart')}</Button>
            <Button
              className="bg-blue-800 hover:bg-blue-900"
              onClick={handleConfirmCart}
              disabled={confirming || totalCartItems === 0}
            >
              {confirming ? t('common.processing') : t('ordering.cart.confirmOrder')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Legacy supplier-based ordering section (kept for backward compatibility)
function LegacySupplierOrder({ storeId }: { storeId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Array<{ packagingId: number; itemName: string; packName: string; currentStock: number; avgDailyDemand: number; leadTimeDays: number; suggestedPackQty: number; editQty: number }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function loadSuggestion() {
    if (!supplierId) return;
    try {
      const res = await orderingApi.getSuggestion(storeId, Number(supplierId));
      const suggestion = res.data.data;
      setLines(
        suggestion.lines.map((l) => ({
          packagingId: l.packagingId,
          itemName: l.itemName,
          packName: l.packName,
          currentStock: l.currentStock,
          avgDailyDemand: l.avgDailyDemand,
          leadTimeDays: l.leadTimeDays,
          suggestedPackQty: l.suggestedPackQty,
          editQty: l.suggestedPackQty,
        }))
      );
      setLoaded(true);
    } catch {
      toast.error(t('ordering.suggestionFailed'));
    }
  }

  function updateQty(index: number, qty: number) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, editQty: qty } : l))
    );
  }

  async function handleSubmit() {
    const orderLines = lines
      .filter((l) => l.editQty > 0)
      .map((l) => ({ packagingId: l.packagingId, packQty: l.editQty }));
    if (orderLines.length === 0) return;

    setSubmitting(true);
    try {
      await orderingApi.createPlan({ storeId, supplierId: Number(supplierId), lines: orderLines });
      toast.success(t('ordering.orderCreated'));
      navigate('/store/ordering');
    } catch {
      toast.error(t('ordering.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('ordering.catalog.title')}</CardTitle>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Input
                type="number"
                placeholder={t('ordering.supplierIdPlaceholder')}
                value={supplierId}
                onChange={(e) => { setSupplierId(e.target.value); setLoaded(false); }}
                className="h-12 text-base"
              />
            </div>
            <Button
              className="bg-blue-800 hover:bg-blue-900 h-12"
              onClick={loadSuggestion}
              disabled={!supplierId}
            >
              {t('ordering.loadSuggestion')}
            </Button>
          </div>

          {loaded && lines.length === 0 && (
            <p className="text-center py-4 text-gray-400">{t('ordering.noItemsForSupplier')}</p>
          )}

          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={line.packagingId} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{line.itemName}</p>
                      <p className="text-sm text-gray-500">{line.packName}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        {t('ordering.stock')}: {line.currentStock.toFixed(0)} | {t('ordering.suggested')}: {line.suggestedPackQty}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0"
                        onClick={() => updateQty(idx, Math.max(0, line.editQty - 1))}>-</Button>
                      <Input
                        type="number" min={0} value={line.editQty}
                        onChange={(e) => updateQty(idx, parseInt(e.target.value) || 0)}
                        className="w-16 h-10 text-center"
                      />
                      <Button size="sm" variant="outline" className="h-10 w-10 p-0"
                        onClick={() => updateQty(idx, line.editQty + 1)}>+</Button>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                className="w-full bg-blue-800 hover:bg-blue-900 h-12"
                onClick={handleSubmit}
                disabled={submitting || lines.every((l) => l.editQty === 0)}
              >
                {submitting ? t('common.creating') : t('ordering.createOrder')}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
