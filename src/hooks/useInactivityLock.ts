import { useEffect } from 'react';

export const useInactivityLock = (timeoutMinutes: number, onLock: () => void) => {
  useEffect(() => {
    if (timeoutMinutes <= 0) return;

    let timer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(onLock, timeoutMinutes * 60 * 1000);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [timeoutMinutes, onLock]);
};
