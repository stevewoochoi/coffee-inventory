import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { orderingApi, type OrderPlan } from '@/api/ordering';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrderingAdminPage() {
  const [plans, setPlans] = useState<OrderPlan[]>([]);
  const [storeId, setStoreId] = useState('1');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await orderingApi.getPlans(Number(storeId));
      setPlans(res.data.data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">All Orders</h2>

      <div className="flex items-center gap-3">
        <input
          type="number"
          placeholder="Store ID"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="border rounded px-3 py-1.5 w-32 text-sm"
        />
        <button
          onClick={loadPlans}
          className="px-4 py-1.5 bg-blue-800 text-white rounded text-sm hover:bg-blue-900"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No orders found</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>AI</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">#{plan.id}</TableCell>
                <TableCell>{plan.storeId}</TableCell>
                <TableCell>{plan.supplierId}</TableCell>
                <TableCell>
                  <Badge className={statusColor[plan.status] || ''}>
                    {plan.status}
                  </Badge>
                </TableCell>
                <TableCell>{plan.recommendedByAi ? 'Yes' : '-'}</TableCell>
                <TableCell>{new Date(plan.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
