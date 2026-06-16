import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TweakProvider } from '../src/lib/tweaks';
import { AuthProvider, useAuth } from '../src/lib/auth';
import { useNotificationsRealtime } from '../src/lib/queries';
import { colors } from '../src/design-system';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Network-on-demand defaults. Tuned per-query when needed.
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

SplashScreen.preventAutoHideAsync();

// ─── Auth gate — redirects based on session ──────────────────
function AuthGate() {
  const { session, loading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  // Subscribe to notification realtime updates whenever logged in.
  useNotificationsRealtime();

  // Tap on a system push → route to the right screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { kind?: string; group_id?: string; match_id?: string }
        | undefined;
      if (!data) {
        router.push('/(tabs)/activity');
        return;
      }
      switch (data.kind) {
        case 'friend_request':
        case 'friend_accepted':
          router.push('/friends');
          return;
        case 'group_invite':
        case 'group_invite_accepted':
        case 'group_member_joined':
        case 'rank_up':
        case 'rank_down':
          if (data.group_id) {
            router.push({ pathname: '/group/[id]', params: { id: data.group_id } });
            return;
          }
          break;
        case 'pick_correct':
        case 'pick_missed':
        case 'match_kickoff_soon':
          if (data.match_id) {
            router.push({ pathname: '/match/[id]', params: { id: data.match_id } });
            return;
          }
          break;
      }
      router.push('/(tabs)/activity');
    });
    return () => sub.remove();
  }, [router]);

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
        <QueryClientProvider client={queryClient}>
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
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
