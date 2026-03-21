import { useState, useEffect } from 'react';

/**
 * Detects mobile virtual keyboard visibility by listening to
 * focusin/focusout on input-like elements and visualViewport resize.
 */
export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const inputSelector = 'input, textarea, select, [contenteditable="true"]';

    const handleFocusIn = (e: FocusEvent) => {
      if ((e.target as Element)?.matches?.(inputSelector)) {
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if ((e.target as Element)?.matches?.(inputSelector)) {
        // Small delay to handle focus moving between inputs
        setTimeout(() => {
          const active = document.activeElement;
          if (!active || !active.matches(inputSelector)) {
            setIsKeyboardVisible(false);
          }
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return isKeyboardVisible;
}
