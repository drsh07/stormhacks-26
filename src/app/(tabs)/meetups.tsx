import { Redirect, useRouter } from 'expo-router';
import { Handshake } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DemoBadge } from '@/components/DemoBadge';
import { EmptyState } from '@/components/EmptyState';
import { Enter } from '@/components/Enter';
import { ErrorText } from '@/components/Field';
import { SkeletonList } from '@/components/Skeleton';
import { api } from '@/lib/api';
import { firstName } from '@/lib/people';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';
import type { MeetupListItem, MeetupStatus } from '@/lib/types';
import { usePolling } from '@/lib/usePolling';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; meetups: MeetupListItem[] };

function statusLine(item: MeetupListItem): { text: string; color: string } {
  const first = firstName(item.other.name);
  const lines: Record<MeetupStatus, { text: string; color: string }> = {
    proposed:
      item.role === 'receiver'
        ? { text: 'Needs your answer', color: colors.primary }
        : { text: `Waiting for ${first}`, color: colors.fog },
    accepted: { text: item.is_event ? 'Going together' : item.quest_title ? 'Quest in progress' : 'Accepted', color: colors.primary },
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

  const renderItem = (item: MeetupListItem, index: number) => {
    const line = statusLine(item);
    return (
      <Enter key={item.id} index={index}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/meetup/${item.id}`)}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}>
        <Text style={styles.emoji}>{item.other.avatar_emoji}</Text>
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text style={type.bodyStrong}>{item.other.name}</Text>
            <DemoBadge name={item.other.name} />
          </View>
          <Text style={[type.small, styles.fog]}>
            {item.day} {item.start_time} to {item.end_time}, {item.spot}
          </Text>
          <Text style={[type.small, { color: line.color }]}>{line.text}</Text>
        </View>
      </Pressable>
      </Enter>
    );
  };

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={type.title}>Meetups</Text>

        {(sessionLoading || state.status === 'loading') && <SkeletonList label="Loading meetups" />}

        {state.status === 'error' && (
          <Card>
            <ErrorText>{state.message}</ErrorText>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {state.status === 'ready' && state.meetups.length === 0 && (
          <EmptyState
            icon={Handshake}
            title="No meetups yet"
            message="Find someone who is free when you are and send the first invite."
            action={{ label: 'Find people', onPress: () => router.navigate('/people') }}
          />
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
    </>
  );
}

const styles = StyleSheet.create({
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
  fog: { color: colors.fog },
  section: { gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
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
