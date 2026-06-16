import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, CButton, Input, Icon, Text, colors,
} from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { useJoinGroup } from '../../src/lib/queries';

export default function JoinGroup() {
  const router = useRouter();
  const { accentColor, accentInk } = useAccent();
  const joinGroup = useJoinGroup();
  const [code, setCode] = useState('');

  async function handleJoin() {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length < 4) {
      Alert.alert('Código inválido', 'El código debe tener al menos 4 caracteres.');
      return;
    }
    try {
      const groupId = await joinGroup.mutateAsync(cleaned);
      router.replace('/(tabs)/groups');
      router.push({ pathname: '/group/[id]', params: { id: groupId } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No pudimos unirte al grupo.';
      Alert.alert('Error', msg);
    }
  }

  return (
    <ScreenContainer theme="dark">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TopBar title="Join a Circl" onBack />

        <View style={{ paddingHorizontal: 24, paddingTop: 18 }}>
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
            <Icon name="qr" size={28} color={accentInk} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.paper }}>
            Pega tu código
          </Text>
          <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 6, lineHeight: 19 }}>
            Tu amigo te compartió un código de 8 caracteres. Pégalo abajo para unirte a su Circl.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 12 }}>
          <Input
            label="Invite code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="ABCD1234"
            maxLength={12}
            lead={<Icon name="lock" size={18} color={colors.mist} />}
          />
        </View>

        <View style={{ marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 20 }}>
          <CButton
            variant="primary"
            size="lg"
            full
            onPress={handleJoin}
            disabled={joinGroup.isPending}
          >
            {joinGroup.isPending ? 'Buscando…' : 'Unirme al grupo'}
          </CButton>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
