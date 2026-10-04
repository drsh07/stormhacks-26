import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';
import type { MeetupListItem, MeetupStatus } from '@/lib/types';
import { usePolling } from '@/lib/usePolling';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; meetups: MeetupListItem[] };

function statusLine(item: MeetupListItem): { text: string; color: string } {
  const first = item.other.name.split(' ')[0];
  const lines: Record<MeetupStatus, { text: string; color: string }> = {
    proposed:
      item.role === 'receiver'
        ? { text: 'Needs your answer', color: colors.cobalt }
        : { text: `Waiting for ${first}`, color: colors.fog },
    accepted: { text: item.is_event ? 'Going together' : item.quest_title ? 'Quest in progress' : 'Accepted', color: colors.cobalt },
    completed: { text: 'Quest complete', color: colors.moss },
    declined: { text: item.role === 'receiver' ? 'You declined' : `${first} declined`, color: colors.coral },
  };
  return lines[item.status];
}

/** Proposals you sent and received. Refreshes every 5 seconds. */
export default function Meetups() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api<{ meetups: MeetupListItem[] }>('/api/meetups');
      setState({ status: 'ready', meetups: data.meetups });
    } catch (err) {
      // Keep showing the last good list if a background refresh fails.
      setState((prev) =>
        prev.status === 'ready' ? prev : { status: 'error', message: err instanceof Error ? err.message : "Couldn't load your meetups." },
      );
    }
  }, [userId]);

  usePolling(load, 5000);

  if (!sessionLoading && !user) return <Redirect href="/" />;

  const received = state.status === 'ready' ? state.meetups.filter((m) => m.role === 'receiver') : [];
  const sent = state.status === 'ready' ? state.meetups.filter((m) => m.role === 'requester') : [];

  const renderItem = (item: MeetupListItem) => {
    const line = statusLine(item);
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        onPress={() => router.push(`/meetup/${item.id}`)}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
        <Text style={styles.emoji}>{item.other.avatar_emoji}</Text>
        <View style={styles.flex}>
          <Text style={type.bodyStrong}>{item.other.name}</Text>
          <Text style={[type.small, styles.fog]}>
            {item.day} {item.start_time} to {item.end_time}, {item.spot}
          </Text>
          <Text style={[type.small, { color: line.color }]}>{line.text}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <AppHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={type.title}>Meetups</Text>

        {(sessionLoading || state.status === 'loading') && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.cobalt} />
          </View>
        )}

        {state.status === 'error' && (
          <Card>
            <Text style={[type.bodyStrong, { color: colors.coral }]}>{state.message}</Text>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {state.status === 'ready' && state.meetups.length === 0 && (
          <Card>
            <Text style={type.heading}>No meetups yet</Text>
            <Text style={type.body}>Find someone who is free when you are and send the first invite.</Text>
            <Button label="Find people" onPress={() => router.replace('/people')} />
          </Card>
        )}

        {received.length > 0 && (
          <View style={styles.section}>
            <Text style={type.heading}>Invites you received</Text>
            {received.map(renderItem)}
          </View>
        )}
        {sent.length > 0 && (
          <View style={styles.section}>
            <Text style={type.heading}>Invites you sent</Text>
            {sent.map(renderItem)}
          </View>
        )}
      </ScrollView>
      <NavBar current="meetups" />
    </SafeAreaView>
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
  centered: { alignItems: 'center', paddingVertical: spacing.xxl },
  fog: { color: colors.fog },
  section: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
  },
  emoji: { fontSize: 28 },
});
