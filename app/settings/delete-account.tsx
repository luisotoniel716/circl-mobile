import { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Input, CButton, Icon, Text, colors,
} from '../../src/components';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';

const CONFIRM_WORD = 'ELIMINAR';

/**
 * Delete account flow. The user must type a confirmation word so a
 * misclick doesn't nuke the account. Calls the RPC delete_my_account
 * which removes the auth row and cascades through profile + picks +
 * memberships + notifications. Then signs out and bounces to welcome.
 */
export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_WORD && !submitting;

  async function handleDelete() {
    if (!canSubmit) return;
    Alert.alert(
      'Última oportunidad',
      '¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer y borrará tus picks, grupos, amistades y todo tu historial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              // `delete_my_account` exists in the DB but isn't yet in the
              // generated RPC type union. Cast around it until next regen.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error } = await (supabase.rpc as any)('delete_my_account');
              if (error) throw error;
              // Sign-out locally and clear cached session.
              await signOut();
              router.replace('/(auth)/welcome');
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'No pudimos eliminar tu cuenta.';
              Alert.alert('Error', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Eliminar cuenta" onBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero warning */}
          <View
            style={{
              margin: 20,
              padding: 18,
              borderRadius: 18,
              backgroundColor: colors.red + '15',
              borderWidth: 1,
              borderColor: colors.red + '44',
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: colors.red,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon name="trash" size={24} color={colors.paper} />
              </View>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '900', color: colors.paper, textAlign: 'center' }}>
              Esta acción es permanente
            </Text>
            <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
              Si eliminas tu cuenta perderás:
            </Text>
            <View style={{ marginTop: 12, gap: 6 }}>
              {[
                'Todos tus picks e historial de aciertos',
                'Tus puntos y rankings en cada grupo',
                'Tus amistades y solicitudes pendientes',
                'Tu acceso a los grupos en los que estás',
                'Tu nombre de usuario quedará liberado',
              ].map((line, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Text style={{ color: colors.red, fontWeight: '900' }}>•</Text>
                  <Text style={{ flex: 1, fontSize: 12.5, color: colors.paper, lineHeight: 17 }}>
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Confirm field */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 13, color: colors.paper2, marginBottom: 10, lineHeight: 18 }}>
              Para confirmar, escribe <Text style={{ color: colors.red, fontWeight: '900' }}>{CONFIRM_WORD}</Text> en mayúsculas en el campo de abajo.
            </Text>

            <Input
              label="Confirmación"
              placeholder={CONFIRM_WORD}
              value={confirmText}
              onChangeText={(v) => setConfirmText(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              valid={confirmText.length > 0
                ? (confirmText.trim().toUpperCase() === CONFIRM_WORD ? 'ok' : 'err')
                : undefined}
              help={confirmText.length > 0 && confirmText.trim().toUpperCase() !== CONFIRM_WORD
                ? `Escribe exactamente "${CONFIRM_WORD}"`
                : undefined}
            />

            <View style={{ marginTop: 18 }}>
              <CButton
                variant="primary"
                size="lg"
                full
                disabled={!canSubmit}
                lead={<Icon name="trash" size={18} color={colors.paper} />}
                onPress={handleDelete}
              >
                {submitting ? 'Eliminando…' : 'Eliminar mi cuenta'}
              </CButton>
            </View>

            {submitting ? (
              <ActivityIndicator color={colors.paper2} style={{ marginTop: 12 }} />
            ) : null}

            <Text
              style={{
                fontSize: 11,
                color: colors.mist,
                marginTop: 16,
                textAlign: 'center',
                lineHeight: 16,
              }}
            >
              ¿No quieres eliminar la cuenta pero dejar de recibir notificaciones?{'\n'}
              Apágalas desde Configuración → Notificaciones.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
