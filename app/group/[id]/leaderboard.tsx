import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeInDown, FadeIn, Easing,
  useSharedValue, useAnimatedStyle, withDelay, withTiming, withSpring,
} from 'react-native-reanimated';
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
  const router = useRouter();
  const { user } = useAuth();
  const { data: group } = useGroup(id);
  const { data: members = [], isLoading } = useGroupMembers(id);

  // Bumps every focus so the podium + others list replay their entrance
  // animation each time the user opens the leaderboard (Expo Router keeps
  // the screen instance around between visits).
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((t) => t + 1);
    }, []),
  );

  // Opens the public profile for a member, unless it's the current user
  // (whose row should just stay where it is — they have their own tab).
  function openMember(uid: string) {
    if (uid === user?.id) return;
    router.push({ pathname: '/user/[id]', params: { id: uid } });
  }

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
          {/* Podium — three pillars rise in cascade: bronze first, silver,
              gold last as the climax. Each pillar has its own animated
              height (0 → target), and the avatar/name on top fades in
              shortly after that pillar finishes growing. */}
          {ranked.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 10,
                paddingHorizontal: 20,
                paddingTop: 10,
                paddingBottom: 18,
                justifyContent: 'center',
              }}
            >
              {[
                ranked[1] ? { m: ranked[1], rank: 2, h: 90,  grad: ['#C7C8DB', '#8E8FA6'] as [string, string], order: 1 } : null,
                ranked[0] ? { m: ranked[0], rank: 1, h: 120, grad: [colors.gold, colors.goldDeep] as [string, string], order: 2 } : null,
                ranked[2] ? { m: ranked[2], rank: 3, h: 74,  grad: ['#B66F3A', '#7A4422'] as [string, string], order: 0 } : null,
              ].filter(Boolean).map((p) => {
                const item = p!;
                const me = item.m.user_id === user?.id;
                return (
                  <PodiumPillar
                    key={item.rank}
                    item={item}
                    me={me}
                    groupAccent={group?.accent ?? colors.s700}
                    onPress={() => openMember(item.m.user_id)}
                    focusTick={focusTick}
                  />
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
                    <Animated.View
                      // The focusTick is part of the key so re-entering the
                      // screen re-mounts these rows → the FadeInDown stagger
                      // plays again. After the podium finishes (~900ms) so the
                      // user sees podium → others in sequence.
                      key={`${focusTick}-${m.user_id}`}
                      entering={FadeInDown
                        .delay(900 + Math.min(i, 8) * 55)
                        .duration(360)
                        .easing(Easing.out(Easing.cubic))}
                    >
                      <LbRow
                        m={m}
                        rank={i + 4}
                        me={m.user_id === user?.id}
                        groupAccent={group?.accent ?? colors.s700}
                        onPress={() => openMember(m.user_id)}
                      />
                    </Animated.View>
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

// ─── Animated podium pillar ──────────────────────────────────
//
// Each pillar rises in two phases:
//   1. The gradient bar grows from height 0 to its target height with
//      a small overshoot ("planting" feel) — bronze first, silver next,
//      gold last so the climax lands on #1.
//   2. The avatar + name + pts text on top fades + slides in once the
//      bar arrives, so the trophy reads as "stacking on" the pillar.
//
// `focusTick` drives a useEffect that resets and replays both phases
// every time the leaderboard regains focus.

interface PodiumPillarProps {
  item: {
    m:     GroupMember;
    rank:  number;
    h:     number;
    grad:  [string, string];
    /** 0 = lands first (bronze), 1 = silver, 2 = gold last. */
    order: number;
  };
  me:          boolean;
  groupAccent: string;
  onPress:     () => void;
  focusTick:   number;
}

function PodiumPillar({ item, me, groupAccent, onPress, focusTick }: PodiumPillarProps) {
  const RISE_MS   = 480;
  const STAGGER   = 220;
  const barProg   = useSharedValue(0);
  const headProg  = useSharedValue(0);

  useEffect(() => {
    // Reset to a clean "not drawn yet" state and replay both phases.
    barProg.value  = 0;
    headProg.value = 0;
    const barDelay = item.order * STAGGER;
    // Bar rises with a very gentle spring for a "planted" feel.
    barProg.value = withDelay(
      barDelay,
      withSpring(1, { damping: 18, stiffness: 160, mass: 0.7 }),
    );
    // Avatar / name fades in once the bar is mostly up.
    headProg.value = withDelay(
      barDelay + RISE_MS * 0.55,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) }),
    );
  }, [item.order, focusTick, barProg, headProg]);

  const barStyle = useAnimatedStyle(() => ({
    height: barProg.value * item.h,
  }));
  const headStyle = useAnimatedStyle(() => ({
    opacity:   headProg.value,
    transform: [{ translateY: (1 - headProg.value) * -6 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={me}
      style={{ flex: 1, alignItems: 'center' }}
    >
      <Animated.View style={[{ marginBottom: 8, alignItems: 'center' }, headStyle]}>
        <Avatar
          initials={initialsOf(item.m.profile?.name)}
          size={item.rank === 1 ? 64 : 48}
          ring={item.rank === 1}
          bg={groupAccent}
          imageUrl={item.m.profile?.avatar_url}
        />
        <Text
          style={{
            fontSize: 12, fontWeight: '800',
            color: me ? colors.gold : colors.paper,
            marginTop: 6,
          }}
        >
          {me ? 'You' : (item.m.profile?.name?.split(' ')[0] ?? '—')}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.gold }}>
          {item.m.points} pts
        </Text>
      </Animated.View>

      {/* The pillar itself — wrapped in an Animated.View whose height
          interpolates 0 → item.h. The gradient fills the wrapper so the
          colour shows through as the bar grows. overflow:'hidden' clips
          the rank number until enough of the bar is visible. */}
      <Animated.View
        style={[
          {
            marginTop: 6,
            alignSelf: 'stretch',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            overflow: 'hidden',
          },
          barStyle,
        ]}
      >
        <LinearGradient
          colors={item.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingTop: 8,
          }}
        >
          <Text style={{ color: item.rank === 1 ? colors.ink : colors.paper, fontWeight: '900', fontSize: 22 }}>
            {item.rank}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function LbRow({
  m, rank, me, groupAccent, onPress,
}: { m: GroupMember; rank: number; me: boolean; groupAccent: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={me}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        backgroundColor: me ? 'rgba(255,185,56,0.10)' : colors.s800,
        borderWidth: me ? 1.5 : 1,
        borderColor: me ? colors.gold : 'rgba(255,255,255,0.04)',
        opacity: pressed && !me ? 0.7 : 1,
      })}
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
    </Pressable>
  );
}
