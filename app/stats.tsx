import { View, ScrollView } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { ScreenContainer, TopBar, Section, TeamCrest, Icon, Text, colors } from '../src/components';
import { LIGAMX } from '../src/data';
import type { TeamCode } from '../src/types';

const STAT_GRID = [
  { v: '142', l: 'TOTAL PICKS' },
  { v: '95', l: 'CORRECT', tint: colors.green },
  { v: '47', l: 'MISSED', tint: colors.red },
  { v: '67%', l: 'ACCURACY', tint: colors.gold },
];
const BARS = [40, 30, 55, 18, 42, 15, 28];
const JORNADAS = [8, 9, 10, 11, 12, 13, 14];
const BY_TEAM: { team: TeamCode; picks: number; correct: number }[] = [
  { team: 'AME', picks: 18, correct: 14 },
  { team: 'PUM', picks: 12, correct: 8 },
  { team: 'CAZ', picks: 14, correct: 7 },
  { team: 'MTY', picks: 9, correct: 5 },
];

export default function Stats() {
  return (
    <ScreenContainer theme="dark">
      <TopBar title="Statistics" onBack />

      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.s800, borderRadius: 9999, padding: 3, gap: 2 }}>
          {['Season', 'Last 30 days', 'All time'].map((tab, i) => (
            <View key={tab} style={{ flex: 1, paddingVertical: 7, borderRadius: 9999, backgroundColor: i === 0 ? colors.paper : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: i === 0 ? colors.ink : colors.paper2 }}>{tab}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STAT_GRID.map((s, i) => (
              <View key={i} style={{ width: '48.5%', backgroundColor: colors.s800, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: s.tint ?? colors.paper }}>{s.v}</Text>
                <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '800', marginTop: 2 }}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        <Section title="POINTS PER JORNADA">
          <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <Svg width="100%" height={120} viewBox="0 0 280 120">
              {BARS.map((v, i) => (
                <Rect key={i} x={20 + i * 36} y={120 - v - 22} width={24} height={v} rx={3} fill={i === 6 ? colors.gold : 'rgba(255,185,56,0.4)'} />
              ))}
              {JORNADAS.map((j, i) => (
                <SvgText key={j} x={32 + i * 36} y={112} fill={colors.mist} fontSize={9} fontWeight="700" textAnchor="middle">
                  J{j}
                </SvgText>
              ))}
            </Svg>
          </View>
        </Section>

        <Section title="BEST STREAK">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.s800, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.red + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="fire" size={24} color={colors.red} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.paper }}>9 picks in a row</Text>
              <Text style={{ fontSize: 11.5, color: colors.mist }}>Jornada 6 → 8 · You earned 90 pts in a stretch</Text>
            </View>
          </View>
        </Section>

        <Section title="BY TEAM · WHEN YOU PICK THEM">
          <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            {BY_TEAM.map((r, i) => {
              const pct = Math.round((r.correct / r.picks) * 100);
              const barColor = pct >= 60 ? colors.green : colors.gold;
              return (
                <View key={r.team} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i < BY_TEAM.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                  <TeamCrest team={r.team} size={32} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper }}>{LIGAMX[r.team].name}</Text>
                      <Text style={{ fontSize: 12, color: colors.mist }}>
                        {r.correct}/{r.picks} · <Text style={{ color: barColor, fontWeight: '800' }}>{pct}%</Text>
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.s700, borderRadius: 99, marginTop: 5, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor }} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}
