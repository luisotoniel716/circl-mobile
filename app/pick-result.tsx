import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScreenContainer, TopBar, Section, CButton, TeamCrest, Icon, Text, colors } from '../src/components';
import { MATCHES, LIGAMX } from '../src/data';

const GROUP_RESULTS = [
  { g: 'La Quiniela', icon: '⚽', accent: '#002DE8', sub: '5/8 friends got it', rank: '#3', delta: '+2' },
  { g: 'Los Compas', icon: '🔥', accent: '#D43530', sub: '2/5 friends got it', rank: '#1', delta: '0' },
];

export default function PickResult() {
  const router = useRouter();
  const m = MATCHES[4];
  const h = LIGAMX[m.home];
  const a = LIGAMX[m.away];
  const score = m.score ?? [0, 0];

  return (
    <ScreenContainer theme="dark">
      <TopBar title="" onBack right={<Icon name="trophy" size={20} color={colors.paper} />} />

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
          <LinearGradient colors={[colors.green, '#0a5e2a']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: 22, padding: 20, alignItems: 'center' }}>
            <Text style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>FINAL</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.9 }}>YOU CALLED IT</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <Icon name="check" size={28} color={colors.paper} stroke={3} />
              <Text style={{ fontSize: 30, fontWeight: '900', color: colors.paper }}>Correct!</Text>
            </View>
            <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 6 }}>
              <Text style={{ fontSize: 14, color: colors.ink }}>★</Text>
              <Text style={{ color: colors.ink, fontWeight: '900', fontSize: 18 }}>+12 pts earned</Text>
            </View>
            <View style={{ marginTop: 18, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', alignSelf: 'stretch' }}>
              <View style={{ alignItems: 'center' }}>
                <TeamCrest team={h} size={42} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, marginTop: 4 }}>{h.code}</Text>
              </View>
              <Text style={{ fontSize: 34, fontWeight: '900', color: colors.paper }}>
                {score[0]} <Text style={{ opacity: 0.4 }}>-</Text> {score[1]}
              </Text>
              <View style={{ alignItems: 'center' }}>
                <TeamCrest team={a} size={42} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, marginTop: 4 }}>{a.code}</Text>
              </View>
            </View>
            <Text style={{ marginTop: 10, fontSize: 11, fontWeight: '700', color: colors.paper, opacity: 0.85 }}>
              Your pick: <Text style={{ fontWeight: '900' }}>{m.myPick ? LIGAMX[m.myPick].name : '—'}</Text> · Jornada 13
            </Text>
          </LinearGradient>
        </View>

        <Section title="LEADERBOARD CHANGE">
          <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: colors.paper2 }}>La Quiniela · 8 members</Text>
              <View style={{ backgroundColor: 'rgba(14,122,58,0.15)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9999 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.green }}>▲ +2</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: colors.mist, fontWeight: '700' }}>BEFORE</Text>
                <Text style={{ fontSize: 30, fontWeight: '900', color: colors.mist }}>#5</Text>
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: colors.gold }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '700' }}>NOW</Text>
                <Text style={{ fontSize: 30, fontWeight: '900', color: colors.gold }}>#3</Text>
              </View>
            </View>
          </View>
        </Section>

        <Section title="HOW YOUR GROUPS DID">
          <View style={{ gap: 8 }}>
            {GROUP_RESULTS.map((r) => (
              <View key={r.g} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.s800, borderRadius: 14 }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: r.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 15 }}>{r.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.paper }}>{r.g}</Text>
                  <Text style={{ fontSize: 11, color: colors.mist }}>{r.sub}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: colors.gold }}>{r.rank}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: r.delta.startsWith('+') ? colors.green : colors.mist }}>{r.delta}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
        <View style={{ flex: 1 }}>
          <CButton variant="ghostDark" size="lg" full>Share</CButton>
        </View>
        <View style={{ flex: 1 }}>
          <CButton variant="primary" size="lg" full onPress={() => router.replace('/(tabs)/home')}>Next match</CButton>
        </View>
      </View>
    </ScreenContainer>
  );
}
