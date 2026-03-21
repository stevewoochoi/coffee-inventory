import { useState, useEffect } from 'react';

/**
 * Detects mobile virtual keyboard visibility using:
 * 1. focusin/focusout events on input elements
 * 2. visualViewport API resize (reliable on iOS Safari)
 */
export function useKeyboardVisible(): boolean {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const inputSelector = 'input, textarea, select, [contenteditable="true"]';
    let focusedOnInput = false;

    const handleFocusIn = (e: FocusEvent) => {
      if ((e.target as Element)?.matches?.(inputSelector)) {
        focusedOnInput = true;
        setIsKeyboardVisible(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      if ((e.target as Element)?.matches?.(inputSelector)) {
        setTimeout(() => {
          const active = document.activeElement;
          if (!active || !active.matches(inputSelector)) {
            focusedOnInput = false;
            setIsKeyboardVisible(false);
          }
        }, 100);
      }
    };

    // visualViewport resize detects iOS keyboard more reliably
    const vv = window.visualViewport;
    const initialHeight = window.innerHeight;
    const handleViewportResize = () => {
      if (!vv) return;
      // Keyboard is considered open when viewport shrinks by >150px
      const keyboardOpen = initialHeight - vv.height > 150;
      if (keyboardOpen) {
        setIsKeyboardVisible(true);
      } else if (!focusedOnInput) {
        setIsKeyboardVisible(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    vv?.addEventListener('resize', handleViewportResize);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      vv?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  return isKeyboardVisible;
}
