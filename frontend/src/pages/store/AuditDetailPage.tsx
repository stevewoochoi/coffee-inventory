import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { auditApi, type AuditResponse, type AuditLineResponse } from '@/api/audit';

const statusColor: Record<string, string> = {
  IN_PROGRESS: 'bg-slate-100 text-[#343741]',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'counted' | 'uncounted' | 'difference'>('all');
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');

  useEffect(() => {
    if (id) loadAudit(Number(id));
  }, [id]);

  async function loadAudit(auditId: number) {
    try {
      setLoading(true);
      const res = await auditApi.getDetail(auditId);
      setAudit(res.data.data);
    } catch {
      toast.error(t('audit.detail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateLine(lineId: number) {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty < 0) {
      toast.error(t('audit.detail.invalidQty'));
      return;
    }
    try {
      await auditApi.updateLine(lineId, qty, editNote || undefined);
      toast.success(t('audit.detail.lineUpdated'));
      setEditingLine(null);
      if (id) loadAudit(Number(id));
    } catch {
      toast.error(t('audit.detail.updateFailed'));
    }
  }

  async function handleComplete() {
    if (!id) return;
    try {
      await auditApi.complete(Number(id));
      toast.success(t('audit.detail.completed'));
      loadAudit(Number(id));
    } catch {
      toast.error(t('audit.detail.completeFailed'));
    }
  }

  async function handleCancel() {
    if (!id) return;
    try {
      await auditApi.cancel(Number(id));
      toast.success(t('audit.detail.cancelled'));
      navigate('/store/inventory/audit');
    } catch {
      toast.error(t('audit.detail.cancelFailed'));
    }
  }

  function startEditing(line: AuditLineResponse) {
    setEditingLine(line.id);
    setEditQty(line.actualQty?.toString() ?? '');
    setEditNote(line.note ?? '');
  }

  const filteredLines = useMemo(() => {
    if (!audit) return [];
    let lines = audit.lines;

    if (search) {
      const q = search.toLowerCase();
      lines = lines.filter(l => l.itemName.toLowerCase().includes(q));
    }

    switch (filter) {
      case 'counted':
        lines = lines.filter(l => l.actualQty !== null);
        break;
      case 'uncounted':
        lines = lines.filter(l => l.actualQty === null);
        break;
      case 'difference':
        lines = lines.filter(l => l.difference !== null && l.difference !== 0);
        break;
    }

    return lines;
  }, [audit, search, filter]);

  const stats = useMemo(() => {
    if (!audit) return { total: 0, counted: 0, uncounted: 0, diffs: 0 };
    const total = audit.lines.length;
    const counted = audit.lines.filter(l => l.actualQty !== null).length;
    const diffs = audit.lines.filter(l => l.difference !== null && l.difference !== 0).length;
    return { total, counted, uncounted: total - counted, diffs };
  }, [audit]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  if (!audit) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">{t('audit.detail.notFound')}</p>
        <Button onClick={() => navigate('/store/inventory/audit')}>{t('common.back')}</Button>
      </div>
    );
  }

  const isInProgress = audit.status === 'IN_PROGRESS';
  const isCompleted = audit.status === 'COMPLETED';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/store/inventory/audit')}>
          {t('common.back')}
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">#{audit.id}</h2>
          <Badge className={statusColor[audit.status] || ''}>
            {t(`audit.status.${audit.status}`)}
          </Badge>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">{t('audit.detail.date')}</span>
              <p className="font-medium">{audit.auditDate}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('audit.detail.created')}</span>
              <p className="font-medium">{new Date(audit.createdAt).toLocaleString()}</p>
            </div>
            {audit.completedAt && (
              <div>
                <span className="text-gray-500">{t('audit.detail.completedAt')}</span>
                <p className="font-medium">{new Date(audit.completedAt).toLocaleString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress / Summary */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="py-3 text-center">
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-500">{t('audit.detail.totalItems')}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="py-3 text-center">
            <div className="text-xl font-bold text-green-600">{stats.counted}</div>
            <div className="text-xs text-green-600">{t('audit.detail.counted')}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="py-3 text-center">
            <div className="text-xl font-bold text-gray-500">{stats.uncounted}</div>
            <div className="text-xs text-gray-500">{t('audit.detail.uncounted')}</div>
          </CardContent>
        </Card>
        <Card className={stats.diffs > 0 ? 'border-amber-200' : ''}>
          <CardContent className="py-3 text-center">
            <div className={`text-xl font-bold ${stats.diffs > 0 ? 'text-amber-600' : 'text-gray-500'}`}>{stats.diffs}</div>
            <div className="text-xs text-gray-500">{t('audit.differences')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {isInProgress && stats.total > 0 && (
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0077cc] rounded-full transition-all"
            style={{ width: `${Math.round((stats.counted / stats.total) * 100)}%` }}
          />
        </div>
      )}

      {/* Search & filter */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t('audit.detail.searchItems')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="border rounded-lg px-3 py-2 text-sm min-h-[44px]"
        >
          <option value="all">{t('audit.filter.all')}</option>
          <option value="counted">{t('audit.filter.counted')}</option>
          <option value="uncounted">{t('audit.filter.uncounted')}</option>
          <option value="difference">{t('audit.filter.difference')}</option>
        </select>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {filteredLines.map((line) => {
          const isEditing = editingLine === line.id;
          const hasDiff = line.difference !== null && line.difference !== 0;

          return (
            <Card key={line.id} className={hasDiff && isCompleted ? 'border-amber-200 bg-amber-50' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{line.itemName}</span>
                  {line.actualQty !== null ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">{t('audit.detail.counted')}</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-500 text-xs">{t('audit.detail.uncounted')}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('audit.detail.system')}: </span>
                    <span className="font-medium">{line.systemQty}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('audit.detail.actual')}: </span>
                    <span className="font-medium">{line.actualQty ?? '-'}</span>
                  </div>
                  {hasDiff && (
                    <div>
                      <span className="text-gray-500">{t('audit.detail.diff')}: </span>
                      <span className={`font-bold ${line.difference! > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {line.difference! > 0 ? '+' : ''}{line.difference}
                      </span>
                    </div>
                  )}
                </div>

                {line.note && (
                  <p className="text-xs text-gray-400 mt-1">{line.note}</p>
                )}

                {isInProgress && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 min-h-[40px]"
                    onClick={() => startEditing(line)}
                  >
                    {line.actualQty !== null ? t('audit.detail.edit') : t('audit.detail.count')}
                  </Button>
                )}

                {isEditing && (
                  <div className="mt-2 space-y-2 border-t pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16">{t('audit.detail.actual')}</label>
                      <input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        autoFocus
                      />
                    </div>
                    <input
                      type="text"
                      placeholder={t('audit.detail.notePlaceholder')}
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="min-h-[40px]" onClick={() => setEditingLine(null)}>
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[#0077cc] hover:bg-[#005ea3] min-h-[40px]"
                        onClick={() => handleUpdateLine(line.id)}
                      >
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      {isInProgress && (
        <div className="flex gap-2 pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="min-h-[48px] text-red-600 border-red-200">
                {t('audit.detail.cancelAudit')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('audit.detail.cancelTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('audit.detail.cancelDesc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                  {t('audit.detail.cancelAudit')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="flex-1 bg-[#0077cc] hover:bg-[#005ea3] min-h-[48px]"
                disabled={stats.uncounted > 0}
              >
                {t('audit.detail.completeAudit')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('audit.detail.completeTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('audit.detail.completeDesc', { diffs: stats.diffs })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleComplete}>
                  {t('audit.detail.completeAudit')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Completed summary */}
      {isCompleted && stats.diffs > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-800">{t('audit.detail.summaryTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">
              {t('audit.detail.summaryDesc', { total: stats.total, diffs: stats.diffs })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
