import { StyleSheet, Text, View } from 'react-native';

import { TIME_PATTERN, toMinutes } from '@/lib/time';
import { colors, spacing, type } from '@/lib/theme';
import { CAMPUSES, DAYS, type Campus, type ClassSlot } from '@/lib/types';

import { Button } from './Button';
import { Card } from './Card';
import { Chips } from './Chips';
import { Field } from './Field';

/** A class being edited. `key` is only for React; it never goes to the server. */
export interface ClassRow extends ClassSlot {
  key: string;
}

let nextKey = 0;
export function toRows(classes: ClassSlot[]): ClassRow[] {
  return classes.map((c) => ({ ...c, key: `row-${nextKey++}` }));
}
export function blankRow(campus: Campus): ClassRow {
  return { key: `row-${nextKey++}`, course_code: '', day: 'Mon', start_time: '', end_time: '', campus };
}
export function toClasses(rows: ClassRow[]): ClassSlot[] {
  return rows.map(({ key: _key, ...slot }) => ({ ...slot, course_code: slot.course_code.trim() }));
}

/** Returns what is wrong with a row, or null if it is ready to save. */
export function rowError(row: ClassRow): string | null {
  if (!row.course_code.trim()) return 'Add a course code, like CMPT 225.';
  if (!TIME_PATTERN.test(row.start_time.trim()) || !TIME_PATTERN.test(row.end_time.trim())) {
    return 'Use 24-hour times, like 10:30 and 14:20.';
  }
  if (toMinutes(row.end_time.trim()) <= toMinutes(row.start_time.trim())) return 'The end time must be after the start time.';
  return null;
}

interface Props {
  rows: ClassRow[];
  onChange: (rows: ClassRow[]) => void;
  defaultCampus: Campus;
  /** When true, rows that are not ready to save show what is wrong. */
  showErrors: boolean;
}

/** The editable class list: fix what the AI got wrong, or type classes by hand. */
export function ClassEditor({ rows, onChange, defaultCampus, showErrors }: Props) {
  function update(key: string, patch: Partial<ClassSlot>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <View style={styles.list}>
      {rows.map((row, index) => {
        const error = showErrors ? rowError(row) : null;
        return (
          <Card key={row.key} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={type.heading}>{row.course_code.trim() || `Class ${index + 1}`}</Text>
              <Button
                label="Remove"
                variant="secondary"
                size="sm"
                onPress={() => onChange(rows.filter((r) => r.key !== row.key))}
              />
            </View>
            <Field
              label="Course code"
              value={row.course_code}
              onChangeText={(course_code) => update(row.key, { course_code })}
              placeholder="CMPT 225"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
            <Chips label="Day" compact options={DAYS} value={row.day} onChange={(day) => update(row.key, { day })} />
            <View style={styles.times}>
              <View style={styles.time}>
                <Field
                  label="Starts"
                  value={row.start_time}
                  onChangeText={(start_time) => update(row.key, { start_time })}
                  placeholder="10:30"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <View style={styles.time}>
                <Field
                  label="Ends"
                  value={row.end_time}
                  onChangeText={(end_time) => update(row.key, { end_time })}
                  placeholder="12:20"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
            <Chips
              label="Campus"
              compact
              options={CAMPUSES}
              value={row.campus}
              onChange={(campus) => update(row.key, { campus })}
            />
            {error ? <Text style={[type.small, { color: colors.coral }]}>{error}</Text> : null}
          </Card>
        );
      })}
      <Button label="Add class manually" variant="secondary" onPress={() => onChange([...rows, blankRow(defaultCampus)])} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  row: { gap: spacing.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  times: { flexDirection: 'row', gap: spacing.md },
  time: { flex: 1 },
});
