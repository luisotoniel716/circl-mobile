import { useState } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import {
  ScreenContainer, TopBar, Input, CButton, Icon, Text, colors,
} from '../../src/components';
import { useAuth } from '../../src/lib/auth';
import { supabase } from '../../src/lib/supabase';

/**
 * Account info screen — surfaces the read-only account data (email,
 * created date) and lets the user change their password through Supabase
 * Auth. Email changes still require contacting support because they
 * involve re-verification and we don't have that flow wired yet.
 */
export default function AccountSettings() {
  const { user } = useAuth();

  const [showPwd, setShowPwd] = useState(false);
  const [newPwd, setNewPwd]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const newPwdValid = newPwd.length >= 8;
  const confirmValid = newPwd === confirm && confirm.length > 0;
  const canSubmit = newPwdValid && confirmValid && !submitting;

  // ISO → local date string. Supabase user.created_at is ISO.
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  async function handleChangePassword() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      Alert.alert('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.');
      setNewPwd('');
      setConfirm('');
      setShowPwd(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos cambiar tu contraseña.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Información de cuenta" onBack />

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
          {/* ── Info read-only ─────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 }}>
            <View
              style={{
                backgroundColor: colors.s800,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.04)',
                overflow: 'hidden',
              }}
            >
              {/* Email row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <View
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="mail" size={15} color={colors.paper2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mist }}>EMAIL</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.paper, marginTop: 2 }}>
                    {user?.email ?? '—'}
                  </Text>
                </View>
                <Icon name="lock" size={13} color={colors.mist} />
              </View>

              {/* Created at row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                }}
              >
                <View
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="check" size={15} color={colors.paper2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mist }}>CUENTA CREADA</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.paper, marginTop: 2 }}>
                    {createdAt}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={{ fontSize: 11, color: colors.mist, marginTop: 8, paddingHorizontal: 4 }}>
              Para cambiar tu email contáctanos en soporte.
            </Text>
          </View>

          {/* ── Change password ─────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper2, marginBottom: 10 }}>
              CONTRASEÑA
            </Text>

            {!showPwd ? (
              <Pressable
                onPress={() => setShowPwd(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  backgroundColor: colors.s800,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <View
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon name="lock" size={15} color={colors.paper2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.paper }}>
                    Cambiar contraseña
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.mist }}>
                    Mínimo 8 caracteres
                  </Text>
                </View>
                <Icon name="chev" size={16} color={colors.mist} />
              </Pressable>
            ) : (
              <View
                style={{
                  backgroundColor: colors.s800,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.04)',
                  padding: 14,
                  gap: 12,
                }}
              >
                <Input
                  label="Nueva contraseña"
                  value={newPwd}
                  onChangeText={setNewPwd}
                  passwordToggle
                  valid={newPwd.length > 0 ? (newPwdValid ? 'ok' : 'err') : undefined}
                  help={!newPwdValid && newPwd.length > 0 ? 'Mínimo 8 caracteres' : undefined}
                />
                <Input
                  label="Confirmar contraseña"
                  value={confirm}
                  onChangeText={setConfirm}
                  passwordToggle
                  valid={confirm.length > 0 ? (confirmValid ? 'ok' : 'err') : undefined}
                  help={!confirmValid && confirm.length > 0 ? 'No coincide con la nueva contraseña' : undefined}
                />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <CButton
                    variant="ghostDark"
                    size="md"
                    onPress={() => {
                      setShowPwd(false);
                      setNewPwd('');
                      setConfirm('');
                    }}
                  >
                    Cancelar
                  </CButton>
                  <View style={{ flex: 1 }}>
                    <CButton
                      variant="primary"
                      size="md"
                      full
                      disabled={!canSubmit}
                      onPress={handleChangePassword}
                    >
                      {submitting ? 'Guardando…' : 'Guardar nueva contraseña'}
                    </CButton>
                  </View>
                </View>
                {submitting ? (
                  <ActivityIndicator color={colors.paper2} style={{ marginTop: 4 }} />
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
