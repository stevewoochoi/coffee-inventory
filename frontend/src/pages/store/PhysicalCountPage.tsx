import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { physicalCountApi, type PhysicalCount } from '@/api/physicalCount';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

function getStatusBadge(status: PhysicalCount['status']) {
  const styles: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-500 text-white',
    COMPLETED: 'bg-green-500 text-white',
    CANCELLED: 'bg-gray-500 text-white',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function PhysicalCountPage() {
  const [counts, setCounts] = useState<PhysicalCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const storeId = 1; // TODO: from auth context

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await physicalCountApi.getHistory(storeId);
      setCounts(res.data.data);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    try {
      setStarting(true);
      const res = await physicalCountApi.start(storeId, 1); // TODO: userId from auth
      navigate(`/store/physical-count/${res.data.data.id}`);
    } catch {
      /* handled */
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Physical Count</h2>
        <button
          onClick={handleStart}
          disabled={starting}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 text-lg"
        >
          {starting ? 'Starting...' : 'New Count'}
        </button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">Loading...</TableCell>
              </TableRow>
            ) : counts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  No physical counts yet
                </TableCell>
              </TableRow>
            ) : (
              counts.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/store/physical-count/${c.id}`)}>
                  <TableCell className="font-medium">#{c.id}</TableCell>
                  <TableCell>{c.countDate}</TableCell>
                  <TableCell>{getStatusBadge(c.status)}</TableCell>
                  <TableCell>{c.lines.length} items</TableCell>
                  <TableCell className="text-gray-500">
                    {c.completedAt ? new Date(c.completedAt).toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-blue-600 text-sm">View</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
