import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { firstName } from '@/lib/people';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, shadow, spacing, type } from '@/lib/theme';
import type { DemoUser } from '@/lib/types';

import { Button } from './Button';
import { DemoBadge } from './DemoBadge';
import { ErrorText } from './Field';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; users: DemoUser[] };

/** Demo only: lets one phone play both sides of a meetup. */
export function DemoSwitcher() {
  const { user, signInAs } = useSession();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: 'loading' });
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetNote, setResetNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await api<{ users: DemoUser[] }>('/api/demo/users');
      setState({ status: 'ready', users: data.users });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : "Couldn't load users." });
    }
  }, []);

  /** Puts Demo Alex and Demo Sam back to their starting state so the demo can be run again. */
  async function resetDemo() {
    setResetting(true);
    setResetNote(null);
    try {
      await api('/api/demo/reset', { method: 'POST', body: {}, timeoutMs: 60000 });
      setResetNote({ ok: true, text: 'Demo Alex and Demo Sam are back to their starting state.' });
      await load();
    } catch (err) {
      setResetNote({ ok: false, text: err instanceof Error ? err.message : "Couldn't reset the demo accounts." });
    } finally {
      setResetting(false);
    }
  }

  function show() {
    setResetNote(null);
    setOpen(true);
    load();
  }

  async function pick(id: string) {
    setSwitchingId(id);
    try {
      await signInAs(id);
      setOpen(false);
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : "Couldn't switch user." });
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Demo: switch user"
        onPress={show}
        style={({ pressed }) => [styles.chip, pressed ? shadow.none : shadow.hardSm]}>
        <Text style={[type.small, styles.chipText]} numberOfLines={1}>
          {user ? `${user.avatar_emoji} ${firstName(user.name)}` : 'Demo'}
        </Text>
        {user && <DemoBadge name={user.name} />}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={type.title}>Demo: switch user</Text>
            <Button label="Close" variant="secondary" size="sm" onPress={() => setOpen(false)} />
          </View>

          <View style={styles.resetBox}>
            <Button label="Reset demo accounts" variant="secondary" size="sm" onPress={resetDemo} loading={resetting} disabled={switchingId !== null} />
            {resetNote &&
              (resetNote.ok ? <Text style={[type.small, { color: colors.moss }]}>{resetNote.text}</Text> : <ErrorText>{resetNote.text}</ErrorText>)}
          </View>

          {state.status === 'loading' && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[type.small, styles.fog]}>Loading demo users…</Text>
            </View>
          )}

          {state.status === 'error' && (
            <View style={styles.center}>
              <Text style={[type.bodyStrong, { color: colors.coral, textAlign: 'center' }]}>{state.message}</Text>
              <Button label="Try again" onPress={load} style={{ alignSelf: 'center' }} />
            </View>
          )}

          {state.status === 'ready' && state.users.length === 0 && (
            <View style={styles.center}>
              <Text style={[type.body, { textAlign: 'center' }]}>
                No users yet. Run npm run seed in the backend folder.
              </Text>
              <Button label="Check again" onPress={load} style={{ alignSelf: 'center' }} />
            </View>
          )}

          {state.status === 'ready' && state.users.length > 0 && (
            <FlatList
              data={state.users}
              keyExtractor={(u) => u.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const selected = item.id === user?.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={switchingId !== null}
                    onPress={() => pick(item.id)}
                    style={({ pressed }) => [
                      styles.row,
                      selected && { backgroundColor: colors.muted },
                      pressed && { backgroundColor: colors.muted },
                    ]}>
                    <Text style={styles.emoji}>{item.avatar_emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={type.bodyStrong}>{item.name}</Text>
                        <DemoBadge name={item.name} />
                      </View>
                      <Text style={[type.small, styles.fog]}>{item.campus}</Text>
                    </View>
                    {switchingId === item.id && <ActivityIndicator color={colors.ink} />}
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    maxWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 36,
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
  },
  chipText: { flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  resetBox: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  sheet: { flex: 1, backgroundColor: colors.chalk },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  fog: { color: colors.fog },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
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
  emoji: { fontSize: 26 },
});
