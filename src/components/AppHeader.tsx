import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { DEMO_MODE } from '@/lib/api';
import { firstName } from '@/lib/people';
import { useSession } from '@/lib/session';
import { borderWidth, colors, fonts, spacing, type } from '@/lib/theme';

import { Button } from './Button';
import { DemoBadge } from './DemoBadge';
import { DemoSwitcher } from './DemoSwitcher';
import { IconButton } from './IconButton';

interface Props {
  /** Hide the Sign in button (used on the sign-in and sign-up screens themselves). */
  hideSignIn?: boolean;
}

export function AppHeader({ hideSignIn }: Props) {
  const router = useRouter();
  const { user, loading, signOut } = useSession();
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>SideQuest</Text>
      <View style={styles.actions}>
        {!loading && !user && !hideSignIn && (
          <Button label="Sign in" variant="secondary" size="sm" onPress={() => router.push('/sign-in')} />
        )}
        {DEMO_MODE ? (
          <DemoSwitcher />
        ) : (
          user && (
            <>
              <Text style={type.small} numberOfLines={1}>
                {user.avatar_emoji} {firstName(user.name)}
              </Text>
              <DemoBadge name={user.name} />
            </>
          )
        )}
        {user && <IconButton icon={LogOut} label="Sign out" onPress={signOut} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.paper,
    borderBottomWidth: borderWidth,
    borderBottomColor: colors.ink,
  },
  wordmark: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.5, color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
});
