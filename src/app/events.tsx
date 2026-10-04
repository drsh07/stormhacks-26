import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EventCard } from '@/components/EventCard';
import { NavBar } from '@/components/NavBar';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors, spacing, type } from '@/lib/theme';
import type { EventFeedItem } from '@/lib/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: EventFeedItem[] };

/** Events that fall in your free time, ranked by how well they fit your interests. */
export default function Events() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setState({ status: 'loading' });
    try {
      const data = await api<{ events: EventFeedItem[] }>('/api/events');
      setState({ status: 'ready', events: data.events });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : "Couldn't load events." });
    }
  }, [userId]);

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
          <Text style={type.title}>Events in your free time</Text>
          <Text style={[type.body, styles.fog]}>Only things you could actually go to, closest to your interests first.</Text>
          <Button label="Post an event" variant="quest" onPress={() => router.push('/post-event')} />
        </View>

        {(sessionLoading || state.status === 'loading') && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.cobalt} />
            <Text style={[type.small, styles.fog]}>Finding events…</Text>
          </View>
        )}

        {state.status === 'error' && (
          <Card>
            <Text style={[type.bodyStrong, { color: colors.coral }]}>{state.message}</Text>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {state.status === 'ready' && state.events.length === 0 && (
          <Card>
            <Text style={type.heading}>Nothing fits your free time yet</Text>
            <Text style={type.body}>No upcoming events land in your free blocks. Post one and be the reason people show up.</Text>
            <Button label="Post an event" onPress={() => router.push('/post-event')} />
          </Card>
        )}

        {state.status === 'ready' && state.events.map((event) => <EventCard key={event.id} event={event} />)}
      </ScrollView>
      <NavBar current="events" />
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
