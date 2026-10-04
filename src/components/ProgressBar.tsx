import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/lib/motion';
import { borderWidth, colors, spacing } from '@/lib/theme';

/** A segmented progress bar. The segment for the current step fills in with a short animation. */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const fill = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();

  useEffect(() => {
    if (reduce) {
      fill.setValue(1);
      return;
    }
    fill.setValue(0);
    Animated.timing(fill, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [step, reduce, fill]);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: step }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        return (
          <View key={n} style={styles.segment}>
            {n < step && <View style={[styles.fill, { width: '100%' }]} />}
            {n === step && (
              <Animated.View style={[styles.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    height: 14,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: 7,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.cobalt },
});
