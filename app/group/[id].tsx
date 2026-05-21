import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, TopBar, Section, CButton, Avatar, MatchRow, Icon, Text, colors } from '../../src/components';
import { GROUPS, USERS, MATCHES } from '../../src/data';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const g = GROUPS.find((x) => x.id === id) ?? GROUPS[0];

  const podium = [
    { u: USERS.u1, rank: 1, pts: 625, icon: '👑', gold: true },
    { u: USERS.u2, rank: 2, pts: 580 },
    { u: USERS.me, rank: 3, pts: 480, me: true },
  ];
  const activity = [
    { u: USERS.u2, text: 'picked Cruz Azul over Pumas', when: '2m' },
    { u: USERS.u1, text: 'climbed to #1 (+30 pts last week)', when: '1h' },
    { u: USERS.u4, text: 'joined the group', when: '2d' },
  ];

  return (
    <ScreenContainer theme="dark">
      <TopBar title={g.name} onBack right={<Icon name="settings" size={20} color={colors.paper} />} />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
          <LinearGradient colors={[g.accent, '#0024BD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 24 }}>{g.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '900', fontSize: 18, color: colors.paper }}>{g.name}</Text>
                <Text style={{ fontSize: 12, color: colors.paper, opacity: 0.85 }}>Liga MX · {g.members} members</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>YOUR RANK</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: colors.paper }}>#{g.myRank}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>POINTS</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: colors.paper }}>{g.myPts}</Text>
              </View>
              <View style={{ marginLeft: 'auto' }}>
                <CButton variant="light" size="sm" lead={<Icon name="addUser" size={14} color={colors.ink} />}>Invite</CButton>
              </View>
            </View>
          </LinearGradient>
        </View>

        <Section
          title="TOP 3"
          action={
            <Text onPress={() => router.push({ pathname: '/group/[id]/leaderboard', params: { id: g.id } })} style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}>
              Full leaderboard ›
            </Text>
          }
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {podium.map((r) => (
              <View
                key={r.rank}
                style={{
                  flex: 1,
                  backgroundColor: colors.s800,
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderWidth: r.me ? 1.5 : 1,
                  borderColor: r.me ? colors.gold : 'rgba(255,255,255,0.04)',
                  alignItems: 'center',
                  marginTop: 8,
                }}
              >
                <View style={{ position: 'absolute', top: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: r.gold ? colors.gold : 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: r.gold ? colors.ink : colors.paper }}>{r.icon ?? `#${r.rank}`}</Text>
                </View>
                <View style={{ marginTop: 6 }}>
                  <Avatar user={r.u} size={36} />
                </View>
                <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', marginTop: 4, color: colors.paper }}>{r.me ? 'You' : r.u.name.split(' ')[0]}</Text>
                <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '800' }}>{r.pts} pts</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="UPCOMING IN GROUP">
          <View style={{ gap: 10 }}>
            <MatchRow m={MATCHES[0]} onPress={() => router.push({ pathname: '/match/[id]', params: { id: 'm1' } })} />
            <MatchRow m={MATCHES[1]} onPress={() => router.push({ pathname: '/match/[id]', params: { id: 'm2' } })} />
          </View>
        </Section>

        <Section title="ACTIVITY">
          <View>
            {activity.map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                <Avatar user={a.u} size={32} />
                <Text style={{ flex: 1, fontSize: 12.5, color: colors.paper2, lineHeight: 17 }}>
                  <Text style={{ color: colors.paper, fontWeight: '800' }}>{a.u.name.split(' ')[0]}</Text> {a.text}
                </Text>
                <Text style={{ fontSize: 11, color: colors.mist }}>{a.when}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}
