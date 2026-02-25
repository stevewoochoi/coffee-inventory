import { useState } from 'react';
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
  const [form, setForm] = useState<PackagingRequest>({
    itemId: 0, packName: '', unitsPerPack: 0,
  });

  const loadPackagings = async () => {
    if (!itemId) return;
    try {
      const res = await masterApi.getPackagings(Number(itemId));
      setPackagings(res.data.data);
      setLoaded(true);
    } catch { /* handled */ }
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
    } catch { /* error handled */ }
  };

  const handleSave = async () => {
    try {
      await masterApi.createPackaging(form);
      setDialogOpen(false);
      loadPackagings();
    } catch { /* handled */ }
  };

  const handleDeprecate = async (id: number) => {
    if (!confirm('이 포장단위를 DEPRECATED 처리하시겠습니까?')) return;
    try {
      await masterApi.deprecatePackaging(id);
      loadPackagings();
    } catch { /* handled */ }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">포장단위 관리</h2>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="부재료 ID를 입력하세요"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={loadPackagings} className="bg-blue-800 hover:bg-blue-900">
          조회
        </Button>
        {loaded && (
          <Button onClick={openCreate} variant="outline">
            + 포장단위 등록
          </Button>
        )}
      </div>

      {loaded && (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>이미지</TableHead>
                <TableHead>포장명</TableHead>
                <TableHead>포장당 수량</TableHead>
                <TableHead>바코드</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
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
                      Deprecate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {packagings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    등록된 포장단위가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>포장단위 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>포장명</Label>
              <Input value={form.packName} onChange={(e) => setForm({ ...form, packName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>포장당 수량</Label>
              <Input type="number" value={form.unitsPerPack}
                onChange={(e) => setForm({ ...form, unitsPerPack: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>바코드</Label>
              <Input value={form.packBarcode || ''}
                onChange={(e) => setForm({ ...form, packBarcode: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} className="bg-blue-800 hover:bg-blue-900">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPkg?.packName} - 이미지 업로드</DialogTitle>
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
