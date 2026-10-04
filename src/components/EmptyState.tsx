import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, iconStroke, radius, shadow, spacing, type } from '@/lib/theme';

import { Button } from './Button';
import { Enter } from './Enter';

interface Props {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
}

/** What a screen shows when there is nothing to list: a large icon, why, and what to do next. */
export function EmptyState({ icon: Icon, title, message, action }: Props) {
  return (
    <Enter>
      <View style={[styles.card, shadow.hard]}>
        <View style={styles.badge}>
          <Icon size={36} color={colors.ink} strokeWidth={iconStroke} />
        </View>
        <Text style={[type.heading, styles.center]}>{title}</Text>
        <Text style={[type.body, styles.center, { color: colors.fog }]}>{message}</Text>
        {action && <Button label={action.label} onPress={action.onPress} style={{ alignSelf: 'center' }} />}
      </View>
    </Enter>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.xl,
    backgroundColor: colors.paper,
  },
  badge: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: 36,
    backgroundColor: colors.chalk,
    transform: [{ rotate: '-6deg' }],
  },
  center: { textAlign: 'center' },
});
