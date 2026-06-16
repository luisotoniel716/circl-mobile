import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase, SUPABASE_READY } from './supabase';
import { setupNotificationHandler, registerForPushNotifications, unregisterPushToken } from './push';
import type { Profile } from '../types/database';

// ─── Types ───────────────────────────────────────────────────

interface AuthState {
  session:  Session | null;
  user:     User    | null;
  profile:  Profile | null;
  loading:  boolean;
}

interface AuthActions {
  signIn:   (email: string, password: string) => Promise<{ error: string | null }>;
  signUp:   (name: string, username: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut:  () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState & AuthActions>({
  session: null, user: null, profile: null, loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

// ─── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,  setSession]  = useState<Session | null>(null);
  const [user,     setUser]     = useState<User    | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);

  // Track this device's push token so we can unregister on sign-out.
  const pushTokenRef = useRef<string | null>(null);

  // Configure foreground notification handler once at mount.
  useEffect(() => {
    setupNotificationHandler();
  }, []);

  // Load persisted session on mount
  useEffect(() => {
    if (!SUPABASE_READY) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        registerForPushNotifications(session.user.id).then((tok) => {
          pushTokenRef.current = tok;
        });
      }
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        registerForPushNotifications(session.user.id).then((tok) => {
          pushTokenRef.current = tok;
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  // ── Actions ─────────────────────────────────────────────────

  async function signIn(email: string, password: string) {
    if (!SUPABASE_READY) return { error: 'Backend not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(name: string, username: string, email: string, password: string) {
    if (!SUPABASE_READY) return { error: 'Backend not configured' };

    // Check username availability before creating account
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existing) return { error: 'Este nombre de usuario ya está en uso' };

    // Use Linking.createURL so it works both in Expo Go (exp+circlmobile://…)
    // and in the standalone build (circlmobile://…)
    const redirectTo = Linking.createURL('auth/callback');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, username: username.toLowerCase() },
        emailRedirectTo: redirectTo,
      },
    });

    return { error: error?.message ?? null };
  }

  async function signOut() {
    // Remove this device's push token first so logged-out users don't keep
    // receiving notifications meant for someone else on this phone.
    await unregisterPushToken(pushTokenRef.current);
    pushTokenRef.current = null;
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
