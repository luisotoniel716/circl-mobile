import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { TweakProvider } from '../src/lib/tweaks';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { colors } from '../src/design-system';

SplashScreen.preventAutoHideAsync();

// ─── Auth gate — redirects based on session ──────────────────
function AuthGate() {
  const { session, loading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && !inAuthGroup) {
      // Not signed in → send to welcome
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      // Already signed in → send to home tab
      router.replace('/(tabs)/home');
    }
    // If session && inTabsGroup → already in the right place, do nothing
    // If !session && inAuthGroup → already in auth flow, do nothing
  }, [session, loading, segments]);

  return null;
}

// ─── Root Layout ─────────────────────────────────────────────
export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.s900 }}>
      <SafeAreaProvider>
        <TweakProvider>
          <AuthProvider>
            <AuthGate />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.s900 },
              }}
            />
          </AuthProvider>
        </TweakProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
