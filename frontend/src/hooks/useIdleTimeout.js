import { useEffect, useRef, useCallback } from 'react';

/**
 * A hook that triggers a callback after a specified period of inactivity.
 * It listens to user interaction events (mousemove, keydown, scroll, touchstart)
 * and resets the timer on each interaction.
 *
 * @param {Function} onIdle - The callback to execute when the user is idle.
 * @param {number} idleTimeMs - The duration of inactivity in milliseconds before triggering the callback. Default is 15 minutes.
 */
export const useIdleTimeout = (onIdle, idleTimeMs = 15 * 60 * 1000) => {
  const timeoutRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onIdle();
    }, idleTimeMs);
  }, [onIdle, idleTimeMs]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleEvent = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    // Start the timer on mount
    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [resetTimer]);
};

export default useIdleTimeout;
