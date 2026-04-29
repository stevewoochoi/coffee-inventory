import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { warehouseApi } from '@/api/warehouse';

const GRADE_OPTIONS = [
  { value: '', labelKey: 'cycleCount.all', defaultValue: '전체' },
  { value: 'A', labelKey: 'operational.gradeA', defaultValue: 'A' },
  { value: 'B', labelKey: 'operational.gradeB', defaultValue: 'B' },
  { value: 'C', labelKey: 'operational.gradeC', defaultValue: 'C' },
] as const;

const ZONE_OPTIONS = [
  { value: '', labelKey: 'cycleCount.all', defaultValue: '전체' },
  { value: 'AMBIENT', labelKey: 'operational.ambient', defaultValue: '상온' },
  { value: 'REFRIG', labelKey: 'operational.refrig', defaultValue: '냉장' },
  { value: 'FROZEN', labelKey: 'operational.frozen', defaultValue: '냉동' },
  { value: 'SUPPLIES', labelKey: 'operational.supplies', defaultValue: '비품' },
] as const;

export default function WarehouseCycleCountNewPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const warehouseIdParam = searchParams.get('warehouseId');
  const warehouseId = warehouseIdParam ? Number(warehouseIdParam) : null;

  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [starting, setStarting] = useState(false);

  if (!warehouseId || Number.isNaN(warehouseId)) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/warehouse-inventory')}>
          {t('common.back', { defaultValue: '< 뒤로' })}
        </Button>
        <div className="text-center py-12 text-gray-500">
          {t('warehouse.warehouseIdRequired', { defaultValue: '창고 ID가 필요합니다 (?warehouseId=N)' })}
        </div>
      </div>
    );
  }

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await warehouseApi.startCycleCount(
        warehouseId,
        gradeFilter || undefined,
        zoneFilter || undefined
      );
      const sessionId = res.data.data.id;
      toast.success(t('cycleCount.startSession', { defaultValue: '실사 시작' }));
      navigate(`/admin/warehouse-inventory/cycle-count/${sessionId}?warehouseId=${warehouseId}`);
    } catch {
      toast.error(t('common.error', { defaultValue: '오류가 발생했습니다' }));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/warehouse-inventory?warehouseId=${warehouseId}`)}
        >
          {t('common.back', { defaultValue: '< 뒤로' })}
        </Button>
        <h2 className="text-xl font-bold">
          {t('warehouse.cycleCountNew', { defaultValue: '신규 실사' })}
        </h2>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('cycleCount.startSession', { defaultValue: '실사 시작' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grade filter */}
          <div>
            <p className="text-sm font-medium mb-2">
              {t('cycleCount.gradeFilter', { defaultValue: '등급 필터' })}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {GRADE_OPTIONS.map((opt) => (
                <label
                  key={`grade-${opt.value}`}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium border-2 transition-colors cursor-pointer ${
                    gradeFilter === opt.value
                      ? 'border-[#0077cc] bg-[#0077cc] text-white'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="grade"
                    value={opt.value}
                    checked={gradeFilter === opt.value}
                    onChange={() => setGradeFilter(opt.value)}
                    className="sr-only"
                  />
                  <span>{t(opt.labelKey, { defaultValue: opt.defaultValue })}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Zone filter */}
          <div>
            <p className="text-sm font-medium mb-2">
              {t('cycleCount.zoneFilter', { defaultValue: '보관 구역 필터' })}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ZONE_OPTIONS.map((opt) => (
                <label
                  key={`zone-${opt.value}`}
                  className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-medium border-2 transition-colors cursor-pointer ${
                    zoneFilter === opt.value
                      ? 'border-[#0077cc] bg-[#0077cc] text-white'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="zone"
                    value={opt.value}
                    checked={zoneFilter === opt.value}
                    onChange={() => setZoneFilter(opt.value)}
                    className="sr-only"
                  />
                  <span>{t(opt.labelKey, { defaultValue: opt.defaultValue })}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            className="w-full h-12 bg-[#0077cc] hover:bg-[#005ea3] text-base"
            onClick={handleStart}
            disabled={starting}
          >
            {starting
              ? t('common.processing', { defaultValue: '처리 중...' })
              : t('cycleCount.startSession', { defaultValue: '실사 시작' })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
