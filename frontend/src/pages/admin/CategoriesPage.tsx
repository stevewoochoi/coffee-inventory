import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { categoryApi, type ItemCategory, type CategoryRequest } from '@/api/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface CategoryForm {
  name: string;
  code: string;
  description: string;
  icon: string;
  displayOrder: number;
}

const emptyForm: CategoryForm = { name: '', code: '', description: '', icon: '', displayOrder: 0 };

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId ?? 1;

  const [l1List, setL1List] = useState<ItemCategory[]>([]);
  const [l2List, setL2List] = useState<ItemCategory[]>([]);
  const [l3List, setL3List] = useState<ItemCategory[]>([]);

  const [selectedL1, setSelectedL1] = useState<ItemCategory | null>(null);
  const [selectedL2, setSelectedL2] = useState<ItemCategory | null>(null);

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ItemCategory | null>(null);
  const [dialogLevel, setDialogLevel] = useState(1);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  // Mobile: breadcrumb navigation
  const [mobileLevel, setMobileLevel] = useState(1);

  useEffect(() => {
    if (brandId) loadL1();
  }, [brandId]);

  async function loadL1() {
    try {
      const res = await categoryApi.getCategories(brandId!, 1);
      setL1List(res.data.data);
    } catch {
      toast.error(t('categories.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function loadL2(parentId: number) {
    try {
      const res = await categoryApi.getCategories(brandId!, undefined, parentId);
      setL2List(res.data.data);
    } catch {
      toast.error(t('categories.loadFailed'));
    }
  }

  async function loadL3(parentId: number) {
    try {
      const res = await categoryApi.getCategories(brandId!, undefined, parentId);
      setL3List(res.data.data);
    } catch {
      toast.error(t('categories.loadFailed'));
    }
  }

  function selectL1(cat: ItemCategory) {
    setSelectedL1(cat);
    setSelectedL2(null);
    setL3List([]);
    loadL2(cat.id);
    setMobileLevel(2);
  }

  function selectL2(cat: ItemCategory) {
    setSelectedL2(cat);
    loadL3(cat.id);
    setMobileLevel(3);
  }

  function openCreateDialog(level: number) {
    setEditTarget(null);
    setDialogLevel(level);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(cat: ItemCategory, level: number) {
    setEditTarget(cat);
    setDialogLevel(level);
    setForm({
      name: cat.name,
      code: cat.code || '',
      description: cat.description || '',
      icon: cat.icon || '',
      displayOrder: cat.displayOrder,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!brandId || !form.name.trim()) return;

    let parentId: number | undefined;
    if (dialogLevel === 2) parentId = selectedL1?.id;
    if (dialogLevel === 3) parentId = selectedL2?.id;

    const data: CategoryRequest = {
      brandId,
      name: form.name,
      parentId: parentId ?? null,
      code: form.code || undefined,
      description: form.description || undefined,
      icon: form.icon || undefined,
      displayOrder: form.displayOrder,
    };

    try {
      if (editTarget) {
        await categoryApi.updateCategory(editTarget.id, data);
        toast.success(t('categories.updated'));
      } else {
        await categoryApi.createCategory(data);
        toast.success(t('categories.created'));
      }
      setDialogOpen(false);
      refreshLevel(dialogLevel);
    } catch {
      toast.error(t('categories.saveFailed'));
    }
  }

  async function handleDelete(cat: ItemCategory, level: number) {
    const children = level === 1 ? l2List : level === 2 ? l3List : [];
    const msg = children.length > 0 ? t('categories.deleteWithChildren') : t('categories.deleteConfirm');
    if (!confirm(msg)) return;

    try {
      await categoryApi.deleteCategory(cat.id);
      toast.success(t('categories.deleted'));

      if (level === 1) {
        setSelectedL1(null);
        setSelectedL2(null);
        setL2List([]);
        setL3List([]);
        loadL1();
      } else if (level === 2) {
        setSelectedL2(null);
        setL3List([]);
        loadL2(selectedL1!.id);
      } else {
        loadL3(selectedL2!.id);
      }
    } catch {
      toast.error(t('categories.deleteFailed'));
    }
  }

  function refreshLevel(level: number) {
    if (level === 1) loadL1();
    else if (level === 2 && selectedL1) loadL2(selectedL1.id);
    else if (level === 3 && selectedL2) loadL3(selectedL2.id);
  }

  const levelLabel = (level: number) =>
    level === 1 ? t('categories.level1') : level === 2 ? t('categories.level2') : t('categories.level3');

  if (loading) return <div className="p-6">{t('common.loading')}</div>;

  // --- Panel component ---
  function CategoryPanel({
    title, items, selectedId, onSelect, onAdd, onEdit, onDelete, level,
  }: {
    title: string;
    items: ItemCategory[];
    selectedId?: number | null;
    onSelect?: (cat: ItemCategory) => void;
    onAdd: () => void;
    onEdit: (cat: ItemCategory) => void;
    onDelete: (cat: ItemCategory) => void;
    level: number;
  }) {
    return (
      <div className="bg-white border rounded-lg shadow-sm flex flex-col h-full">
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Button size="sm" onClick={onAdd} className="bg-[#0077cc] hover:bg-[#005ea3] text-xs h-7 px-2">
            + {t('categories.addChild')}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              {level === 1 ? t('categories.noCategories') : t('categories.noSubcategories')}
            </div>
          ) : (
            items.map(cat => (
              <div
                key={cat.id}
                className={`flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedId === cat.id ? 'bg-slate-50 border-l-2 border-l-slate-600' : ''
                }`}
                onClick={() => onSelect?.(cat)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {cat.icon && <span className="text-sm">{cat.icon}</span>}
                  <span className="font-medium text-sm truncate">{cat.name}</span>
                  {cat.code && <Badge variant="secondary" className="text-xs shrink-0">{cat.code}</Badge>}
                </div>
                <div className="flex gap-1 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onEdit(cat)} className="text-[#69707d] hover:underline text-xs px-1">
                    {t('common.edit')}
                  </button>
                  <button onClick={() => onDelete(cat)} className="text-red-600 hover:underline text-xs px-1">
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('categories.title')}</h1>

      {/* Desktop: 3-column layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-4" style={{ minHeight: '500px' }}>
        <CategoryPanel
          title={levelLabel(1)}
          items={l1List}
          selectedId={selectedL1?.id}
          onSelect={selectL1}
          onAdd={() => openCreateDialog(1)}
          onEdit={cat => openEditDialog(cat, 1)}
          onDelete={cat => handleDelete(cat, 1)}
          level={1}
        />
        <CategoryPanel
          title={levelLabel(2)}
          items={l2List}
          selectedId={selectedL2?.id}
          onSelect={selectL2}
          onAdd={() => openCreateDialog(2)}
          onEdit={cat => openEditDialog(cat, 2)}
          onDelete={cat => handleDelete(cat, 2)}
          level={2}
        />
        <CategoryPanel
          title={levelLabel(3)}
          items={l3List}
          onAdd={() => openCreateDialog(3)}
          onEdit={cat => openEditDialog(cat, 3)}
          onDelete={cat => handleDelete(cat, 3)}
          level={3}
        />
      </div>

      {/* Mobile: Tab-based with breadcrumb */}
      <div className="md:hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm mb-3 text-gray-500">
          <button
            className={`${mobileLevel === 1 ? 'text-[#69707d] font-semibold' : 'hover:text-[#69707d]'}`}
            onClick={() => { setMobileLevel(1); }}
          >
            {levelLabel(1)}
          </button>
          {selectedL1 && (
            <>
              <span>/</span>
              <button
                className={`${mobileLevel === 2 ? 'text-[#69707d] font-semibold' : 'hover:text-[#69707d]'}`}
                onClick={() => { setMobileLevel(2); }}
              >
                {selectedL1.name}
              </button>
            </>
          )}
          {selectedL2 && (
            <>
              <span>/</span>
              <button
                className={`${mobileLevel === 3 ? 'text-[#69707d] font-semibold' : 'hover:text-[#69707d]'}`}
                onClick={() => { setMobileLevel(3); }}
              >
                {selectedL2.name}
              </button>
            </>
          )}
        </div>

        {mobileLevel === 1 && (
          <CategoryPanel
            title={levelLabel(1)}
            items={l1List}
            selectedId={selectedL1?.id}
            onSelect={selectL1}
            onAdd={() => openCreateDialog(1)}
            onEdit={cat => openEditDialog(cat, 1)}
            onDelete={cat => handleDelete(cat, 1)}
            level={1}
          />
        )}
        {mobileLevel === 2 && selectedL1 && (
          <CategoryPanel
            title={levelLabel(2)}
            items={l2List}
            selectedId={selectedL2?.id}
            onSelect={selectL2}
            onAdd={() => openCreateDialog(2)}
            onEdit={cat => openEditDialog(cat, 2)}
            onDelete={cat => handleDelete(cat, 2)}
            level={2}
          />
        )}
        {mobileLevel === 3 && selectedL2 && (
          <CategoryPanel
            title={levelLabel(3)}
            items={l3List}
            onAdd={() => openCreateDialog(3)}
            onEdit={cat => openEditDialog(cat, 3)}
            onDelete={cat => handleDelete(cat, 3)}
            level={3}
          />
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? t('categories.editTitle') : t('categories.addTitle')} ({levelLabel(dialogLevel)})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('categories.namePlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('categories.code')}</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. BEAN"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('categories.displayOrder')}</Label>
                <Input
                  type="number"
                  value={form.displayOrder}
                  onChange={e => setForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('categories.icon')}</Label>
              <Input
                value={form.icon}
                onChange={e => setForm(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="☕"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('categories.description')}</Label>
              <Input
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              />
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
