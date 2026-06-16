import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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
  const [success,  setSuccess]  = useState(false);

  async function handleRegister() {
    setError(null);

    if (!name.trim())                    return setError('Ingresa tu nombre.');
    if (username.trim().length < 3)      return setError('El username debe tener al menos 3 caracteres.');
    if (!/^[a-z0-9_]+$/i.test(username)) return setError('Username solo puede tener letras, números y _');
    if (!email.trim())                   return setError('Ingresa tu correo.');
    if (password.length < 8)             return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm)            return setError('Las contraseñas no coinciden.');

    setLoading(true);
    const { error: err } = await signUp(
      name.trim(),
      username.trim().toLowerCase(),
      email.trim().toLowerCase(),
      password,
    );
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    // Either AuthGate redirects to /home (if email confirmation is off)
    // or we land on the "check your email" success view (if it's on).
    setSuccess(true);
  }

  const usernameValid = username.length >= 3 && /^[a-z0-9_]+$/i.test(username);

  // ─── Success screen ────────────────────────────────────────
  if (success) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="" onBack={false} />
        <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: 78,
              height: 78,
              borderRadius: 39,
              backgroundColor: accentColor,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 22,
            }}
          >
            <Icon name="mail" size={36} color={accentInk} stroke={2.4} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.paper, textAlign: 'center' }}>
            Revisa tu correo
          </Text>
          <Text style={{ fontSize: 14, color: colors.paper2, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
            Te enviamos un link de confirmación a{' '}
            <Text style={{ color: colors.paper, fontWeight: '700' }}>{email}</Text>.
            {'\n'}Confírmalo para activar tu cuenta y empezar a jugar.
          </Text>

          <View
            style={{
              marginTop: 26,
              padding: 14,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              width: '100%',
            }}
          >
            <Text style={{ fontSize: 12, color: colors.mist, lineHeight: 18 }}>
              💡 Si no llega en unos minutos, revisa la carpeta de spam o promociones.
            </Text>
          </View>

          <View style={{ marginTop: 28, width: '100%' }}>
            <CButton variant="primary" size="lg" full onPress={() => router.replace('/(auth)/login')}>
              Ir a iniciar sesión
            </CButton>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ─── Form ───────────────────────────────────────────────────
  return (
    <ScreenContainer theme="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
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
          showsVerticalScrollIndicator={false}
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
            passwordToggle
            help="Mínimo 8 caracteres"
            lead={<Icon name="lock" size={18} color={colors.mist} />}
          />
          <Input
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            passwordToggle
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

          <View style={{ paddingTop: 6 }}>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
