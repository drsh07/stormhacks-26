import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';
import { formatDuration } from '@/lib/time';
import type { Campus, Match, Overlap } from '@/lib/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; match: Match; spots: Record<Campus, string[]> };

const overlapKey = (o: Overlap) => `${o.day}-${o.start_time}-${o.end_time}`;

/** Propose a meetup: pick one of the blocks you are both free, and a spot. No chat. */
export default function Propose() {
  const router = useRouter();
  const { userId, day, start, end } = useLocalSearchParams<{ userId?: string; day?: string; start?: string; end?: string }>();
  const { user, loading: sessionLoading } = useSession();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [chosen, setChosen] = useState<Overlap | null>(null);
  const [spot, setSpot] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const myId = user?.id;

  const load = useCallback(async () => {
    if (!myId || !userId) return;
    setState({ status: 'loading' });
    try {
      // Ask the matcher again so the blocks shown are the ones both people are free right now.
      const windowQuery = day && start && end ? `?day=${day}&start=${start}&end=${end}` : '';
      const [windowed, all, spotData] = await Promise.all([
        windowQuery ? api<{ matches: Match[] }>(`/api/matches${windowQuery}`) : Promise.resolve(null),
        api<{ matches: Match[] }>('/api/matches'),
        api<{ spots: Record<Campus, string[]> }>('/api/spots'),
      ]);
      const match = all.matches.find((m) => m.user.id === userId);
      if (!match) {
        setState({ status: 'error', message: 'You two no longer have free time in common. Pick someone else.' });
        return;
      }
      // If they came from a specific block, offer that block first.
      const fromWindow = windowed?.matches.find((m) => m.user.id === userId)?.overlaps ?? [];
      const seen = new Set<string>();
      const overlaps = [...fromWindow, ...match.overlaps].filter((o) => !seen.has(overlapKey(o)) && seen.add(overlapKey(o)));
      setState({ status: 'ready', match: { ...match, overlaps }, spots: spotData.spots });
      setChosen(overlaps[0] ?? null);
      setSpot(null);
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : "Couldn't load this person." });
    }
  }, [myId, userId, day, start, end]);

  useEffect(() => {
    load();
  }, [load]);

  if (!sessionLoading && !user) return <Redirect href="/" />;
  if (!userId) return <Redirect href="/people" />;

  async function send() {
    if (!chosen || !spot) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await api<{ meetup_id: string }>('/api/meetups', {
        method: 'POST',
        body: { receiver_id: userId, day: chosen.day, start_time: chosen.start_time, end_time: chosen.end_time, spot },
      });
      router.replace(`/meetup/${res.meetup_id}`);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Couldn't send that proposal. Try again.");
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Button label="Back" icon={ArrowLeft} variant="secondary" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace('/people'))} />

        {(sessionLoading || state.status === 'loading') && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {state.status === 'error' && (
          <Card>
            <Text style={[type.bodyStrong, { color: colors.coral }]}>{state.message}</Text>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {state.status === 'ready' && (
          <>
            <Text style={type.title}>
              Meet {state.match.user.avatar_emoji} {state.match.user.name.split(' ')[0]}
            </Text>
            <Text style={[type.body, styles.fog]}>
              Pick a time and a place. {state.match.user.name.split(' ')[0]} gets the invite and can accept or decline.
            </Text>

            <Text style={type.heading}>When</Text>
            <View style={styles.options} accessibilityRole="radiogroup">
              {state.match.overlaps.map((o) => {
                const selected = !!chosen && overlapKey(o) === overlapKey(chosen);
                return (
                  <Pressable
                    key={overlapKey(o)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      // Spots are per campus, so a new campus clears the spot.
                      if (chosen?.campus !== o.campus) setSpot(null);
                      setChosen(o);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}>
                    <Text style={[type.bodyStrong, selected && styles.onCobalt]}>
                      {o.day} {o.start_time} to {o.end_time}
                    </Text>
                    <Text style={[type.small, selected ? styles.onCobalt : styles.fog]}>
                      {formatDuration(o.minutes)} at {o.campus}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {chosen && (
              <>
                <Text style={type.heading}>Where on the {chosen.campus} campus</Text>
                <View style={styles.options} accessibilityRole="radiogroup">
                  {state.spots[chosen.campus].map((s) => {
                    const selected = s === spot;
                    return (
                      <Pressable
                        key={s}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setSpot(s)}
                        style={[styles.option, selected && styles.optionSelected]}>
                        <Text style={[type.bodyStrong, selected && styles.onCobalt]}>{s}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {sendError ? <Text style={[type.bodyStrong, { color: colors.coral }]}>{sendError}</Text> : null}
            <Button label="Send the invite" size="lg" onPress={send} loading={sending} disabled={!chosen || !spot} />
            {!spot && <Text style={[type.small, styles.fog]}>Pick a spot to send the invite.</Text>}
          </>
        )}
      </ScrollView>
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
  centered: { alignItems: 'center', paddingVertical: spacing.xxl },
  fog: { color: colors.fog },
  options: { gap: spacing.sm },
  option: {
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
    gap: 2,
  },
  optionSelected: { backgroundColor: colors.primary },
  onCobalt: { color: colors.white },
});
