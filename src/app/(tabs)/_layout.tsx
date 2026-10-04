import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { NavBar, TABS } from '@/components/NavBar';
import { useReduceMotion } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

/**
 * The four main screens. They are siblings, not a stack: switching tabs
 * slides sideways in tab order (a tab to the right comes in from the right),
 * while the header and the nav bar stay put. Each tab keeps its own state
 * (scroll position, selected day, filters) while you are on another one.
 */
export default function TabsLayout() {
  const { user, loading } = useSession();
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();

  if (!loading && !user) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <AppHeader />
      <View style={styles.scenes}>
        <Tabs
          tabBar={({ state, navigation }) => (
            <NavBar index={state.index} onSelect={(name) => navigation.navigate(name)} />
          )}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: colors.chalk },
            transitionSpec: { animation: 'timing', config: { duration: 220, easing: Easing.out(Easing.cubic) } },
            // progress: -1 = this screen is to the left of the active tab, 0 = active, 1 = to the right.
            sceneStyleInterpolator: ({ current }) =>
              reduce
                ? { sceneStyle: { opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] }) } }
                : {
                    sceneStyle: {
                      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] }) }],
                    },
                  },
          }}>
          {TABS.map((tab) => (
            <Tabs.Screen key={tab.name} name={tab.name} />
          ))}
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // Clip the sliding screens so they never spill over the header or nav bar.
  scenes: { flex: 1, overflow: 'hidden', backgroundColor: colors.chalk },
});
