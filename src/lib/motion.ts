import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the person has asked their device for less motion. Animations should then be skipped. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancelled) setReduce(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
  return reduce;
}
