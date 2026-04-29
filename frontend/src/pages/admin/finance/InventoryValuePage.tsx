import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getInventoryValuation } from '@/api/finance';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface StoreValuation {
  storeId: number;
  storeName: string;
  totalItems: number;
  totalValue: number;
  lastUpdated: string;
}

interface ValuationData {
  totalValue: number;
  stores: StoreValuation[];
}

export default function InventoryValuePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId;

  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInventoryValuation(brandId);
      setData(result.data || result);
    } catch {
      toast.error(t('finance.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [brandId, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const stores = data?.stores || [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('finance.inventoryValueTitle')}</h2>

      {/* Total value card */}
      {data && (
        <Card className="mb-6">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-gray-500 mb-1">{t('finance.totalInventoryValue')}</p>
            <p className="text-3xl font-bold text-green-700">
              {formatCurrency(data.totalValue ?? 0, undefined)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {stores.length} {t('finance.storeCount')}
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : stores.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('common.noData')}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('finance.storeName')}</TableHead>
                  <TableHead className="text-right">{t('finance.totalItems')}</TableHead>
                  <TableHead className="text-right">{t('finance.inventoryValue')}</TableHead>
                  <TableHead className="text-right">{t('finance.lastUpdated')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.storeId}>
                    <TableCell className="font-medium">{store.storeName}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{store.totalItems}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(store.totalValue, undefined)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {store.lastUpdated ? new Date(store.lastUpdated).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {stores.map((store) => (
              <Card key={store.storeId}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{store.storeName}</p>
                    <Badge variant="secondary">{store.totalItems} {t('finance.itemUnit')}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('finance.inventoryValue')}</span>
                    <span className="font-bold text-green-700">{formatCurrency(store.totalValue, undefined)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{t('finance.lastUpdated')}</span>
                    <span>{store.lastUpdated ? new Date(store.lastUpdated).toLocaleDateString() : '-'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
