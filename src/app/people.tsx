import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SearchX, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Enter } from '@/components/Enter';
import { ErrorText } from '@/components/Field';
import { SkeletonList } from '@/components/Skeleton';
import { EventCard } from '@/components/EventCard';
import { MatchCard } from '@/components/MatchCard';
import { NavBar } from '@/components/NavBar';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, spacing, type } from '@/lib/theme';
import type { EventFeedItem, Match } from '@/lib/types';

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
  const [blockEvents, setBlockEvents] = useState<EventFeedItem[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]); // swiped left, hidden until the screen reloads
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
      // For a single block, also show events happening then. Not worth an error screen if it fails.
      if (filtered) {
        api<{ events: EventFeedItem[] }>(path.replace('/api/matches', '/api/events'))
          .then((res) => setBlockEvents(res.events))
          .catch(() => setBlockEvents([]));
      } else {
        setBlockEvents([]);
      }
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
  const visible = state.status === 'ready' ? state.matches.filter((m) => !skipped.includes(m.user.id)) : [];

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

        {(sessionLoading || state.status === 'loading') && <SkeletonList label="Finding people" />}

        {state.status === 'error' && (
          <Card>
            <ErrorText>{state.message}</ErrorText>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {state.status === 'ready' && state.matches.length === 0 && (
          <EmptyState
            icon={filtered ? SearchX : Users}
            title={filtered ? 'Nobody else is free in this block' : 'No matches yet'}
            message={
              filtered
                ? 'Try another block, or look at everyone you overlap with this week.'
                : 'Matches come from your free time. Check that your classes and campus are right.'
            }
            action={
              filtered
                ? { label: 'See all my matches', onPress: () => router.replace('/people') }
                : { label: 'Edit schedule', onPress: () => router.push('/onboarding?step=schedule') }
            }
          />
        )}

        {state.status === 'ready' && visible.length > 0 && (
          <Text style={[type.small, styles.fog]}>Swipe a card right to propose, left to skip.</Text>
        )}
        {state.status === 'ready' && state.matches.length > 0 && visible.length === 0 && (
          <EmptyState
            icon={Users}
            title="You skipped everyone"
            message="That was the whole list. Bring them back and take another look."
            action={{ label: 'Show them again', onPress: () => setSkipped([]) }}
          />
        )}
        {visible.map((match, index) => {
          const propose = () =>
            router.push(
              filtered
                ? `/propose?userId=${match.user.id}&day=${day}&start=${start}&end=${end}`
                : `/propose?userId=${match.user.id}`,
            );
          return (
            <Enter key={match.user.id} index={index}>
              <MatchCard match={match} onPropose={propose} onSkip={() => setSkipped((ids) => [...ids, match.user.id])} />
            </Enter>
          );
        })}

        {state.status === 'ready' && filtered && blockEvents.length > 0 && (
          <>
            <Text style={type.heading}>Events in this block</Text>
            {blockEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </>
        )}
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
  fog: { color: colors.fog },
});
