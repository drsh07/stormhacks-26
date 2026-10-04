import { StyleSheet, Text, View } from 'react-native';

import { DEMO_MODE } from '@/lib/api';
import { useSession } from '@/lib/session';
import { borderWidth, colors, fonts, spacing, type } from '@/lib/theme';

import { DemoSwitcher } from './DemoSwitcher';

export function AppHeader() {
  const { user } = useSession();
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>SideQuest</Text>
      {DEMO_MODE ? (
        <DemoSwitcher />
      ) : (
        user && (
          <Text style={type.small}>
            {user.avatar_emoji} {user.name.split(' ')[0]}
          </Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.paper,
    borderBottomWidth: borderWidth,
    borderBottomColor: colors.ink,
  },
  wordmark: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.5, color: colors.ink },
});
