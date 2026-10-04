import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { borderWidth, colors, fonts, iconStroke, radius, spacing, type } from '@/lib/theme';

import { AnimatedCheck } from './AnimatedCheck';
import { ErrorText } from './Field';

interface Props {
  label: string;
  /** The chosen option, or '' if nothing valid is chosen yet. */
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  error?: string | null;
  onBlur?: () => void;
  /** Leading icon inside the field. */
  icon?: LucideIcon;
}

const MAX_SHOWN = 6;

/**
 * A searchable dropdown: type to filter, tap to choose. The list opens under
 * the field (not as an overlay), so it scrolls with the form and never gets
 * clipped. Only values from `options` count as chosen.
 */
export function SearchSelect({ label, value, onChange, options, placeholder, error, onBlur, icon: Icon }: Props) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);

  const query = text.trim().toLowerCase();
  const matches = (query ? options.filter((o) => o.toLowerCase().includes(query)) : [...options]).slice(0, MAX_SHOWN);

  function type_(next: string) {
    setText(next);
    setOpen(true);
    // Typing an exact option name selects it; anything else clears the choice.
    const exact = options.find((o) => o.toLowerCase() === next.trim().toLowerCase());
    onChange(exact ?? '');
  }

  function choose(option: string) {
    setText(option);
    setOpen(false);
    onChange(option);
  }

  return (
    <View style={styles.wrap}>
      <Text style={type.small}>{label}</Text>
      <View style={[styles.box, error ? { borderColor: colors.coral } : null]}>
        {Icon && <Icon size={18} color={colors.fog} strokeWidth={iconStroke} />}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint="Type to search, then pick from the list"
          value={text}
          onChangeText={type_}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Wait a moment so a tap on an option registers before the list closes.
            setTimeout(() => setOpen(false), 150);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.fog}
          autoCorrect={false}
          style={styles.input}
        />
        {!!value && !error && <AnimatedCheck />}
      </View>
      {open && (
        <View style={styles.list} accessibilityRole="list">
          {matches.length === 0 ? (
            <Text style={[type.small, styles.empty]}>No program matches that. Try "Other".</Text>
          ) : (
            matches.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => choose(option)}
                style={({ pressed }) => [styles.option, (pressed || option === value) && { backgroundColor: colors.muted }]}>
                <Text style={type.body}>{option}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
      {error ? <ErrorText>{error}</ErrorText> : null}
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
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  list: {
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  empty: { padding: spacing.md, color: colors.fog },
});
