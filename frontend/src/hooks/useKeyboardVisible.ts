import { useState, useEffect, useRef } from 'react';

/**
 * Detects mobile virtual keyboard visibility.
 * Uses focusin/focusout + visualViewport resize for iOS compatibility.
 * Returns true when keyboard is open (input focused), false when closed.
 */
export function useKeyboardVisible(): boolean {
  const [hidden, setHidden] = useState(false);
  const inputFocused = useRef(false);

  useEffect(() => {
    const inputSelector = 'input, textarea, [contenteditable="true"]';

    const show = () => { inputFocused.current = true; setHidden(true); };
    const hide = () => { inputFocused.current = false; setHidden(false); };

    const handleFocusIn = (e: FocusEvent) => {
      if ((e.target as Element)?.matches?.(inputSelector)) {
        show();
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if ((e.target as Element)?.matches?.(inputSelector)) {
        // Delay to allow focus to move between inputs without flicker
        setTimeout(() => {
          const active = document.activeElement;
          if (!active || active === document.body || !active.matches(inputSelector)) {
            hide();
          }
        }, 150);
      }
    };

    // iOS Safari: visualViewport resize is the most reliable signal
    const vv = window.visualViewport;
    let baseHeight = vv?.height ?? window.innerHeight;

    const handleResize = () => {
      if (!vv) return;
      const diff = baseHeight - vv.height;
      if (diff > 100) {
        setHidden(true);
      } else if (!inputFocused.current) {
        setHidden(false);
      }
    };

    // Update base height on orientation change
    const handleOrientationChange = () => {
      setTimeout(() => { baseHeight = vv?.height ?? window.innerHeight; }, 500);
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    vv?.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      vv?.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return hidden;
}
