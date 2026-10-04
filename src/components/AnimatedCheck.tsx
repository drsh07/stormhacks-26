import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useReduceMotion } from '@/lib/motion';
import { colors, iconStroke } from '@/lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LENGTH = 24; // a little longer than the check's path, so it starts fully hidden

/** A checkmark that draws itself in when it appears (same shape as the Lucide check). */
export function AnimatedCheck({ size = 18, color = colors.moss }: { size?: number; color?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [reduce, progress]);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <AnimatedPath
        d="M20 6 9 17l-5-5"
        stroke={color}
        strokeWidth={iconStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={LENGTH}
        strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [LENGTH, 0] })}
      />
    </Svg>
  );
}
