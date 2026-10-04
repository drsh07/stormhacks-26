import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/lib/motion';
import { borderWidth, colors, fonts, iconStroke, radius, shadow } from '@/lib/theme';

type Variant = 'primary' | 'quest' | 'secondary' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  /** Optional leading icon. Only for actions with a clear meaning (add, back, delete, edit). */
  icon?: LucideIcon;
  /** Rotate the icon a quarter turn on hover (used for the "add" plus). */
  spinIconOnHover?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BACKGROUND: Record<Variant, string> = {
  primary: colors.primary,
  quest: colors.quest,
  secondary: colors.paper,
  destructive: colors.coral,
};
const FOREGROUND: Record<Variant, string> = {
  primary: colors.white,
  quest: colors.ink,
  secondary: colors.ink,
  destructive: colors.white,
};
const HEIGHT: Record<Size, number> = { sm: 38, md: 46, lg: 56 };
const FONT_SIZE: Record<Size, number> = { sm: 14, md: 16, lg: 18 };
const ICON_SIZE: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

/**
 * Ink outline + hard shadow. Hovering lifts the button (the shadow grows);
 * pressing pushes it down into its shadow (the shadow collapses).
 */
export function Button({ label, onPress, variant = 'primary', size = 'md', disabled, loading, icon: Icon, spinIconOnHover, style }: Props) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!blocked, busy: !!loading }}
      disabled={blocked}
      onPress={onPress}
      style={(state) => {
        const hovered = (state as { hovered?: boolean }).hovered && !blocked;
        return [
          styles.base,
          { backgroundColor: BACKGROUND[variant], height: HEIGHT[size], paddingHorizontal: size === 'lg' ? 26 : 18 },
          state.pressed ? [shadow.none, styles.pressed] : hovered ? [shadow.hardLift, styles.lifted] : shadow.hardSm,
          blocked && styles.blocked,
          style,
        ];
      }}>
      {(state) =>
        loading ? (
          <ActivityIndicator color={FOREGROUND[variant]} />
        ) : (
          <>
            {Icon && (
              <Spin on={!!spinIconOnHover && !!(state as { hovered?: boolean }).hovered}>
                <Icon size={ICON_SIZE[size]} color={FOREGROUND[variant]} strokeWidth={iconStroke} />
              </Spin>
            )}
            <Text style={[styles.label, { color: FOREGROUND[variant], fontSize: FONT_SIZE[size] }]}>{label}</Text>
          </>
        )
      }
    </Pressable>
  );
}

/** Turns its child a quarter turn while `on` is true. */
function Spin({ on, children }: { on: boolean; children: React.ReactNode }) {
  const turn = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    Animated.timing(turn, { toValue: on ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [on, reduce, turn]);
  return (
    <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  lifted: { transform: [{ translateX: -2 }, { translateY: -2 }] },
  blocked: { opacity: 0.5 },
  label: { fontFamily: fonts.displayBold },
});
