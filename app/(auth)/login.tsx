import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { ScreenContainer, TopBar, CButton, Input, Icon, Text, colors } from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';
import { useRouter } from 'expo-router';

export default function Login() {
  const router = useRouter();
  const { accentColor, accentInk } = useAccent();
  const { signIn } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setError(null);
    setNeedsConfirm(false);
    setLoading(true);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) {
      // Detect "email not confirmed" from Supabase
      const lower = err.toLowerCase();
      if (lower.includes('confirm') || lower.includes('not confirmed') || lower.includes('verified')) {
        setNeedsConfirm(true);
        setError('Necesitas confirmar tu correo antes de iniciar sesión.');
      } else {
        setError('Correo o contraseña incorrectos.');
      }
    }
    // On success AuthGate in _layout will redirect to /(tabs)/home automatically
  }

  async function handleResend() {
    setResending(true);
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: Linking.createURL('auth/callback') },
    });
    setResending(false);
    if (err) {
      Alert.alert('Error', err.message);
    } else {
      Alert.alert('Listo', 'Te reenviamos el correo de confirmación.');
    }
  }

  return (
    <ScreenContainer theme="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TopBar title="Log in" onBack />
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 8 }}>
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: accentColor,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Icon name="target" size={32} color={accentInk} />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.paper }}>Welcome back.</Text>
            <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 6 }}>
              Sign in to make this week&apos;s picks.
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 18, gap: 12 }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              lead={<Icon name="at" size={18} color={colors.mist} />}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              passwordToggle
              lead={<Icon name="lock" size={18} color={colors.mist} />}
            />
            {error ? (
              <Text style={{ fontSize: 13, color: colors.red, fontWeight: '600' }}>{error}</Text>
            ) : null}
            {needsConfirm ? (
              <Text
                onPress={handleResend}
                style={{ fontSize: 13, color: colors.paper, fontWeight: '700', textDecorationLine: 'underline' }}
              >
                {resending ? 'Reenviando…' : 'Reenviar correo de confirmación'}
              </Text>
            ) : null}
            <Text
              onPress={() => {}}
              style={{ textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.paper2 }}
            >
              Forgot password?
            </Text>
          </View>

          <View style={{ marginTop: 'auto', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 24 }}>
            <CButton variant="primary" size="lg" full onPress={handleLogin} disabled={loading}>
              {loading ? 'Signing in…' : 'Log in'}
            </CButton>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ fontSize: 11, color: colors.mist, fontWeight: '700' }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </View>
            <CButton variant="ghostDark" size="lg" full onPress={() => router.push('/(auth)/register')}>
              Create new account
            </CButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
