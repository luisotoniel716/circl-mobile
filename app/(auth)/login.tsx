import { useState } from 'react';
import { View } from 'react-native';
import { ScreenContainer, TopBar, CButton, Input, Icon, Text, colors } from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { useAuth } from '../../src/lib/auth';
import { useRouter } from 'expo-router';

export default function Login() {
  const router = useRouter();
  const { accentColor, accentInk } = useAccent();
  const { signIn } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) {
      setError('Correo o contraseña incorrectos.');
    }
    // On success AuthGate in _layout will redirect to /(tabs)/home automatically
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Log in" onBack />
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
          secureTextEntry
          lead={<Icon name="lock" size={18} color={colors.mist} />}
          trail={<Icon name="eye" size={18} color={colors.mist} />}
        />
        {error ? (
          <Text style={{ fontSize: 13, color: colors.red, fontWeight: '600' }}>{error}</Text>
        ) : null}
        <Text
          onPress={() => {}}
          style={{ textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.paper2 }}
        >
          Forgot password?
        </Text>
      </View>

      <View style={{ marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 24 }}>
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
    </ScreenContainer>
  );
}
