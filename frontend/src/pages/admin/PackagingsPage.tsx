import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { masterApi, type Packaging, type PackagingRequest } from '@/api/master';
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
  const [itemId, setItemId] = useState('');
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<Packaging | null>(null);
  const { t } = useTranslation();
  const [form, setForm] = useState<PackagingRequest>({
    itemId: 0, packName: '', unitsPerPack: 0,
  });

  const loadPackagings = async () => {
    if (!itemId) return;
    try {
      const res = await masterApi.getPackagings(Number(itemId));
      setPackagings(res.data.data);
      setLoaded(true);
    } catch { toast.error(t('packagings.loadFailed')); }
  };

  const openCreate = () => {
    setForm({ itemId: Number(itemId), packName: '', unitsPerPack: 0, packBarcode: '' });
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
    try {
      await masterApi.createPackaging(form);
      toast.success(t('packagings.created'));
      setDialogOpen(false);
      loadPackagings();
    } catch { toast.error(t('packagings.createFailed')); }
  };

  const handleDeprecate = async (id: number) => {
    if (!confirm(t('packagings.deprecateConfirm'))) return;
    try {
      await masterApi.deprecatePackaging(id);
      loadPackagings();
    } catch { toast.error(t('packagings.deprecateFailed')); }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('packagings.title')}</h2>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder={t('packagings.itemIdPlaceholder')}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={loadPackagings} className="bg-blue-800 hover:bg-blue-900">
          {t('packagings.search')}
        </Button>
        {loaded && (
          <Button onClick={openCreate} variant="outline">
            {t('packagings.addPackaging')}
          </Button>
        )}
      </div>

      {loaded && (
        <>
          {/* Desktop: Table view */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.id')}</TableHead>
                  <TableHead>{t('common.image')}</TableHead>
                  <TableHead>{t('packagings.packName')}</TableHead>
                  <TableHead>{t('packagings.qtyPerPack')}</TableHead>
                  <TableHead>{t('packagings.barcode')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packagings.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>{pkg.id}</TableCell>
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
                    <TableCell className="font-medium">{pkg.packName}</TableCell>
                    <TableCell>{pkg.unitsPerPack}</TableCell>
                    <TableCell>{pkg.packBarcode || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={pkg.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {pkg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleDeprecate(pkg.id)}>
                        {t('packagings.deprecate')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {packagings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      {t('packagings.noPackagings')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Card view */}
          <div className="md:hidden space-y-3">
            {packagings.map((pkg) => (
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
                      <span className="font-semibold truncate">{pkg.packName}</span>
                      <Badge variant={pkg.status === 'ACTIVE' ? 'default' : 'secondary'} className="flex-shrink-0">
                        {pkg.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {t('packagings.qtyPerPack')}: {pkg.unitsPerPack} · {pkg.packBarcode || '-'}
                    </div>
                  </div>
                </div>
                <Button variant="destructive" size="sm" className="w-full min-h-[44px]" onClick={() => handleDeprecate(pkg.id)}>
                  {t('packagings.deprecate')}
                </Button>
              </div>
            ))}
            {packagings.length === 0 && (
              <div className="text-center text-gray-500 py-8 bg-white rounded-lg border">
                {t('packagings.noPackagings')}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('packagings.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('packagings.packName')}</Label>
              <Input value={form.packName} onChange={(e) => setForm({ ...form, packName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('packagings.qtyPerPack')}</Label>
              <Input type="number" value={form.unitsPerPack}
                onChange={(e) => setForm({ ...form, unitsPerPack: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>{t('packagings.barcode')}</Label>
              <Input value={form.packBarcode || ''}
                onChange={(e) => setForm({ ...form, packBarcode: e.target.value })} />
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
