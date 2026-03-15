import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { claimsApi, type ClaimResponse } from '@/api/claims';

const statusColor: Record<string, string> = {
  SUBMITTED: 'bg-slate-100 text-slate-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const TIMELINE_STEPS = ['SUBMITTED', 'IN_REVIEW', 'RESOLVED', 'CLOSED'];

function ClaimTimeline({ status }: { status: string }) {
  const { t } = useTranslation();
  const currentIdx = TIMELINE_STEPS.indexOf(status);

  return (
    <div className="flex items-center justify-between px-2">
      {TIMELINE_STEPS.map((step, idx) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                idx <= currentIdx
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {idx < currentIdx ? '\u2713' : idx + 1}
            </div>
            <span className={`text-xs mt-1 ${idx <= currentIdx ? 'text-slate-700 font-medium' : 'text-gray-400'}`}>
              {t(`claims.status.${step}`)}
            </span>
          </div>
          {idx < TIMELINE_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${idx < currentIdx ? 'bg-slate-700' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [claim, setClaim] = useState<ClaimResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    if (id) loadClaim(Number(id));
  }, [id]);

  async function loadClaim(claimId: number) {
    try {
      setLoading(true);
      const res = await claimsApi.getDetail(claimId);
      setClaim(res.data.data);
    } catch {
      toast.error(t('claims.detail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!claim) return;
    try {
      setResolving(true);
      const data: import('@/api/claims').ResolveClaimRequest = {
        status: 'RESOLVED',
        resolutionNote: resolutionNote || undefined,
        lines: claim.lines.map(line => ({
          claimLineId: line.id,
          acceptedQty: line.claimedQty,
        })),
      };
      const res = await claimsApi.resolve(claim.id, data);
      setClaim(res.data.data);
      setResolutionNote('');
      toast.success(t('claims.detail.resolveSuccess') ?? '클레임이 해결되었습니다.');
    } catch {
      toast.error(t('claims.detail.resolveFailed') ?? '클레임 해결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  if (!claim) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">{t('claims.detail.notFound')}</p>
        <Button onClick={() => navigate('/store/claims')}>{t('common.back')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="min-h-[44px]" onClick={() => navigate('/store/claims')}>
          {t('common.back')}
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">#{claim.id}</h2>
          <Badge className={statusColor[claim.status] || ''}>
            {t(`claims.status.${claim.status}`)}
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="py-4">
          <ClaimTimeline status={claim.status} />
        </CardContent>
      </Card>

      {/* Claim info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('claims.detail.info')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">{t('claims.detail.type')}</span>
              <p className="font-medium">{t(`claims.type.${claim.claimType}`)}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('claims.detail.created')}</span>
              <p className="font-medium">{new Date(claim.createdAt).toLocaleDateString()}</p>
            </div>
            {claim.orderPlanId && (
              <div>
                <span className="text-gray-500">{t('claims.detail.relatedOrder')}</span>
                <p className="font-medium cursor-pointer text-slate-600" onClick={() => navigate(`/store/ordering/${claim.orderPlanId}`)}>
                  #{claim.orderPlanId}
                </p>
              </div>
            )}
            {claim.resolvedAt && (
              <div>
                <span className="text-gray-500">{t('claims.detail.resolvedAt')}</span>
                <p className="font-medium">{new Date(claim.resolvedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {claim.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('claims.detail.description')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{claim.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Requested action */}
      {claim.requestedAction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('claims.detail.requestedAction')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{claim.requestedAction}</p>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      {claim.lines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('claims.detail.items')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2">{t('claims.detail.itemName')}</th>
                    <th className="text-right py-2">{t('claims.detail.claimedQty')}</th>
                    {claim.lines.some(l => l.acceptedQty !== null) && (
                      <th className="text-right py-2">{t('claims.detail.acceptedQty')}</th>
                    )}
                    <th className="text-left py-2">{t('claims.detail.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {claim.lines.map((line) => (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="py-2">
                        {line.itemName}
                        {line.packName && <span className="text-gray-400 text-xs ml-1">({line.packName})</span>}
                      </td>
                      <td className="py-2 text-right font-medium">{line.claimedQty}</td>
                      {claim.lines.some(l => l.acceptedQty !== null) && (
                        <td className="py-2 text-right font-medium text-green-600">
                          {line.acceptedQty ?? '-'}
                        </td>
                      )}
                      <td className="py-2 text-gray-500">{line.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {claim.images.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('claims.detail.photos')} ({claim.images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {claim.images.map((img) => (
                <div key={img.id} className="border rounded-lg overflow-hidden">
                  <img
                    src={img.imageUrl}
                    alt={`Claim ${claim.id} photo`}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTI4IiBmaWxsPSIjZTVlN2ViIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyOCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOWNhM2FmIiBmb250LXNpemU9IjE0Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  <p className="text-xs text-gray-400 p-1">{new Date(img.uploadedAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolve action */}
      {(claim.status === 'SUBMITTED' || claim.status === 'IN_REVIEW') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('claims.detail.resolveAction') ?? '클레임 해결'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder={t('claims.detail.resolutionNotePlaceholder') ?? '해결 내용을 입력하세요'}
              className="w-full border rounded-lg p-3 text-sm min-h-[80px] resize-y"
            />
            <Button
              className="w-full bg-green-600 hover:bg-green-700 min-h-[44px]"
              onClick={handleResolve}
              disabled={resolving}
            >
              {resolving ? t('common.processing') ?? '처리 중...' : t('claims.detail.resolve') ?? '해결 완료'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resolution note */}
      {claim.resolutionNote && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800">{t('claims.detail.resolution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700">{claim.resolutionNote}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
