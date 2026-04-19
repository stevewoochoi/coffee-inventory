import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cycleCountApi, type CycleCountSessionDetail, type CycleCountLine } from '@/api/inventory';

export default function CycleCountDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [session, setSession] = useState<CycleCountSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [applyAdjustments, setApplyAdjustments] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  async function loadSession() {
    try {
      const res = await cycleCountApi.getSession(Number(sessionId));
      setSession(res.data.data);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateLine(line: CycleCountLine, value: string) {
    const countedQty = value === '' ? null : parseFloat(value);
    try {
      await cycleCountApi.updateLine(Number(sessionId), line.id, countedQty);
      loadSession();
    } catch {
      toast.error(t('common.error'));
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await cycleCountApi.completeSession(Number(sessionId), applyAdjustments);
      toast.success(t('cycleCount.completed'));
      navigate('/store/cycle-count');
    } catch {
      toast.error(t('common.error'));
    } finally {
      setCompleting(false);
      setShowCompleteDialog(false);
    }
  }

  if (loading || !session) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  const isJa = i18n.language?.startsWith('ja');
  const uncountedCount = session.lines.filter(l => l.countedQty === null).length;
  const varianceCount = session.lines.filter(l => l.varianceQty && l.varianceQty !== 0).length;

  // Group lines by storageZone
  const grouped = session.lines.reduce((acc, line) => {
    const zone = line.storageZone || 'OTHER';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(line);
    return acc;
  }, {} as Record<string, CycleCountLine[]>);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('cycleCount.title')}</h2>
          <p className="text-sm text-gray-500">
            {session.gradeFilter && `${session.gradeFilter}${t('operational.itemGrade')}`}
            {session.zoneFilter && ` / ${session.zoneFilter}`}
          </p>
        </div>
        <Badge className={session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
          {session.completedCount}/{session.itemCount}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-[#0077cc] rounded-full transition-all"
          style={{ width: `${session.itemCount > 0 ? (session.completedCount / session.itemCount) * 100 : 0}%` }} />
      </div>

      {/* Lines grouped by zone */}
      {Object.entries(grouped).map(([zone, lines]) => (
        <div key={zone}>
          <h3 className="text-sm font-semibold text-gray-500 mb-2 uppercase">{zone}</h3>
          <div className="space-y-2">
            {lines.map((line) => {
              const hasVariance = line.varianceQty != null && line.varianceQty !== 0;
              return (
                <Card key={line.id} className={`border ${hasVariance ? 'border-amber-300 bg-amber-50' : ''}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {isJa && line.itemNameJa ? line.itemNameJa : line.itemName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('cycleCount.systemQty')}: {line.systemQty?.toFixed(1) ?? '0'} {line.stockUnit}
                        </p>
                        {hasVariance && (
                          <p className={`text-xs font-medium ${(line.varianceQty ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {t('cycleCount.variance')}: {(line.varianceQty ?? 0) > 0 ? '+' : ''}{line.varianceQty?.toFixed(1)} {line.stockUnit}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          className="w-24 h-11 text-center text-base font-bold"
                          placeholder="0"
                          defaultValue={line.countedQty?.toString() ?? ''}
                          onBlur={(e) => handleUpdateLine(line, e.target.value)}
                          disabled={session.status === 'COMPLETED'}
                        />
                        <span className="text-xs text-gray-500 w-8">{line.stockUnit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Bottom action bar */}
      {session.status !== 'COMPLETED' && (
        <div className="sticky bottom-[56px] md:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 -mx-4 px-4 z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
          <Button className="w-full h-12 bg-[#0077cc] hover:bg-[#005ea3] text-base"
            onClick={() => setShowCompleteDialog(true)}>
            {t('cycleCount.completeSession')}
            {varianceCount > 0 && ` (${varianceCount} ${t('cycleCount.variance')})`}
          </Button>
        </div>
      )}

      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cycleCount.confirmComplete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {uncountedCount > 0 && <p className="text-amber-600 mb-2">{uncountedCount} {t('cycleCount.itemsNotCounted')}</p>}
              {varianceCount > 0 && (
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={applyAdjustments}
                    onChange={(e) => setApplyAdjustments(e.target.checked)}
                    className="w-5 h-5" />
                  <span>{t('cycleCount.applyAdjustments')} ({varianceCount})</span>
                </label>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-[#0077cc] hover:bg-[#005ea3]"
              onClick={handleComplete} disabled={completing}>
              {completing ? t('common.processing') : t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
