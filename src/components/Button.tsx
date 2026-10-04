import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, fonts, radius, shadow } from '@/lib/theme';

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
  style?: StyleProp<ViewStyle>;
}

const BACKGROUND: Record<Variant, string> = {
  primary: colors.cobalt,
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

/** Ink outline + hard shadow. Pressing pushes the button into its shadow. */
export function Button({ label, onPress, variant = 'primary', size = 'md', disabled, loading, style }: Props) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!blocked, busy: !!loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BACKGROUND[variant], height: HEIGHT[size], paddingHorizontal: size === 'lg' ? 26 : 18 },
        pressed ? [shadow.none, styles.pressed] : shadow.hardSm,
        blocked && styles.blocked,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={FOREGROUND[variant]} />
      ) : (
        <Text style={[styles.label, { color: FOREGROUND[variant], fontSize: FONT_SIZE[size] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  blocked: { opacity: 0.5 },
  label: { fontFamily: fonts.displayBold },
});
