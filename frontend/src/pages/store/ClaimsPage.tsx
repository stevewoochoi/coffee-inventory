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
  SUBMITTED: 'bg-blue-100 text-blue-800',
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
  OTHER: 'bg-gray-100 text-gray-800',
};

const STATUS_TABS = ['all', 'SUBMITTED', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const;

export default function ClaimsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const storeId = user?.storeId ?? 1;

  const [claims, setClaims] = useState<ClaimResponse[]>([]);
  const [summary, setSummary] = useState<ClaimSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

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

  const filteredClaims = activeTab === 'all'
    ? claims
    : claims.filter(c => c.status === activeTab);

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
          className="bg-blue-800 hover:bg-blue-900 text-base px-6 py-3"
          onClick={() => navigate('/store/claims/new')}
        >
          {t('claims.newClaim')}
        </Button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-3 text-center">
              <div className="text-2xl font-bold text-blue-800">{summary.submitted}</div>
              <div className="text-xs text-blue-600">{t('claims.status.SUBMITTED')}</div>
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
                  ? 'bg-blue-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`claims.status.${tab}`)}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-blue-700' : 'bg-gray-200'
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
