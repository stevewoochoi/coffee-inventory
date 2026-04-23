import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cycleCountApi, type CycleCountSession } from '@/api/inventory';

const GRADE_OPTIONS = ['A', 'B', 'C'] as const;
const ZONE_OPTIONS = ['REFRIGERATED', 'FROZEN', 'AMBIENT', 'SUPPLIES'] as const;

const gradeGuides: Record<string, string> = {
  A: 'cycleCount.guideA',
  B: 'cycleCount.guideB',
  C: 'cycleCount.guideC',
};

export default function CycleCountPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const storeId = user?.storeId;
  const { t } = useTranslation();

  const [activeSessions, setActiveSessions] = useState<CycleCountSession[]>([]);
  const [history, setHistory] = useState<CycleCountSession[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('A');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [activeRes, historyRes] = await Promise.all([
        cycleCountApi.getActiveSessions(storeId),
        cycleCountApi.getHistory(storeId, 0, 5),
      ]);
      setActiveSessions(activeRes.data.data);
      setHistory(historyRes.data.data?.content || []);
    } catch { /* ignore */ }
  }

  async function handleStart() {
    setStarting(true);
    try {
      const res = await cycleCountApi.startSession(
        storeId, selectedGrade, selectedZone || undefined, user?.userId
      );
      toast.success(t('cycleCount.startSession'));
      navigate(`/store/cycle-count/${res.data.data.id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t('cycleCount.title')}</h2>

      {/* Active sessions banner */}
      {activeSessions.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            {activeSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-amber-800">{t('cycleCount.inProgress')}</p>
                  <p className="text-sm text-amber-600">
                    {s.gradeFilter && `${s.gradeFilter}${t('operational.itemGrade')}`}
                    {s.zoneFilter && ` / ${s.zoneFilter}`}
                    {' - '}{s.completedCount}/{s.itemCount}
                  </p>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 min-h-[44px]"
                  onClick={() => navigate(`/store/cycle-count/${s.id}`)}>
                  {t('cycleCount.continueSession')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Start new session */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('cycleCount.startSession')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grade selection */}
          <div>
            <p className="text-sm font-medium mb-2">{t('cycleCount.gradeFilter')}</p>
            <div className="flex gap-2">
              {GRADE_OPTIONS.map((g) => (
                <button key={g} onClick={() => setSelectedGrade(g)}
                  className={`flex-1 px-3 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    selectedGrade === g ? 'border-slate-700 bg-[#0077cc] text-white' : 'border-gray-200 hover:border-slate-400'
                  }`}>
                  {t(`operational.grade${g}`)}
                </button>
              ))}
            </div>
            {selectedGrade && gradeGuides[selectedGrade] && (
              <p className="text-xs text-gray-500 mt-2">{t(gradeGuides[selectedGrade])}</p>
            )}
          </div>

          {/* Zone selection (optional) */}
          <div>
            <p className="text-sm font-medium mb-2">{t('cycleCount.zoneFilter')} ({t('common.noData').replace(/데이터|data|データ/gi, '')})</p>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setSelectedZone(null)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  !selectedZone ? 'border-slate-700 bg-slate-100 text-[#343741]' : 'border-gray-200 hover:border-gray-300'
                }`}>{t('cycleCount.all')}</button>
              {ZONE_OPTIONS.map((z) => (
                <button key={z} onClick={() => setSelectedZone(z)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    selectedZone === z ? 'border-slate-700 bg-slate-100 text-[#343741]' : 'border-gray-200 hover:border-gray-300'
                  }`}>{t(`operational.${z.toLowerCase()}`)}</button>
              ))}
            </div>
          </div>

          <Button className="w-full h-12 bg-[#0077cc] hover:bg-[#005ea3] text-base"
            onClick={handleStart} disabled={starting}>
            {starting ? t('common.processing') : t('cycleCount.startSession')}
          </Button>
        </CardContent>
      </Card>

      {/* Recent history */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('cycleCount.recentHistory')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0"
                onClick={() => navigate(`/store/cycle-count/${s.id}`)}>
                <div>
                  <span className="text-sm font-medium">
                    {s.gradeFilter || t('cycleCount.all')} {s.zoneFilter ? `/ ${s.zoneFilter}` : ''}
                  </span>
                  <p className="text-xs text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString()} - {s.completedCount}/{s.itemCount}
                  </p>
                </div>
                <Badge className={s.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {s.status === 'COMPLETED' ? t('cycleCount.completed') : t('cycleCount.inProgress')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
