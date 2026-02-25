import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

export default function OrderingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<OrderPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: storeId는 실제 로그인한 사용자의 storeId 사용
  const storeId = 1;

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const res = await orderingApi.getPlans(storeId);
      setPlans(res.data.data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(id: number) {
    await orderingApi.confirmPlan(id);
    loadPlans();
  }

  async function handleDispatch(id: number) {
    await orderingApi.dispatchPlan(id);
    loadPlans();
  }

  async function handleDownloadPdf(id: number) {
    try {
      const res = await orderingApi.downloadPdf(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `order-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // handle error
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Order Plans</h2>
        <Button
          size="lg"
          className="bg-blue-800 hover:bg-blue-900 text-base px-6 py-3"
          onClick={() => navigate('/store/ordering/new')}
        >
          + New Order
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No order plans yet</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">#{plan.id}</TableCell>
                <TableCell>
                  <Badge className={statusColor[plan.status] || ''}>
                    {plan.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(plan.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="space-x-2">
                  {plan.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirm(plan.id)}
                    >
                      Confirm
                    </Button>
                  )}
                  {plan.status === 'CONFIRMED' && (
                    <Button
                      size="sm"
                      className="bg-blue-800 hover:bg-blue-900"
                      onClick={() => handleDispatch(plan.id)}
                    >
                      Dispatch
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPdf(plan.id)}
                  >
                    Download PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
