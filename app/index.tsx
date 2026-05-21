import { Redirect } from 'expo-router';

// Entry point. Later this can branch on Supabase auth state:
// const { session } = useAuth();
// return <Redirect href={session ? '/(tabs)/home' : '/(auth)/welcome'} />;
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
