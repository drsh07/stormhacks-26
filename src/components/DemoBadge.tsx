import { StyleSheet, Text, View } from 'react-native';

import { isDemoName } from '@/lib/people';
import { colors, fonts } from '@/lib/theme';

/** A small "DEMO" tag. Renders nothing unless `name` is one of the demo accounts. */
export function DemoBadge({ name }: { name: string }) {
  if (!isDemoName(name)) return null;
  return (
    <View style={styles.badge} accessibilityLabel="Demo account">
      <Text style={styles.text}>DEMO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  text: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.6, color: colors.white },
});
