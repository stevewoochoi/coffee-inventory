import { useEffect, useState, useRef } from 'react';
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
import { uploadApi } from '@/api/upload';
import axios from 'axios';

const CLAIM_TYPES = ['DEFECTIVE', 'WRONG_ITEM', 'SHORTAGE', 'DAMAGE', 'QUALITY', 'OTHER'] as const;

interface SelectedItem {
  itemId: number;
  itemName: string;
  packagingId?: number;
  packName?: string;
  claimedQty: number;
  reason: string;
}

interface PhotoFile {
  file: File;
  preview: string;
  uploading: boolean;
  uploadedUrl?: string;
}

export default function NewClaimPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const storeId = user?.storeId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [recentOrders, setRecentOrders] = useState<OrderHistory[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [claimType, setClaimType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [requestedAction, setRequestedAction] = useState('');
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRecentOrders();
  }, []);

  async function loadRecentOrders() {
    try {
      const res = await orderingApi.getOrderHistory(storeId, 10);
      setRecentOrders(res.data.data);
    } catch { /* silently fail */ }
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

  function updateItemQty(idx: number, value: string) {
    const parsed = parseInt(value, 10);
    const qty = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], claimedQty: qty };
      return updated;
    });
  }

  function updateItemReason(idx: number, value: string) {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], reason: value };
      return updated;
    });
  }

  function updateItemName(idx: number, value: string) {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], itemName: value };
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

  // Photo handling
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: PhotoFile[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = '';
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function uploadPhotos(): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.uploadedUrl) {
        urls.push(photo.uploadedUrl);
        continue;
      }
      try {
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: true } : p));
        const ext = photo.file.name.split('.').pop() || 'jpg';
        const fileName = `claim_${Date.now()}_${i}.${ext}`;
        const contentType = photo.file.type || 'image/jpeg';
        const presigned = await uploadApi.getPresignedUrl(fileName, contentType);
        const { uploadUrl, fileUrl } = presigned.data.data;
        await axios.put(uploadUrl, photo.file, {
          headers: { 'Content-Type': contentType },
        });
        urls.push(fileUrl);
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: false, uploadedUrl: fileUrl } : p));
      } catch {
        setPhotos(prev => prev.map((p, idx) => idx === i ? { ...p, uploading: false } : p));
        throw new Error(`사진 ${i + 1} 업로드 실패`);
      }
    }
    return urls;
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
      // Upload photos first
      let uploadedUrls: string[] = [];
      if (photos.length > 0) {
        try {
          uploadedUrls = await uploadPhotos();
        } catch (e: any) {
          toast.error(e.message || '사진 업로드 실패');
          setSubmitting(false);
          return;
        }
      }

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

      const claimId = res.data.data.id;
      for (const url of uploadedUrls) {
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
                step >= s ? 'bg-[#0077cc] text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-[#0077cc]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="text-sm text-gray-500 ml-2">
          {step === 1 && t('claims.new.step1')}
          {step === 2 && t('claims.new.step2')}
          {step === 3 && t('claims.new.step3')}
        </span>
      </div>

      {/* Step 1: Select order */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t('claims.new.selectOrderDesc')}</p>
          <Button variant="outline" className="w-full min-h-[48px] border-dashed" onClick={handleSkipOrder}>
            {t('claims.new.skipOrder')}
          </Button>
          {recentOrders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500">{t('claims.new.recentOrders')}</h3>
              {recentOrders.map((order) => (
                <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleSelectOrder(order)}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold">#{order.id}</span>
                        <span className="text-gray-500 ml-2">{order.supplierName}</span>
                      </div>
                      <Badge className="bg-slate-100 text-[#343741]">{t(`ordering.status.${order.status}`)}</Badge>
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
                        ? 'border-[#0077cc] bg-[rgba(0,119,204,0.04)] text-[#0077cc]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t(`claims.type.${type}`)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('claims.new.items')}</CardTitle>
                <Button size="sm" variant="outline" onClick={addManualItem}>
                  + {t('claims.new.addItem')}
                </Button>
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
                        {item.itemId > 0 ? (
                          <span className="font-medium text-sm">
                            {item.itemName}
                            {item.packName && <span className="text-gray-400 ml-1">({item.packName})</span>}
                          </span>
                        ) : (
                          <input
                            type="text"
                            placeholder="품목명 입력"
                            value={item.itemName}
                            onChange={(e) => updateItemName(idx, e.target.value)}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm mr-2"
                          />
                        )}
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
                            onClick={() => updateItemQty(idx, String(Math.max(0, item.claimedQty - 1)))}
                            className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold hover:bg-gray-200"
                          >-</button>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={item.claimedQty || ''}
                            onFocus={(e) => { if (item.claimedQty === 0) e.target.value = ''; }}
                            onChange={(e) => updateItemQty(idx, e.target.value)}
                            className="w-16 text-center border rounded-lg h-10 text-sm"
                            min={0}
                          />
                          <button
                            onClick={() => updateItemQty(idx, String(item.claimedQty + 1))}
                            className="w-10 h-10 rounded-lg bg-gray-100 text-lg font-bold hover:bg-gray-200"
                          >+</button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder={t('claims.new.reasonPlaceholder')}
                        value={item.reason}
                        onChange={(e) => updateItemReason(idx, e.target.value)}
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
              className="flex-1 min-h-[48px]"
              onClick={() => {
                if (!claimType) { toast.error(t('claims.new.selectType')); return; }
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

          {/* Photo upload */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('claims.new.photos')}</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <div className="space-y-3">
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative">
                        <img src={photo.preview} alt={`photo-${idx}`} className="w-full h-24 object-cover rounded-lg border" />
                        {photo.uploading && (
                          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs">업로드중...</span>
                          </div>
                        )}
                        {photo.uploadedUrl && (
                          <div className="absolute top-1 left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full min-h-[48px] border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷 사진 촬영 / 갤러리에서 선택
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-[#e8eaf0] bg-[#f7f8fc]">
            <CardContent className="py-4">
              <h3 className="font-semibold text-[#343741] mb-2">{t('claims.new.summary')}</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">{t('claims.new.claimType')}:</span> {t(`claims.type.${claimType}`)}</p>
                {selectedOrderId && <p><span className="text-gray-500">{t('claims.new.relatedOrder')}:</span> #{selectedOrderId}</p>}
                <p><span className="text-gray-500">{t('claims.new.items')}:</span> {items.filter(i => i.claimedQty > 0).length} {t('claims.itemCount')}</p>
                {photos.length > 0 && (
                  <p><span className="text-gray-500">{t('claims.new.photos')}:</span> {photos.length}장</p>
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
                <Button className="flex-1 min-h-[48px]" disabled={submitting}>
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
                  <AlertDialogAction onClick={handleSubmit}>{t('claims.new.submit')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}
