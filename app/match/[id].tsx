import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer, TopBar, Section, CButton, TeamCrest, Icon, Text, colors } from '../../src/components';
import { MATCHES, LIGAMX } from '../../src/data';

const H2H = [
  { r: 'W', c: colors.green },
  { r: 'L', c: colors.red },
  { r: 'D', c: colors.mist },
  { r: 'W', c: colors.green },
  { r: 'W', c: colors.green },
];

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const m = MATCHES.find((x) => x.id === id) ?? MATCHES[0];
  const h = LIGAMX[m.home];
  const a = LIGAMX[m.away];

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Match detail" onBack right={<Icon name="trophy" size={20} color={colors.paper} />} />

      <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
        <View style={{ borderRadius: 20, overflow: 'hidden' }}>
          <LinearGradient
            colors={[h.primary, h.primary, '#FAFAFA', '#FAFAFA', a.primary, a.primary]}
            locations={[0, 0.45, 0.45, 0.51, 0.51, 1]}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={{ paddingVertical: 24, paddingHorizontal: 18 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: colors.paper, fontSize: 10, fontWeight: '800' }}>JORNADA 14</Text>
              <Text style={{ color: colors.paper, fontSize: 10, fontWeight: '800' }}>{m.kickoff.toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TeamCrest team={h} size={58} />
                <Text style={{ color: h.text, fontWeight: '900', fontSize: 18, marginTop: 6 }}>{h.name}</Text>
                <Text style={{ color: h.text, fontSize: 10, fontWeight: '700', opacity: 0.9 }}>{h.code} · HOME</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.gold }}>KICK OFF</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: colors.paper }}>21:00</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TeamCrest team={a} size={58} />
                <Text style={{ color: a.text, fontWeight: '900', fontSize: 18, marginTop: 6 }}>{a.name}</Text>
                <Text style={{ color: a.text, fontSize: 10, fontWeight: '700', opacity: 0.9 }}>{a.code} · AWAY</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.mist, fontWeight: '700' }}>KICK OFF IN</Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: colors.paper, marginTop: 2 }}>
            06<Text style={{ color: colors.mist }}> : </Text>14<Text style={{ color: colors.mist }}> : </Text>52
          </Text>
          <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '700', marginTop: 1 }}>HRS · MIN · SEC</Text>
        </View>

        <Section title="GROUP PICKS · LA QUINIELA">
          <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: colors.paper2 }}>
                <Text style={{ color: colors.paper, fontWeight: '800' }}>6</Text> of 8 friends picked
              </Text>
              <Text style={{ color: colors.mist, fontSize: 11 }}>Hidden until kickoff</Text>
            </View>
            <View style={{ flexDirection: 'row', height: 10, borderRadius: 99, overflow: 'hidden', backgroundColor: colors.s700 }}>
              <View style={{ width: '62%', backgroundColor: h.primary }} />
              <View style={{ width: '12%', backgroundColor: colors.mist }} />
              <View style={{ width: '26%', backgroundColor: a.primary }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: colors.paper, fontSize: 11, fontWeight: '800' }}>{h.code} 62%</Text>
              <Text style={{ color: colors.mist, fontSize: 11, fontWeight: '800' }}>Draw 12%</Text>
              <Text style={{ color: colors.paper, fontSize: 11, fontWeight: '800' }}>{a.code} 26%</Text>
            </View>
          </View>
        </Section>

        <Section title="HEAD-TO-HEAD · LAST 5">
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {H2H.map((x, i) => (
              <View key={i} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: x.c + '33', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: x.c, fontWeight: '900', fontSize: 12 }}>{x.r}</Text>
              </View>
            ))}
            <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: colors.mist, fontWeight: '700' }}>América 3-1-1</Text>
          </View>
        </Section>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
        <CButton variant="primary" size="lg" full lead={<Icon name="target" size={20} color={colors.paper} />} onPress={() => router.push({ pathname: '/pick/[id]', params: { id: m.id } })}>
          Make your pick
        </CButton>
      </View>
    </ScreenContainer>
  );
}
