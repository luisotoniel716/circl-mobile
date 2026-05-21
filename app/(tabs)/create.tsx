import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, CButton, Input, Icon, Text, colors } from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';

const LEAGUES = ['Liga MX', 'Premier', 'La Liga', 'MLS'];

export default function Create() {
  const router = useRouter();
  const { accentColor } = useAccent();
  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.paper }}>Start your Circl</Text>
        <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 6 }}>Invite friends, pick a league, predict together.</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Input label="Group name" placeholder="e.g. Los Compas" lead={<Icon name="people" size={18} color={colors.mist} />} />
        <Input label="Description (optional)" placeholder="Trash talk encouraged" lead={<Icon name="chat" size={18} color={colors.mist} />} />

        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper2, marginBottom: 8, paddingLeft: 4 }}>League</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LEAGUES.map((l, i) => (
              <View
                key={l}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 9999,
                  backgroundColor: i === 0 ? accentColor : 'rgba(255,255,255,0.06)',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: i === 0 ? colors.paper : colors.paper2 }}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.s800, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={18} color={colors.paper2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.paper }}>Private group</Text>
            <Text style={{ fontSize: 11.5, color: colors.mist }}>Only people with the invite link can join</Text>
          </View>
          <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: accentColor, padding: 3, alignItems: 'flex-end' }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.paper }} />
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <CButton variant="primary" size="lg" full onPress={() => router.push('/(tabs)/groups')}>Create group</CButton>
      </View>
    </ScreenContainer>
  );
}
