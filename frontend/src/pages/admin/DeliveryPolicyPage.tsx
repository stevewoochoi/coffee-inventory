import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { deliveryPolicyApi, type DeliveryHoliday } from '@/api/deliveryPolicy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DeliveryPolicyPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const brandId = user?.brandId;

  const [holidays, setHolidays] = useState<DeliveryHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryHoliday | null>(null);
  const [form, setForm] = useState({ holidayDate: '', description: '' });

  const loadHolidays = useCallback(async () => {
    if (!brandId) return;
    try {
      setLoading(true);
      const res = await deliveryPolicyApi.getHolidays(brandId);
      setHolidays(res.data.data || []);
    } catch {
      toast.error(t('finance.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [brandId, t]);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);

  const handleCreate = async () => {
    if (!brandId || !form.holidayDate) return;
    try {
      await deliveryPolicyApi.createHoliday({
        brandId,
        holidayDate: form.holidayDate,
        description: form.description || undefined,
      });
      toast.success(t('common.success'));
      setDialogOpen(false);
      setForm({ holidayDate: '', description: '' });
      loadHolidays();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deliveryPolicyApi.deleteHoliday(deleteTarget.id);
      toast.success(t('common.success'));
      setDeleteTarget(null);
      loadHolidays();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const now = new Date();
  const upcomingHolidays = holidays.filter(h => new Date(h.holidayDate) >= now);
  const pastHolidays = holidays.filter(h => new Date(h.holidayDate) < now);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('nav.deliveryPolicy')}</h2>
        <Button
          className="bg-blue-800 hover:bg-blue-900"
          onClick={() => { setForm({ holidayDate: '', description: '' }); setDialogOpen(true); }}
        >
          + {t('deliveryPolicy.addHoliday')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <>
          {/* Upcoming holidays */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="font-medium text-sm">{t('deliveryPolicy.upcoming')} ({upcomingHolidays.length})</h3>
            </div>
            {upcomingHolidays.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t('deliveryPolicy.noHolidays')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('deliveryPolicy.date')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('deliveryPolicy.dayOfWeek')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('deliveryPolicy.description')}</th>
                    <th className="text-center px-4 py-3 font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upcomingHolidays.map(h => (
                    <tr key={h.id}>
                      <td className="px-4 py-3 font-medium">{h.holidayDate}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(h.holidayDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{h.description || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(h)}
                        >
                          {t('common.delete')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Past holidays */}
          {pastHolidays.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden opacity-60">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-medium text-sm">{t('deliveryPolicy.past')} ({pastHolidays.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('deliveryPolicy.date')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('deliveryPolicy.dayOfWeek')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('deliveryPolicy.description')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pastHolidays.map(h => (
                    <tr key={h.id}>
                      <td className="px-4 py-3">{h.holidayDate}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(h.holidayDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{h.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Create holiday dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deliveryPolicy.addHoliday')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t('deliveryPolicy.date')}</Label>
              <Input
                type="date"
                value={form.holidayDate}
                onChange={(e) => setForm({ ...form, holidayDate: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('deliveryPolicy.description')}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('deliveryPolicy.descPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button className="bg-blue-800 hover:bg-blue-900" onClick={handleCreate} disabled={!form.holidayDate}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deliveryPolicy.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.holidayDate} - {deleteTarget?.description || ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
