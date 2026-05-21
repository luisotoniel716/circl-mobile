import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, TopBar, CButton, Input, Icon, Text, colors } from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';

export default function Login() {
  const router = useRouter();
  const { accentColor, accentInk } = useAccent();
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
        <Input label="Email or username" defaultValue="@dreyes" autoCapitalize="none" lead={<Icon name="at" size={18} color={colors.mist} />} />
        <Input label="Password" defaultValue="circl2026" secureTextEntry lead={<Icon name="lock" size={18} color={colors.mist} />} trail={<Icon name="eye" size={18} color={colors.mist} />} />
        <Text onPress={() => router.push('/(auth)/welcome')} style={{ textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.paper2 }}>
          Forgot password?
        </Text>
      </View>
      <View style={{ marginTop: 'auto', paddingHorizontal: 20, paddingBottom: 24 }}>
        <CButton variant="primary" size="lg" full onPress={() => router.replace('/(tabs)/home')}>
          Log in
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
