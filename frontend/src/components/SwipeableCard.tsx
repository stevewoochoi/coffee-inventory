import { useRef, useState, type ReactNode, type TouchEvent } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  className?: string;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Delete',
  rightLabel = 'Edit',
  leftColor = 'bg-red-500',
  rightColor = 'bg-blue-500',
  className = '',
}: SwipeableCardProps) {
  const startXRef = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startXRef.current;
    const clamped = Math.max(-120, Math.min(120, diff));
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    if (offsetX < -SWIPE_THRESHOLD && onSwipeLeft) {
      if (navigator.vibrate) navigator.vibrate(30);
      onSwipeLeft();
    } else if (offsetX > SWIPE_THRESHOLD && onSwipeRight) {
      if (navigator.vibrate) navigator.vibrate(30);
      onSwipeRight();
    }
    setOffsetX(0);
    setSwiping(false);
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {onSwipeRight && (
          <div className={`${rightColor} flex items-center px-4 text-white font-medium text-sm`}>
            {rightLabel}
          </div>
        )}
        <div className="flex-1" />
        {onSwipeLeft && (
          <div className={`${leftColor} flex items-center px-4 text-white font-medium text-sm`}>
            {leftLabel}
          </div>
        )}
      </div>

      {/* Foreground content */}
      <div
        className="relative bg-white transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
