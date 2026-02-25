import { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierRequest>({
    brandId: 1, name: '', email: '', orderMethod: 'EMAIL',
  });

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await masterApi.getSuppliers();
      setSuppliers(res.data.data);
    } catch { /* handled */ }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const openCreate = () => {
    setEditSupplier(null);
    setForm({ brandId: 1, name: '', email: '', orderMethod: 'EMAIL' });
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
      setDialogOpen(false);
      loadSuppliers();
    } catch { /* handled */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 공급사를 삭제하시겠습니까?')) return;
    try {
      await masterApi.deleteSupplier(id);
      loadSuppliers();
    } catch { /* handled */ }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">공급사 관리</h2>
        <Button onClick={openCreate} className="bg-blue-800 hover:bg-blue-900">
          + 공급사 등록
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>발주 방법</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.email || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{s.orderMethod}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                    수정
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {suppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  등록된 공급사가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSupplier ? '공급사 수정' : '공급사 등록'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input type="email" value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>발주 방법</Label>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={handleSave} className="bg-blue-800 hover:bg-blue-900">저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
