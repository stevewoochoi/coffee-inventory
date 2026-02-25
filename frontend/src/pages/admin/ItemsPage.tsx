import { useState, useEffect, useCallback } from 'react';
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
  const [form, setForm] = useState<ItemRequest>({ brandId: 1, name: '', baseUnit: 'g' });

  const loadItems = useCallback(async () => {
    try {
      const res = await masterApi.getItems(undefined, page);
      setItems(res.data.data.content);
      setTotalPages(res.data.data.totalPages);
    } catch { /* handled by interceptor */ }
  }, [page]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ brandId: 1, name: '', baseUnit: 'g', category: '', lossRate: 0 });
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
    } catch { /* error handled */ }
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await masterApi.updateItem(editItem.id, form);
      } else {
        await masterApi.createItem(form);
      }
      setDialogOpen(false);
      loadItems();
    } catch { /* error handled */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 부재료를 비활성화하시겠습니까?')) return;
    try {
      await masterApi.deleteItem(id);
      loadItems();
    } catch { /* error handled */ }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">부재료 관리</h2>
        <Button onClick={openCreate} className="bg-blue-800 hover:bg-blue-900">
          + 부재료 등록
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>이미지</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead>기본 단위</TableHead>
              <TableHead>로스율</TableHead>
              <TableHead>상태</TableHead>
              <TableHead className="text-right">관리</TableHead>
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
                <TableCell>
                  <Badge variant={item.isActive ? 'default' : 'secondary'}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    수정
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                    삭제
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  등록된 부재료가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            이전
          </Button>
          <span className="py-1 px-3 text-sm text-gray-600">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            다음
          </Button>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? '부재료 수정' : '부재료 등록'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>기본 단위</Label>
                <Input value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>로스율</Label>
                <Input type="number" step="0.01" value={form.lossRate || 0}
                  onChange={(e) => setForm({ ...form, lossRate: parseFloat(e.target.value) || 0 })} />
              </div>
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
            <DialogTitle>{selectedItem?.name} - 이미지 업로드</DialogTitle>
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
