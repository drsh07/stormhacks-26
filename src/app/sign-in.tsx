import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Enter } from '@/components/Enter';
import { ErrorText, Field } from '@/components/Field';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';
import type { User } from '@/lib/types';

const SFU_EMAIL = /^[a-z0-9._-]+@sfu\.ca$/i;

/** Sign in: SFU email only, no password. */
export default function SignIn() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { user, loading, updateUser } = useSession();

  const [email, setEmail] = useState(params.email ?? '');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  if (!loading && user) return <Redirect href="/home" />;

  const valid = SFU_EMAIL.test(email.trim());
  const emailError = touched && !valid ? 'Use your SFU email. It must end in @sfu.ca.' : null;

  async function signIn() {
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await api<{ user: User }>('/api/sign-in', { method: 'POST', body: { email: email.trim() }, userId: null });
      updateUser(res.user); // saved on the device, so a refresh keeps you signed in
      router.replace('/home');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'not_found') setNotFound(true);
      else setError(err instanceof Error ? err.message : "Couldn't sign you in. Try again.");
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader hideSignIn />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Enter>
            <Text style={type.title}>Sign in</Text>
            <Text style={[type.body, styles.fog]}>Enter the SFU email you signed up with.</Text>
          </Enter>

          <Field
            label="SFU email"
            icon={Mail}
            valid={valid && !notFound}
            value={email}
            onChangeText={(next) => {
              setEmail(next);
              setNotFound(false);
            }}
            onBlur={() => setTouched(true)}
            onSubmitEditing={signIn}
            placeholder="you@sfu.ca"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            error={emailError}
          />

          {notFound && (
            <View style={styles.notice}>
              <Text style={type.bodyStrong}>No account with that email</Text>
              <Text style={type.small}>Check the spelling, or create an account. It takes a minute.</Text>
              <Button label="Sign up instead" variant="secondary" size="sm" onPress={() => router.replace('/onboarding')} />
            </View>
          )}
          {error ? <ErrorText>{error}</ErrorText> : null}

          <Button label="Sign in" size="lg" onPress={signIn} loading={busy} disabled={!valid} />
          <Button label="New here? Sign up" variant="secondary" size="sm" onPress={() => router.replace('/onboarding')} />
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
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  fog: { color: colors.fog },
  notice: {
    borderWidth,
    borderColor: colors.coral,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
