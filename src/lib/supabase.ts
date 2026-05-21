// Supabase placeholder.
//
// When ready to connect a backend:
//   1. npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
//   2. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env file.
//   3. Uncomment the client below and replace the mock data reads in src/data
//      with queries through src/features/* repositories.
//
// The app currently runs entirely on the mock data in src/data, so nothing
// here is imported yet — this keeps the architecture ready without a hard dep.

// import 'react-native-url-polyfill/auto';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';
//
// const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
//
// export const supabase = createClient(url, anonKey, {
//   auth: {
//     storage: AsyncStorage,
//     autoRefreshToken: true,
//     persistSession: true,
//     detectSessionInUrl: false,
//   },
// });

export const SUPABASE_READY = false;
