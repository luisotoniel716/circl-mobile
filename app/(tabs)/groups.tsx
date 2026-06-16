import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, TopBar, Pill, GroupIcon, Icon, Text, colors,
} from '../../src/components';
import { useMyGroups } from '../../src/lib/queries';
import type { Group } from '../../src/types';

export default function Groups() {
  const router = useRouter();
  const { data: groups = [], isLoading } = useMyGroups();

  const totalMembers = groups.reduce((s, g) => s + g.members, 0);
  const bestRank     = groups.length ? Math.min(...groups.map((g) => g.myRank)) : 0;
  const totalPts     = groups.reduce((s, g) => s + g.myPts, 0);

  const stats = [
    { v: String(groups.length),                  label: 'GROUPS' },
    { v: bestRank ? `#${bestRank}` : '—',        label: 'BEST RANK', tint: colors.gold },
    { v: totalPts.toLocaleString(),              label: 'TOTAL PTS', mono: true },
  ];

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      <TopBar
        title="My groups"
        big
        right={
          <Pressable onPress={() => router.push('/group/join')} hitSlop={8}>
            <Icon name="qr" size={20} color={colors.paper} />
          </Pressable>
        }
      />

      {/* Stat strip */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12 }}>
        {stats.map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: colors.s800,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <Text style={{ fontSize: s.mono ? 17 : 20, fontWeight: '900', color: s.tint ?? colors.paper }}>{s.v}</Text>
            <Text style={{ fontSize: 10, color: colors.mist, fontWeight: '700' }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View
              style={{
                padding: 24,
                borderRadius: 18,
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                borderStyle: 'dashed',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.paper }}>
                Aún no estás en ningún Circl
              </Text>
              <Text style={{ fontSize: 12.5, color: colors.paper2, marginTop: 6, textAlign: 'center' }}>
                Crea uno o únete con el código de un amigo.
              </Text>
            </View>
          }
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
                <GroupIcon imageUrl={g.image_url} emoji={g.icon} accent={g.accent} size={46} radius={14} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Text style={{ fontWeight: '800', fontSize: 15, color: colors.paper }}>{g.name}</Text>
                    {g.myRank === 1 && g.members > 1 ? <Pill tone="gold" size="sm">👑 #1</Pill> : null}
                  </View>
                  <Text style={{ fontSize: 11.5, color: colors.mist, fontWeight: '600' }}>
                    {g.members} {g.members === 1 ? 'miembro' : 'miembros'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
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
              onPress={() => router.push('/group/join')}
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
      )}
    </ScreenContainer>
  );
}
