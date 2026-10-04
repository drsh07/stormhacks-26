import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

/**
 * Runs `fn` when the screen comes into view, then every `ms` milliseconds
 * while it stays in view and `enabled` is true. It also runs again right away
 * whenever `fn` itself changes (for example once the signed-in user has
 * loaded), so pass a function wrapped in useCallback.
 * This is how meetup status updates arrive: plain polling, no websockets.
 */
export function usePolling(fn: () => void, ms: number, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      fn();
      if (!enabled) return;
      const timer = setInterval(fn, ms);
      return () => clearInterval(timer);
    }, [fn, ms, enabled]),
  );
}
