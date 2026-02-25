const PENDING_SCANS_KEY = 'coffee-inv-pending-scans';

export interface PendingScan {
  id: string;
  deliveryId: number;
  packagingId: number;
  packCountScanned: number;
  timestamp: number;
}

export function savePendingScan(scan: Omit<PendingScan, 'id' | 'timestamp'>) {
  const pending = getPendingScans();
  pending.push({
    ...scan,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(pending));
}

export function getPendingScans(): PendingScan[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_SCANS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function removePendingScan(id: string) {
  const pending = getPendingScans().filter((s) => s.id !== id);
  localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(pending));
}

export function clearPendingScans() {
  localStorage.removeItem(PENDING_SCANS_KEY);
}

export function hasPendingScans(): boolean {
  return getPendingScans().length > 0;
}
