import { View, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import {
  ScreenContainer, TopBar, Avatar, Icon, Text, colors,
} from '../../../src/components';
import { useAuth } from '../../../src/lib/auth';
import { useGroup, useGroupMembers, type GroupMember } from '../../../src/lib/queries';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function Leaderboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: group } = useGroup(id);
  const { data: members = [], isLoading } = useGroupMembers(id);

  // Sort by points desc, fallback by join date
  const ranked = [...members].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return (
    <ScreenContainer theme="dark">
      <TopBar title="Leaderboard" onBack />

      {/* Period tabs (cosmetic until we wire matchday filters) */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.s800, borderRadius: 9999, padding: 3, gap: 2 }}>
          {['Season', 'Jornada 14', 'Last 5'].map((tab, i) => (
            <View
              key={tab}
              style={{
                flex: 1,
                paddingVertical: 7,
                borderRadius: 9999,
                backgroundColor: i === 0 ? colors.paper : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: i === 0 ? colors.ink : colors.paper2 }}>{tab}</Text>
            </View>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      ) : (
        <>
          {/* Podium */}
          {ranked.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, justifyContent: 'center' }}>
              {[
                ranked[1] ? { m: ranked[1], rank: 2, h: 90,  grad: ['#C7C8DB', '#8E8FA6'] as [string, string] } : null,
                ranked[0] ? { m: ranked[0], rank: 1, h: 120, grad: [colors.gold, colors.goldDeep] as [string, string] } : null,
                ranked[2] ? { m: ranked[2], rank: 3, h: 74,  grad: ['#B66F3A', '#7A4422'] as [string, string] } : null,
              ].filter(Boolean).map((p, i) => {
                const item = p!;
                const me = item.m.user_id === user?.id;
                return (
                  <View key={item.rank} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ marginBottom: 8 }}>
                      <Avatar
                        initials={initialsOf(item.m.profile?.name)}
                        size={item.rank === 1 ? 64 : 48}
                        ring={item.rank === 1}
                        bg={group?.accent ?? colors.s700}
                        imageUrl={item.m.profile?.avatar_url}
                      />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: me ? colors.gold : colors.paper }}>
                      {me ? 'You' : (item.m.profile?.name?.split(' ')[0] ?? '—')}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gold }}>{item.m.points} pts</Text>
                    <LinearGradient
                      colors={item.grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{ marginTop: 6, height: item.h, alignSelf: 'stretch', borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', paddingTop: 8 }}
                    >
                      <Text style={{ color: item.rank === 1 ? colors.ink : colors.paper, fontWeight: '900', fontSize: 22 }}>
                        {item.rank}
                      </Text>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          ) : null}

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {ranked.length > 3 ? (
              <>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>OTHERS</Text>
                <View style={{ gap: 6 }}>
                  {ranked.slice(3).map((m, i) => (
                    <LbRow
                      key={m.user_id}
                      m={m}
                      rank={i + 4}
                      me={m.user_id === user?.id}
                      groupAccent={group?.accent ?? colors.s700}
                    />
                  ))}
                </View>
              </>
            ) : ranked.length === 0 ? (
              <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', paddingVertical: 24 }}>
                Aún no hay miembros con puntos.{'\n'}Invita a más amigos al grupo.
              </Text>
            ) : null}
          </ScrollView>
        </>
      )}
    </ScreenContainer>
  );
}

function LbRow({
  m, rank, me, groupAccent,
}: { m: GroupMember; rank: number; me: boolean; groupAccent: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        backgroundColor: me ? 'rgba(255,185,56,0.10)' : colors.s800,
        borderWidth: me ? 1.5 : 1,
        borderColor: me ? colors.gold : 'rgba(255,255,255,0.04)',
      }}
    >
      <Text style={{ width: 30, textAlign: 'center', fontWeight: '900', fontSize: 15, color: me ? colors.gold : colors.paper2 }}>
        #{rank}
      </Text>
      <Avatar initials={initialsOf(m.profile?.name)} size={36} bg={groupAccent} imageUrl={m.profile?.avatar_url} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: me ? colors.gold : colors.paper }}>
          {me ? 'You · ' : ''}{m.profile?.name ?? '—'}
        </Text>
        <Text style={{ fontSize: 11, color: colors.mist }}>@{m.profile?.username ?? '—'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: colors.gold }}>{m.points}</Text>
      </View>
    </View>
  );
}
