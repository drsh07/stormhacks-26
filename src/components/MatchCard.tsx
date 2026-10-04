import { StyleSheet, Text, View } from 'react-native';

import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';
import { formatDuration } from '@/lib/time';
import type { Match } from '@/lib/types';

import { Button } from './Button';
import { Card } from './Card';

const YEAR_LABEL = ['', '1st year', '2nd year', '3rd year', '4th year'];

/** One person you could meet: who they are, when you are both free, and why you matched. */
export function MatchCard({ match, onPropose }: { match: Match; onPropose?: () => void }) {
  const { user, overlap, why } = match;
  const year = YEAR_LABEL[user.year] ?? `${user.year}th year`;
  const about = [user.program, year].filter(Boolean).join(', ');

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.emoji}>{user.avatar_emoji}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={type.heading}>{user.name}</Text>
          {about ? <Text style={[type.small, styles.fog]}>{about}</Text> : null}
        </View>
      </View>

      <View style={[styles.block, overlap.on_campus && styles.blockGap]}>
        <Text style={[type.bodyStrong, overlap.on_campus && { color: colors.white }]}>
          {overlap.day} {overlap.start_time} to {overlap.end_time}
        </Text>
        <Text style={[type.small, overlap.on_campus ? { color: colors.white } : styles.fog]}>
          {formatDuration(overlap.minutes)} together at {overlap.campus}
        </Text>
      </View>

      <Text style={type.small}>{why}</Text>
      {onPropose && <Button label="Propose meetup" onPress={onPropose} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fog: { color: colors.fog },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: 26,
    backgroundColor: colors.chalk,
  },
  emoji: { fontSize: 26 },
  block: {
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.chalk,
  },
  blockGap: { backgroundColor: colors.cobalt },
});
