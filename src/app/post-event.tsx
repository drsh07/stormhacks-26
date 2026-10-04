import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { Field } from '@/components/Field';
import { AI_TIMEOUT_MS, api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';
import { nextDays, TIME_PATTERN, toMinutes } from '@/lib/time';
import { CAMPUSES } from '@/lib/types';

const PLACES = [...CAMPUSES, 'Off campus'] as const;
type Place = (typeof PLACES)[number];

/** Post an event. It is checked by AI moderation before it goes live. */
export default function PostEvent() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const days = useMemo(() => nextDays(7), []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [dateLabel, setDateLabel] = useState(days[0].label);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionLoading && !user) return <Redirect href="/" />;
  const chosenPlace = place ?? user?.campus ?? 'Burnaby';

  async function post() {
    setError(null);
    if (title.trim().length < 3) return setError('Give the event a title.');
    if (description.trim().length < 10) return setError('Describe the event in a sentence or two.');
    if (location.trim().length < 2) return setError('Say where it is.');
    if (!TIME_PATTERN.test(start.trim()) || !TIME_PATTERN.test(end.trim())) return setError('Use 24-hour times, like 18:00 and 20:30.');
    if (toMinutes(end.trim()) <= toMinutes(start.trim())) return setError('The end time must be after the start time.');

    setPosting(true);
    try {
      await api<{ id: string }>('/api/events', {
        method: 'POST',
        body: {
          title,
          description,
          location,
          campus: chosenPlace === 'Off campus' ? null : chosenPlace,
          date: days.find((d) => d.label === dateLabel)?.date ?? days[0].date,
          start_time: start.trim(),
          end_time: end.trim(),
        },
        timeoutMs: AI_TIMEOUT_MS,
      });
      router.replace('/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that event. Try again.");
      setPosting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button label="Back" variant="secondary" size="sm" onPress={() => (router.canGoBack() ? router.back() : router.replace('/events'))} />
          <Text style={type.title}>Post an event</Text>
          <Text style={[type.body, styles.fog]}>
            It shows up for people who are free then and into this kind of thing. Posts cannot be edited or deleted, so
            check the details.
          </Text>

          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Karaoke night at the SUB" maxLength={120} />
          <Field
            label="What is it?"
            value={description}
            onChangeText={setDescription}
            placeholder="Open karaoke, zero talent required. Free snacks."
            multiline
            maxLength={1000}
          />
          <Field label="Where exactly" value={location} onChangeText={setLocation} placeholder="Student Union Building, ballroom" maxLength={160} />
          <Chips label="Campus" options={PLACES} value={chosenPlace} onChange={setPlace} />
          <Chips label="Day" options={days.map((d) => d.label)} value={dateLabel} onChange={setDateLabel} />
          <View style={styles.times}>
            <View style={styles.flex}>
              <Field label="Starts" value={start} onChangeText={setStart} placeholder="18:00" keyboardType="numbers-and-punctuation" maxLength={5} />
            </View>
            <View style={styles.flex}>
              <Field label="Ends" value={end} onChangeText={setEnd} placeholder="20:30" keyboardType="numbers-and-punctuation" maxLength={5} />
            </View>
          </View>

          {error ? (
            <View style={styles.error}>
              <Text style={[type.bodyStrong, { color: colors.coral }]}>Not posted</Text>
              <Text style={type.small}>{error}</Text>
            </View>
          ) : null}
          {posting && <Text style={[type.small, styles.fog]}>Checking your post. This takes a few seconds.</Text>}
          <Button label="Post event" size="lg" onPress={post} loading={posting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  scroll: { backgroundColor: colors.chalk },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 3,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  fog: { color: colors.fog },
  times: { flexDirection: 'row', gap: spacing.md },
  error: {
    borderWidth,
    borderColor: colors.coral,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
    gap: 2,
  },
});
