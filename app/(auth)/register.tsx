import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, TopBar, CButton, Input, Icon, Text, colors } from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';

export default function Register() {
  const router = useRouter();
  const { accentColor, accentInk } = useAccent();
  return (
    <ScreenContainer theme="dark">
      <TopBar title="Create account" onBack />
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.paper }}>Join the Circl.</Text>
        <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 6 }}>
          Pick a username your friends can find you with.
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Input label="Full name" defaultValue="Diego Reyes" lead={<Icon name="user" size={18} color={colors.mist} />} />
        <Input label="Username" defaultValue="@dreyes" autoCapitalize="none" valid="ok" help="Available · friends will find you with this" lead={<Icon name="at" size={18} color={colors.mist} />} />
        <Input label="Email" defaultValue="diego@example.com" autoCapitalize="none" keyboardType="email-address" lead={<Icon name="mail" size={18} color={colors.mist} />} />
        <Input label="Password" defaultValue="circl2026" secureTextEntry lead={<Icon name="lock" size={18} color={colors.mist} />} trail={<Icon name="eye" size={18} color={colors.mist} />} />
        <Input label="Confirm password" defaultValue="circl2026" secureTextEntry valid="ok" lead={<Icon name="lock" size={18} color={colors.mist} />} />
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
          <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <Icon name="check" size={14} color={accentInk} stroke={2.6} />
          </View>
          <Text style={{ flex: 1, fontSize: 11.5, color: colors.paper2, lineHeight: 16 }}>
            I agree to the Terms & Privacy. I understand Circl is a free social game with{' '}
            <Text style={{ color: colors.paper, fontWeight: '700' }}>no real-money betting</Text>.
          </Text>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
        <CButton variant="primary" size="lg" full onPress={() => router.replace('/(tabs)/home')}>
          Create account
        </CButton>
        <Text style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: colors.paper2 }}>
          Already have one?{' '}
          <Text onPress={() => router.push('/(auth)/login')} style={{ color: colors.paper, fontWeight: '700' }}>
            Log in
          </Text>
        </Text>
      </View>
    </ScreenContainer>
  );
}
