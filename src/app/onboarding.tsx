import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Chips, Pop } from '@/components/Chips';
import { ClassEditor, rowError, toClasses, toRows, type ClassRow } from '@/components/ClassEditor';
import { Field } from '@/components/Field';
import { ProgressBar } from '@/components/ProgressBar';
import { SearchSelect } from '@/components/SearchSelect';
import { AI_TIMEOUT_MS, api, ApiError } from '@/lib/api';
import { pickImage } from '@/lib/image';
import { useReduceMotion } from '@/lib/motion';
import { PROGRAMS } from '@/lib/programs';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';
import { CAMPUSES, type Campus, type ClassSlot, type Schedule, type User } from '@/lib/types';

type Step = 1 | 2 | 3;
const STEP_TITLES: Record<Step, string> = {
  1: 'The basics',
  2: 'Your class schedule',
  3: 'What are you into?',
};

const EMOJI = ['🦊', '🧗', '🎮', '🎧', '📚', '🧋', '🎨', '⚽', '🎸', '🛹', '🔭', '🌱'];
const YEARS = [1, 2, 3, 4, 5] as const;
const INTEREST_IDEAS = [
  'bouldering', 'indie games', 'bubble tea', 'karaoke', 'chess', 'film photography',
  'anime', 'pickup basketball', 'thrifting', 'hackathons', 'techno', 'hiking',
];
const SFU_EMAIL = /^[a-z0-9._-]+@sfu\.ca$/i;

interface Basics {
  name: string;
  email: string;
  campus: Campus;
  program: string;
  year: number;
  emoji: string;
}

interface ExtractResponse {
  ok: boolean;
  classes: ClassSlot[];
  message?: string;
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Sign up: basics -> schedule -> interests, with Back between steps.
 * Everything typed is kept in this component, so going back never loses it.
 *
 * Also used to edit later: /onboarding?step=schedule or ?step=interests
 * opens that one step and returns to the week view when saved.
 */
export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const { user, loading: sessionLoading, updateUser } = useSession();
  const reduceMotion = useReduceMotion();

  const editing = params.step === 'schedule' || params.step === 'interests';
  const [step, setStep] = useState<Step>(params.step === 'interests' ? 3 : params.step === 'schedule' ? 2 : 1);

  // The account this sign-up flow created. Anyone else who is signed in (they
  // arrived signed in, or switched user in demo mode) is sent to their week.
  const [createdId, setCreatedId] = useState<string | null>(null);

  /* ----- everything the person has entered, kept across steps ----- */
  const [basics, setBasics] = useState<Basics>({ name: '', email: '', campus: 'Burnaby', program: '', year: 1, emoji: EMOJI[0] });
  const [touched, setTouched] = useState({ name: false, email: false, program: false });
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [rowsLoadedFor, setRowsLoadedFor] = useState<string | null>(null);
  const [interests, setInterests] = useState<string | null>(null); // null = not started; falls back to the saved value

  /* ----- per-step status ----- */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  /* ----- slide between steps ----- */
  const slide = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);
  function goTo(next: Step) {
    direction.current = next > step ? 1 : -1;
    setError(null);
    setStep(next);
  }
  useEffect(() => {
    if (reduceMotion) {
      slide.setValue(1);
      return;
    }
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, reduceMotion, slide]);

  /* ----- load the saved schedule once per user, when the schedule step opens ----- */
  const userId = user?.id;
  useEffect(() => {
    if (step !== 2 || !userId || rowsLoadedFor === userId) return;
    let cancelled = false;
    api<Schedule>('/api/schedule')
      .then((s) => {
        if (!cancelled) setRows(toRows(s.classes));
      })
      .catch(() => {
        // Not fatal: they can still upload or type their classes.
      })
      .finally(() => {
        if (!cancelled) setRowsLoadedFor(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [step, userId, rowsLoadedFor]);

  if (sessionLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <AppHeader hideSignIn />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.cobalt} />
        </View>
      </SafeAreaView>
    );
  }
  // Someone who is already signed in has no business in the sign-up flow.
  if (user && !editing && user.id !== createdId) return <Redirect href="/home" />;
  // Signed out in the middle of editing (or the account was wiped).
  if (!user && (editing || step !== 1)) return <Redirect href="/" />;

  const done = () => router.replace('/home');

  /* ---------- Step 1: basics ---------- */
  const nameOk = basics.name.trim().length >= 2;
  const emailOk = SFU_EMAIL.test(basics.email.trim());
  const programOk = (PROGRAMS as readonly string[]).includes(basics.program);
  const basicsValid = nameOk && emailOk && programOk;
  const accountMade = !!user; // they came back to step 1 after creating the account

  async function saveBasics() {
    setTouched({ name: true, email: true, program: true });
    if (!basicsValid) return;
    setSaving(true);
    setError(null);
    setExists(false);
    try {
      const profile = { name: basics.name, campus: basics.campus, program: basics.program, year: basics.year, avatar_emoji: basics.emoji };
      const res = accountMade
        ? await api<{ user: User }>('/api/me', { method: 'PATCH', body: profile })
        : await api<{ user: User }>('/api/users', { method: 'POST', body: { ...profile, email: basics.email.trim() }, userId: null });
      setCreatedId(res.user.id);
      updateUser(res.user);
      goTo(2);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'exists') setExists(true);
      else setError(message(err, "Couldn't save your account. Try again."));
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Step 2: schedule ---------- */
  const rowsValid = rows.every((r) => !rowError(r));

  async function pickScreenshot() {
    setNotice(null);
    const picked = await pickImage('library');
    if (picked.status === 'cancelled') return;
    if (picked.status === 'error') {
      setNotice({ tone: 'bad', text: `${picked.message} You can still add classes by hand below.` });
      return;
    }
    setReading(true);
    try {
      const result = await api<ExtractResponse>('/api/schedule/extract', {
        method: 'POST',
        body: { imageBase64: picked.image.base64, mimeType: picked.image.mimeType },
        timeoutMs: AI_TIMEOUT_MS,
      });
      if (result.ok && result.classes.length > 0) {
        const found = toRows(result.classes);
        setRows(found);
        setNotice({ tone: 'good', text: `Found ${found.length} ${found.length === 1 ? 'class' : 'classes'}. Check them and fix anything that's off.` });
      } else {
        setNotice({ tone: 'bad', text: result.message ?? "Couldn't read that screenshot. Try again, or add classes by hand below." });
      }
    } catch (err) {
      setNotice({ tone: 'bad', text: `${message(err, "Couldn't read that screenshot.")} You can still add classes by hand below.` });
    } finally {
      setReading(false);
    }
  }

  async function saveSchedule() {
    if (!rowsValid) return;
    setSaving(true);
    setError(null);
    try {
      await api<Schedule>('/api/schedule', { method: 'PUT', body: { classes: toClasses(rows) } });
      if (editing) done();
      else goTo(3);
    } catch (err) {
      setError(message(err, "Couldn't save your schedule. Try again."));
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Step 3: interests ---------- */
  const interestText = interests ?? user?.interests ?? '';
  const interestsValid = interestText.trim().length >= 3;
  const unusedIdeas = INTEREST_IDEAS.filter((idea) => !interestText.toLowerCase().includes(idea));

  function addIdea(idea: string) {
    const current = interestText.trim().replace(/,\s*$/, '');
    setInterests(current ? `${current}, ${idea}` : idea);
  }

  async function saveInterests() {
    if (!interestsValid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ user: User }>('/api/me', { method: 'PATCH', body: { interests: interestText } });
      updateUser(res.user);
      done();
    } catch (err) {
      setError(message(err, "Couldn't save your interests. Try again."));
      setSaving(false);
    }
  }

  /* ---------- footer: one primary button, always visible ---------- */
  const scheduleLoading = step === 2 && !!userId && rowsLoadedFor !== userId;
  const primary =
    step === 1
      ? { label: 'Save and continue', onPress: saveBasics, disabled: !basicsValid }
      : step === 2
        ? {
            label: editing ? 'Save schedule' : rows.length === 0 ? 'Continue without classes' : 'Save and continue',
            onPress: saveSchedule,
            disabled: !rowsValid || reading || scheduleLoading,
          }
        : { label: editing ? 'Save interests' : 'Save and see my week', onPress: saveInterests, disabled: !interestsValid };

  const back = editing
    ? () => (router.canGoBack() ? router.back() : router.replace('/home'))
    : step > 1
      ? () => goTo((step - 1) as Step)
      : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader hideSignIn />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!editing && <ProgressBar step={step} total={3} />}

          <Animated.View
            style={[
              styles.block,
              {
                opacity: slide,
                transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [direction.current * 36, 0] }) }],
              },
            ]}>
            <Text style={type.title}>{STEP_TITLES[step]}</Text>

            {step === 1 && (
              <>
                <Field
                  label="Name"
                  value={basics.name}
                  onChangeText={(name) => setBasics({ ...basics, name })}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="Maya Chen"
                  autoCapitalize="words"
                  maxLength={80}
                  error={touched.name && !nameOk ? 'Enter your name.' : null}
                />
                <Field
                  label="SFU email"
                  value={basics.email}
                  onChangeText={(email) => {
                    setBasics({ ...basics, email });
                    setExists(false);
                  }}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="you@sfu.ca"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!accountMade}
                  style={accountMade ? styles.locked : undefined}
                  error={touched.email && !emailOk ? 'Use your SFU email. It must end in @sfu.ca.' : null}
                  hint={accountMade ? 'Your email is set and cannot be changed.' : undefined}
                />
                {exists && (
                  <View style={styles.notice}>
                    <Text style={type.bodyStrong}>You already have an account</Text>
                    <Text style={type.small}>That SFU email is registered. Sign in to pick up where you left off.</Text>
                    <Button
                      label="Sign in instead"
                      variant="secondary"
                      size="sm"
                      onPress={() => router.replace(`/sign-in?email=${encodeURIComponent(basics.email.trim())}`)}
                    />
                  </View>
                )}
                <Chips label="Campus" options={CAMPUSES} value={basics.campus} onChange={(campus) => setBasics({ ...basics, campus })} />
                <SearchSelect
                  label="Program"
                  value={basics.program}
                  onChange={(program) => setBasics({ ...basics, program })}
                  onBlur={() => setTouched((t) => ({ ...t, program: true }))}
                  options={PROGRAMS}
                  placeholder="Start typing, e.g. Computing Science"
                  error={touched.program && !programOk ? 'Pick your program from the list.' : null}
                />
                <Chips
                  label="Year"
                  options={YEARS}
                  value={basics.year}
                  onChange={(year) => setBasics({ ...basics, year })}
                  format={(y) => (y === 5 ? '5+' : String(y))}
                />
                <View style={styles.group}>
                  <Text style={type.small}>Pick an emoji for your profile</Text>
                  <View style={styles.emojiGrid} accessibilityRole="radiogroup">
                    {EMOJI.map((e) => (
                      <Pop key={e} active={e === basics.emoji}>
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected: e === basics.emoji }}
                          accessibilityLabel={`Emoji ${e}`}
                          onPress={() => setBasics({ ...basics, emoji: e })}
                          style={[styles.emoji, e === basics.emoji && styles.emojiSelected]}>
                          <Text style={styles.emojiText}>{e}</Text>
                        </Pressable>
                      </Pop>
                    ))}
                  </View>
                </View>
              </>
            )}

            {step === 2 && user && (
              <>
                <Text style={[type.body, styles.fog]}>
                  Upload a screenshot of your weekly schedule and we will read the classes off it. Nobody else ever sees
                  your classes, only the times you are both free.
                </Text>
                <Button
                  label={rows.length > 0 ? 'Upload a different screenshot' : 'Upload a schedule screenshot'}
                  variant="quest"
                  onPress={pickScreenshot}
                  loading={reading}
                  disabled={saving}
                />
                {reading && <Text style={[type.small, styles.fog]}>Reading your schedule. This takes a few seconds.</Text>}
                {notice && (
                  <View style={[styles.notice, { borderColor: notice.tone === 'good' ? colors.moss : colors.coral }]}>
                    <Text style={[type.small, { color: notice.tone === 'good' ? colors.moss : colors.coral }]}>{notice.text}</Text>
                  </View>
                )}
                {scheduleLoading ? (
                  <ActivityIndicator color={colors.cobalt} style={styles.left} />
                ) : (
                  <>
                    {rows.length === 0 && (
                      <Text style={[type.body, styles.fog]}>
                        No classes yet. Upload a screenshot above, or add them one at a time.
                      </Text>
                    )}
                    <ClassEditor rows={rows} onChange={setRows} defaultCampus={user.campus} showErrors />
                  </>
                )}
              </>
            )}

            {step === 3 && user && (
              <>
                <Text style={[type.body, styles.fog]}>
                  Be specific. "Bouldering and bad karaoke" finds you better people, and a better side quest, than
                  "sports and music".
                </Text>
                <Field
                  label="Your interests"
                  value={interestText}
                  onChangeText={setInterests}
                  placeholder="bouldering, indie games, bubble tea"
                  multiline
                  maxLength={500}
                />
                {unusedIdeas.length > 0 && (
                  <View style={styles.group}>
                    <Text style={type.small}>Tap to add</Text>
                    <View style={styles.ideas}>
                      {unusedIdeas.map((idea) => (
                        <Pressable key={idea} accessibilityRole="button" onPress={() => addIdea(idea)} style={styles.idea}>
                          <Text style={type.small}>{idea}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </ScrollView>

        {/* Sticky footer: the main button is always on screen. */}
        <View style={styles.footer}>
          {error ? <Text style={[type.small, styles.footerError]}>{error}</Text> : null}
          <View style={styles.footerRow}>
            {back && <Button label="Back" variant="secondary" onPress={back} disabled={saving} />}
            <Button label={primary.label} onPress={primary.onPress} loading={saving} disabled={primary.disabled} style={styles.primary} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  left: { alignSelf: 'flex-start' },
  scroll: { backgroundColor: colors.chalk },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chalk },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  fog: { color: colors.fog },
  block: { gap: spacing.lg },
  group: { gap: spacing.xs },
  locked: { backgroundColor: colors.muted, color: colors.fog },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emoji: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  emojiSelected: { backgroundColor: colors.cobalt },
  emojiText: { fontSize: 24 },
  notice: {
    borderWidth,
    borderColor: colors.coral,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
    gap: spacing.sm,
  },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  idea: {
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.ink,
    borderRadius: 999,
    backgroundColor: colors.paper,
  },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.paper,
    borderTopWidth: borderWidth,
    borderTopColor: colors.ink,
  },
  footerRow: { flexDirection: 'row', gap: spacing.md, width: '100%', maxWidth: 560 - spacing.xl * 2, alignSelf: 'center' },
  footerError: { color: colors.coral, width: '100%', maxWidth: 560 - spacing.xl * 2, alignSelf: 'center' },
  primary: { flex: 1, alignSelf: 'stretch' },
});
