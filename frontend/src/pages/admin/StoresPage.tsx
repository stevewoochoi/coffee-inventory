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
import { storeApi, type Store, type StoreRequest } from '@/api/store';

export default function StoresPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId;

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);

  const [form, setForm] = useState<StoreRequest>({
    brandId: brandId ?? 1,
    name: '',
    address: '',
    phone: '',
    openDate: '',
    memo: '',
    status: 'ACTIVE',
  });

  useEffect(() => { loadStores(); }, []);

  async function loadStores() {
    setLoading(true);
    try {
      const res = await storeApi.getStores(brandId ?? undefined);
      setStores(res.data.data);
    } catch {
      toast.error(t('stores.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingStore(null);
    setForm({ brandId: brandId ?? 1, name: '', address: '', phone: '', openDate: '', memo: '', status: 'ACTIVE' });
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
        <Button onClick={openCreate}>{t('stores.addStore')}</Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('stores.searchPlaceholder')}
        className="max-w-md"
      />

      {loading ? (
        <p className="text-center py-8 text-gray-500">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-gray-400">{t('stores.noStores')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 px-2">{t('common.id')}</th>
                <th className="py-3 px-2">{t('stores.name')}</th>
                <th className="py-3 px-2">{t('stores.address')}</th>
                <th className="py-3 px-2">{t('stores.phone')}</th>
                <th className="py-3 px-2">{t('stores.openDate')}</th>
                <th className="py-3 px-2">{t('stores.status')}</th>
                <th className="py-3 px-2">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(store => (
                <tr key={store.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2">{store.id}</td>
                  <td className="py-3 px-2 font-medium">{store.name}</td>
                  <td className="py-3 px-2 text-gray-600 max-w-[200px] truncate">{store.address ?? '-'}</td>
                  <td className="py-3 px-2">{store.phone ?? '-'}</td>
                  <td className="py-3 px-2">{store.openDate ?? '-'}</td>
                  <td className="py-3 px-2">
                    <Badge className={store.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {store.status === 'ACTIVE' ? t('stores.statusActive') : t('stores.statusInactive')}
                    </Badge>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(store)}>{t('common.edit')}</Button>
                      {store.status === 'ACTIVE' && (
                        <Button size="sm" variant="outline" className="text-red-600"
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
            <div>
              <Label>{t('stores.name')}</Label>
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
                  className="w-full border rounded px-3 py-2 text-sm"
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
            <Button onClick={handleSave} disabled={!form.name.trim()}>{t('common.save')}</Button>
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
