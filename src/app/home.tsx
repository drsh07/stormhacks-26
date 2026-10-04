import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { borderWidth, colors, fonts, radius, spacing, type } from '@/lib/theme';
import { formatDuration, todayInVancouver, toMinutes } from '@/lib/time';
import { DAYS, type ClassSlot, type Day, type FreeBlock, type Schedule } from '@/lib/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; schedule: Schedule };

/** One row in a day's timeline: either a class or a free block. */
type Item = { type: 'class'; slot: ClassSlot } | { type: 'free'; block: FreeBlock };

function itemsFor(day: Day, schedule: Schedule): Item[] {
  const items: Item[] = [
    ...schedule.classes.filter((c) => c.day === day).map((slot) => ({ type: 'class' as const, slot })),
    ...schedule.free_blocks.filter((b) => b.day === day).map((block) => ({ type: 'free' as const, block })),
  ];
  const start = (i: Item) => toMinutes(i.type === 'class' ? i.slot.start_time : i.block.start_time);
  return items.sort((a, b) => start(a) - start(b));
}

/** The week view: your classes and your free blocks, one day at a time. */
export default function Home() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [day, setDay] = useState<Day>(todayInVancouver);
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setState({ status: 'loading' });
    try {
      const schedule = await api<Schedule>('/api/schedule');
      setState({ status: 'ready', schedule });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : "Couldn't load your week." });
    }
  }, [userId]);

  // Reload whenever this screen comes back into view (after editing) or the user changes.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!sessionLoading && !user) return <Redirect href="/" />;

  const schedule = state.status === 'ready' ? state.schedule : null;
  const hasClasses = !!schedule && schedule.classes.length > 0;
  const hasInterests = !!user && user.interests.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <AppHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[type.title, styles.flex]}>{user ? `${user.name.split(' ')[0]}'s week` : 'Your week'}</Text>
          <Button label="Edit schedule" variant="secondary" size="sm" onPress={() => router.push('/onboarding?step=schedule')} />
        </View>

        {(sessionLoading || state.status === 'loading') && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.cobalt} />
            <Text style={[type.small, styles.fog]}>Loading your week…</Text>
          </View>
        )}

        {state.status === 'error' && (
          <Card>
            <Text style={[type.bodyStrong, { color: colors.coral }]}>{state.message}</Text>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {schedule && !hasInterests && (
          <Card>
            <Text style={type.heading}>Add your interests</Text>
            <Text style={type.body}>We match you with people who are free when you are and into the same things.</Text>
            <Button label="Add my interests" onPress={() => router.push('/onboarding?step=interests')} />
          </Card>
        )}

        {schedule && !hasClasses && (
          <Card>
            <Text style={type.heading}>No classes yet</Text>
            <Text style={type.body}>
              Add your classes so we can find your gaps. Until then, we count you as free all day.
            </Text>
            <Button label="Add my classes" onPress={() => router.push('/onboarding?step=schedule')} />
          </Card>
        )}

        {schedule && (
          <>
            <View style={styles.days} accessibilityRole="tablist">
              {DAYS.map((d) => {
                const selected = d === day;
                const hasGap = schedule.free_blocks.some((b) => b.day === d && b.kind === 'on_campus_gap');
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={hasGap ? `${d}, has a gap on campus` : d}
                    onPress={() => setDay(d)}
                    style={[styles.day, selected && styles.daySelected]}>
                    <Text style={[styles.dayText, selected && { color: colors.white }]}>{d}</Text>
                    {/* A dot marks days with an on-campus gap. */}
                    <View style={[styles.dot, hasGap && { backgroundColor: selected ? colors.white : colors.cobalt }]} />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.timeline}>
              {itemsFor(day, schedule).map((item) =>
                item.type === 'class' ? (
                  <ClassItem key={`c-${item.slot.course_code}-${item.slot.start_time}`} slot={item.slot} />
                ) : (
                  <FreeItem key={`f-${item.block.start_time}`} block={item.block} />
                ),
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ClassItem({ slot }: { slot: ClassSlot }) {
  return (
    <View style={[styles.item, styles.classItem]}>
      <Text style={styles.time}>
        {slot.start_time} to {slot.end_time}
      </Text>
      <Text style={type.heading}>{slot.course_code}</Text>
      <Text style={[type.small, styles.fog]}>Class, {slot.campus}</Text>
    </View>
  );
}

function FreeItem({ block }: { block: FreeBlock }) {
  const length = formatDuration(toMinutes(block.end_time) - toMinutes(block.start_time));
  const gap = block.kind === 'on_campus_gap';
  return (
    <View style={[styles.item, gap ? styles.gapItem : styles.freeItem]}>
      <Text style={[styles.time, gap && { color: colors.white }]}>
        {block.start_time} to {block.end_time}
      </Text>
      <Text style={[type.heading, gap && { color: colors.white }]}>{gap ? `Gap on campus, ${length}` : `Free, ${length}`}</Text>
      <Text style={[type.small, gap ? { color: colors.white } : styles.fog]}>
        {gap ? `Stuck at ${block.campus} between classes` : 'No class'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  scroll: { backgroundColor: colors.chalk },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  centered: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  fog: { color: colors.fog },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  daySelected: { backgroundColor: colors.cobalt },
  dayText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  timeline: { gap: spacing.md },
  item: { borderWidth, borderColor: colors.ink, borderRadius: radius.lg, padding: spacing.lg, gap: 2 },
  classItem: { backgroundColor: colors.paper },
  gapItem: { backgroundColor: colors.cobalt },
  freeItem: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: colors.fog },
  time: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.fog },
});
