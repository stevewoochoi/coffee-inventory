import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { auditApi, type AuditResponse, type AuditSummary } from '@/api/audit';

const statusColor: Record<string, string> = {
  IN_PROGRESS: 'bg-slate-100 text-[#343741]',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const STATUS_TABS = ['all', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export default function AuditListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;

  const [audits, setAudits] = useState<AuditResponse[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    loadAudits();
    loadSummary();
  }, []);

  async function loadAudits() {
    try {
      setLoading(true);
      const res = await auditApi.getList(storeId);
      setAudits(res.data.data);
    } catch {
      toast.error(t('audit.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const res = await auditApi.getSummary(storeId);
      setSummary(res.data.data);
    } catch {
      // silently fail
    }
  }

  async function handleCreate() {
    try {
      setCreating(true);
      const res = await auditApi.create(storeId);
      toast.success(t('audit.createSuccess'));
      navigate(`/store/inventory/audit/${res.data.data.id}`);
    } catch {
      toast.error(t('audit.createFailed'));
    } finally {
      setCreating(false);
    }
  }

  const filteredAudits = activeTab === 'all'
    ? audits
    : audits.filter(a => a.status === activeTab);

  const statusCounts = audits.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('audit.title')}</h2>
        <Button
          size="lg"
          className="bg-[#0077cc] hover:bg-[#005ea3] text-base px-6 py-3"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? t('common.loading') : t('audit.newAudit')}
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-slate-300 bg-slate-50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-[#343741]">{summary.inProgress}</div>
              <div className="text-xs text-[#69707d]">{t('audit.status.IN_PROGRESS')}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-green-800">{summary.completed}</div>
              <div className="text-xs text-green-600">{t('audit.status.COMPLETED')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
              <div className="text-xs text-gray-600">{t('audit.total')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'all' ? audits.length : (statusCounts[tab] || 0);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap flex items-center gap-1 transition-colors ${
                activeTab === tab
                  ? 'bg-[#0077cc] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`audit.status.${tab}`)}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-[#0077cc]' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Audit list */}
      {filteredAudits.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('audit.noAudits')}</div>
      ) : (
        <div className="space-y-3">
          {filteredAudits.map((audit) => {
            const countedLines = audit.lines.filter(l => l.actualQty !== null).length;
            const totalLines = audit.lines.length;
            const diffLines = audit.lines.filter(l => l.difference !== null && l.difference !== 0).length;

            return (
              <Card
                key={audit.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/store/inventory/audit/${audit.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">#{audit.id}</span>
                      <Badge className={statusColor[audit.status] || ''}>
                        {t(`audit.status.${audit.status}`)}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">{audit.auditDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {t('audit.progress')}: {countedLines}/{totalLines}
                    </span>
                    {audit.status === 'COMPLETED' && diffLines > 0 && (
                      <span className="text-amber-600 font-medium">
                        {diffLines} {t('audit.differences')}
                      </span>
                    )}
                  </div>
                  {audit.status === 'IN_PROGRESS' && totalLines > 0 && (
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0077cc] rounded-full transition-all"
                        style={{ width: `${Math.round((countedLines / totalLines) * 100)}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
