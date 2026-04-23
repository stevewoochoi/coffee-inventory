import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { masterApi, type BrandItem, type Supplier } from '@/api/master';
import { getLocalizedName } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function BrandItemsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId;
  const [brandItems, setBrandItems] = useState<BrandItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [editingItem, setEditingItem] = useState<BrandItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [vatInclusive, setVatInclusive] = useState(true);
  const [minStockQty, setMinStockQty] = useState('');
  const [supplierId, setSupplierId] = useState<number | undefined>();

  const loadBrandItems = useCallback(async () => {
    try {
      const res = await masterApi.getBrandItems(brandId);
      setBrandItems(res.data.data);
    } catch { toast.error('Failed to load brand items'); }
  }, [brandId]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await masterApi.getSuppliers(brandId);
      setSuppliers(res.data.data);
    } catch { /* non-critical */ }
  }, [brandId]);

  useEffect(() => { loadBrandItems(); loadSuppliers(); }, [loadBrandItems, loadSuppliers]);

  const openEdit = (bi: BrandItem) => {
    setEditingItem(bi);
    setPrice(bi.price?.toString() || '');
    setVatInclusive(bi.vatInclusive ?? true);
    setMinStockQty(bi.minStockQty?.toString() || '');
    setSupplierId(bi.supplierId ?? undefined);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    try {
      await masterApi.updateBrandItem(editingItem.id, {
        price: price ? Number(price) : undefined,
        vatInclusive,
        minStockQty: minStockQty ? Number(minStockQty) : undefined,
        supplierId,
      });
      toast.success(t('items.updated'));
      setDialogOpen(false);
      loadBrandItems();
    } catch { toast.error(t('items.saveFailed')); }
  };

  const filtered = brandItems.filter(bi => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    const displayName = getLocalizedName(bi.itemName, bi.itemNameEn, bi.itemNameJa, bi.itemNameKo);
    return displayName.toLowerCase().includes(kw) || (bi.itemName || '').toLowerCase().includes(kw);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('items.title')}</h2>
      </div>

      <div className="mb-4">
        <Input
          placeholder={t('common.search') + '...'}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.image')}</TableHead>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('items.category')}</TableHead>
              <TableHead>{t('items.baseUnit')}</TableHead>
              <TableHead>{t('items.price')}</TableHead>
              <TableHead>{t('items.vat')}</TableHead>
              <TableHead>{t('items.supplier')}</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>{t('common.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(bi => (
              <TableRow key={bi.id}>
                <TableCell>
                  {bi.imageUrl ? (
                    <img src={bi.imageUrl} alt={bi.itemName || ''} className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                      -
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{getLocalizedName(bi.itemName, bi.itemNameEn, bi.itemNameJa, bi.itemNameKo)}</TableCell>
                <TableCell>{bi.categoryName || '-'}</TableCell>
                <TableCell>{bi.baseUnit}</TableCell>
                <TableCell>
                  {bi.price != null ? `¥${bi.price.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell>
                  {bi.price != null && bi.vatInclusive ? (
                    <span className="text-xs text-orange-600">{t('items.vatIncl')}</span>
                  ) : bi.price != null ? (
                    <span className="text-xs text-gray-400">{t('items.vatExcl')}</span>
                  ) : '-'}
                </TableCell>
                <TableCell>{bi.supplierName || '-'}</TableCell>
                <TableCell>{bi.minStockQty ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={bi.isOrderable ? 'default' : 'secondary'}>
                    {bi.isOrderable ? 'Orderable' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openEdit(bi)}>
                    {t('common.edit')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                  {t('items.noItems')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(bi => (
          <div key={bi.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-start gap-3 mb-3">
              {bi.imageUrl ? (
                <img src={bi.imageUrl} alt={bi.itemName || ''}
                  className="w-12 h-12 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                  -
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{getLocalizedName(bi.itemName, bi.itemNameEn, bi.itemNameJa, bi.itemNameKo)}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {bi.categoryName || '-'} · {bi.baseUnit}
                  {bi.price != null && ` · ¥${bi.price.toLocaleString()}`}
                  {bi.supplierName && ` · ${bi.supplierName}`}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full min-h-[44px]" onClick={() => openEdit(bi)}>
              {t('common.edit')}
            </Button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8 bg-white rounded-lg border">
            {t('items.noItems')}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? getLocalizedName(editingItem.itemName, editingItem.itemNameEn, editingItem.itemNameJa, editingItem.itemNameKo) : ''} - {t('items.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('items.price')} (¥)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('items.vat')}</Label>
                <select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  value={vatInclusive ? 'true' : 'false'}
                  onChange={(e) => setVatInclusive(e.target.value === 'true')}>
                  <option value="true">{t('items.vatIncl')}</option>
                  <option value="false">{t('items.vatExcl')}</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Min Stock Qty</Label>
              <Input type="number" value={minStockQty} onChange={(e) => setMinStockQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('items.supplier')}</Label>
              <select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                value={supplierId ?? ''}
                onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">{t('items.selectSupplier')}</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-[#0077cc] hover:bg-[#005ea3]">{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
