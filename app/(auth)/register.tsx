import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { ScreenContainer, TopBar, CButton, Input, Icon, Text, colors } from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { useAuth } from '../../src/lib/auth';
import { useRouter } from 'expo-router';

export default function Register() {
  const router = useRouter();
  const { accentColor, accentInk } = useAccent();
  const { signUp } = useAuth();

  const [name,     setName]     = useState('');
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleRegister() {
    setError(null);

    if (!name.trim())           return setError('Ingresa tu nombre.');
    if (username.trim().length < 3) return setError('El username debe tener al menos 3 caracteres.');
    if (!/^[a-z0-9_]+$/i.test(username)) return setError('Username solo puede tener letras, números y _');
    if (!email.trim())          return setError('Ingresa tu correo.');
    if (password.length < 8)   return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm)   return setError('Las contraseñas no coinciden.');

    setLoading(true);
    const { error: err } = await signUp(
      name.trim(),
      username.trim().toLowerCase(),
      email.trim().toLowerCase(),
      password,
    );
    setLoading(false);
    if (err) setError(err);
    // On success AuthGate redirects to /(tabs)/home
  }

  const usernameValid = username.length >= 3 && /^[a-z0-9_]+$/i.test(username);

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Create account" onBack />
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.paper }}>Join the Circl.</Text>
        <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 6 }}>
          Pick a username your friends can find you with.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Full name"
          value={name}
          onChangeText={setName}
          lead={<Icon name="user" size={18} color={colors.mist} />}
        />
        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          valid={usernameValid ? 'ok' : undefined}
          help={usernameValid ? 'Disponible · tus amigos te buscarán así' : undefined}
          lead={<Icon name="at" size={18} color={colors.mist} />}
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          lead={<Icon name="mail" size={18} color={colors.mist} />}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          lead={<Icon name="lock" size={18} color={colors.mist} />}
          trail={<Icon name="eye" size={18} color={colors.mist} />}
        />
        <Input
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          valid={confirm.length > 0 && confirm === password ? 'ok' : undefined}
          lead={<Icon name="lock" size={18} color={colors.mist} />}
        />

        {error ? (
          <Text style={{ fontSize: 13, color: colors.red, fontWeight: '600' }}>{error}</Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            alignItems: 'flex-start',
            padding: 14,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              backgroundColor: accentColor,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <Icon name="check" size={14} color={accentInk} stroke={2.6} />
          </View>
          <Text style={{ flex: 1, fontSize: 11.5, color: colors.paper2, lineHeight: 16 }}>
            I agree to the Terms & Privacy. I understand Circl is a free social game with{' '}
            <Text style={{ color: colors.paper, fontWeight: '700' }}>no real-money betting</Text>.
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
        <CButton variant="primary" size="lg" full onPress={handleRegister} disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </CButton>
        <Text style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: colors.paper2 }}>
          Already have one?{' '}
          <Text
            onPress={() => router.push('/(auth)/login')}
            style={{ color: colors.paper, fontWeight: '700' }}
          >
            Log in
          </Text>
        </Text>
      </View>
    </ScreenContainer>
  );
}
