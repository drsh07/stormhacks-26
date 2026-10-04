import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { borderWidth, colors, fonts, radius, spacing, type } from '@/lib/theme';

interface Props extends TextInputProps {
  label: string;
  /** Shown under the input in coral when set. */
  error?: string | null;
  hint?: string;
}

/** A labelled text input. */
export function Field({ label, error, hint, style, multiline, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={type.small}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.fog}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error ? { borderColor: colors.coral } : null, style]}
        {...rest}
      />
      {error ? <Text style={[type.small, { color: colors.coral }]}>{error}</Text> : null}
      {!error && hint ? <Text style={[type.small, { color: colors.fog }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: spacing.md },
});
