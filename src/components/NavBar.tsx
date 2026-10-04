import { useRouter, type Href } from 'expo-router';
import { CalendarDays, Handshake, Ticket, Users, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/lib/motion';
import { borderWidth, colors, fonts, iconStroke, spacing } from '@/lib/theme';

type TabKey = 'home' | 'people' | 'meetups' | 'events';

const TABS: { key: TabKey; label: string; href: Href; icon: LucideIcon }[] = [
  { key: 'home', label: 'Week', href: '/home', icon: CalendarDays },
  { key: 'people', label: 'People', href: '/people', icon: Users },
  { key: 'meetups', label: 'Meetups', href: '/meetups', icon: Handshake },
  { key: 'events', label: 'Events', href: '/events', icon: Ticket },
];

/** Bottom navigation between the main screens. `current` is the active tab's key. */
export function NavBar({ current }: { current: TabKey }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.key === current;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) router.replace(tab.href);
            }}
            style={styles.tab}>
            <View style={[styles.pill, selected && styles.pillSelected]}>
              <Bounce active={selected}>
                <tab.icon size={20} color={selected ? colors.white : colors.ink} strokeWidth={iconStroke} />
              </Bounce>
              <Text style={[styles.label, selected && { color: colors.white }]}>{tab.label}</Text>
            </View>
          </Pressable>
        );
      })}
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
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: 2,
    backgroundColor: colors.paper,
    borderTopWidth: borderWidth,
    borderTopColor: colors.ink,
  },
  tab: { flex: 1, alignItems: 'center' },
  pill: { alignItems: 'center', gap: 2, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 4, justifyContent: 'center', borderRadius: 14 },
  pillSelected: { backgroundColor: colors.primary },
  label: { fontFamily: fonts.displayBold, fontSize: 12, color: colors.ink },
});
