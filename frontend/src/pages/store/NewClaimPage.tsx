import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { claimsApi, type ClaimLineInput } from '@/api/claims';
import { orderingApi, type OrderHistory } from '@/api/ordering';

const CLAIM_TYPES = ['DEFECTIVE', 'WRONG_ITEM', 'SHORTAGE', 'DAMAGE', 'QUALITY', 'OTHER'] as const;

interface SelectedItem {
  itemId: number;
  itemName: string;
  packagingId?: number;
  packName?: string;
  claimedQty: number;
  reason: string;
}

export default function NewClaimPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;

  const [step, setStep] = useState(1);
  const [recentOrders, setRecentOrders] = useState<OrderHistory[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [claimType, setClaimType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [requestedAction, setRequestedAction] = useState('');
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRecentOrders();
  }, []);

  async function loadRecentOrders() {
    try {
      const res = await orderingApi.getOrderHistory(storeId, 10);
      setRecentOrders(res.data.data);
    } catch {
      // silently fail
    }
  }

  function handleSelectOrder(order: OrderHistory) {
    setSelectedOrderId(order.id);
    setItems(
      order.lines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        packagingId: l.packagingId,
        packName: l.packName,
        claimedQty: 0,
        reason: '',
      }))
    );
    setStep(2);
  }

  function handleSkipOrder() {
    setSelectedOrderId(null);
    setItems([]);
    setStep(2);
  }

  function updateItem(idx: number, field: keyof SelectedItem, value: string | number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addManualItem() {
    setItems((prev) => [
      ...prev,
      { itemId: 0, itemName: '', claimedQty: 1, reason: '' },
    ]);
  }

  async function handleSubmit() {
    if (!claimType) {
      toast.error(t('claims.new.selectType'));
      return;
    }

    const validItems = items.filter((item) => item.claimedQty > 0);
    if (validItems.length === 0) {
      toast.error(t('claims.new.addItems'));
      return;
    }

    setSubmitting(true);
    try {
      const lines: ClaimLineInput[] = validItems.map((item) => ({
        itemId: item.itemId,
        packagingId: item.packagingId,
        claimedQty: item.claimedQty,
        reason: item.reason || undefined,
      }));

      const res = await claimsApi.create({
        storeId,
        orderPlanId: selectedOrderId ?? undefined,
        claimType,
        description: description || undefined,
        requestedAction: requestedAction || undefined,
        lines,
      });

      // Upload images if any
      const claimId = res.data.data.id;
      for (const url of imageUrls) {
        await claimsApi.addImage(claimId, url);
      }

      toast.success(t('claims.new.submitSuccess'));
      navigate(`/store/claims/${claimId}`);
    } catch {
      toast.error(t('claims.new.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/store/claims')}>
          {t('common.back')}
        </Button>
        <h2 className="text-xl font-bold">{t('claims.new.title')}</h2>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-blue-800' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="text-sm text-gray-500 ml-2">
          {step === 1 && t('claims.new.step1')}
          {step === 2 && t('claims.new.step2')}
          {step === 3 && t('claims.new.step3')}
        </span>
      </div>

      {/* Step 1: Select order (optional) */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t('claims.new.selectOrderDesc')}</p>

          <Button
            variant="outline"
            className="w-full min-h-[48px] border-dashed"
            onClick={handleSkipOrder}
          >
            {t('claims.new.skipOrder')}
          </Button>

          {recentOrders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500">{t('claims.new.recentOrders')}</h3>
              {recentOrders.map((order) => (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectOrder(order)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold">#{order.id}</span>
                        <span className="text-gray-500 ml-2">{order.supplierName}</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">
                        {t(`ordering.status.${order.status}`)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {order.lines.map((l) => l.itemName).join(', ')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Claim type & items */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Claim type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('claims.new.claimType')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {CLAIM_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setClaimType(type)}
                    className={`p-3 rounded-lg text-sm font-medium border-2 transition-colors min-h-[48px] ${
                      claimType === type
                        ? 'border-blue-800 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t(`claims.type.${type}`)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('claims.new.items')}</CardTitle>
                {!selectedOrderId && (
                  <Button size="sm" variant="outline" onClick={addManualItem}>
                    + {t('claims.new.addItem')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">{t('claims.new.noItems')}</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {item.itemName || t('claims.new.manualItem')}
                          {item.packName && <span className="text-gray-400 ml-1">({item.packName})</span>}
                        </span>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-red-500 text-sm hover:text-red-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-gray-500">{t('claims.new.qty')}</label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateItem(idx, 'claimedQty', Math.max(0, item.claimedQty - 1))}
                            className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold hover:bg-gray-200"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.claimedQty}
                            onChange={(e) => updateItem(idx, 'claimedQty', Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-16 text-center border rounded-lg h-10 text-sm"
                          />
                          <button
                            onClick={() => updateItem(idx, 'claimedQty', item.claimedQty + 1)}
                            className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder={t('claims.new.reasonPlaceholder')}
                        value={item.reason}
                        onChange={(e) => updateItem(idx, 'reason', e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="min-h-[48px]" onClick={() => setStep(1)}>
              {t('common.back')}
            </Button>
            <Button
              className="flex-1 bg-blue-800 hover:bg-blue-900 min-h-[48px]"
              onClick={() => {
                if (!claimType) {
                  toast.error(t('claims.new.selectType'));
                  return;
                }
                setStep(3);
              }}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Description, photos & submit */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('claims.new.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('claims.new.descriptionPlaceholder')}
                className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none"
              />
            </CardContent>
          </Card>

          {/* Requested action */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('claims.new.requestedAction')}</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={requestedAction}
                onChange={(e) => setRequestedAction(e.target.value)}
                placeholder={t('claims.new.actionPlaceholder')}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </CardContent>
          </Card>

          {/* Photo URLs (simplified - URL input instead of camera) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('claims.new.photos')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const updated = [...imageUrls];
                        updated[idx] = e.target.value;
                        setImageUrls(updated);
                      }}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 text-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px]"
                  onClick={() => setImageUrls((prev) => [...prev, ''])}
                >
                  + {t('claims.new.addPhoto')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <h3 className="font-semibold text-blue-800 mb-2">{t('claims.new.summary')}</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">{t('claims.new.claimType')}:</span> {t(`claims.type.${claimType}`)}</p>
                {selectedOrderId && <p><span className="text-gray-500">{t('claims.new.relatedOrder')}:</span> #{selectedOrderId}</p>}
                <p><span className="text-gray-500">{t('claims.new.items')}:</span> {items.filter(i => i.claimedQty > 0).length} {t('claims.itemCount')}</p>
                {imageUrls.filter(u => u).length > 0 && (
                  <p><span className="text-gray-500">{t('claims.new.photos')}:</span> {imageUrls.filter(u => u).length} {t('claims.photoCount')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" className="min-h-[48px]" onClick={() => setStep(2)}>
              {t('common.back')}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="flex-1 bg-blue-800 hover:bg-blue-900 min-h-[48px]"
                  disabled={submitting}
                >
                  {submitting ? t('common.loading') : t('claims.new.submit')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('claims.new.confirmTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('claims.new.confirmDesc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    {t('claims.new.submit')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
