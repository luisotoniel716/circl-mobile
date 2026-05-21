import { View, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, AvatarStack, Pill, Icon, Text, colors,
} from '../../src/components';
import { GROUPS } from '../../src/data';
import type { Group } from '../../src/types';

const STATS = [
  { v: '4', label: 'ACTIVE' },
  { v: '#3', label: 'BEST RANK', tint: colors.gold },
  { v: '1,635', label: 'TOTAL PTS', mono: true },
];

export default function Groups() {
  const router = useRouter();

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <TopBar title="My groups" big right={<Icon name="search" size={20} color={colors.paper} />} />

      {/* Stat strip */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}>
        {STATS.map((s, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.s800, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <Text style={{ fontSize: s.mono ? 17 : 20, fontWeight: '900', color: s.tint ?? colors.paper }}>{s.v}</Text>
            <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '700' }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={GROUPS}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: g }: { item: Group }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
            style={{
              backgroundColor: colors.s800,
              borderRadius: 18,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: g.accent }} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: g.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{g.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: colors.paper }}>{g.name}</Text>
                  {g.myRank === 1 ? <Pill tone="gold" size="sm">👑 #1</Pill> : null}
                </View>
                <Text style={{ fontSize: 11.5, color: colors.mist, fontWeight: '600' }}>
                  {g.members} members · Next: <Text style={{ color: colors.paper2 }}>{g.lastMatch}</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <AvatarStack items={g.avatars.map((i) => ({ initials: i }))} size={22} max={5} />
                  <View style={{ flex: 1 }} />
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: colors.paper }}>#{g.myRank}</Text>
                      <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '700' }}>of {g.members}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gold }}>{g.myPts} pts</Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable
            onPress={() => router.push('/(tabs)/create')}
            style={{
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.18)',
              borderStyle: 'dashed',
              borderRadius: 18,
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginTop: 12,
            }}
          >
            <Icon name="qr" size={18} color={colors.paper2} />
            <Text style={{ color: colors.paper2, fontSize: 13, fontWeight: '700' }}>Join with code</Text>
          </Pressable>
        }
      />
    </ScreenContainer>
  );
}
