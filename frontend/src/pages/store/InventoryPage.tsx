import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { inventoryApi, type InventorySnapshot, type LowStockItem } from '@/api/inventory';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function InventoryPage() {
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;
  const { t } = useTranslation();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [snapRes, lowRes] = await Promise.all([
        inventoryApi.getSnapshot(storeId),
        inventoryApi.getLowStock(storeId),
      ]);
      setSnapshots(snapRes.data.data);
      setLowStock(lowRes.data.data);
    } catch { toast.error(t('inventory.loadFailed')); }
    finally { setLoading(false); }
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  const lowStockItemIds = new Set(lowStock.map(l => l.itemId));

  if (loading && snapshots.length === 0) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('inventory.title')}</h2>

      {lowStock.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-700">
              {t('inventory.lowStockAlert', { count: lowStock.length })}
            </h3>
            <button
              onClick={() => navigate('/store/ordering/new')}
              className="text-sm px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 min-h-[44px]"
            >
              {t('inventory.createOrder')}
            </button>
          </div>
          <div className="space-y-2">
            {lowStock.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between bg-white rounded p-3 border border-red-100">
                <div>
                  <span className="font-medium">{item.itemName}</span>
                  <span className="text-sm text-gray-500 ml-2">({item.baseUnit})</span>
                </div>
                <div className="text-right">
                  <span className="text-red-600 font-bold">{item.currentQty}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  <span className="text-gray-500">{item.minStockQty}</span>
                  <span className="text-red-500 text-sm ml-2">(-{item.deficit})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desktop: Table view */}
      <div className="hidden md:block bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('inventory.itemId')}</TableHead>
              <TableHead>{t('inventory.quantity')}</TableHead>
              <TableHead>{t('inventory.lastUpdated')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((s) => (
              <TableRow key={s.id} className={lowStockItemIds.has(s.itemId) ? 'bg-red-50' : ''}>
                <TableCell className="font-medium">
                  {t('inventory.itemPrefix', { id: s.itemId })}
                  {lowStockItemIds.has(s.itemId) && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{t('inventory.lowBadge')}</span>
                  )}
                </TableCell>
                <TableCell className={s.qtyBaseUnit <= 0 ? 'text-red-600 font-bold' : ''}>
                  {s.qtyBaseUnit}
                </TableCell>
                <TableCell className="text-gray-500">
                  {new Date(s.updatedAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {snapshots.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-500 py-12">
                  {t('inventory.noData')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Card list view */}
      <div className="md:hidden space-y-2">
        {snapshots.map((s) => (
          <div
            key={s.id}
            className={`bg-white rounded-lg border p-4 ${lowStockItemIds.has(s.itemId) ? 'border-red-300 bg-red-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {t('inventory.itemPrefix', { id: s.itemId })}
              </span>
              {lowStockItemIds.has(s.itemId) && (
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{t('inventory.lowBadge')}</span>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className={`text-lg font-bold ${s.qtyBaseUnit <= 0 ? 'text-red-600' : ''}`}>
                {s.qtyBaseUnit}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(s.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        {snapshots.length === 0 && (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg border">
            {t('inventory.noData')}
          </div>
        )}
      </div>
    </div>
  );
}
