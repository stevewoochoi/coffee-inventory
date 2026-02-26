import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { masterApi, type Supplier, type SupplierRequest } from '@/api/master';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const { user } = useAuthStore();
  const brandId = user?.brandId ?? 1;
  const { t } = useTranslation();
  const [form, setForm] = useState<SupplierRequest>({
    brandId, name: '', email: '', orderMethod: 'EMAIL',
  });

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await masterApi.getSuppliers();
      setSuppliers(res.data.data);
    } catch { toast.error(t('suppliers.loadFailed')); }
  }, [t]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const openCreate = () => {
    setEditSupplier(null);
    setForm({ brandId, name: '', email: '', orderMethod: 'EMAIL' });
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setForm({
      brandId: supplier.brandId,
      name: supplier.name,
      email: supplier.email || '',
      orderMethod: supplier.orderMethod,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editSupplier) {
        await masterApi.updateSupplier(editSupplier.id, form);
      } else {
        await masterApi.createSupplier(form);
      }
      toast.success(editSupplier ? t('suppliers.updated') : t('suppliers.created'));
      setDialogOpen(false);
      loadSuppliers();
    } catch { toast.error(t('suppliers.saveFailed')); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('suppliers.deleteConfirm'))) return;
    try {
      await masterApi.deleteSupplier(id);
      loadSuppliers();
    } catch { toast.error(t('suppliers.deleteFailed')); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('suppliers.title')}</h2>
        <Button onClick={openCreate} className="bg-blue-800 hover:bg-blue-900">
          {t('suppliers.addSupplier')}
        </Button>
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.id')}</TableHead>
              <TableHead>{t('common.name')}</TableHead>
              <TableHead>{t('suppliers.email')}</TableHead>
              <TableHead>{t('suppliers.orderMethod')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.email || '-'}</TableCell>
                <TableCell>{s.orderMethod}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                    {t('common.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  {t('suppliers.noSuppliers')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{s.name}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s.orderMethod}</span>
            </div>
            <div className="text-sm text-gray-500 mb-3">{s.email || '-'}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => openEdit(s)}>
                {t('common.edit')}
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 min-h-[44px]" onClick={() => handleDelete(s.id)}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="text-center text-gray-500 py-8 bg-white rounded-lg border">
            {t('suppliers.noSuppliers')}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSupplier ? t('suppliers.editTitle') : t('suppliers.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.email')}</Label>
              <Input type="email" value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('suppliers.orderMethod')}</Label>
              <select
                value={form.orderMethod}
                onChange={(e) => setForm({ ...form, orderMethod: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="EMAIL">EMAIL</option>
                <option value="PORTAL">PORTAL</option>
                <option value="EDI">EDI</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} className="bg-blue-800 hover:bg-blue-900">{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
