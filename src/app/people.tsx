import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MatchCard } from '@/components/MatchCard';
import { NavBar } from '@/components/NavBar';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, spacing, type } from '@/lib/theme';
import type { Match } from '@/lib/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; matches: Match[] };

/**
 * Ranked matches. With ?day=&start=&end= (from tapping a free block on the
 * week view) it shows only people free in that block.
 */
export default function People() {
  const router = useRouter();
  const { day, start, end } = useLocalSearchParams<{ day?: string; start?: string; end?: string }>();
  const { user, loading: sessionLoading } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const userId = user?.id;
  const filtered = !!(day && start && end);

  const load = useCallback(async () => {
    if (!userId) return;
    setState({ status: 'loading' });
    try {
      const path = filtered
        ? `/api/matches?day=${encodeURIComponent(day!)}&start=${encodeURIComponent(start!)}&end=${encodeURIComponent(end!)}`
        : '/api/matches';
      const data = await api<{ matches: Match[] }>(path);
      setState({ status: 'ready', matches: data.matches });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : "Couldn't load your matches." });
    }
  }, [userId, filtered, day, start, end]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!sessionLoading && !user) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <AppHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={type.title}>{filtered ? `Free ${day} ${start} to ${end}` : 'People free when you are'}</Text>
          <Text style={[type.body, styles.fog]}>
            {filtered
              ? 'Everyone who is free in this block, best match first.'
              : 'Ranked by shared interests, time together, and shared courses.'}
          </Text>
          {filtered && <Button label="See all my matches" variant="secondary" size="sm" onPress={() => router.replace('/people')} />}
        </View>

        {(sessionLoading || state.status === 'loading') && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.cobalt} />
            <Text style={[type.small, styles.fog]}>Finding people…</Text>
          </View>
        )}

        {state.status === 'error' && (
          <Card>
            <Text style={[type.bodyStrong, { color: colors.coral }]}>{state.message}</Text>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {state.status === 'ready' && state.matches.length === 0 && (
          <Card>
            <Text style={type.heading}>{filtered ? 'Nobody else is free in this block' : 'No matches yet'}</Text>
            <Text style={type.body}>
              {filtered
                ? 'Try another block, or look at everyone you overlap with this week.'
                : 'Matches come from your free time. Check that your classes and campus are right.'}
            </Text>
            {filtered ? (
              <Button label="See all my matches" onPress={() => router.replace('/people')} />
            ) : (
              <Button label="Edit schedule" onPress={() => router.push('/onboarding?step=schedule')} />
            )}
          </Card>
        )}

        {state.status === 'ready' && state.matches.map((match) => (
            <MatchCard
              key={match.user.id}
              match={match}
              onPropose={() =>
                router.push(
                  filtered
                    ? `/propose?userId=${match.user.id}&day=${day}&start=${start}&end=${end}`
                    : `/propose?userId=${match.user.id}`,
                )
              }
            />
          ))}
      </ScrollView>
      <NavBar current="people" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { backgroundColor: colors.chalk },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  titleBlock: { gap: spacing.sm },
  centered: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  fog: { color: colors.fog },
});
