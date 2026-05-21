import { View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Href } from 'expo-router';
import { ScreenContainer, CButton, Avatar, Icon, IconName, Text, colors } from '../../src/components';
import { USERS } from '../../src/data';

const DETAILS: { icon: IconName; l: string; sub: string; to: Href }[] = [
  { icon: 'trend', l: 'Full statistics', sub: 'Streaks, accuracy by team', to: '/stats' },
  { icon: 'people', l: 'Active in 4 groups', sub: 'Best rank: #1 · Los Compas', to: '/(tabs)/groups' },
  { icon: 'flag', l: 'Liga MX · 142 picks', sub: '95 correct · 67% accuracy', to: '/stats' },
  { icon: 'star', l: '3 achievements', sub: 'Hot streak · Underdog · Loyalty', to: '/stats' },
];

export default function Profile() {
  const me = USERS.me;
  const router = useRouter();
  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
          <Icon name="settings" size={20} color={colors.paper} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 }}>
          <View style={{ marginBottom: 14 }}>
            <Avatar user={me} size={92} ring />
            <Pressable onPress={() => router.push('/edit-profile')} style={{ position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.s900, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="edit" size={14} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.paper }}>{me.name}</Text>
          <Text style={{ fontSize: 13, color: colors.paper2, marginTop: 2 }}>{me.username}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <CButton variant="primary" size="md" lead={<Icon name="edit" size={14} color={colors.paper} />} onPress={() => router.push('/edit-profile')}>Edit profile</CButton>
            <CButton variant="ghostDark" size="md" lead={<Icon name="link" size={14} color={colors.paper} />}>Share</CButton>
          </View>
        </View>

        {/* Trophy / season card */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <LinearGradient colors={[colors.gold, colors.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink, opacity: 0.8 }}>SEASON · APERTURA 2026</Text>
                <Text style={{ fontSize: 34, fontWeight: '900', color: colors.ink, marginTop: 4 }}>{me.points}</Text>
                <Text style={{ fontSize: 12, color: colors.ink, opacity: 0.8 }}>Total points</Text>
              </View>
              <Icon name="trophy" size={54} color={colors.ink} stroke={2.2} />
            </View>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.10)' }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink, opacity: 0.8 }}>ACCURACY</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>{me.accuracy}%</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink, opacity: 0.8 }}>PICKS</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>{me.correct}/{me.picks}</Text>
              </View>
              <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.ink, opacity: 0.8 }}>BEST RANK</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.ink }}>#1 · Los Compas</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Details list */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper2, marginBottom: 10 }}>DETAILS</Text>
          <View style={{ backgroundColor: colors.s800, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
            {DETAILS.map((r, i) => (
              <Pressable
                key={i}
                onPress={() => router.push(r.to)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderBottomWidth: i < DETAILS.length - 1 ? 1 : 0,
                  borderBottomColor: 'rgba(255,255,255,0.04)',
                }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={r.icon} size={16} color={colors.paper2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.paper }}>{r.l}</Text>
                  <Text style={{ fontSize: 11, color: colors.mist }}>{r.sub}</Text>
                </View>
                <Icon name="chev" size={16} color={colors.mist} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
