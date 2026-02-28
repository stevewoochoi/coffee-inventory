import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { masterApi, type Packaging, type PackagingRequest, type Item, type Supplier } from '@/api/master';
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

export default function PackagingsPage() {
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Packaging | null>(null);
  const [editPkg, setEditPkg] = useState<Packaging | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuthStore();
  const brandId = user?.brandId ?? 1;
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [boxPriceOverridden, setBoxPriceOverridden] = useState(false);
  const [form, setForm] = useState<PackagingRequest>({
    itemId: 0, packName: '', unitsPerPack: 0,
  });

  const loadPackagings = useCallback(async () => {
    try {
      const status = showAll ? undefined : 'ACTIVE';
      const res = await masterApi.getAllPackagings(brandId, status);
      setPackagings(res.data.data);
    } catch { toast.error(t('packagings.loadFailed')); }
  }, [brandId, showAll, t]);

  const loadItems = useCallback(async () => {
    try {
      const res = await masterApi.getItems(brandId, 0, 1000);
      setItems(res.data.data.content);
    } catch { /* items load failure is non-critical */ }
  }, [brandId]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await masterApi.getSuppliers(brandId);
      setSuppliers(res.data.data);
    } catch { /* non-critical */ }
  }, [brandId]);

  useEffect(() => { loadPackagings(); }, [loadPackagings]);
  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filtered = packagings.filter((pkg) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (pkg.itemName?.toLowerCase().includes(q)) ||
           (pkg.packName?.toLowerCase().includes(q));
  });

  const openCreate = () => {
    setEditPkg(null);
    setBoxPriceOverridden(false);
    setForm({ itemId: 0, packName: '', unitsPerPack: 0, packBarcode: '', boxPrice: undefined, supplierId: undefined });
    setDialogOpen(true);
  };

  const openEdit = (pkg: Packaging) => {
    setEditPkg(pkg);
    const existingBoxPrice = pkg.supplierItems?.[0]?.price ?? undefined;
    const existingSupplierId = pkg.supplierItems?.[0]?.supplierId ?? undefined;
    setBoxPriceOverridden(existingBoxPrice != null);
    setForm({
      itemId: pkg.itemId,
      packName: pkg.packName,
      unitsPerPack: pkg.unitsPerPack,
      packBarcode: pkg.packBarcode || '',
      boxPrice: existingBoxPrice,
      supplierId: existingSupplierId,
    });
    setDialogOpen(true);
  };

  const openImageDialog = (pkg: Packaging) => {
    setSelectedPkg(pkg);
    setImageDialogOpen(true);
  };

  const handleImageUpload = async (fileUrl: string) => {
    if (!selectedPkg) return;
    try {
      await masterApi.updatePackagingImage(selectedPkg.id, fileUrl);
      setImageDialogOpen(false);
      loadPackagings();
    } catch { toast.error(t('packagings.imageUpdateFailed')); }
  };

  const handleSave = async () => {
    if (!form.itemId) {
      toast.error(t('packagings.selectItem'));
      return;
    }
    try {
      if (editPkg) {
        await masterApi.updatePackaging(editPkg.id, form);
        toast.success(t('packagings.updated'));
      } else {
        await masterApi.createPackaging(form);
        toast.success(t('packagings.created'));
      }
      setDialogOpen(false);
      loadPackagings();
    } catch { toast.error(editPkg ? t('packagings.updateFailed') : t('packagings.createFailed')); }
  };

  const handleDeprecate = async (id: number) => {
    if (!confirm(t('packagings.deprecateConfirm'))) return;
    try {
      await masterApi.deprecatePackaging(id);
      loadPackagings();
    } catch { toast.error(t('packagings.deprecateFailed')); }
  };

  const formatPrice = (price: number | null) => {
    if (price == null) return '-';
    return `₩${price.toLocaleString()}`;
  };

  const getUnitPrice = (pkg: Packaging) => {
    const si = pkg.supplierItems?.[0];
    if (!si?.price || !pkg.unitsPerPack) return '-';
    return formatPrice(Math.round(si.price / pkg.unitsPerPack));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('packagings.title')}</h2>
        <Button onClick={openCreate} className="bg-blue-800 hover:bg-blue-900">
          {t('packagings.addPackaging')}
        </Button>
      </div>

      {/* 필터 영역 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder={t('packagings.searchPlaceholder')}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant={showAll ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? t('packagings.showAll') : t('packagings.showActive')}
        </Button>
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.image')}</TableHead>
              <TableHead>{t('packagings.itemName')}</TableHead>
              <TableHead>{t('packagings.category')}</TableHead>
              <TableHead>{t('packagings.packName')}</TableHead>
              <TableHead>{t('packagings.baseUnit')}</TableHead>
              <TableHead>{t('packagings.qtyPerPack')}</TableHead>
              <TableHead>{t('packagings.supplier')}</TableHead>
              <TableHead>{t('packagings.boxPrice')}</TableHead>
              <TableHead>{t('packagings.unitPrice')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>
                  {pkg.imageUrl ? (
                    <img
                      src={pkg.imageUrl}
                      alt={pkg.packName}
                      className="w-10 h-10 object-cover rounded cursor-pointer"
                      onClick={() => openImageDialog(pkg)}
                    />
                  ) : (
                    <button
                      className="w-10 h-10 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs hover:border-blue-400"
                      onClick={() => openImageDialog(pkg)}
                    >
                      +
                    </button>
                  )}
                </TableCell>
                <TableCell className="font-medium">{pkg.itemName || '-'}</TableCell>
                <TableCell>{pkg.categoryName || '-'}</TableCell>
                <TableCell>{pkg.packName}</TableCell>
                <TableCell>{pkg.baseUnit || '-'}</TableCell>
                <TableCell>{pkg.unitsPerPack}</TableCell>
                <TableCell>{pkg.supplierItems?.[0]?.supplierName || '-'}</TableCell>
                <TableCell>{formatPrice(pkg.supplierItems?.[0]?.price ?? null)}</TableCell>
                <TableCell>{getUnitPrice(pkg)}</TableCell>
                <TableCell>
                  <Badge variant={pkg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {pkg.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {pkg.status === 'ACTIVE' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(pkg)}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeprecate(pkg.id)}>
                        {t('packagings.deprecate')}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                  {t('packagings.noPackagings')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {filtered.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-start gap-3 mb-3">
              {pkg.imageUrl ? (
                <img
                  src={pkg.imageUrl}
                  alt={pkg.packName}
                  className="w-12 h-12 object-cover rounded cursor-pointer flex-shrink-0"
                  onClick={() => openImageDialog(pkg)}
                />
              ) : (
                <button
                  className="w-12 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs hover:border-blue-400 flex-shrink-0"
                  onClick={() => openImageDialog(pkg)}
                >
                  +
                </button>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{pkg.itemName || '-'}</span>
                  <Badge variant={pkg.status === 'ACTIVE' ? 'default' : 'secondary'} className="flex-shrink-0">
                    {pkg.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {pkg.packName} · {pkg.unitsPerPack}{pkg.baseUnit || ''}
                </div>
                <div className="text-sm text-gray-500">
                  {pkg.categoryName || '-'} · {pkg.supplierItems?.[0]?.supplierName || '-'}
                </div>
                {pkg.supplierItems?.[0]?.price != null && (
                  <div className="text-sm text-gray-700 mt-1">
                    {t('packagings.boxPrice')}: {formatPrice(pkg.supplierItems[0].price)} · {t('packagings.unitPrice')}: {getUnitPrice(pkg)}
                  </div>
                )}
              </div>
            </div>
            {pkg.status === 'ACTIVE' && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => openEdit(pkg)}>
                  {t('common.edit')}
                </Button>
                <Button variant="destructive" size="sm" className="flex-1 min-h-[44px]" onClick={() => handleDeprecate(pkg.id)}>
                  {t('packagings.deprecate')}
                </Button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8 bg-white rounded-lg border">
            {t('packagings.noPackagings')}
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPkg ? t('packagings.editTitle') : t('packagings.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('packagings.itemName')}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.itemId}
                onChange={(e) => {
                  const newItemId = Number(e.target.value);
                  const selectedItem = items.find(i => i.id === newItemId);
                  const autoPrice = (!boxPriceOverridden && selectedItem?.price && form.unitsPerPack)
                    ? Math.round(selectedItem.price * form.unitsPerPack)
                    : form.boxPrice;
                  setForm({ ...form, itemId: newItemId, boxPrice: autoPrice });
                }}
              >
                <option value={0}>{t('packagings.selectItem')}</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} ({item.baseUnit})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('packagings.packName')}</Label>
              <Input value={form.packName} onChange={(e) => setForm({ ...form, packName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('packagings.qtyPerPack')}</Label>
                <Input type="number" value={form.unitsPerPack}
                  onChange={(e) => {
                    const newQty = parseFloat(e.target.value) || 0;
                    const selectedItem = items.find(i => i.id === form.itemId);
                    const autoPrice = (!boxPriceOverridden && selectedItem?.price && newQty)
                      ? Math.round(selectedItem.price * newQty)
                      : form.boxPrice;
                    setForm({ ...form, unitsPerPack: newQty, boxPrice: autoPrice });
                  }} />
              </div>
              <div className="space-y-2">
                <Label>{t('packagings.barcode')}</Label>
                <Input value={form.packBarcode || ''}
                  onChange={(e) => setForm({ ...form, packBarcode: e.target.value })} />
              </div>
            </div>
            {/* Box Price Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('packagings.boxPrice')}</Label>
                  <Input type="number" step="1" value={form.boxPrice ?? ''}
                    placeholder="₩"
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : undefined;
                      setBoxPriceOverridden(val != null);
                      setForm({ ...form, boxPrice: val });
                    }} />
                  {!boxPriceOverridden && form.boxPrice != null && (
                    <p className="text-xs text-gray-400">{t('packagings.autoCalcHint')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('packagings.unitPriceCalc')}</Label>
                  <Input readOnly
                    value={form.boxPrice && form.unitsPerPack ? `₩${Math.round(form.boxPrice / form.unitsPerPack).toLocaleString()}` : '-'} />
                </div>
              </div>
              {!editPkg && (
                <div className="space-y-2">
                  <Label>{t('packagings.selectSupplier')}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.supplierId ?? ''}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">{t('packagings.selectSupplier')}</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-blue-800 hover:bg-blue-900">{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPkg?.packName} - {t('items.imageUpload')}</DialogTitle>
          </DialogHeader>
          <ImageUpload
            currentImageUrl={selectedPkg?.imageUrl ?? undefined}
            onUploadComplete={handleImageUpload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
