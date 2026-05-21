import { View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, Section, Avatar, AvatarStack, MatchRow, Icon, Text, colors,
} from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { USERS, MATCHES, GROUPS } from '../../src/data';

const CHIPS = ['Liga MX', 'Today', 'Live', 'My picks', 'Pending'];

export default function Home() {
  const router = useRouter();
  const me = USERS.me;
  const { accentColor } = useAccent();

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
        <Avatar user={me} size={42} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11.5, color: colors.mist, fontWeight: '700' }}>Wednesday · Jornada 14</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.paper }}>Hey, Diego 👋</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/activity')} style={iconBtn}>
          <Icon name="bell" size={20} color={colors.paper} />
          <View style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red }} />
        </Pressable>
        <Pressable style={iconBtn}>
          <Icon name="search" size={20} color={colors.paper} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero stat card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
          <LinearGradient
            colors={[accentColor, '#0024BD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>YOUR POINTS · JORNADA 14</Text>
                <Text style={{ fontSize: 36, fontWeight: '900', color: colors.paper, marginTop: 4 }}>+48</Text>
                <Text style={{ fontSize: 12, color: colors.paper, opacity: 0.85, marginTop: 2 }}>4 of 6 picks correct so far</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>RANK</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: colors.paper }}>#3</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Icon name="arrowUp" size={11} color={colors.paper} />
                  <Text style={{ fontSize: 11, color: colors.paper, opacity: 0.85 }}>+2</Text>
                </View>
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="fire" size={14} color={colors.paper} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper }}>3 pick streak</Text>
              </View>
              <Text onPress={() => router.push('/stats')} style={{ fontSize: 12, fontWeight: '700', color: colors.paper, opacity: 0.9 }}>See full stats ›</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 10 }}>
          {CHIPS.map((c, i) => (
            <View
              key={c}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 7,
                borderRadius: 9999,
                backgroundColor: i === 0 ? colors.paper : 'rgba(255,255,255,0.06)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: i === 0 ? colors.ink : colors.paper2 }}>{c}</Text>
              {i === 2 ? <Text style={{ color: colors.red, fontSize: 12 }}>●</Text> : null}
            </View>
          ))}
        </ScrollView>

        {/* Today's matches */}
        <Section title="TODAY'S MATCHES" action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}>See all ›</Text>}>
          <View style={{ gap: 10 }}>
            <MatchRow m={MATCHES[2]} onPress={() => router.push({ pathname: '/match/[id]', params: { id: MATCHES[2].id } })} />
            <MatchRow m={MATCHES[0]} onPress={() => router.push({ pathname: '/match/[id]', params: { id: MATCHES[0].id } })} />
            <MatchRow m={MATCHES[1]} onPress={() => router.push({ pathname: '/match/[id]', params: { id: MATCHES[1].id } })} />
          </View>
        </Section>

        {/* Active circls */}
        <Section
          title="YOUR ACTIVE CIRCLS"
          action={
            <Text onPress={() => router.push('/(tabs)/groups')} style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}>
              All groups ›
            </Text>
          }
          style={{ marginTop: 4 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
            {GROUPS.slice(0, 3).map((g) => (
              <Pressable
                key={g.id}
                onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
                style={{
                  width: 200,
                  backgroundColor: colors.s800,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.04)',
                  borderTopWidth: 3,
                  borderTopColor: g.accent,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: g.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 15 }}>{g.icon}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 14, flex: 1, color: colors.paper }}>{g.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.paper }}>#{g.myRank}</Text>
                  <Text style={{ fontSize: 11, color: colors.mist, fontWeight: '700' }}>of {g.members}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <AvatarStack items={g.avatars.map((i) => ({ initials: i }))} size={20} max={4} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gold }}>{g.myPts} pts</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}

const iconBtn = {
  backgroundColor: colors.s800,
  width: 40,
  height: 40,
  borderRadius: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
