import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useSession } from '@/lib/session';
import { borderWidth, colors, radius, spacing, type } from '@/lib/theme';

export default function Landing() {
  const router = useRouter();
  const { user, loading, error } = useSession();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <AppHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={type.hero}>Your gap between classes is a side quest.</Text>
        <Text style={[type.body, styles.lede]}>
          SideQuest reads your SFU schedule, finds people who are free when you are, and hands you both something
          slightly unhinged to do together.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.cobalt} style={styles.spinner} />
        ) : (
          <View style={styles.actions}>
            {user ? (
              <>
                <Button size="lg" label="Open my week" onPress={() => router.push('/home')} />
                <Text style={[type.small, styles.fog]}>
                  Signed in as {user.name}, {user.campus}
                </Text>
              </>
            ) : (
              <View style={styles.authButtons}>
                <Button size="lg" label="Sign up" onPress={() => router.push('/onboarding')} />
                <Button size="lg" variant="secondary" label="Sign in" onPress={() => router.push('/sign-in')} />
              </View>
            )}
            {error && <Text style={[type.small, { color: colors.coral }]}>{error}</Text>}
          </View>
        )}

        {/* A real sample quest instead of a stock hero image: this is the product. */}
        <Card tone="quest" style={styles.sample} accessibilityLabel="Sample quest">
          <Text style={type.small}>Quest for Maya and Noah, 40 minutes, the AQ</Text>
          <Text style={type.title}>The Concrete Critics</Text>
          <Text style={type.body}>
            Find the most dramatic slab of concrete in the AQ. Give it a name, a star sign, and a one-star review. You
            both climb, so settle whether it would be a V2 or a V5.
          </Text>
          <View style={styles.proof}>
            <Text style={type.small}>Photo proof: both of you pointing at the slab like it owes you money.</Text>
          </View>
        </Card>
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
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  lede: { marginTop: spacing.lg, color: colors.fog, fontSize: 17, lineHeight: 25 },
  spinner: { marginTop: spacing.xl, alignSelf: 'flex-start' },
  actions: { marginTop: spacing.xl, gap: spacing.md },
  fog: { color: colors.fog },
  authButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sample: { marginTop: spacing.xxl, transform: [{ rotate: '-1.5deg' }] },
  proof: {
    borderWidth,
    borderColor: colors.ink,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    padding: spacing.md,
  },
});
