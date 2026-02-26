import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { adminUserApi, type UserResponse, type ApproveRequest } from '@/api/adminUser';
import client from '@/api/client';
import type { ApiResponse } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SelectOption {
  id: number;
  name: string;
}

const STATUS_TABS = ['PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'SUSPENDED'] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  ACTIVE: 'bg-green-50 text-green-700 border-green-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-300',
  SUSPENDED: 'bg-gray-50 text-gray-700 border-gray-300',
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-600',
  BRAND_ADMIN: 'bg-blue-600',
  STORE_MANAGER: 'bg-teal-600',
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [currentTab, setCurrentTab] = useState<string>('PENDING_APPROVAL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Approve modal
  const [approveOpen, setApproveOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [approveRole, setApproveRole] = useState('STORE_MANAGER');
  const [approveBrandId, setApproveBrandId] = useState<number | undefined>();
  const [approveStoreIds, setApproveStoreIds] = useState<number[]>([]);
  const [brands, setBrands] = useState<SelectOption[]>([]);
  const [stores, setStores] = useState<SelectOption[]>([]);
  const [approving, setApproving] = useState(false);

  // Reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUserApi.getUsers({
        status: currentTab || undefined,
        search: search || undefined,
        page,
        size: 20,
      });
      setUsers(res.data.data.content);
      setTotalElements(res.data.data.totalElements);
    } catch {
      toast.error(t('users.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [currentTab, search, page, t]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await adminUserApi.getUsers({ status: 'PENDING_APPROVAL', size: 1 });
      setPendingCount(res.data.data.totalElements);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  const fetchBrands = async () => {
    try {
      const res = await client.get<ApiResponse<SelectOption[]>>('/admin/brands/select');
      setBrands(res.data.data);
    } catch { /* ignore */ }
  };

  const fetchStores = async (brandId: number) => {
    try {
      const res = await client.get<ApiResponse<SelectOption[]>>('/admin/stores/select', {
        params: { brandId },
      });
      setStores(res.data.data);
    } catch { /* ignore */ }
  };

  const openApproveModal = (user: UserResponse) => {
    setSelectedUser(user);
    setApproveRole('STORE_MANAGER');
    setApproveBrandId(undefined);
    setApproveStoreIds([]);
    setStores([]);
    fetchBrands();
    setApproveOpen(true);
  };

  const openRejectModal = (user: UserResponse) => {
    setSelectedUser(user);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleBrandChange = (brandId: number) => {
    setApproveBrandId(brandId);
    setApproveStoreIds([]);
    if (brandId) fetchStores(brandId);
    else setStores([]);
  };

  const toggleStoreId = (storeId: number) => {
    setApproveStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    setApproving(true);
    try {
      const data: ApproveRequest = { role: approveRole };
      if (approveRole === 'BRAND_ADMIN' || approveRole === 'STORE_MANAGER') {
        data.brandId = approveBrandId;
      }
      if (approveRole === 'STORE_MANAGER') {
        data.storeIds = approveStoreIds;
      }
      await adminUserApi.approve(selectedUser.id, data);
      toast.success(t('users.approved'));
      setApproveOpen(false);
      fetchUsers();
      fetchPendingCount();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('users.approveFailed'));
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setRejecting(true);
    try {
      await adminUserApi.reject(selectedUser.id, { reason: rejectReason });
      toast.success(t('users.rejected'));
      setRejectOpen(false);
      fetchUsers();
      fetchPendingCount();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('users.rejectFailed'));
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t('users.title')}</h2>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setCurrentTab(tab); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              currentTab === tab
                ? 'bg-blue-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t(`users.status.${tab}`)}
            {tab === 'PENDING_APPROVAL' && pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder={t('users.searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="max-w-xs"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">{t('users.noUsers')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3">{t('users.col.name')}</th>
                <th className="text-left p-3">{t('users.col.email')}</th>
                <th className="text-left p-3">{t('users.col.role')}</th>
                <th className="text-left p-3">{t('users.col.stores')}</th>
                <th className="text-left p-3">{t('users.col.status')}</th>
                <th className="text-left p-3">{t('users.col.registeredAt')}</th>
                <th className="text-left p-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{user.name || '-'}</td>
                  <td className="p-3 text-gray-600">{user.email}</td>
                  <td className="p-3">
                    <Badge className={ROLE_STYLES[user.role] || ''}>
                      {t(`users.role.${user.role}`)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {user.stores && user.stores.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.stores.map((s) => (
                          <Badge key={s.storeId} variant="outline" className="text-xs">
                            {s.storeName}{s.isPrimary ? ' ★' : ''}
                          </Badge>
                        ))}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={STATUS_STYLES[user.accountStatus] || ''}>
                      {t(`users.status.${user.accountStatus}`)}
                    </Badge>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3">
                    {user.accountStatus === 'PENDING_APPROVAL' && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => openApproveModal(user)}
                                className="bg-green-600 hover:bg-green-700 text-xs h-8">
                          {t('users.approve')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openRejectModal(user)}
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-8">
                          {t('users.reject')}
                        </Button>
                      </div>
                    )}
                    {user.accountStatus === 'REJECTED' && user.rejectedReason && (
                      <span className="text-xs text-red-500">{user.rejectedReason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalElements > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" disabled={page === 0}
                      onClick={() => setPage(page - 1)}>
                {t('common.previous')}
              </Button>
              <span className="text-sm text-gray-500 flex items-center">
                {t('common.page', { current: page + 1, total: Math.ceil(totalElements / 20) })}
              </span>
              <Button size="sm" variant="outline" disabled={(page + 1) * 20 >= totalElements}
                      onClick={() => setPage(page + 1)}>
                {t('common.next')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Approve Modal */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.approveTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {selectedUser?.name} ({selectedUser?.email})
            </p>

            {/* Role Select */}
            <div className="space-y-2">
              <Label>{t('users.col.role')}</Label>
              <select
                value={approveRole}
                onChange={(e) => {
                  setApproveRole(e.target.value);
                  setApproveStoreIds([]);
                }}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="STORE_MANAGER">{t('users.role.STORE_MANAGER')}</option>
                <option value="BRAND_ADMIN">{t('users.role.BRAND_ADMIN')}</option>
                <option value="SUPER_ADMIN">{t('users.role.SUPER_ADMIN')}</option>
              </select>
            </div>

            {/* Brand Select */}
            {(approveRole === 'BRAND_ADMIN' || approveRole === 'STORE_MANAGER') && (
              <div className="space-y-2">
                <Label>{t('users.brand')}</Label>
                <select
                  value={approveBrandId ?? ''}
                  onChange={(e) => handleBrandChange(Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">{t('users.selectBrand')}</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Store Multi-select */}
            {approveRole === 'STORE_MANAGER' && approveBrandId && (
              <div className="space-y-2">
                <Label>{t('users.stores')} ({approveStoreIds.length}{t('users.selected')})</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {stores.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('users.noStores')}</p>
                  ) : (
                    stores.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={approveStoreIds.includes(s.id)}
                          onChange={() => toggleStoreId(s.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{s.name}</span>
                        {approveStoreIds[0] === s.id && approveStoreIds.length > 0 && (
                          <Badge variant="outline" className="text-xs ml-auto">★ {t('users.primary')}</Badge>
                        )}
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-400">{t('users.primaryHint')}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={
                approving ||
                ((approveRole === 'BRAND_ADMIN' || approveRole === 'STORE_MANAGER') && !approveBrandId) ||
                (approveRole === 'STORE_MANAGER' && approveStoreIds.length === 0)
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? t('common.processing') : t('users.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.rejectTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {selectedUser?.name} ({selectedUser?.email})
            </p>
            <div className="space-y-2">
              <Label>{t('users.rejectReasonLabel')}</Label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                placeholder={t('users.rejectReasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejecting ? t('common.processing') : t('users.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
