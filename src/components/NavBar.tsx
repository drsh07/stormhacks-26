import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderWidth, colors, fonts, spacing } from '@/lib/theme';

const TABS: { key: string; label: string; href: Href }[] = [
  { key: 'home', label: 'Week', href: '/home' },
  { key: 'people', label: 'People', href: '/people' },
  { key: 'meetups', label: 'Meetups', href: '/meetups' },
  { key: 'events', label: 'Events', href: '/events' },
];

/** Bottom navigation between the main screens. `current` is the active tab's key. */
export function NavBar({ current }: { current: 'home' | 'people' | 'meetups' | 'events' }) {
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
              <Text style={[styles.label, selected && { color: colors.white }]}>{tab.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
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
  pill: { minHeight: 40, paddingHorizontal: spacing.md, justifyContent: 'center', borderRadius: 999 },
  pillSelected: { backgroundColor: colors.cobalt },
  label: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
});
