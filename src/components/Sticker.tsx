import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, fonts, iconStroke, radius, shadow } from '@/lib/theme';

interface Props {
  icon: LucideIcon;
  label: string;
  /** Degrees of tilt. Vary it between neighbours so they look hand-stuck. */
  tilt?: number;
  tone?: 'paper' | 'red' | 'ink';
}

/** A small tilted badge with a hard shadow, like a stamp on a quest poster. */
export function Sticker({ icon: Icon, label, tilt = -3, tone = 'paper' }: Props) {
  const background = tone === 'red' ? colors.primary : tone === 'ink' ? colors.ink : colors.paper;
  const foreground = tone === 'paper' ? colors.ink : colors.white;
  return (
    <View style={[styles.sticker, shadow.hardSm, { backgroundColor: background, transform: [{ rotate: `${tilt}deg` }] }]}>
      <Icon size={14} color={foreground} strokeWidth={iconStroke} />
      <Text style={[styles.text, { color: foreground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.sm,
  },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 13, flexShrink: 1 },
});
