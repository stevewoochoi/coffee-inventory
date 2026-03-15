import { useTranslation } from 'react-i18next';

interface TimelineStep {
  label: string;
  date: string | null;
  active: boolean;
  completed: boolean;
}

interface OrderTimelineProps {
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
}

const statusOrder = ['DRAFT', 'CONFIRMED', 'DISPATCHED', 'DELIVERED'];

export default function OrderTimeline({ status, createdAt, confirmedAt, dispatchedAt, receivedAt }: OrderTimelineProps) {
  const { t } = useTranslation();

  const currentIndex = statusOrder.indexOf(status);
  // For PARTIALLY_RECEIVED, treat as between DISPATCHED and DELIVERED
  const effectiveIndex = status === 'PARTIALLY_RECEIVED' ? 2.5 : currentIndex;

  const steps: TimelineStep[] = [
    {
      label: t('ordering.timeline.created'),
      date: createdAt,
      active: effectiveIndex === 0,
      completed: effectiveIndex > 0,
    },
    {
      label: t('ordering.timeline.confirmed'),
      date: confirmedAt,
      active: effectiveIndex === 1,
      completed: effectiveIndex > 1,
    },
    {
      label: t('ordering.timeline.dispatched'),
      date: dispatchedAt,
      active: effectiveIndex >= 2 && effectiveIndex < 3,
      completed: effectiveIndex >= 3,
    },
    {
      label: t('ordering.timeline.received'),
      date: receivedAt,
      active: effectiveIndex === 3,
      completed: effectiveIndex >= 3,
    },
  ];

  return (
    <div className="flex items-center w-full py-2">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                step.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : step.active
                    ? 'bg-slate-500 border-slate-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}
            >
              {step.completed ? '✓' : idx + 1}
            </div>
            <span className={`text-xs mt-1 ${step.completed || step.active ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
            {step.date && (
              <span className="text-[10px] text-gray-400">
                {new Date(step.date).toLocaleDateString()}
              </span>
            )}
          </div>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${step.completed ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
