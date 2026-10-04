import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useReduceMotion } from '@/lib/motion';
import { colors } from '@/lib/theme';

const PIECES = 28;
const PALETTE = [colors.primary, colors.quest, colors.ink, colors.moss];

/**
 * A one-shot burst of paper squares falling down the screen. Render it once
 * at the moment worth celebrating. Shows nothing if reduced motion is on.
 */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const fall = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: Math.random() * Math.min(width, 560),
        drift: (Math.random() - 0.5) * 120,
        spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
        size: 8 + Math.random() * 8,
        color: PALETTE[i % PALETTE.length],
        start: -20 - Math.random() * 120,
      })),
    [width],
  );

  useEffect(() => {
    if (reduce) return;
    Animated.timing(fall, { toValue: 1, duration: 1600, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
  }, [reduce, fall]);

  if (reduce) return null;

  return (
    <View style={styles.layer} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.start,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderWidth: 1,
            borderColor: colors.ink,
            opacity: fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
              { translateX: fall.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', zIndex: 20 },
});
