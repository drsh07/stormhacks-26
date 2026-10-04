import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, fonts, iconStroke, radius, shadow } from '@/lib/theme';

interface Props {
  icon: LucideIcon;
  /** Read by screen readers, and shown as the tooltip on hover. Required: the button has no text. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

/** A button that is only an icon. Always has an accessible name and a hover tooltip. */
export function IconButton({ icon: Icon, label, onPress, disabled }: Props) {
  const [hovered, setHovered] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-label={label}
        disabled={disabled}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        hitSlop={6}
        style={({ pressed }) => [
          styles.button,
          pressed ? [shadow.none, styles.pressed] : hovered ? [shadow.hardLift, styles.lifted] : shadow.hardSm,
          disabled && { opacity: 0.5 },
        ]}>
        <Icon size={18} color={colors.ink} strokeWidth={iconStroke} />
      </Pressable>
      {hovered && (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  lifted: { transform: [{ translateX: -2 }, { translateY: -2 }] },
  tooltip: {
    position: 'absolute',
    top: 44,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
  },
  tooltipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.white },
});
