import { StyleSheet, View, type ViewProps } from 'react-native';

import { borderWidth, colors, radius, shadow, spacing } from '@/lib/theme';

interface Props extends ViewProps {
  /** "quest" is the yellow quest-log card. Use it for quests only. */
  tone?: 'paper' | 'quest';
}

/** The sticker card: ink outline, hard offset shadow. */
export function Card({ tone = 'paper', style, ...rest }: Props) {
  return (
    <View
      style={[styles.card, shadow.hard, { backgroundColor: tone === 'quest' ? colors.quest : colors.paper }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
