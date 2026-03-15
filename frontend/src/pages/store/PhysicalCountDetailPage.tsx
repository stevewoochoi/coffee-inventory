import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { physicalCountApi, type PhysicalCount, type PhysicalCountLine } from '@/api/physicalCount';

function GapDisplay({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="text-gray-400">-</span>;
  if (gap > 0) return <span className="text-green-600 font-bold">+{gap}</span>;
  if (gap < 0) return <span className="text-red-600 font-bold">{gap}</span>;
  return <span className="text-gray-500 font-medium">0</span>;
}

export default function PhysicalCountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [count, setCount] = useState<PhysicalCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await physicalCountApi.getById(Number(id));
      setCount(res.data.data);
    } catch {
      toast.error(t('physicalCount.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (line: PhysicalCountLine) => {
    if (!count || !inputValue) return;
    try {
      await physicalCountApi.updateLine(count.id, line.id, {
        actualQty: parseFloat(inputValue),
      });
      setEditingLine(null);
      setInputValue('');
      load();
    } catch {
      toast.error(t('physicalCount.saveFailed'));
    }
  };

  const handleComplete = async () => {
    if (!count) return;
    try {
      setCompleting(true);
      await physicalCountApi.complete(count.id);
      setShowConfirm(false);
      toast.success(t('physicalCount.countCompleted'));
      load();
    } catch {
      toast.error(t('physicalCount.completeFailed'));
    } finally {
      setCompleting(false);
    }
  };

  const allCounted = count?.lines.every((l) => l.actualQty !== null) ?? false;
  const isActive = count?.status === 'IN_PROGRESS';

  if (loading) {
    return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;
  }

  if (!count) {
    return <div className="text-center py-12 text-gray-500">{t('physicalCount.notFound')}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => navigate('/store/physical-count')}
            className="text-slate-600 text-sm mb-1 hover:underline">
            &larr; {t('physicalCount.backToList')}
          </button>
          <h2 className="text-xl font-bold">
            {t('physicalCount.detailTitle', { id: count.id })}
            <span className={`ml-3 px-2 py-0.5 text-xs font-bold rounded-full ${
              count.status === 'IN_PROGRESS' ? 'bg-slate-500 text-white' :
              count.status === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
            }`}>
              {count.status}
            </span>
          </h2>
          <p className="text-sm text-gray-500">{t('physicalCount.dateLabel')} {count.countDate}</p>
        </div>
        {isActive && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!allCounted}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 text-lg"
          >
            {t('physicalCount.completeCount')}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {count.lines.map((line) => {
          const isEditing = editingLine === line.id;
          const localGap = isEditing && inputValue
            ? parseFloat(inputValue) - line.systemQty
            : line.gapQty;

          return (
            <div key={line.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-lg">{t('inventory.itemPrefix', { id: line.itemId })}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {t('physicalCount.system')} <span className="font-medium text-gray-700">{line.systemQty}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[80px]">
                    <div className="text-xs text-gray-500">{t('physicalCount.gap')}</div>
                    <div className="text-lg"><GapDisplay gap={localGap} /></div>
                  </div>

                  {isActive ? (
                    isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          className="w-32 h-14 text-2xl text-center border-2 border-slate-400 rounded-lg focus:outline-none focus:border-slate-600"
                          autoFocus
                          inputMode="decimal"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave(line);
                            if (e.key === 'Escape') { setEditingLine(null); setInputValue(''); }
                          }}
                        />
                        <button
                          onClick={() => handleSave(line)}
                          className="px-4 h-14 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-600"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => { setEditingLine(null); setInputValue(''); }}
                          className="px-3 h-14 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingLine(line.id);
                          setInputValue(line.actualQty !== null ? String(line.actualQty) : '');
                        }}
                        className={`px-6 h-14 rounded-lg font-medium text-lg ${
                          line.actualQty !== null
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {line.actualQty !== null ? line.actualQty : t('physicalCount.countBtn')}
                      </button>
                    )
                  ) : (
                    <div className="text-center min-w-[80px]">
                      <div className="text-xs text-gray-500">{t('physicalCount.actual')}</div>
                      <div className="text-lg font-medium">{line.actualQty ?? '-'}</div>
                    </div>
                  )}
                </div>
              </div>
              {line.note && (
                <div className="mt-2 text-sm text-gray-500 italic">Note: {line.note}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-3">{t('physicalCount.completeTitle')}</h3>
            <p className="text-gray-600 mb-2">
              {t('physicalCount.completeMsg')}
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1">
              {count.lines.filter(l => l.gapQty !== null && l.gapQty !== 0).map((l) => (
                <div key={l.id} className="flex justify-between text-sm">
                  <span>{t('inventory.itemPrefix', { id: l.itemId })}</span>
                  <GapDisplay gap={l.gapQty} />
                </div>
              ))}
              {count.lines.every(l => l.gapQty === 0) && (
                <div className="text-sm text-gray-500 text-center">{t('physicalCount.noAdjustments')}</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {completing ? t('common.processing') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
