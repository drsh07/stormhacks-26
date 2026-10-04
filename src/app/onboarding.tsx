import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Chips } from '@/components/Chips';
import { ClassEditor, rowError, toClasses, toRows, type ClassRow } from '@/components/ClassEditor';
import { Field } from '@/components/Field';
import { api } from '@/lib/api';
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

function message(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Onboarding: basics -> schedule -> interests.
 * Also used to edit later: /onboarding?step=schedule or ?step=interests
 * opens that one step and returns to the week view when saved.
 */
export default function Onboarding() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const { user, loading: sessionLoading, updateUser } = useSession();

  const editing = params.step === 'schedule' || params.step === 'interests';
  const [step, setStep] = useState<Step>(params.step === 'interests' ? 3 : params.step === 'schedule' ? 2 : 1);

  // Someone who already has an account skips the basics.
  useEffect(() => {
    if (!sessionLoading && user && step === 1) setStep(2);
  }, [sessionLoading, user, step]);

  if (sessionLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <AppHeader />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.cobalt} />
        </View>
      </SafeAreaView>
    );
  }

  const done = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <AppHeader />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!editing && <Text style={[type.small, styles.fog]}>Step {step} of 3</Text>}
          <Text style={type.title}>{STEP_TITLES[step]}</Text>

          {step === 1 && (
            <BasicsStep
              onDone={(created) => {
                updateUser(created);
                setStep(2);
              }}
            />
          )}
          {step === 2 && user && (
            <ScheduleStep key={user.id} user={user} onDone={editing ? done : () => setStep(3)} saveLabel={editing ? 'Save schedule' : 'Save and continue'} />
          )}
          {step === 3 && user && (
            <InterestsStep
              key={user.id}
              user={user}
              onDone={(updated) => {
                updateUser(updated);
                done();
              }}
            />
          )}
          {step !== 1 && !user && (
            <View style={styles.block}>
              <Text style={type.body}>Start with the basics so we know whose schedule this is.</Text>
              <Button label="Go to step 1" onPress={() => setStep(1)} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Step 1: basics ---------- */

function BasicsStep({ onDone }: { onDone: (user: User) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [campus, setCampus] = useState<Campus>('Burnaby');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState<number>(1);
  const [emoji, setEmoji] = useState(EMOJI[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[a-z0-9._-]+@sfu\.ca$/i.test(email.trim());
  const emailError = email.trim().length > 0 && !emailOk ? 'Use your SFU email. It must end in @sfu.ca.' : null;

  async function save() {
    if (name.trim().length < 2) return setError('Enter your name.');
    if (!emailOk) return setError('Use your SFU email. It must end in @sfu.ca.');
    setSaving(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>('/api/users', {
        method: 'POST',
        body: { name, email, campus, program, year, avatar_emoji: emoji },
        userId: null,
      });
      onDone(user);
    } catch (err) {
      setError(message(err, "Couldn't save your account. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.block}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Maya Chen" autoCapitalize="words" maxLength={80} />
      <Field
        label="SFU email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@sfu.ca"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={emailError}
        hint="No password. Already signed up? Use the same email to get back in."
      />
      <Chips label="Campus" options={CAMPUSES} value={campus} onChange={setCampus} />
      <Field label="Program" value={program} onChangeText={setProgram} placeholder="Computing Science" maxLength={80} />
      <Chips label="Year" options={YEARS} value={year} onChange={setYear} format={(y) => (y === 5 ? '5+' : String(y))} />

      <View style={styles.group}>
        <Text style={type.small}>Pick an emoji for your profile</Text>
        <View style={styles.emojiGrid} accessibilityRole="radiogroup">
          {EMOJI.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="radio"
              accessibilityState={{ selected: e === emoji }}
              accessibilityLabel={`Emoji ${e}`}
              onPress={() => setEmoji(e)}
              style={[styles.emoji, e === emoji && styles.emojiSelected]}>
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? <Text style={[type.bodyStrong, { color: colors.coral }]}>{error}</Text> : null}
      <Button label="Save and continue" size="lg" onPress={save} loading={saving} />
    </View>
  );
}

/* ---------- Step 2: schedule upload + review ---------- */

interface ExtractResponse {
  ok: boolean;
  classes: ClassSlot[];
  message?: string;
}

function ScheduleStep({ user, onDone, saveLabel }: { user: User; onDone: () => void; saveLabel: string }) {
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // If this person already has classes (editing, or signed back in), start from those.
  useEffect(() => {
    let cancelled = false;
    api<Schedule>('/api/schedule')
      .then((s) => {
        if (!cancelled) setRows(toRows(s.classes));
      })
      .catch(() => {
        // Not fatal: they can still upload or type their classes.
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  async function pickScreenshot() {
    setNotice(null);
    let picked: ImagePicker.ImagePickerResult;
    try {
      picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.6 });
    } catch {
      setNotice({ tone: 'bad', text: "Couldn't open your photos. Check the photo permission in Settings, or add classes by hand below." });
      return;
    }
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset?.base64) {
      setNotice({ tone: 'bad', text: "Couldn't read that image. Try another screenshot, or add classes by hand below." });
      return;
    }

    setReading(true);
    try {
      const result = await api<ExtractResponse>('/api/schedule/extract', {
        method: 'POST',
        body: { imageBase64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' },
      });
      if (result.ok && result.classes.length > 0) {
        setRows(toRows(result.classes));
        setShowErrors(false);
        setNotice({ tone: 'good', text: `Found ${result.classes.length} class meetings. Check them and fix anything that's off.` });
      } else {
        setNotice({ tone: 'bad', text: result.message ?? "Couldn't read that screenshot. Try again, or add classes by hand below." });
      }
    } catch (err) {
      setNotice({ tone: 'bad', text: `${message(err, "Couldn't read that screenshot.")} You can still add classes by hand below.` });
    } finally {
      setReading(false);
    }
  }

  async function save() {
    setSaveError(null);
    if (rows.some((r) => rowError(r))) {
      setShowErrors(true);
      setSaveError('Some classes need fixing. Look for the red notes above.');
      return;
    }
    setSaving(true);
    try {
      await api<Schedule>('/api/schedule', { method: 'PUT', body: { classes: toClasses(rows) } });
      onDone();
    } catch (err) {
      setSaveError(message(err, "Couldn't save your schedule. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.block}>
      <Text style={[type.body, styles.fog]}>
        Upload a screenshot of your weekly schedule and we will read the classes off it. Nobody else ever sees your
        classes, only the times you are both free.
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

      {loadingExisting ? (
        <ActivityIndicator color={colors.cobalt} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <>
          {rows.length === 0 && (
            <Text style={[type.body, styles.fog]}>No classes yet. Upload a screenshot above, or add them one at a time.</Text>
          )}
          <ClassEditor rows={rows} onChange={setRows} defaultCampus={user.campus} showErrors={showErrors} />
        </>
      )}

      {saveError ? <Text style={[type.bodyStrong, { color: colors.coral }]}>{saveError}</Text> : null}
      <Button
        label={rows.length === 0 ? 'Continue without classes' : saveLabel}
        size="lg"
        onPress={save}
        loading={saving}
        disabled={reading || loadingExisting}
      />
    </View>
  );
}

/* ---------- Step 3: interests ---------- */

function InterestsStep({ user, onDone }: { user: User; onDone: (user: User) => void }) {
  const [interests, setInterests] = useState(user.interests);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addIdea(idea: string) {
    const current = interests.trim().replace(/,\s*$/, '');
    setInterests(current ? `${current}, ${idea}` : idea);
  }
  const unused = INTEREST_IDEAS.filter((idea) => !interests.toLowerCase().includes(idea));

  async function save() {
    if (interests.trim().length < 3) return setError('Add at least one thing you are into.');
    setSaving(true);
    setError(null);
    try {
      const { user: updated } = await api<{ user: User }>('/api/me', { method: 'PATCH', body: { interests } });
      onDone(updated);
    } catch (err) {
      setError(message(err, "Couldn't save your interests. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.block}>
      <Text style={[type.body, styles.fog]}>
        Be specific. "Bouldering and bad karaoke" finds you better people, and a better side quest, than "sports and
        music".
      </Text>
      <Field
        label="Your interests"
        value={interests}
        onChangeText={setInterests}
        placeholder="bouldering, indie games, bubble tea"
        multiline
        maxLength={500}
      />
      {unused.length > 0 && (
        <View style={styles.group}>
          <Text style={type.small}>Tap to add</Text>
          <View style={styles.ideas}>
            {unused.map((idea) => (
              <Pressable key={idea} accessibilityRole="button" onPress={() => addIdea(idea)} style={styles.idea}>
                <Text style={type.small}>{idea}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {error ? <Text style={[type.bodyStrong, { color: colors.coral }]}>{error}</Text> : null}
      <Button label="Save and see my week" size="lg" onPress={save} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  scroll: { backgroundColor: colors.chalk },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.chalk },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 3,
    gap: spacing.sm,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  fog: { color: colors.fog },
  block: { marginTop: spacing.lg, gap: spacing.lg },
  group: { gap: spacing.xs },
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
  notice: { borderWidth, borderRadius: radius.md, backgroundColor: colors.paper, padding: spacing.md },
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
});
