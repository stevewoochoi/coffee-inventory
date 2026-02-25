import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi, type InventorySnapshot, type LowStockItem } from '@/api/inventory';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function InventoryPage() {
  const [snapshots, setSnapshots] = useState<InventorySnapshot[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const navigate = useNavigate();
  const storeId = 1; // TODO: from auth context

  const load = useCallback(async () => {
    try {
      const [snapRes, lowRes] = await Promise.all([
        inventoryApi.getSnapshot(storeId),
        inventoryApi.getLowStock(storeId),
      ]);
      setSnapshots(snapRes.data.data);
      setLowStock(lowRes.data.data);
    } catch { /* handled */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lowStockItemIds = new Set(lowStock.map(l => l.itemId));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Current Inventory</h2>

      {lowStock.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-700">
              Low Stock Alert ({lowStock.length} items)
            </h3>
            <button
              onClick={() => navigate('/store/ordering/new')}
              className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Create Order
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

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item ID</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((s) => (
              <TableRow key={s.id} className={lowStockItemIds.has(s.itemId) ? 'bg-red-50' : ''}>
                <TableCell className="font-medium">
                  Item #{s.itemId}
                  {lowStockItemIds.has(s.itemId) && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">LOW</span>
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
                  No inventory data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
