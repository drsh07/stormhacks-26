import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/lib/motion';

interface Props {
  /** Position in a list. Each item starts a little after the one before it. */
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const STEP_MS = 60;
const MAX_DELAY_MS = 360;

/** Fades and slides its child up into place. Use with `index` for a staggered list. */
export function Enter({ index = 0, children, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index * STEP_MS, MAX_DELAY_MS),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, reduce, progress]);

  return (
    <Animated.View
      style={[
        style,
        { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}>
      {children}
    </Animated.View>
  );
}
