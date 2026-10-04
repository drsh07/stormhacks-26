import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { CardStyleInterpolators, Stack } from 'expo-router/js-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useReduceMotion } from '@/lib/motion';
import { SessionProvider } from '@/lib/session';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // If fonts fail we still show the app (system font) instead of a stuck splash.
  const ready = fontsLoaded || fontError !== null;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootStack />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

/**
 * The top-level stack. Going deeper into a detail screen pushes it in from
 * the right; going back slides it out the same way. (Switching between the
 * main tabs is handled separately, in (tabs)/_layout.tsx.)
 */
function RootStack() {
  const reduce = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        cardStyle: { flex: 1, backgroundColor: colors.chalk },
        gestureEnabled: false,
        cardStyleInterpolator: reduce ? CardStyleInterpolators.forFadeFromCenter : CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 250 } },
          close: { animation: 'timing', config: { duration: 220 } },
        },
      }}
    />
  );
}
