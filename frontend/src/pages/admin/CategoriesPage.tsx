import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { categoryApi, type ItemCategory } from '@/api/category';

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId;

  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', displayOrder: 0 });

  useEffect(() => {
    if (brandId) loadCategories();
  }, [brandId]);

  async function loadCategories() {
    try {
      const res = await categoryApi.getAllCategories(brandId!);
      setCategories(res.data.data);
    } catch {
      toast.error(t('categories.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!brandId || !form.name.trim()) return;
    try {
      if (editId) {
        await categoryApi.updateCategory(editId, { brandId, name: form.name, displayOrder: form.displayOrder });
        toast.success(t('categories.updated'));
      } else {
        await categoryApi.createCategory({ brandId, name: form.name, displayOrder: form.displayOrder });
        toast.success(t('categories.created'));
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', displayOrder: 0 });
      loadCategories();
    } catch {
      toast.error(t('categories.saveFailed'));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(t('categories.deleteConfirm'))) return;
    try {
      await categoryApi.deleteCategory(id);
      toast.success(t('categories.deleted'));
      loadCategories();
    } catch {
      toast.error(t('categories.deleteFailed'));
    }
  }

  function startEdit(cat: ItemCategory) {
    setEditId(cat.id);
    setForm({ name: cat.name, displayOrder: cat.displayOrder });
    setShowForm(true);
  }

  if (loading) return <div className="p-6">{t('common.loading')}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('categories.title')}</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', displayOrder: 0 }); }}
          className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900"
        >
          {t('categories.addCategory')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">
            {editId ? t('categories.editTitle') : t('categories.addTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('common.name')}</label>
              <input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder={t('categories.namePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('categories.displayOrder')}</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={e => setForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900">
              {t('common.save')}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">{t('common.id')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium">{t('common.name')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium">{t('categories.displayOrder')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium">{t('common.status')}</th>
              <th className="px-4 py-3 text-left text-sm font-medium">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">{t('categories.noCategories')}</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{cat.id}</td>
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3">{cat.displayOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {cat.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(cat)} className="text-blue-600 hover:underline text-sm">
                        {t('common.edit')}
                      </button>
                      {cat.isActive && (
                        <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:underline text-sm">
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
