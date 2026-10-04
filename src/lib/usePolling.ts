import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Runs `fn` once when the screen comes into view, then every `ms`
 * milliseconds while it stays in view and `enabled` is true.
 * This is how meetup status updates arrive: plain polling, no websockets.
 */
export function usePolling(fn: () => void, ms: number, enabled = true) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  }, [fn]);

  useFocusEffect(
    useCallback(() => {
      latest.current();
      if (!enabled) return;
      const timer = setInterval(() => latest.current(), ms);
      return () => clearInterval(timer);
    }, [ms, enabled]),
  );
}
