import { CalendarDays, Handshake, Ticket, Users, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/lib/motion';
import { borderWidth, colors, fonts, iconStroke, spacing } from '@/lib/theme';

/** The main tabs, left to right. The order here decides which way screens slide. */
export const TABS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'home', label: 'Week', icon: CalendarDays },
  { name: 'people', label: 'People', icon: Users },
  { name: 'meetups', label: 'Meetups', icon: Handshake },
  { name: 'events', label: 'Events', icon: Ticket },
];

interface Props {
  /** Index of the active tab in TABS. */
  index: number;
  onSelect: (name: string) => void;
}

/**
 * Bottom navigation. The bar never moves; only the red indicator slides
 * across to the active tab.
 */
export function NavBar({ index, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const position = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (reduce) {
      position.setValue(index);
      return;
    }
    Animated.timing(position, { toValue: index, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [index, reduce, position]);

  const tabWidth = width / TABS.length;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.row} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.indicator, { width: tabWidth - 8, transform: [{ translateX: Animated.multiply(position, tabWidth) }] }]}
          />
        )}
        {TABS.map((tab, i) => {
          const selected = i === index;
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onSelect(tab.name)}
              style={styles.tab}>
              <Bounce active={selected}>
                <tab.icon size={20} color={selected ? colors.white : colors.ink} strokeWidth={iconStroke} />
              </Bounce>
              <Text style={[styles.label, selected && { color: colors.white }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A small hop when a tab becomes the selected one. */
function Bounce({ active, children }: { active: boolean; children: React.ReactNode }) {
  const y = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!active || reduce) return;
    y.setValue(-6);
    Animated.spring(y, { toValue: 0, friction: 4, tension: 200, useNativeDriver: true }).start();
  }, [active, reduce, y]);
  return <Animated.View style={{ transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.paper,
    borderTopWidth: borderWidth,
    borderTopColor: colors.ink,
  },
  row: { flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center' },
  indicator: { position: 'absolute', left: 4, top: 0, bottom: 0, borderRadius: 14, backgroundColor: colors.primary },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48, paddingVertical: 4 },
  label: { fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink },
});
