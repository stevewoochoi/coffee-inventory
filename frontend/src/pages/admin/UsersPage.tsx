import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { adminUserApi, type UserResponse, type ApproveRequest, type UpdateRequest } from '@/api/adminUser';
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
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBrandId, setEditBrandId] = useState<number | undefined>();
  const [editStoreIds, setEditStoreIds] = useState<number[]>([]);
  const [editBrands, setEditBrands] = useState<SelectOption[]>([]);
  const [editStores, setEditStores] = useState<SelectOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Suspend confirm modal
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendUser, setSuspendUserState] = useState<UserResponse | null>(null);
  const [suspending, setSuspending] = useState(false);

  // Delete confirm modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUserState] = useState<UserResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUserApi.getUsers({
        status: currentTab || undefined,
        search: debouncedSearch || undefined,
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
  }, [currentTab, debouncedSearch, page, t]);

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
      return res.data.data;
    } catch { return []; }
  };

  const fetchStores = async (brandId: number) => {
    try {
      const res = await client.get<ApiResponse<SelectOption[]>>('/admin/stores/select', {
        params: { brandId },
      });
      setStores(res.data.data);
      return res.data.data;
    } catch { return []; }
  };

  const fetchEditBrands = async () => {
    try {
      const res = await client.get<ApiResponse<SelectOption[]>>('/admin/brands/select');
      setEditBrands(res.data.data);
      return res.data.data;
    } catch { return []; }
  };

  const fetchEditStores = async (brandId: number) => {
    try {
      const res = await client.get<ApiResponse<SelectOption[]>>('/admin/stores/select', {
        params: { brandId },
      });
      setEditStores(res.data.data);
      return res.data.data;
    } catch { return []; }
  };

  // --- Approve ---
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

  // --- Edit ---
  const openEditModal = async (user: UserResponse) => {
    setEditUser(user);
    setEditName(user.name || '');
    setEditRole(user.role);
    setEditBrandId(user.brandId ?? undefined);
    setEditStores([]);
    await fetchEditBrands();
    if (user.brandId) {
      await fetchEditStores(user.brandId);
    }
    setEditStoreIds(user.stores?.map(s => s.storeId) || []);
    setEditOpen(true);
  };

  const handleEditBrandChange = async (brandId: number) => {
    setEditBrandId(brandId);
    setEditStoreIds([]);
    if (brandId) await fetchEditStores(brandId);
    else setEditStores([]);
  };

  const toggleEditStoreId = (storeId: number) => {
    setEditStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const data: UpdateRequest = {
        name: editName,
        role: editRole,
      };
      if (editRole === 'BRAND_ADMIN' || editRole === 'STORE_MANAGER') {
        data.brandId = editBrandId;
      }
      if (editRole === 'STORE_MANAGER') {
        data.storeIds = editStoreIds;
      }
      await adminUserApi.update(editUser.id, data);
      toast.success(t('users.updated'));
      setEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('users.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  // --- Suspend ---
  const openSuspendModal = (user: UserResponse) => {
    setSuspendUserState(user);
    setSuspendOpen(true);
  };

  const handleSuspend = async () => {
    if (!suspendUser) return;
    setSuspending(true);
    try {
      await adminUserApi.suspend(suspendUser.id);
      toast.success(t('users.suspended'));
      setSuspendOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('users.suspendFailed'));
    } finally {
      setSuspending(false);
    }
  };

  // --- Delete ---
  const openDeleteModal = (user: UserResponse) => {
    setDeleteUserState(user);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await adminUserApi.delete(deleteUser.id);
      toast.success(t('users.deleted'));
      setDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('users.deleteFailed'));
    } finally {
      setDeleting(false);
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
          onChange={(e) => setSearch(e.target.value)}
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
                    {/* Pending: Approve/Reject */}
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
                    {/* Active: Edit/Suspend/Delete */}
                    {user.accountStatus === 'ACTIVE' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(user)}
                                className="text-xs h-8">
                          {t('common.edit')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openSuspendModal(user)}
                                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 text-xs h-8">
                          {t('users.suspend')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openDeleteModal(user)}
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-8">
                          {t('common.delete')}
                        </Button>
                      </div>
                    )}
                    {/* Rejected: show reason + edit */}
                    {user.accountStatus === 'REJECTED' && (
                      <div className="flex flex-col gap-1">
                        {user.rejectedReason && (
                          <span className="text-xs text-red-500">{user.rejectedReason}</span>
                        )}
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEditModal(user)}
                                  className="text-xs h-8">
                            {t('common.edit')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openDeleteModal(user)}
                                  className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-8">
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Suspended: edit/delete */}
                    {user.accountStatus === 'SUSPENDED' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(user)}
                                className="text-xs h-8">
                          {t('common.edit')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openDeleteModal(user)}
                                className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-8">
                          {t('common.delete')}
                        </Button>
                      </div>
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

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.editTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{editUser?.email}</p>

            {/* Name */}
            <div className="space-y-2">
              <Label>{t('users.col.name')}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label>{t('users.col.role')}</Label>
              <select
                value={editRole}
                onChange={(e) => {
                  setEditRole(e.target.value);
                  setEditStoreIds([]);
                }}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="STORE_MANAGER">{t('users.role.STORE_MANAGER')}</option>
                <option value="BRAND_ADMIN">{t('users.role.BRAND_ADMIN')}</option>
                <option value="SUPER_ADMIN">{t('users.role.SUPER_ADMIN')}</option>
              </select>
            </div>

            {/* Brand */}
            {(editRole === 'BRAND_ADMIN' || editRole === 'STORE_MANAGER') && (
              <div className="space-y-2">
                <Label>{t('users.brand')}</Label>
                <select
                  value={editBrandId ?? ''}
                  onChange={(e) => handleEditBrandChange(Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">{t('users.selectBrand')}</option>
                  {editBrands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Stores Multi-select */}
            {editRole === 'STORE_MANAGER' && editBrandId && (
              <div className="space-y-2">
                <Label>{t('users.stores')} ({editStoreIds.length}{t('users.selected')})</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
                  {editStores.length === 0 ? (
                    <p className="text-sm text-gray-400">{t('users.noStores')}</p>
                  ) : (
                    editStores.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editStoreIds.includes(s.id)}
                          onChange={() => toggleEditStoreId(s.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{s.name}</span>
                        {editStoreIds[0] === s.id && editStoreIds.length > 0 && (
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? t('common.processing') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirm Modal */}
      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('users.suspendTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {t('users.suspendConfirm', { name: suspendUser?.name || suspendUser?.email })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={suspending}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {suspending ? t('common.processing') : t('users.suspend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('users.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {t('users.deleteConfirm', { name: deleteUser?.name || deleteUser?.email })}
          </p>
          <p className="text-xs text-red-500 mt-1">{t('users.deleteWarning')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? t('common.processing') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
