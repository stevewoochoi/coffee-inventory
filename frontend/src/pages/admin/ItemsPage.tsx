import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { masterApi, updateItemOperational, type Item, type ItemRequest, type ItemOperationalRequest, type Supplier, type DeliveryScheduleRequest, type BatchUploadResult } from '@/api/master';
import { categoryApi, type CategoryTreeNode } from '@/api/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ImageUpload from '@/components/ImageUpload';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const { user } = useAuthStore();
  const brandId = user?.brandId;
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [selL1, setSelL1] = useState<number | ''>('');
  const [selL2, setSelL2] = useState<number | ''>('');
  const [selL3, setSelL3] = useState<number | ''>('');
  const [form, setForm] = useState<ItemRequest>({ brandId, name: '', baseUnit: 'g' });
  const emptySchedule: DeliveryScheduleRequest = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };
  const [deliverySchedule, setDeliverySchedule] = useState<DeliveryScheduleRequest>(emptySchedule);
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(null);
  const [uploadResultOpen, setUploadResultOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'operational'>('basic');
  const [opForm, setOpForm] = useState<ItemOperationalRequest>({});
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await masterApi.getSuppliers(brandId);
      setSuppliers(res.data.data);
    } catch { /* non-critical */ }
  }, [brandId]);

  const loadCategoryTree = useCallback(async () => {
    try {
      const res = await categoryApi.getCategoryTree(brandId);
      setCategoryTree(res.data.data);
    } catch { /* non-critical */ }
  }, [brandId]);

  const loadItems = useCallback(async () => {
    try {
      const res = await masterApi.getItems(brandId, page, 20, statusFilter === 'active' ? undefined : statusFilter);
      setItems(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error(t('items.loadFailed')); }
  }, [brandId, page, statusFilter, t]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);
  useEffect(() => { loadCategoryTree(); }, [loadCategoryTree]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ brandId, name: '', baseUnit: 'g', category: '', categoryId: undefined, lossRate: 0, price: undefined, vatInclusive: true, supplierId: undefined });
    setSelL1('');
    setSelL2('');
    setSelL3('');
    setDeliverySchedule(emptySchedule);
    setHasExistingSchedule(false);
    setActiveTab('basic');
    setOpForm({});
    setDialogOpen(true);
  };

  const openEdit = async (item: Item) => {
    setEditItem(item);

    // Match category name to tree for dropdown pre-selection
    let matchedL1: number | '' = '';
    let matchedL2: number | '' = '';
    let matchedL3: number | '' = '';
    let matchedCategoryId: number | undefined = item.categoryId ?? undefined;
    const catName = item.category || '';
    if (catName && categoryTree.length > 0) {
      // Try to find matching category in tree by name or categoryId
      for (const l1 of categoryTree) {
        if (l1.name === catName || (matchedCategoryId && l1.id === matchedCategoryId)) {
          matchedL1 = l1.id;
          matchedCategoryId = l1.id;
          break;
        }
        for (const l2 of (l1.children || [])) {
          if (l2.name === catName || (matchedCategoryId && l2.id === matchedCategoryId)) {
            matchedL1 = l1.id;
            matchedL2 = l2.id;
            matchedCategoryId = l2.id;
            break;
          }
          for (const l3 of (l2.children || [])) {
            if (l3.name === catName || (matchedCategoryId && l3.id === matchedCategoryId)) {
              matchedL1 = l1.id;
              matchedL2 = l2.id;
              matchedL3 = l3.id;
              matchedCategoryId = l3.id;
              break;
            }
          }
          if (matchedL2) break;
        }
        if (matchedL1) break;
      }
    }

    setForm({
      brandId: item.brandId ?? undefined,
      name: item.name,
      baseUnit: item.baseUnit,
      category: catName,
      categoryId: matchedCategoryId,
      lossRate: item.lossRate,
      price: item.price ?? undefined,
      vatInclusive: item.vatInclusive ?? true,
      supplierId: item.supplierId ?? undefined,
    });
    setSelL1(matchedL1);
    setSelL2(matchedL2);
    setSelL3(matchedL3);
    setActiveTab('basic');
    setOpForm({
      stockUnit: item.stockUnit || '',
      orderUnit: item.orderUnit || '',
      conversionQty: item.conversionQty ?? undefined,
      minOrderQty: item.minOrderQty ?? undefined,
      parLevel: item.parLevel ?? undefined,
      countCycle: (item.countCycle as ItemOperationalRequest['countCycle']) ?? undefined,
      storageZone: (item.storageZone as ItemOperationalRequest['storageZone']) ?? undefined,
      itemGrade: (item.itemGrade as ItemOperationalRequest['itemGrade']) ?? undefined,
      lotTracking: (item.lotTracking as ItemOperationalRequest['lotTracking']) ?? undefined,
      isPosTracked: item.isPosTracked ?? false,
    });
    // Load delivery schedule
    try {
      const res = await masterApi.getDeliverySchedule(item.id);
      const s = res.data.data;
      if (s) {
        setDeliverySchedule({ mon: s.mon, tue: s.tue, wed: s.wed, thu: s.thu, fri: s.fri, sat: s.sat, sun: s.sun });
        setHasExistingSchedule(true);
      } else {
        setDeliverySchedule(emptySchedule);
        setHasExistingSchedule(false);
      }
    } catch {
      setDeliverySchedule(emptySchedule);
      setHasExistingSchedule(false);
    }
    setDialogOpen(true);
  };

  const openImageDialog = (item: Item) => {
    setSelectedItem(item);
    setImageDialogOpen(true);
  };

  const handleImageUpload = async (fileUrl: string) => {
    if (!selectedItem) return;
    try {
      await masterApi.updateItemImage(selectedItem.id, fileUrl);
      setImageDialogOpen(false);
      loadItems();
    } catch { toast.error(t('items.imageUpdateFailed')); }
  };

  const handleSave = async () => {
    try {
      let itemId: number;
      if (editItem) {
        await masterApi.updateItem(editItem.id, form);
        itemId = editItem.id;
      } else {
        const res = await masterApi.createItem(form);
        itemId = res.data.data.id;
      }
      // Save delivery schedule
      const hasAnyDay = Object.values(deliverySchedule).some(v => v === true);
      if (hasAnyDay) {
        if (hasExistingSchedule) {
          await masterApi.updateDeliverySchedule(itemId, deliverySchedule);
        } else {
          await masterApi.createDeliverySchedule(itemId, deliverySchedule);
        }
      }
      // Save operational fields
      const hasOpFields = opForm.itemGrade || opForm.storageZone || opForm.countCycle ||
        opForm.stockUnit || opForm.orderUnit || opForm.lotTracking ||
        opForm.conversionQty || opForm.minOrderQty || opForm.parLevel || opForm.isPosTracked;
      if (hasOpFields) {
        try {
          await updateItemOperational(itemId, opForm);
        } catch { /* operational save is best-effort */ }
      }
      toast.success(editItem ? t('items.updated') : t('items.created'));
      setDialogOpen(false);
      loadItems();
    } catch { toast.error(t('items.saveFailed')); }
  };

  const handleToggleActive = async (item: Item) => {
    const action = item.isActive ? t('items.deactivateConfirm') : t('items.activateConfirm', { defaultValue: '이 상품을 활성화하시겠습니까?' });
    if (!confirm(action)) return;
    try {
      await masterApi.toggleItemActive(item.id);
      toast.success(item.isActive ? t('items.deactivated', { defaultValue: '비활성화 완료' }) : t('items.activated', { defaultValue: '활성화 완료' }));
      loadItems();
    } catch { toast.error(t('items.statusChangeFailed', { defaultValue: '상태 변경 실패' })); }
  };

  const handleDownloadSample = async () => {
    try {
      const res = await masterApi.downloadItemExcelSample();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'item_upload_sample.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('샘플 다운로드 실패'); }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!brandId) {
      toast.error('브랜드 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }
    setUploading(true);
    try {
      const res = await masterApi.uploadItemExcel(brandId, file);
      setUploadResult(res.data.data);
      setUploadResultOpen(true);
      loadItems();
      if (res.data.data.errorCount === 0) {
        toast.success(`${res.data.data.successCount}건 등록 완료`);
      } else {
        toast.warning(`${res.data.data.successCount}건 성공, ${res.data.data.errorCount}건 실패`);
      }
    } catch { toast.error('엑셀 업로드 실패'); }
    setUploading(false);
    e.target.value = '';
  };

  const handleBatchDelete = async () => {
    if (!brandId) { toast.error('브랜드 정보가 없습니다.'); return; }
    if (!confirm(`현재 브랜드의 모든 상품(${items.length}건)을 비활성화합니다. 계속하시겠습니까?`)) return;
    if (!confirm('정말 일괄 비활성화하시겠습니까? 이 작업은 되돌릴 수 있습니다.')) return;
    try {
      const res = await masterApi.batchDeleteItems(brandId);
      toast.success(`${res.data.data}건 비활성화 완료`);
      loadItems();
    } catch { toast.error('일괄 비활성화 실패'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('items.title')}</h2>
        <div className="flex gap-2 flex-wrap">
          {items.length > 0 && statusFilter === 'active' && (
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={handleBatchDelete}>
              일괄 비활성화
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadSample}>
            샘플 다운로드
          </Button>
          <Button variant="outline" size="sm" disabled={uploading}
            onClick={() => fileInputRef.current?.click()}>
            {uploading ? '업로드 중...' : '엑셀 업로드'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelUpload}
          />
          <Button onClick={openCreate} className="bg-[#0077cc] hover:bg-[#005ea3]">
            {t('items.addItem')}
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'active', label: '활성', count: null },
          { key: 'inactive', label: '비활성', count: null },
          { key: 'all', label: '전체', count: null },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-[#0077cc] text-white'
                : 'bg-white border border-[#e8eaf0] text-[#69707d] hover:bg-[#f7f8fc]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.id')}</TableHead>
              <TableHead>{t('common.image')}</TableHead>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('items.category')}</TableHead>
              <TableHead>{t('items.supplier')}</TableHead>
              <TableHead>{t('items.baseUnit')}</TableHead>
              <TableHead>{t('items.lossRate')}</TableHead>
              <TableHead>{t('items.price')}</TableHead>
              <TableHead>{t('items.vat')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-10 h-10 object-cover rounded cursor-pointer"
                      onClick={() => openImageDialog(item)}
                    />
                  ) : (
                    <button
                      className="w-10 h-10 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs hover:border-slate-400"
                      onClick={() => openImageDialog(item)}
                    >
                      +
                    </button>
                  )}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category || '-'}</TableCell>
                <TableCell>{item.supplierName || '-'}</TableCell>
                <TableCell>{item.baseUnit}</TableCell>
                <TableCell>{(item.lossRate * 100).toFixed(1)}%</TableCell>
                <TableCell>{item.price != null ? `₩${item.price.toLocaleString()}` : '-'}</TableCell>
                <TableCell>
                  {item.price != null && item.vatInclusive ? (
                    <span className="text-xs text-orange-600 font-medium">
                      {t('items.vatIncl')} ₩{Math.round(item.price * 0.1).toLocaleString()}
                    </span>
                  ) : item.price != null && !item.vatInclusive ? (
                    <span className="text-xs text-gray-400">{t('items.vatExcl')}</span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                    {item.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant={item.isActive ? 'outline' : 'default'}
                    size="sm"
                    className={item.isActive ? 'text-red-600 hover:text-red-700' : 'bg-green-600 hover:bg-green-700 text-white'}
                    onClick={() => handleToggleActive(item)}
                  >
                    {item.isActive ? t('items.deactivate', { defaultValue: '비활성화' }) : t('items.activate', { defaultValue: '활성화' })}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                  {t('items.noItems')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-start gap-3 mb-3">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-12 h-12 object-cover rounded cursor-pointer flex-shrink-0"
                  onClick={() => openImageDialog(item)}
                />
              ) : (
                <button
                  className="w-12 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs hover:border-slate-400 flex-shrink-0"
                  onClick={() => openImageDialog(item)}
                >
                  +
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{item.name}</span>
                  <Badge variant={item.isActive ? 'default' : 'secondary'} className="flex-shrink-0">
                    {item.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {item.category || '-'} · {item.supplierName || '-'} · {item.baseUnit} · {(item.lossRate * 100).toFixed(1)}%
                  {item.price != null && ` · ₩${item.price.toLocaleString()}`}
                  {item.price != null && item.vatInclusive && (
                    <span className="text-orange-600"> ({t('items.vatIncl')} ₩{Math.round(item.price * 0.1).toLocaleString()})</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => openEdit(item)}>
                {t('common.edit')}
              </Button>
              <Button
                size="sm"
                className={`flex-1 min-h-[44px] ${item.isActive ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'}`}
                onClick={() => handleToggleActive(item)}
              >
                {item.isActive ? t('items.deactivate', { defaultValue: '비활성화' }) : t('items.activate', { defaultValue: '활성화' })}
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center text-gray-500 py-8 bg-white rounded-lg border">
            {t('items.noItems')}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            {t('common.previous')}
          </Button>
          <span className="py-1 px-3 text-sm text-gray-600">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? t('items.editTitle') : t('items.addTitle')}</DialogTitle>
          </DialogHeader>
          {/* Tab switcher */}
          {editItem && (
            <div className="flex border-b mb-2">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'basic' ? 'border-slate-700 text-[#343741]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('basic')}
              >
                {t('items.basicInfo', { defaultValue: '기본 정보' })}
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'operational' ? 'border-slate-700 text-[#343741]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('operational')}
              >
                {t('operational.title')}
              </button>
            </div>
          )}

          {/* Basic tab */}
          <div className={`space-y-4 ${activeTab !== 'basic' && editItem ? 'hidden' : ''}`}>
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('items.category')}</Label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selL1}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : '';
                    setSelL1(v);
                    setSelL2('');
                    setSelL3('');
                    if (v) {
                      const node = categoryTree.find(c => c.id === v);
                      const catName = node?.name || '';
                      setForm({ ...form, category: catName, categoryId: v as number });
                    } else {
                      setForm({ ...form, category: '', categoryId: undefined });
                    }
                  }}
                >
                  <option value="">{t('categories.selectLevel1')}</option>
                  {categoryTree.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selL2}
                  disabled={!selL1}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : '';
                    setSelL2(v);
                    setSelL3('');
                    if (v) {
                      const l1 = categoryTree.find(c => c.id === selL1);
                      const l2 = l1?.children.find(c => c.id === v);
                      const catName = l2?.name || '';
                      setForm({ ...form, category: catName, categoryId: v as number });
                    } else if (selL1) {
                      const node = categoryTree.find(c => c.id === selL1);
                      setForm({ ...form, category: node?.name || '', categoryId: selL1 as number });
                    }
                  }}
                >
                  <option value="">{t('categories.selectLevel2')}</option>
                  {selL1 && categoryTree.find(c => c.id === selL1)?.children.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selL3}
                  disabled={!selL2}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : '';
                    setSelL3(v);
                    if (v) {
                      const l1 = categoryTree.find(c => c.id === selL1);
                      const l2 = l1?.children.find(c => c.id === selL2);
                      const l3 = l2?.children.find(c => c.id === v);
                      const catName = l3?.name || '';
                      setForm({ ...form, category: catName, categoryId: v as number });
                    } else if (selL2) {
                      const l1 = categoryTree.find(c => c.id === selL1);
                      const l2 = l1?.children.find(c => c.id === selL2);
                      setForm({ ...form, category: l2?.name || '', categoryId: selL2 as number });
                    }
                  }}
                >
                  <option value="">{t('categories.selectLevel3', { defaultValue: '-' })}</option>
                  {selL2 && categoryTree.find(c => c.id === selL1)?.children.find(c => c.id === selL2)?.children.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('items.supplier')}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.supplierId ?? ''}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">{t('items.selectSupplier')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('items.baseUnit')}</Label>
                <Input value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('items.lossRate')}</Label>
                <Input type="number" step="0.01" value={form.lossRate || 0}
                  onChange={(e) => setForm({ ...form, lossRate: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('items.price')}</Label>
                <Input type="number" step="0.01" value={form.price ?? ''}
                  placeholder="₩"
                  onChange={(e) => setForm({ ...form, price: e.target.value ? parseFloat(e.target.value) : undefined })} />
              </div>
              <div className="space-y-2">
                <Label>{t('items.vat')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.vatInclusive ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, vatInclusive: e.target.value === 'true' })}
                >
                  <option value="true">{t('items.vatIncl')}</option>
                  <option value="false">{t('items.vatExcl')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('items.vatAmount')}</Label>
                <Input readOnly
                  value={form.price && form.vatInclusive ? `₩${Math.round(form.price * 0.1).toLocaleString()}` : '-'}
                  className="bg-gray-50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('catalog.deliveryDays', { defaultValue: '납품 가능일' })}</Label>
              <div className="flex flex-wrap gap-2">
                {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => (
                  <label key={day} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={deliverySchedule[day]}
                      onChange={(e) => setDeliverySchedule({ ...deliverySchedule, [day]: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{t(`days.${day}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Operational tab */}
          {editItem && (
            <div className={`space-y-4 ${activeTab !== 'operational' ? 'hidden' : ''}`}>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('operational.itemGrade')}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={opForm.itemGrade ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, itemGrade: (e.target.value || undefined) as ItemOperationalRequest['itemGrade'] })}
                  >
                    <option value="">-</option>
                    <option value="A">{t('operational.gradeA')}</option>
                    <option value="B">{t('operational.gradeB')}</option>
                    <option value="C">{t('operational.gradeC')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('operational.storageZone')}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={opForm.storageZone ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, storageZone: (e.target.value || undefined) as ItemOperationalRequest['storageZone'] })}
                  >
                    <option value="">-</option>
                    <option value="REFRIGERATED">{t('operational.refrigerated')}</option>
                    <option value="FROZEN">{t('operational.frozen')}</option>
                    <option value="AMBIENT">{t('operational.ambient')}</option>
                    <option value="SUPPLIES">{t('operational.supplies')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{t('operational.countCycle')}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={opForm.countCycle ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, countCycle: (e.target.value || undefined) as ItemOperationalRequest['countCycle'] })}
                  >
                    <option value="">-</option>
                    <option value="DAILY">{t('operational.daily')}</option>
                    <option value="TWICE_WEEKLY">{t('operational.twiceWeekly')}</option>
                    <option value="WEEKLY">{t('operational.weekly')}</option>
                    <option value="MONTHLY">{t('operational.monthly')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('operational.stockUnit')}</Label>
                  <Input
                    value={opForm.stockUnit ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, stockUnit: e.target.value })}
                    placeholder="e.g. g, ml, ea"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('operational.orderUnit')}</Label>
                  <Input
                    value={opForm.orderUnit ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, orderUnit: e.target.value })}
                    placeholder="e.g. box, bag"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('operational.conversionQty')}</Label>
                  <Input
                    type="number"
                    value={opForm.conversionQty ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, conversionQty: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('operational.minOrderQty')}</Label>
                  <Input
                    type="number"
                    value={opForm.minOrderQty ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, minOrderQty: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('operational.parLevel')}</Label>
                  <Input
                    type="number"
                    value={opForm.parLevel ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, parLevel: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('operational.lotTracking')}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={opForm.lotTracking ?? ''}
                    onChange={(e) => setOpForm({ ...opForm, lotTracking: (e.target.value || undefined) as ItemOperationalRequest['lotTracking'] })}
                  >
                    <option value="">-</option>
                    <option value="FULL">{t('operational.lotFull')}</option>
                    <option value="EXP_ONLY">{t('operational.lotExpOnly')}</option>
                    <option value="NONE">{t('operational.lotNone')}</option>
                  </select>
                </div>
                <div className="space-y-2 flex items-end">
                  <label className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      checked={opForm.isPosTracked ?? false}
                      onChange={(e) => setOpForm({ ...opForm, isPosTracked: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{t('operational.isPosTracked')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-[#0077cc] hover:bg-[#005ea3]">{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Result Dialog */}
      <Dialog open={uploadResultOpen} onOpenChange={setUploadResultOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>엑셀 업로드 결과</DialogTitle>
          </DialogHeader>
          {uploadResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{uploadResult.totalRows}</div>
                  <div className="text-sm text-gray-500">전체</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{uploadResult.successCount}</div>
                  <div className="text-sm text-gray-500">성공</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{uploadResult.errorCount}</div>
                  <div className="text-sm text-gray-500">실패</div>
                </div>
              </div>
              {uploadResult.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">오류 목록</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {uploadResult.errors.map((err, idx) => (
                      <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        행 {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setUploadResultOpen(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.name} - {t('items.imageUpload')}</DialogTitle>
          </DialogHeader>
          <ImageUpload
            currentImageUrl={selectedItem?.imageUrl ?? undefined}
            onUploadComplete={handleImageUpload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
