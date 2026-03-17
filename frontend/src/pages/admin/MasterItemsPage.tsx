import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { masterApi, type Item, type ItemRequest, type BrandItem, type BrandItemAssignRequest } from '@/api/master';
import { brandApi, type Brand } from '@/api/store';
// categoryApi removed - not needed for master items page
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import ImageUpload from '@/components/ImageUpload';
import { getLocalizedName } from '@/lib/utils';

export default function MasterItemsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandItemsMap, setBrandItemsMap] = useState<Record<number, BrandItem[]>>({});
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemRequest>({ name: '', baseUnit: 'g' });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const res = await masterApi.getItems(undefined, 0, 200);
      setItems(res.data.data.content);
    } catch { toast.error('Failed to load items'); }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const res = await brandApi.getBrands();
      setBrands(res.data.data);
      // Load brand items for each brand
      const map: Record<number, BrandItem[]> = {};
      for (const brand of res.data.data) {
        try {
          const biRes = await masterApi.getBrandItems(brand.id);
          map[brand.id] = biRes.data.data;
        } catch { map[brand.id] = []; }
      }
      setBrandItemsMap(map);
      if (res.data.data.length > 0 && !selectedBrandId) {
        setSelectedBrandId(res.data.data[0].id);
      }
    } catch { toast.error('Failed to load brands'); }
  }, [selectedBrandId]);

  useEffect(() => { loadItems(); loadBrands(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', baseUnit: 'g', category: '', lossRate: 0, nameEn: '', nameJa: '', nameKo: '' });
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setForm({
      name: item.name,
      nameEn: item.nameEn ?? '',
      nameJa: item.nameJa ?? '',
      nameKo: item.nameKo ?? '',
      baseUnit: item.baseUnit,
      category: item.category || '',
      lossRate: item.lossRate,
      itemCode: item.itemCode ?? undefined,
      spec: item.spec ?? undefined,
      description: item.description ?? undefined,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await masterApi.updateItem(editItem.id, form);
        toast.success(t('items.updated'));
      } else {
        await masterApi.createItem(form);
        toast.success(t('items.created'));
      }
      setDialogOpen(false);
      loadItems();
    } catch { toast.error(t('items.saveFailed')); }
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, itemId: number) => {
    setDraggedItemId(itemId);
    e.dataTransfer.setData('text/plain', String(itemId));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent, brandId: number) => {
    e.preventDefault();
    const itemId = Number(e.dataTransfer.getData('text/plain'));
    setDraggedItemId(null);

    // Check if already assigned
    const existing = brandItemsMap[brandId]?.find(bi => bi.itemId === itemId);
    if (existing) {
      toast.info('This item is already assigned to this brand');
      return;
    }

    try {
      const req: BrandItemAssignRequest = { brandId, itemId };
      await masterApi.assignBrandItem(req);
      toast.success('Item assigned to brand');
      // Reload brand items
      const biRes = await masterApi.getBrandItems(brandId);
      setBrandItemsMap(prev => ({ ...prev, [brandId]: biRes.data.data }));
    } catch { toast.error('Failed to assign item'); }
  };

  const handleUnassign = async (brandItemId: number, brandId: number) => {
    if (!confirm('Remove this item from brand?')) return;
    try {
      await masterApi.unassignBrandItem(brandItemId);
      const biRes = await masterApi.getBrandItems(brandId);
      setBrandItemsMap(prev => ({ ...prev, [brandId]: biRes.data.data }));
      toast.success('Item removed from brand');
    } catch { toast.error('Failed to remove item'); }
  };

  const filteredItems = items.filter(item => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return item.name.toLowerCase().includes(kw)
      || (item.nameEn && item.nameEn.toLowerCase().includes(kw))
      || (item.nameJa && item.nameJa.toLowerCase().includes(kw))
      || (item.nameKo && item.nameKo.toLowerCase().includes(kw));
  });

  const currentBrandItems = selectedBrandId ? (brandItemsMap[selectedBrandId] || []) : [];
  const assignedItemIds = new Set(currentBrandItems.map(bi => bi.itemId));

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Master Items</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Master Items */}
        <div className="bg-white rounded-lg border flex flex-col">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">All Master Items</h3>
              <Button size="sm" onClick={openCreate} className="bg-slate-700 hover:bg-slate-800">
                + {t('items.addItem')}
              </Button>
            </div>
            <Input
              placeholder={t('common.search') + '...'}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-2">Drag items to the brand panel on the right</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredItems.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing hover:bg-slate-50 transition-colors ${
                  assignedItemIds.has(item.id) ? 'bg-green-50 border-green-200' : 'bg-white'
                } ${draggedItemId === item.id ? 'opacity-50' : ''}`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name}
                    className="w-10 h-10 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                    IMG
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{getLocalizedName(item.name, item.nameEn, item.nameJa, item.nameKo)}</div>
                  <div className="text-xs text-gray-500">
                    {item.baseUnit} {item.category && `· ${item.category}`}
                    {item.itemCode && ` · ${item.itemCode}`}
                  </div>
                </div>
                <div className="flex-shrink-0 flex gap-1">
                  {assignedItemIds.has(item.id) && (
                    <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Assigned</Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                    <span className="text-xs">&#9998;</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                    onClick={() => { setSelectedItem(item); setImageDialogOpen(true); }}>
                    <span className="text-xs">&#128247;</span>
                  </Button>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="text-center text-gray-400 py-8">{t('items.noItems')}</div>
            )}
          </div>
        </div>

        {/* Right: Brand assignment panel */}
        <div className="bg-white rounded-lg border flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-700 mb-3">Brand Items</h3>
            <div className="flex gap-2 flex-wrap">
              {brands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrandId(brand.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedBrandId === brand.id
                      ? 'bg-slate-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          {selectedBrandId && (
            <div
              className="flex-1 overflow-y-auto p-2 space-y-1"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, selectedBrandId)}
            >
              {currentBrandItems.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12 border-2 border-dashed rounded-lg">
                  <div className="text-4xl mb-2">&#x2B07;</div>
                  <p className="text-sm">Drag items here to assign</p>
                </div>
              )}
              {currentBrandItems.map(bi => (
                <BrandItemRow
                  key={bi.id}
                  brandItem={bi}
                  onUnassign={() => handleUnassign(bi.id, selectedBrandId)}
                  onUpdate={async () => {
                    const biRes = await masterApi.getBrandItems(selectedBrandId);
                    setBrandItemsMap(prev => ({ ...prev, [selectedBrandId]: biRes.data.data }));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Master Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? t('items.editTitle') : t('items.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">EN English Name</Label>
                <Input value={form.nameEn || ''} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="English" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">JA 日本語名</Label>
                <Input value={form.nameJa || ''} onChange={(e) => setForm({ ...form, nameJa: e.target.value })} placeholder="日本語" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">KO 한국어명</Label>
                <Input value={form.nameKo || ''} onChange={(e) => setForm({ ...form, nameKo: e.target.value })} placeholder="한국어" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('items.baseUnit')}</Label>
                <Input value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('items.category')}</Label>
                <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Code</Label>
                <Input value={form.itemCode || ''} onChange={(e) => setForm({ ...form, itemCode: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Spec</Label>
                <Input value={form.spec || ''} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('items.lossRate')}</Label>
              <Input type="number" step="0.01" value={form.lossRate || 0}
                onChange={(e) => setForm({ ...form, lossRate: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-slate-700 hover:bg-slate-800">{t('common.save')}</Button>
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
            onUploadComplete={async (url: string) => {
              if (!selectedItem) return;
              try {
                await masterApi.updateItemImage(selectedItem.id, url);
                setImageDialogOpen(false);
                loadItems();
              } catch { toast.error('Failed to update image'); }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Brand item row with inline price editing
function BrandItemRow({ brandItem, onUnassign, onUpdate }: {
  brandItem: BrandItem;
  onUnassign: () => void;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState<string>(brandItem.price?.toString() || '');
  const [minStock, setMinStock] = useState<string>(brandItem.minStockQty?.toString() || '');
  const [vatInclusive, setVatInclusive] = useState(brandItem.vatInclusive ?? true);

  const handleSave = async () => {
    try {
      await masterApi.updateBrandItem(brandItem.id, {
        price: price ? Number(price) : undefined,
        minStockQty: minStock ? Number(minStock) : undefined,
        vatInclusive,
      });
      setEditing(false);
      onUpdate();
      toast.success('Updated');
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-3 rounded-lg border bg-white hover:bg-gray-50">
      <div className="flex items-center gap-3">
        {brandItem.imageUrl ? (
          <img src={brandItem.imageUrl} alt={brandItem.itemName || ''}
            className="w-10 h-10 rounded object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
            IMG
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{getLocalizedName(brandItem.itemName, brandItem.itemNameEn, brandItem.itemNameJa, brandItem.itemNameKo)}</div>
          <div className="text-xs text-gray-500">
            {brandItem.baseUnit}
            {brandItem.categoryName && ` · ${brandItem.categoryName}`}
            {brandItem.supplierName && ` · ${brandItem.supplierName}`}
          </div>
          {!editing && (
            <div className="text-xs mt-1">
              {brandItem.price != null ? (
                <span className="text-slate-600 font-medium">
                  ¥{brandItem.price.toLocaleString()}
                  {brandItem.vatInclusive ? ' (tax incl.)' : ' (tax excl.)'}
                </span>
              ) : (
                <span className="text-gray-400">No price set</span>
              )}
              {brandItem.minStockQty != null && (
                <span className="ml-2 text-orange-600">Min: {brandItem.minStockQty}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex gap-1">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(true)}>
                Price
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                onClick={onUnassign}>
                &#x2715;
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs bg-slate-700" onClick={handleSave}>
                Save
              </Button>
            </>
          )}
        </div>
      </div>
      {editing && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500">Price (¥)</label>
            <Input className="h-8 text-sm" type="number" value={price}
              onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Min Stock</label>
            <Input className="h-8 text-sm" type="number" value={minStock}
              onChange={(e) => setMinStock(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">VAT</label>
            <select className="flex h-8 w-full rounded-md border px-2 text-sm"
              value={vatInclusive ? 'true' : 'false'}
              onChange={(e) => setVatInclusive(e.target.value === 'true')}>
              <option value="true">Incl.</option>
              <option value="false">Excl.</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
