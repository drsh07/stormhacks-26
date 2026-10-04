import { AlertCircle, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { borderWidth, colors, fonts, iconStroke, radius, spacing, type } from '@/lib/theme';

import { AnimatedCheck } from './AnimatedCheck';

interface Props extends TextInputProps {
  label: string;
  /** Shown under the input, with an alert icon, when set. */
  error?: string | null;
  hint?: string;
  /** Leading icon inside the field. */
  icon?: LucideIcon;
  /** Shows a checkmark that draws itself in. */
  valid?: boolean;
}

/** A labelled text input with an optional leading icon and inline validation. */
export function Field({ label, error, hint, icon: Icon, valid, style, multiline, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={type.small}>{label}</Text>
      <View style={[styles.box, multiline && styles.boxMultiline, error ? { borderColor: colors.coral } : null]}>
        {Icon && <Icon size={18} color={colors.fog} strokeWidth={iconStroke} />}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.fog}
          multiline={multiline}
          style={[styles.input, multiline && styles.multiline, style]}
          {...rest}
        />
        {valid && !error && <AnimatedCheck />}
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {!error && hint ? <Text style={[type.small, { color: colors.fog }]}>{hint}</Text> : null}
    </View>
  );
}

/** An inline error line: alert icon plus message. */
export function ErrorText({ children }: { children: string }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <AlertCircle size={16} color={colors.coral} strokeWidth={iconStroke} />
      <Text style={[type.small, styles.errorText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  boxMultiline: { alignItems: 'flex-start', paddingTop: spacing.sm },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  errorText: { flex: 1, color: colors.coral },
});
