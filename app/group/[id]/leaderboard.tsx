import { View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer, TopBar, Avatar, Icon, Text, colors } from '../../../src/components';
import { USERS } from '../../../src/data';
import type { User } from '../../../src/types';

const RANKED: { u: User; pts: number; change: number; me?: boolean }[] = [
  { u: USERS.u1, pts: 625, change: 1 },
  { u: USERS.u2, pts: 580, change: 0 },
  { u: USERS.me, pts: 480, change: 2, me: true },
  { u: USERS.u3, pts: 445, change: -1 },
  { u: USERS.u4, pts: 402, change: -2 },
  { u: USERS.u5, pts: 318, change: 1 },
  { u: USERS.u6, pts: 260, change: 0 },
  { u: USERS.u7, pts: 198, change: -1 },
];

const PODIUM = [
  { rank: 2, h: 90, pts: 580, u: USERS.u2, grad: ['#C7C8DB', '#8E8FA6'] as [string, string] },
  { rank: 1, h: 120, pts: 625, u: USERS.u1, grad: [colors.gold, colors.goldDeep] as [string, string] },
  { rank: 3, h: 74, pts: 480, u: USERS.me, me: true, grad: ['#B66F3A', '#7A4422'] as [string, string] },
];

export default function Leaderboard() {
  return (
    <ScreenContainer theme="dark">
      <TopBar title="Leaderboard" onBack right={<Icon name="filter" size={20} color={colors.paper} />} />

      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.s800, borderRadius: 9999, padding: 3, gap: 2 }}>
          {['Season', 'Jornada 14', 'Last 5'].map((tab, i) => (
            <View key={tab} style={{ flex: 1, paddingVertical: 7, borderRadius: 9999, backgroundColor: i === 1 ? colors.paper : 'transparent', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: i === 1 ? colors.ink : colors.paper2 }}>{tab}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Podium */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, justifyContent: 'center' }}>
        {PODIUM.map((p) => (
          <View key={p.rank} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ marginBottom: 8 }}>
              <Avatar user={p.u} size={p.rank === 1 ? 64 : 48} ring={p.rank === 1} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: p.me ? colors.gold : colors.paper }}>{p.me ? 'You' : p.u.name.split(' ')[0]}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gold }}>{p.pts} pts</Text>
            <LinearGradient colors={p.grad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ marginTop: 6, height: p.h, alignSelf: 'stretch', borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', paddingTop: 8 }}>
              <Text style={{ color: p.rank === 1 ? colors.ink : colors.paper, fontWeight: '900', fontSize: 22 }}>{p.rank}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>OTHERS</Text>
        <View style={{ gap: 6 }}>
          {RANKED.slice(3).map((r, i) => (
            <LbRow key={r.u.id} r={r} rank={i + 4} />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function LbRow({ r, rank }: { r: { u: User; pts: number; change: number; me?: boolean }; rank: number }) {
  const arrow = r.change > 0 ? '▲' : r.change < 0 ? '▼' : '–';
  const arrowColor = r.change > 0 ? colors.green : r.change < 0 ? colors.red : colors.mist;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        backgroundColor: r.me ? 'rgba(255,185,56,0.10)' : colors.s800,
        borderWidth: r.me ? 1.5 : 1,
        borderColor: r.me ? colors.gold : 'rgba(255,255,255,0.04)',
      }}
    >
      <Text style={{ width: 30, textAlign: 'center', fontWeight: '900', fontSize: 15, color: r.me ? colors.gold : colors.paper2 }}>#{rank}</Text>
      <Avatar user={r.u} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: r.me ? colors.gold : colors.paper }}>{r.me ? 'You · ' : ''}{r.u.name}</Text>
        <Text style={{ fontSize: 11, color: colors.mist }}>{r.u.username}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.gold }}>{r.pts}</Text>
        <Text style={{ fontSize: 10, fontWeight: '800', color: arrowColor }}>{arrow} {Math.abs(r.change) || ''}</Text>
      </View>
    </View>
  );
}
