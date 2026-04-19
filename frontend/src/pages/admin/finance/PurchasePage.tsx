import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getPurchaseSummary } from '@/api/finance';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface PurchaseRow {
  supplierId: number;
  supplierName: string;
  orderCount: number;
  totalAmount: number;
  vatAmount: number;
}

export default function PurchasePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId ?? 1;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPurchaseSummary(brandId, year, month);
      setData(result.data || []);
    } catch {
      toast.error(t('finance.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [brandId, year, month, t]);

  const grandTotal = data.reduce((sum, row) => sum + row.totalAmount, 0);
  const grandVat = data.reduce((sum, row) => sum + row.vatAmount, 0);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('finance.purchaseTitle')}</h2>

      {/* Period selector */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex gap-2 items-center">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}{t('calendar.year')}</option>
                ))}
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}{t('calendar.monthSuffix')}</option>
                ))}
              </select>
            </div>
            <Button onClick={loadData} disabled={loading} className="bg-[#0077cc] hover:bg-[#005ea3]">
              {t('common.search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('common.noData')}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('finance.supplierName')}</TableHead>
                  <TableHead className="text-right">{t('finance.orderCount')}</TableHead>
                  <TableHead className="text-right">{t('finance.purchaseAmount')}</TableHead>
                  <TableHead className="text-right">{t('finance.vatAmount')}</TableHead>
                  <TableHead className="text-right">{t('finance.totalInclVat')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.supplierId}>
                    <TableCell className="font-medium">{row.supplierName}</TableCell>
                    <TableCell className="text-right">{row.orderCount}</TableCell>
                    <TableCell className="text-right">{'\u20A9'}{row.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{'\u20A9'}{row.vatAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">
                      {'\u20A9'}{(row.totalAmount + row.vatAmount).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell>{t('finance.grandTotal')}</TableCell>
                  <TableCell className="text-right">{data.reduce((s, r) => s + r.orderCount, 0)}</TableCell>
                  <TableCell className="text-right">{'\u20A9'}{grandTotal.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{'\u20A9'}{grandVat.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{'\u20A9'}{(grandTotal + grandVat).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {data.map((row) => (
              <Card key={row.supplierId}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{row.supplierName}</p>
                    <p className="text-sm text-gray-500">{row.orderCount}{t('finance.orderUnit')}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('finance.purchaseAmount')}</span>
                    <span className="font-medium">{'\u20A9'}{row.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('finance.vatAmount')}</span>
                    <span>{'\u20A9'}{row.vatAmount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="bg-gray-50">
              <CardContent className="py-3">
                <div className="flex justify-between font-bold">
                  <span>{t('finance.grandTotal')}</span>
                  <span>{'\u20A9'}{(grandTotal + grandVat).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
