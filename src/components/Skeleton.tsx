import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/lib/motion';
import { borderWidth, colors, radius, spacing } from '@/lib/theme';

/** One pulsing grey bar. */
function Bar({ width, height = 14 }: { width: `${number}%`; height?: number }) {
  return <View style={[styles.bar, { width, height }]} />;
}

/** Placeholder cards shown while a list loads, shaped like the cards that will replace them. */
export function SkeletonList({ count = 3, label }: { count?: number; label: string }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  const reduce = useReduceMotion();

  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  return (
    <Animated.View style={[styles.list, { opacity: pulse }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <Bar width="45%" height={18} />
          <Bar width="80%" />
          <Bar width="65%" />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth,
    borderColor: colors.muted,
    borderRadius: radius.xl,
    backgroundColor: colors.paper,
  },
  bar: { borderRadius: 7, backgroundColor: colors.muted },
});
