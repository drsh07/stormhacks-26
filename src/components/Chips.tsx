import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, fonts, radius, spacing, type } from '@/lib/theme';

interface Props<T extends string | number> {
  /** Optional label shown above the chips. */
  label?: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  /** Smaller chips, for dense rows like the class editor. */
  compact?: boolean;
  /** Custom text for an option. Defaults to the option itself. */
  format?: (option: T) => string;
}

/** Pick exactly one option from a short list. */
export function Chips<T extends string | number>({ label, options, value, onChange, compact, format }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={type.small}>{label}</Text> : null}
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={String(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              hitSlop={4}
              style={[styles.chip, compact && styles.compact, selected && styles.selected]}>
              <Text style={[styles.text, compact && styles.compactText, selected && { color: colors.white }]}>
                {format ? format(option) : String(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  compact: { minHeight: 34, paddingHorizontal: 10 },
  selected: { backgroundColor: colors.cobalt },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.ink },
  compactText: { fontSize: 13 },
});
