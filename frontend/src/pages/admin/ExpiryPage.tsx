import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, type ExpiryAlert } from '@/api/inventory';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function getStatusBadge(status: ExpiryAlert['alertStatus']) {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    WARNING: 'bg-yellow-500 text-white',
    EXPIRED: 'bg-gray-500 text-white',
    NORMAL: 'bg-green-500 text-white',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function AdminExpiryPage() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  // TODO: fetch for all stores under the brand
  const storeId = 1;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getExpiryAlerts(storeId);
      setAlerts(res.data.data);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { EXPIRED: 0, CRITICAL: 1, WARNING: 2, NORMAL: 3 };
    return order[a.alertStatus] - order[b.alertStatus];
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Expiry Alert Overview</h2>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>Exp Date</TableHead>
              <TableHead>Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sortedAlerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  No expiry alerts
                </TableCell>
              </TableRow>
            ) : (
              sortedAlerts.map((alert) => (
                <TableRow
                  key={alert.id}
                  className={alert.alertStatus === 'EXPIRED' ? 'line-through text-gray-400' : ''}
                >
                  <TableCell>{getStatusBadge(alert.alertStatus)}</TableCell>
                  <TableCell>Store #{alert.storeId}</TableCell>
                  <TableCell className="font-medium">Item #{alert.itemId}</TableCell>
                  <TableCell>{alert.lotNo || '-'}</TableCell>
                  <TableCell>{alert.expDate}</TableCell>
                  <TableCell>{alert.qtyBaseUnit}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
