import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { getClosingHistory, executeMonthlyClosing } from '@/api/finance';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface ClosingRecord {
  id: number;
  year: number;
  month: number;
  status: string;
  totalPurchase: number;
  totalInventory: number;
  closedAt: string | null;
  closedBy: string | null;
}

export default function ClosingPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId;

  const [records, setRecords] = useState<ClosingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executing, setExecuting] = useState(false);

  const now = new Date();
  const [execYear, setExecYear] = useState(now.getFullYear());
  const [execMonth, setExecMonth] = useState(now.getMonth() + 1);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClosingHistory(brandId);
      setRecords(result.data || []);
    } catch {
      toast.error(t('finance.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [brandId, t]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleExecuteClosing = async () => {
    setExecuting(true);
    try {
      await executeMonthlyClosing(brandId, execYear, execMonth);
      toast.success(t('finance.closingSuccess'));
      setExecuteDialogOpen(false);
      loadHistory();
    } catch {
      toast.error(t('finance.closingFailed'));
    } finally {
      setExecuting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLOSED': return <Badge className="bg-green-100 text-green-800">{t('finance.statusClosed')}</Badge>;
      case 'OPEN': return <Badge variant="outline">{t('finance.statusOpen')}</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-amber-100 text-amber-800">{t('finance.statusInProgress')}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('finance.closingTitle')}</h2>
        <Button
          onClick={() => setExecuteDialogOpen(true)}
          className="bg-[#0077cc] hover:bg-[#005ea3]"
        >
          {t('finance.executeClosing')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('common.noData')}</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('finance.period')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('finance.totalPurchase')}</TableHead>
                  <TableHead className="text-right">{t('finance.totalInventoryValue')}</TableHead>
                  <TableHead className="text-right">{t('finance.closedAt')}</TableHead>
                  <TableHead>{t('finance.closedBy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.year}{t('calendar.year')} {record.month}{t('calendar.monthSuffix')}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.totalPurchase ?? 0, undefined)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.totalInventory ?? 0, undefined)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      {record.closedAt ? new Date(record.closedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-sm">{record.closedBy || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {records.map((record) => (
              <Card key={record.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">
                      {record.year}{t('calendar.year')} {record.month}{t('calendar.monthSuffix')}
                    </p>
                    {getStatusBadge(record.status)}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('finance.totalPurchase')}</span>
                      <span>{formatCurrency(record.totalPurchase ?? 0, undefined)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('finance.totalInventoryValue')}</span>
                      <span>{formatCurrency(record.totalInventory ?? 0, undefined)}</span>
                    </div>
                    {record.closedAt && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{t('finance.closedAt')}</span>
                        <span>{new Date(record.closedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Execute Closing Dialog */}
      <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finance.executeClosing')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t('finance.closingDesc')}</p>
            <div className="flex gap-4">
              <select
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={execYear}
                onChange={(e) => setExecYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}{t('calendar.year')}</option>
                ))}
              </select>
              <select
                className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={execMonth}
                onChange={(e) => setExecMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}{t('calendar.monthSuffix')}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleExecuteClosing}
              disabled={executing}
              className="bg-[#0077cc] hover:bg-[#005ea3]"
            >
              {executing ? t('common.processing') : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
