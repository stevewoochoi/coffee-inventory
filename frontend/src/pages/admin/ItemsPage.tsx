import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { masterApi, type Item, type ItemRequest } from '@/api/master';
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
  const brandId = user?.brandId ?? 1;
  const { t } = useTranslation();
  const [form, setForm] = useState<ItemRequest>({ brandId, name: '', baseUnit: 'g' });

  const loadItems = useCallback(async () => {
    try {
      const res = await masterApi.getItems(undefined, page);
      setItems(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error(t('items.loadFailed')); }
  }, [page, t]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ brandId, name: '', baseUnit: 'g', category: '', lossRate: 0, price: undefined });
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setForm({
      brandId: item.brandId,
      name: item.name,
      baseUnit: item.baseUnit,
      category: item.category || '',
      lossRate: item.lossRate,
      price: item.price ?? undefined,
    });
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
      if (editItem) {
        await masterApi.updateItem(editItem.id, form);
      } else {
        await masterApi.createItem(form);
      }
      toast.success(editItem ? t('items.updated') : t('items.created'));
      setDialogOpen(false);
      loadItems();
    } catch { toast.error(t('items.saveFailed')); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('items.deactivateConfirm'))) return;
    try {
      await masterApi.deleteItem(id);
      loadItems();
    } catch { toast.error(t('items.deleteFailed')); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('items.title')}</h2>
        <Button onClick={openCreate} className="bg-blue-800 hover:bg-blue-900">
          {t('items.addItem')}
        </Button>
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
              <TableHead>{t('items.baseUnit')}</TableHead>
              <TableHead>{t('items.lossRate')}</TableHead>
              <TableHead>{t('items.price')}</TableHead>
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
                      className="w-10 h-10 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs hover:border-blue-400"
                      onClick={() => openImageDialog(item)}
                    >
                      +
                    </button>
                  )}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category || '-'}</TableCell>
                <TableCell>{item.baseUnit}</TableCell>
                <TableCell>{(item.lossRate * 100).toFixed(1)}%</TableCell>
                <TableCell>{item.price != null ? `₩${item.price.toLocaleString()}` : '-'}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                    {item.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                    {t('common.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
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
                  className="w-12 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs hover:border-blue-400 flex-shrink-0"
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
                  {item.category || '-'} · {item.baseUnit} · {(item.lossRate * 100).toFixed(1)}%
                  {item.price != null && ` · ₩${item.price.toLocaleString()}`}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => openEdit(item)}>
                {t('common.edit')}
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 min-h-[44px]" onClick={() => handleDelete(item.id)}>
                {t('common.delete')}
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('items.category')}</Label>
              <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('items.baseUnit')}</Label>
                <Input value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('items.lossRate')}</Label>
                <Input type="number" step="0.01" value={form.lossRate || 0}
                  onChange={(e) => setForm({ ...form, lossRate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{t('items.price')}</Label>
                <Input type="number" step="0.01" value={form.price ?? ''}
                  placeholder="₩"
                  onChange={(e) => setForm({ ...form, price: e.target.value ? parseFloat(e.target.value) : undefined })} />
              </div>
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
