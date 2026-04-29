import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { orderingApi, type OrderDetailedResponse, type SupplierSummary } from '@/api/ordering';
import { masterApi, type Supplier } from '@/api/master';
import { formatCurrency } from '@/lib/currency';

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  CUTOFF_CLOSED: 'bg-purple-100 text-purple-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

export default function OrderingAdminPage() {
  const [plans, setPlans] = useState<OrderDetailedResponse[]>([]);
  const [summary, setSummary] = useState<SupplierSummary[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterStore, setFilterStore] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'orders' | 'summary'>('orders');
  const { user } = useAuthStore();
  const brandId = user?.brandId;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params: { brandId: number; supplierId?: number; storeId?: number; status?: string } = { brandId };
      if (filterSupplier) params.supplierId = Number(filterSupplier);
      if (filterStore) params.storeId = Number(filterStore);
      if (filterStatus) params.status = filterStatus;
      const res = await orderingApi.getAllPlans(params);
      setPlans(res.data.data);
    } catch {
      toast.error(t('ordering.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [brandId, filterSupplier, filterStore, filterStatus, t]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await orderingApi.getSupplierSummary(brandId);
      setSummary(res.data.data);
    } catch { /* non-critical */ }
  }, [brandId]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await masterApi.getSuppliers(brandId);
      setSuppliers(res.data.data);
    } catch { /* non-critical */ }
  }, [brandId]);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  // 매장 목록 추출 (전체 plans에서 — 필터 전 데이터가 필요하므로 별도 로드)
  const [allStores, setAllStores] = useState<{id: number; name: string}[]>([]);
  const loadStores = useCallback(async () => {
    try {
      const res = await orderingApi.getAllPlans({ brandId });
      const storeMap = new Map<number, string>();
      res.data.data.forEach((p: OrderDetailedResponse) => {
        if (p.storeId && p.storeName) storeMap.set(p.storeId, p.storeName);
      });
      setAllStores(Array.from(storeMap, ([id, name]) => ({ id, name })));
    } catch { /* non-critical */ }
  }, [brandId]);
  useEffect(() => { loadStores(); }, [loadStores]);

  const filtered = plans.filter((p) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (p.supplierName?.toLowerCase().includes(q)) ||
           (p.storeName?.toLowerCase().includes(q)) ||
           (String(p.id).includes(q));
  });

  const formatPrice = (n: number | null | undefined, currency?: string) => {
    if (n == null) return '-';
    return formatCurrency(n, currency || 'JPY');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t('ordering.allOrders')}</h2>
        <div className="flex gap-2">
          <Button variant={tab === 'orders' ? 'default' : 'outline'} size="sm" onClick={() => setTab('orders')}>
            {t('orderAdmin.orderList')}
          </Button>
          <Button variant={tab === 'summary' ? 'default' : 'outline'} size="sm" onClick={() => setTab('summary')}>
            {t('orderAdmin.supplierSummary')}
          </Button>
        </div>
      </div>

      {tab === 'orders' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder={t('orderAdmin.searchPlaceholder')}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="max-w-[200px]"
            />
            <select
              className="border rounded-md px-3 py-1.5 text-sm h-10"
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
            >
              <option value="">{t('orderAdmin.allStores')}</option>
              {allStores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-1.5 text-sm h-10"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
            >
              <option value="">{t('orderAdmin.allSuppliers')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-1.5 text-sm h-10"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">{t('ordering.status.all')}</option>
              <option value="DRAFT">{t('ordering.status.DRAFT')}</option>
              <option value="CONFIRMED">{t('ordering.status.CONFIRMED')}</option>
              <option value="DISPATCHED">{t('ordering.status.DISPATCHED')}</option>
              <option value="DELIVERED">{t('ordering.status.DELIVERED')}</option>
              <option value="CANCELLED">{t('ordering.status.CANCELLED')}</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">{t('ordering.noOrdersFound')}</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.id')}</TableHead>
                      <TableHead>{t('orderAdmin.storeName')}</TableHead>
                      <TableHead>{t('orderAdmin.supplierName')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('orderAdmin.deliveryDate')}</TableHead>
                      <TableHead>{t('orderAdmin.totalAmount')}</TableHead>
                      <TableHead>{t('ordering.created')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((plan) => (
                      <TableRow key={plan.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/admin/ordering/${plan.id}`, { state: { from: 'list' } })}>
                        <TableCell className="font-medium text-blue-600 underline">#{plan.id}</TableCell>
                        <TableCell>{plan.storeName || `#${plan.storeId}`}</TableCell>
                        <TableCell>{plan.supplierName || `#${plan.supplierId}`}</TableCell>
                        <TableCell>
                          <Badge className={statusColor[plan.status] || ''}>
                            {t(`ordering.status.${plan.status}`, plan.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{plan.deliveryDate || '-'}</TableCell>
                        <TableCell>{formatPrice(plan.totalAmount, plan.currency)}</TableCell>
                        <TableCell>{new Date(plan.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filtered.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-lg border p-4 cursor-pointer active:bg-gray-50" onClick={() => navigate(`/admin/ordering/${plan.id}`, { state: { from: 'list' } })}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-blue-600 underline">#{plan.id}</span>
                      <Badge className={statusColor[plan.status] || ''}>
                        {t(`ordering.status.${plan.status}`, plan.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <div className="text-gray-500">{t('orderAdmin.storeName')}: {plan.storeName || `#${plan.storeId}`}</div>
                      <div className="text-gray-500">{t('orderAdmin.supplierName')}: {plan.supplierName || `#${plan.supplierId}`}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-gray-400">{new Date(plan.createdAt).toLocaleDateString()}</span>
                      <span className="font-medium">{formatPrice(plan.totalAmount, plan.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'summary' && (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orderAdmin.supplierName')}</TableHead>
                <TableHead>{t('orderAdmin.orderCount')}</TableHead>
                <TableHead>{t('orderAdmin.totalAmount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((s) => (
                <TableRow key={s.supplierId}>
                  <TableCell className="font-medium">{s.supplierName}</TableCell>
                  <TableCell>{s.orderCount}{t('orderAdmin.countUnit')}</TableCell>
                  <TableCell>{formatPrice(s.totalAmount, s.currency)}</TableCell>
                </TableRow>
              ))}
              {summary.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                    {t('common.noData')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
