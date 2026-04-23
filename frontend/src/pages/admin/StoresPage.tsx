import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { storeApi, brandApi, type Store, type StoreRequest, type Brand } from '@/api/store';

export default function StoresPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userBrandId = user?.brandId;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(userBrandId ?? null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const [form, setForm] = useState<StoreRequest>({
    brandId: selectedBrandId ?? 0,
    name: '',
    address: '',
    phone: '',
    openDate: '',
    memo: '',
    status: 'ACTIVE',
  });

  // Load brands on mount
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await brandApi.getBrands();
        setBrands(res.data.data);
        // If no brand selected yet and brands exist, select the first one
        if (!selectedBrandId && res.data.data.length > 0) {
          setSelectedBrandId(res.data.data[0].id);
        }
      } catch {
        toast.error(t('stores.brandLoadFailed', { defaultValue: 'Failed to load brands' }));
      }
    }
    loadBrands();
  }, []);

  // Load stores when selected brand changes
  useEffect(() => {
    if (selectedBrandId) {
      loadStores();
    }
  }, [selectedBrandId]);

  async function loadStores() {
    setLoading(true);
    try {
      const res = await storeApi.getStores(selectedBrandId ?? undefined);
      setStores(res.data.data);
    } catch {
      toast.error(t('stores.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingStore(null);
    setForm({
      brandId: selectedBrandId ?? 0,
      name: '',
      address: '',
      phone: '',
      openDate: '',
      memo: '',
      status: 'ACTIVE',
    });
    setDialogOpen(true);
  }

  function openEdit(store: Store) {
    setEditingStore(store);
    setForm({
      brandId: store.brandId,
      name: store.name,
      address: store.address ?? '',
      phone: store.phone ?? '',
      openDate: store.openDate ?? '',
      memo: store.memo ?? '',
      status: store.status ?? 'ACTIVE',
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.brandId) {
      toast.error(t('stores.brandRequired', { defaultValue: 'Please select a brand' }));
      return;
    }
    try {
      if (editingStore) {
        await storeApi.updateStore(editingStore.id, form);
        toast.success(t('stores.updated'));
      } else {
        await storeApi.createStore(form);
        toast.success(t('stores.created'));
      }
      setDialogOpen(false);
      loadStores();
    } catch {
      toast.error(t('stores.saveFailed'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await storeApi.deleteStore(deleteTarget.id);
      toast.success(t('stores.deleted'));
      setDeleteTarget(null);
      loadStores();
    } catch {
      toast.error(t('stores.deleteFailed'));
    }
  }

  // Get brand name by ID
  function getBrandName(brandId: number): string {
    return brands.find(b => b.id === brandId)?.name ?? `Brand #${brandId}`;
  }

  const filtered = stores.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q)
      || (s.address ?? '').toLowerCase().includes(q)
      || (s.phone ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('stores.title')}</h2>
        <Button onClick={openCreate} disabled={!selectedBrandId}>{t('stores.addStore')}</Button>
      </div>

      {/* Brand selector */}
      <div className="bg-white rounded-xl border border-[#e8eaf0] p-4">
        <Label className="text-xs font-bold text-[#69707d] uppercase tracking-wide mb-2 block">
          {t('stores.brand', { defaultValue: 'Brand' })}
        </Label>
        {isSuperAdmin ? (
          <div className="flex flex-wrap gap-2">
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => setSelectedBrandId(brand.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                  selectedBrandId === brand.id
                    ? 'bg-[#0077cc] text-white'
                    : 'bg-[#f7f8fc] text-[#343741] border border-[#e8eaf0] hover:bg-[#eef1f7]'
                }`}
              >
                {brand.name}
              </button>
            ))}
            {brands.length === 0 && (
              <p className="text-sm text-[#69707d]">{t('stores.noBrands', { defaultValue: 'No brands found' })}</p>
            )}
          </div>
        ) : (
          <p className="text-sm font-medium text-[#343741]">
            {selectedBrandId ? getBrandName(selectedBrandId) : '-'}
          </p>
        )}
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('stores.searchPlaceholder')}
        className="max-w-md"
      />

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-[#e8eaf0] p-4 animate-pulse">
              <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-1/2 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : !selectedBrandId ? (
        <p className="text-center py-8 text-[#69707d]">
          {t('stores.selectBrand', { defaultValue: 'Please select a brand first' })}
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-gray-400">{t('stores.noStores')}</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-[#e8eaf0]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e8eaf0] text-left">
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('common.id')}</th>
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('stores.name')}</th>
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('stores.brand', { defaultValue: 'Brand' })}</th>
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('stores.address')}</th>
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('stores.phone')}</th>
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('stores.openDate')}</th>
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('stores.status')}</th>
                <th className="py-3 px-4 text-xs font-bold text-[#69707d] uppercase tracking-wide">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(store => (
                <tr key={store.id} className="border-b border-[#e8eaf0] hover:bg-[rgba(0,119,204,0.02)] transition-colors">
                  <td className="py-3.5 px-4">{store.id}</td>
                  <td className="py-3.5 px-4 font-medium text-[#1a1c21]">{store.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-1 rounded-md bg-[#edf4fa] text-[#0077cc] text-xs font-bold">
                      {getBrandName(store.brandId)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#69707d] max-w-[200px] truncate">{store.address ?? '-'}</td>
                  <td className="py-3.5 px-4">{store.phone ?? '-'}</td>
                  <td className="py-3.5 px-4">{store.openDate ?? '-'}</td>
                  <td className="py-3.5 px-4">
                    <Badge className={store.status === 'ACTIVE' ? 'bg-[#e7f6ec] text-[#18794e]' : 'bg-gray-100 text-gray-600'}>
                      {store.status === 'ACTIVE' ? t('stores.statusActive') : t('stores.statusInactive')}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(store)}>{t('common.edit')}</Button>
                      {store.status === 'ACTIVE' && (
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(store)}>{t('common.delete')}</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStore ? t('stores.editTitle') : t('stores.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Brand selector in dialog */}
            <div>
              <Label>{t('stores.brand', { defaultValue: 'Brand' })} <span className="text-red-500">*</span></Label>
              {isSuperAdmin ? (
                <select
                  className="w-full h-10 rounded-md border border-[rgba(17,43,134,0.1)] px-3 text-sm bg-white focus:outline-none focus:border-[#0077cc] focus:ring-[3px] focus:ring-[rgba(0,119,204,0.08)]"
                  value={form.brandId}
                  onChange={(e) => setForm({ ...form, brandId: Number(e.target.value) })}
                >
                  <option value={0}>{t('stores.selectBrandOption', { defaultValue: '-- Select brand --' })}</option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <div className="h-10 flex items-center px-3 rounded-md bg-[#f7f8fc] border border-[#e8eaf0] text-sm font-medium text-[#343741]">
                  {getBrandName(form.brandId)}
                </div>
              )}
            </div>
            <div>
              <Label>{t('stores.name')} <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('stores.address')}</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('stores.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>{t('stores.openDate')}</Label>
                <Input type="date" value={form.openDate} onChange={(e) => setForm({ ...form, openDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{t('stores.memo')}</Label>
              <Input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
            </div>
            {editingStore && (
              <div>
                <Label>{t('stores.status')}</Label>
                <select
                  className="w-full h-10 rounded-md border border-[rgba(17,43,134,0.1)] px-3 text-sm bg-white focus:outline-none focus:border-[#0077cc] focus:ring-[3px] focus:ring-[rgba(0,119,204,0.08)]"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">{t('stores.statusActive')}</option>
                  <option value="INACTIVE">{t('stores.statusInactive')}</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.brandId}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('stores.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
