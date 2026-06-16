import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { ScreenContainer, Icon, Text, CButton, colors } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { useAccent } from '../../src/lib/tweaks';

type Status = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const { accentColor, accentInk } = useAccent();
  const [status, setStatus]   = useState<Status>('processing');
  const [message, setMessage] = useState('Confirmando tu cuenta…');

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCallback() {
    try {
      // Tokens may arrive in two shapes:
      //  1) ?access_token=...&refresh_token=...   (search params)
      //  2) #access_token=...&refresh_token=...   (URL fragment) — Supabase default
      const url = await Linking.getInitialURL();
      const fragment = url?.split('#')[1] ?? '';
      const fragParams = new URLSearchParams(fragment);

      const access_token =
        (params.access_token as string | undefined) ?? fragParams.get('access_token');
      const refresh_token =
        (params.refresh_token as string | undefined) ?? fragParams.get('refresh_token');
      const error_description =
        (params.error_description as string | undefined) ??
        fragParams.get('error_description');

      if (error_description) {
        setStatus('error');
        setMessage(decodeURIComponent(error_description));
        return;
      }

      if (!access_token || !refresh_token) {
        setStatus('error');
        setMessage('No encontramos un token válido en el link. Intenta iniciar sesión.');
        return;
      }

      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setStatus('error');
        setMessage(error.message);
        return;
      }

      setStatus('success');
      setMessage('¡Cuenta confirmada! Entrando…');
      // AuthGate in _layout will redirect to /(tabs)/home once the session is set.
      setTimeout(() => router.replace('/(tabs)/home'), 800);
    } catch (e) {
      setStatus('error');
      setMessage('Algo salió mal al confirmar. Intenta iniciar sesión.');
    }
  }

  return (
    <ScreenContainer theme="dark">
      <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            width: 78,
            height: 78,
            borderRadius: 39,
            backgroundColor:
              status === 'success' ? colors.green : status === 'error' ? colors.red : accentColor,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 22,
          }}
        >
          {status === 'processing' ? (
            <ActivityIndicator color={accentInk} size="large" />
          ) : (
            <Icon
              name={status === 'success' ? 'check' : 'close'}
              size={36}
              color={accentInk}
              stroke={2.6}
            />
          )}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.paper, textAlign: 'center' }}>
          {status === 'success'
            ? 'Listo'
            : status === 'error'
            ? 'No pudimos confirmar'
            : 'Un momento…'}
        </Text>
        <Text style={{ fontSize: 14, color: colors.paper2, marginTop: 10, textAlign: 'center', lineHeight: 20 }}>
          {message}
        </Text>

        {status === 'error' ? (
          <View style={{ marginTop: 28, width: '100%' }}>
            <CButton variant="primary" size="lg" full onPress={() => router.replace('/(auth)/login')}>
              Ir a iniciar sesión
            </CButton>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
