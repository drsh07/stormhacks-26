import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { QuestCard } from '@/components/QuestCard';
import { AI_TIMEOUT_MS, api, ApiError } from '@/lib/api';
import { pickImage } from '@/lib/image';
import { useSession } from '@/lib/session';
import { borderWidth, colors, fonts, radius, spacing, type } from '@/lib/theme';
import { formatDuration } from '@/lib/time';
import type { MeetupDetail } from '@/lib/types';
import { usePolling } from '@/lib/usePolling';

type Busy = null | 'accept' | 'decline' | 'quest' | 'reroll' | 'verify';

interface VerifyResponse {
  verified: boolean;
  comment: string;
  detail: MeetupDetail;
}

const revealKey = (questId: string) => `sq_revealed_${questId}`;

/** One meetup, start to finish: invite -> quest reveal -> photo proof -> done. */
export default function MeetupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading: sessionLoading } = useSession();

  const [detail, setDetail] = useState<MeetupDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null); // comment from a failed photo check
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const userId = user?.id;
  const busyRef = useRef<Busy>(null);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const status = detail?.meetup.status;
  const quest = detail?.quest ?? null;
  const questId = quest?.id;

  const load = useCallback(async () => {
    if (!userId || !id || busyRef.current) return; // never overwrite the screen mid-action
    try {
      const next = await api<MeetupDetail>(`/api/meetups/${id}`);
      if (!busyRef.current) setDetail(next);
      setLoadError(null);
    } catch (err) {
      // A failed background refresh keeps the last good state on screen.
      setLoadError(err instanceof ApiError && err.status === 404 ? 'This meetup does not exist, or you are not part of it.' : err instanceof Error ? err.message : "Couldn't load this meetup.");
    }
  }, [userId, id]);

  // Poll every 5 seconds until the meetup is finished one way or the other.
  usePolling(load, 5000, status !== 'completed' && status !== 'declined');

  // Remember, per phone, which quests have already been revealed.
  useEffect(() => {
    if (!questId) return;
    let cancelled = false;
    AsyncStorage.getItem(revealKey(questId))
      .then((seen) => {
        if (!cancelled && seen) setRevealedId(questId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [questId]);

  if (!sessionLoading && !user) return <Redirect href="/" />;

  const revealed = !!quest && (revealedId === quest.id || quest.status === 'verified');
  function reveal() {
    if (!quest) return;
    setRevealedId(quest.id);
    AsyncStorage.setItem(revealKey(quest.id), '1').catch(() => {});
  }

  /** Runs a server action, shows its error if it fails, and never leaves the UI stuck. */
  async function run(kind: Exclude<Busy, null>, action: () => Promise<MeetupDetail>, after?: (d: MeetupDetail) => void) {
    setBusy(kind);
    setActionError(null);
    try {
      const next = await action();
      setDetail(next);
      after?.(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  }

  const respond = (action: 'accept' | 'decline') =>
    run(action, () => api<MeetupDetail>(`/api/meetups/${id}/respond`, { method: 'POST', body: { action }, timeoutMs: AI_TIMEOUT_MS }));

  const getQuest = () => run('quest', () => api<MeetupDetail>(`/api/meetups/${id}/quest`, { method: 'POST', body: {}, timeoutMs: AI_TIMEOUT_MS }));

  const reroll = () =>
    run(
      'reroll',
      () => api<MeetupDetail>(`/api/meetups/${id}/quest`, { method: 'POST', body: { reroll: true }, timeoutMs: AI_TIMEOUT_MS }),
      (next) => {
        // They asked for a new quest, so show it straight away.
        setRejection(null);
        if (next.quest) {
          setRevealedId(next.quest.id);
          AsyncStorage.setItem(revealKey(next.quest.id), '1').catch(() => {});
        }
      },
    );

  async function submitProof(source: 'camera' | 'library') {
    setActionError(null);
    setRejection(null);
    const picked = await pickImage(source);
    if (picked.status === 'cancelled') return;
    if (picked.status === 'error') {
      setActionError(picked.message);
      return;
    }

    setBusy('verify');
    try {
      const res = await api<VerifyResponse>(`/api/meetups/${id}/verify`, {
        method: 'POST',
        body: { imageBase64: picked.image.base64, mimeType: picked.image.mimeType },
        timeoutMs: AI_TIMEOUT_MS,
      });
      setDetail(res.detail);
      if (!res.verified) setRejection(res.comment);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't check that photo. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const first = detail?.other.name.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Button label="All meetups" variant="secondary" size="sm" onPress={() => router.replace('/meetups')} />

        {!detail && !loadError && (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.cobalt} />
            <Text style={[type.small, styles.fog]}>Loading the meetup…</Text>
          </View>
        )}

        {!detail && loadError && (
          <Card>
            <Text style={[type.bodyStrong, { color: colors.coral }]}>{loadError}</Text>
            <Button label="Try again" onPress={load} />
          </Card>
        )}

        {detail && (
          <>
            <View style={styles.who}>
              <Text style={styles.bigEmoji}>{detail.other.avatar_emoji}</Text>
              <View style={styles.flex}>
                <Text style={type.title}>{detail.other.name}</Text>
                <Text style={[type.body, styles.fog]}>
                  {detail.meetup.day} {detail.meetup.start_time} to {detail.meetup.end_time} ({formatDuration(detail.meetup.minutes)})
                </Text>
                <Text style={[type.body, styles.fog]}>{detail.meetup.spot}</Text>
              </View>
            </View>

            {/* 1. Invite sent, waiting on an answer */}
            {status === 'proposed' && detail.role === 'receiver' && (
              <Card>
                <Text style={type.heading}>{first} wants to meet</Text>
                <Text style={type.body}>
                  {detail.quest_required
                    ? 'Say yes and you both get a side quest to do together. It is mandatory the first time you meet.'
                    : 'You two have met before, so a side quest is optional this time.'}
                </Text>
                {busy === 'accept' && <Text style={[type.small, styles.fog]}>Summoning your side quest. This takes a few seconds.</Text>}
                <View style={styles.buttons}>
                  <Button label="Accept" onPress={() => respond('accept')} loading={busy === 'accept'} disabled={busy !== null} />
                  <Button label="Decline" variant="secondary" onPress={() => respond('decline')} loading={busy === 'decline'} disabled={busy !== null} />
                </View>
              </Card>
            )}
            {status === 'proposed' && detail.role === 'requester' && (
              <Card>
                <Text style={type.heading}>Waiting for {first}</Text>
                <Text style={type.body}>Your invite is sent. This screen updates by itself when {first} answers.</Text>
                <ActivityIndicator color={colors.cobalt} style={styles.left} />
              </Card>
            )}

            {/* 2. Declined */}
            {status === 'declined' && (
              <Card>
                <Text style={type.heading}>{detail.role === 'receiver' ? 'You declined this one' : `${first} can't make it`}</Text>
                <Text style={type.body}>No hard feelings. There are other people free when you are.</Text>
                <Button label="Find someone else" onPress={() => router.replace('/people')} />
              </Card>
            )}

            {/* 3. Accepted: the quest */}
            {status === 'accepted' && !quest && (
              <Card>
                <Text style={type.heading}>You are on</Text>
                <Text style={type.body}>
                  Meet {first} at {detail.meetup.spot}. You have met before, so the side quest is optional. Want one anyway?
                </Text>
                <Button label="Give us a side quest" variant="quest" onPress={getQuest} loading={busy === 'quest'} />
              </Card>
            )}

            {status === 'accepted' && quest && (
              <>
                <QuestCard quest={quest} revealed={revealed} onReveal={reveal} />
                {revealed && (
                  <Card>
                    <Text style={type.heading}>Done it? Prove it.</Text>
                    <Text style={type.body}>One photo from either of you. We check it and then throw the photo away.</Text>
                    {busy === 'verify' && <Text style={[type.small, styles.fog]}>The quest master is inspecting your photo.</Text>}
                    {rejection && (
                      <View style={styles.rejection}>
                        <Text style={[type.bodyStrong, { color: colors.coral }]}>Not quite</Text>
                        <Text style={type.small}>{rejection}</Text>
                      </View>
                    )}
                    <View style={styles.buttons}>
                      {Platform.OS !== 'web' && (
                        <Button label="Take a photo" onPress={() => submitProof('camera')} loading={busy === 'verify'} disabled={busy !== null} />
                      )}
                      <Button
                        label="Choose a photo"
                        variant={Platform.OS === 'web' ? 'primary' : 'secondary'}
                        onPress={() => submitProof('library')}
                        loading={Platform.OS === 'web' && busy === 'verify'}
                        disabled={busy !== null}
                      />
                    </View>
                    {detail.rerolls_left > 0 && (
                      <Button
                        label="Reroll the quest (one chance)"
                        variant="secondary"
                        size="sm"
                        onPress={reroll}
                        loading={busy === 'reroll'}
                        disabled={busy !== null}
                      />
                    )}
                  </Card>
                )}
              </>
            )}

            {/* 4. Completed */}
            {status === 'completed' && <Celebration detail={detail} onDone={() => router.replace('/meetups')} />}

            {actionError ? <Text style={[type.bodyStrong, { color: colors.coral }]}>{actionError}</Text> : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The payoff screen: a stamp that lands, the verdict, and the quest you finished. */
function Celebration({ detail, onDone }: { detail: MeetupDetail; onDone: () => void }) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const first = detail.other.name.split(' ')[0];

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) scale.setValue(1);
        else Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [scale]);

  return (
    <>
      <Animated.View style={[styles.stamp, { transform: [{ scale }, { rotate: '-4deg' }] }]}>
        <Text style={styles.stampText}>Quest complete</Text>
      </Animated.View>
      <Card>
        <Text style={type.heading}>
          You and {first} did it{detail.quest ? `: ${detail.quest.title}` : ''}
        </Text>
        {detail.quest?.verdict_comment ? <Text style={type.body}>{detail.quest.verdict_comment}</Text> : null}
        <Text style={[type.small, styles.fog]}>
          Next time you two meet, the side quest is optional. You are officially not strangers.
        </Text>
        <Button label="Back to my meetups" onPress={onDone} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  left: { alignSelf: 'flex-start' },
  scroll: { backgroundColor: colors.chalk },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  centered: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  fog: { color: colors.fog },
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  bigEmoji: { fontSize: 48 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rejection: {
    borderWidth,
    borderColor: colors.coral,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
    gap: 2,
  },
  stamp: {
    alignSelf: 'center',
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: 4,
    borderColor: colors.moss,
    borderRadius: radius.lg,
    backgroundColor: colors.paper,
  },
  stampText: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.5, color: colors.moss },
});
