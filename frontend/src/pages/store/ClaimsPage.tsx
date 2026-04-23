import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { claimsApi, type ClaimResponse, type ClaimSummary } from '@/api/claims';

const statusColor: Record<string, string> = {
  SUBMITTED: 'bg-slate-100 text-[#343741]',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const claimTypeColor: Record<string, string> = {
  DEFECTIVE: 'bg-red-100 text-red-800',
  WRONG_ITEM: 'bg-orange-100 text-orange-800',
  SHORTAGE: 'bg-amber-100 text-amber-800',
  DAMAGE: 'bg-rose-100 text-rose-800',
  QUALITY: 'bg-purple-100 text-purple-800',
  EXPIRY_ISSUE: 'bg-yellow-100 text-yellow-800',
  LABELING: 'bg-indigo-100 text-indigo-800',
  ORDER_ERROR: 'bg-orange-100 text-orange-800',
  DEFECTIVE_FOOD: 'bg-red-100 text-red-800',
  DEFECTIVE_NONFOOD: 'bg-pink-100 text-pink-800',
  FOREIGN_MATTER: 'bg-violet-100 text-violet-800',
  OVER_DELIVERY: 'bg-teal-100 text-teal-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

const STATUS_TABS = ['all', 'SUBMITTED', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const;

export default function ClaimsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const storeId = user?.storeId;

  const [claims, setClaims] = useState<ClaimResponse[]>([]);
  const [summary, setSummary] = useState<ClaimSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [monthFilter, setMonthFilter] = useState<string>('');

  useEffect(() => {
    loadClaims();
    loadSummary();
  }, []);

  async function loadClaims() {
    try {
      setLoading(true);
      const res = await claimsApi.getList(storeId);
      setClaims(res.data.data);
    } catch {
      toast.error(t('claims.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const res = await claimsApi.getSummary(storeId);
      setSummary(res.data.data);
    } catch {
      // silently fail
    }
  }

  const monthFiltered = monthFilter
    ? claims.filter(c => c.createdAt.substring(0, 7) === monthFilter)
    : claims;

  const filteredClaims = activeTab === 'all'
    ? monthFiltered
    : monthFiltered.filter(c => c.status === activeTab);

  const statusCounts = claims.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('claims.title')}</h2>
        <Button
          size="lg"
          className="bg-[#0077cc] hover:bg-[#005ea3] text-base px-6 py-3"
          onClick={() => navigate('/store/claims/new')}
        >
          {t('claims.newClaim')}
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-slate-300 bg-slate-50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-[#343741]">{summary.submitted}</div>
              <div className="text-xs text-[#69707d]">{t('claims.status.SUBMITTED')}</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-yellow-800">{summary.inReview}</div>
              <div className="text-xs text-yellow-600">{t('claims.status.IN_REVIEW')}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-green-800">{summary.resolved}</div>
              <div className="text-xs text-green-600">{t('claims.status.RESOLVED')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Month filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">{t('claims.monthFilter')}:</label>
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="h-9 rounded-md border border-input px-3 text-sm bg-background"
        />
        {monthFilter && (
          <button onClick={() => setMonthFilter('')} className="text-sm text-gray-400 hover:text-gray-600">
            {t('common.reset')}
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab === 'all' ? claims.length : (statusCounts[tab] || 0);
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
              {t(`claims.status.${tab}`)}
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

      {/* Claims list */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('claims.noClaims')}</div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <Card
              key={claim.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/store/claims/${claim.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">#{claim.id}</span>
                    <Badge className={claimTypeColor[claim.claimType] || ''}>
                      {t(`claims.type.${claim.claimType}`)}
                    </Badge>
                  </div>
                  <Badge className={statusColor[claim.status] || ''}>
                    {t(`claims.status.${claim.status}`)}
                  </Badge>
                </div>
                {claim.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{claim.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {claim.lines.length} {t('claims.itemCount')}
                    {claim.images.length > 0 && ` | ${claim.images.length} ${t('claims.photoCount')}`}
                  </span>
                  <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
