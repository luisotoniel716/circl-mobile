import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, Section, Avatar, AvatarStack, GroupIcon, MatchRow, Icon, Text, colors,
  AddFriendModal,
} from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { useAuth } from '../../src/lib/auth';
import {
  useMatches, useMyGroups, useMyPickedMatchIds, useMyAllPicks, useUnreadCount,
  useMyPinnedGroupIds,
} from '../../src/lib/queries';
import type { TeamCode, Match } from '../../src/types';

type Chip = 'Liga MX' | 'Today' | 'Live' | 'My picks' | 'Pending';
const CHIPS: Chip[] = ['Liga MX', 'Today', 'Live', 'My picks', 'Pending'];

function isSameDay(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate()  === now.getDate();
}

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const { accentColor } = useAccent();
  const { profile } = useAuth();

  // Pull a wider window so we can navigate matchdays. Also pull picks so
  // finished matches can show real correct/incorrect state.
  const { data: allMatches = [], isLoading: matchesLoading } = useMatches({ limit: 200 });
  const { data: pickedIds = new Set<string>() } = useMyPickedMatchIds();
  const { data: myPicks = {} } = useMyAllPicks();
  const { data: groups  = [], isLoading: groupsLoading  } = useMyGroups();
  const { data: pinnedIds = [] } = useMyPinnedGroupIds();
  const { data: unreadCount = 0 } = useUnreadCount();

  // Pinned groups drive the home Wallet stack. Order them by the user's
  // pin sequence (the array order in `pinnedIds` reflects pin order). If
  // the user hasn't pinned anything yet, fall back to the first 3 from
  // their group list so the home never looks empty.
  const stackGroups = useMemo(() => {
    if (pinnedIds.length === 0) return groups.slice(0, 3);
    const byId = new Map(groups.map((g) => [g.id, g]));
    return pinnedIds
      .map((id) => byId.get(id))
      .filter((g): g is NonNullable<typeof g> => !!g);
  }, [groups, pinnedIds]);
  const usingFallback = pinnedIds.length === 0 && groups.length > 0;

  const [chip, setChip] = useState<Chip>('Today');
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  // ─── Matchday navigation ──────────────────────────────────────
  // Determine the "active matchday": matchday of the next non-finished
  // match (or the highest matchday seen if all are finished).
  const matchdayOf = (m: Match) => {
    const n = parseInt(m.round.replace(/\D+/g, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const allMatchdays = useMemo(() => {
    const set = new Set<number>();
    for (const m of allMatches) {
      const md = matchdayOf(m);
      if (md > 0) set.add(md);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [allMatches]);

  const activeMatchday = useMemo(() => {
    const upcoming = allMatches.find((m) => m.status !== 'finished');
    if (upcoming) return matchdayOf(upcoming);
    return allMatchdays[allMatchdays.length - 1] ?? 0;
  }, [allMatches, allMatchdays]);

  const [selectedMd, setSelectedMd] = useState<number | null>(null);
  const currentMd = selectedMd ?? activeMatchday;
  const mdIdx = allMatchdays.indexOf(currentMd);
  const canPrev = mdIdx > 0;
  const canNext = mdIdx >= 0 && mdIdx < allMatchdays.length - 1;

  // Enrich matches with the user's pick + result so MatchRow shows the
  // correct/missed badge for finished matches in the "My picks" chip.
  // Also pass the per-group coverage counts so MatchRow can show partial
  // pick status when the user has only picked in some of their groups.
  const totalGroups = groups.length;
  const enrichedMatches = useMemo<Match[]>(() => {
    return allMatches.map((m) => {
      const p = myPicks[m.id];
      if (!p) return m;
      const myPickCode: TeamCode | null =
        p.prediction === 'home' ? m.home :
        p.prediction === 'away' ? m.away :
        null; // draw → no team
      return {
        ...m,
        myPick:  myPickCode,
        correct: p.correct ?? undefined,
        pts:     p.correct != null ? `+${p.points}` : m.pts,
        myPickGroupsPicked: p.groupCount,
        myPickGroupsTotal:  totalGroups,
      };
    });
  }, [allMatches, myPicks, totalGroups]);

  // Filter matches based on selected chip.
  const matches = useMemo(() => {
    switch (chip) {
      case 'Liga MX':
        // Matches of the current matchday (active by default, navigable).
        return enrichedMatches.filter((m) => matchdayOf(m) === currentMd);
      case 'Today':
        return enrichedMatches.filter((m) =>
          m.status !== 'finished' && m.kickoff_at && isSameDay(m.kickoff_at),
        );
      case 'Live':
        return enrichedMatches.filter((m) => m.status === 'live');
      case 'My picks':
        return enrichedMatches.filter((m) => pickedIds.has(m.id));
      case 'Pending':
        return enrichedMatches.filter((m) => !pickedIds.has(m.id) && m.status !== 'finished');
      default:
        return enrichedMatches;
    }
  }, [chip, enrichedMatches, pickedIds, currentMd]);

  const displayName = profile?.name?.split(' ')[0] ?? 'amigo';
  const initials    = initialsOf(profile?.name);

  return (
    <ScreenContainer theme="dark" edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
        <Avatar initials={initials} size={42} bg={accentColor} imageUrl={profile?.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11.5, color: colors.mist, fontWeight: '700' }}>Jornada 14</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.paper }}>Hey, {displayName} 👋</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/activity')} style={iconBtn}>
          <Icon name="bell" size={20} color={colors.paper} />
          {unreadCount > 0 ? (
            unreadCount > 9 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 4, right: 4,
                  minWidth: 18, height: 18, paddingHorizontal: 4,
                  borderRadius: 9,
                  backgroundColor: colors.red,
                  borderWidth: 2, borderColor: colors.s900,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '900', color: colors.paper }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  position: 'absolute',
                  top: 6, right: 6,
                  minWidth: 16, height: 16, paddingHorizontal: 4,
                  borderRadius: 8,
                  backgroundColor: colors.red,
                  borderWidth: 2, borderColor: colors.s900,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '900', color: colors.paper }}>
                  {unreadCount}
                </Text>
              </View>
            )
          ) : null}
        </Pressable>
        <Pressable onPress={() => setAddFriendOpen(true)} style={iconBtn}>
          <Icon name="addUser" size={20} color={colors.paper} />
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
                <Text style={{ fontSize: 36, fontWeight: '900', color: colors.paper, marginTop: 4 }}>+0</Text>
                <Text style={{ fontSize: 12, color: colors.paper, opacity: 0.85, marginTop: 2 }}>Aún no haces picks esta jornada</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>RANK</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: colors.paper }}>—</Text>
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
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.paper }}>Sin racha aún</Text>
              </View>
              <Text onPress={() => router.push('/stats')} style={{ fontSize: 12, fontWeight: '700', color: colors.paper, opacity: 0.9 }}>See full stats ›</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Active circls — placed above the chip row so groups are the
            primary entry point now that the Groups tab was removed from
            the bottom bar. */}
        <Section
          title={usingFallback ? 'TUS GRUPOS' : 'TUS CIRCLS ANCLADOS'}
          action={
            <Text onPress={() => router.push('/(tabs)/groups')} style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}>
              {usingFallback ? 'Anclar grupos ›' : 'All groups ›'}
            </Text>
          }
          style={{ marginTop: 4 }}
        >
          {groupsLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.paper2} />
            </View>
          ) : groups.length === 0 ? (
            <Pressable
              onPress={() => router.push('/(tabs)/groups')}
              style={{
                padding: 18,
                borderRadius: 16,
                backgroundColor: colors.s800,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.06)',
                borderStyle: 'dashed',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.paper }}>
                Aún no tienes grupos
              </Text>
              <Text style={{ fontSize: 12, color: colors.paper2, marginTop: 4 }}>
                Crea uno o únete con un código ›
              </Text>
            </Pressable>
          ) : (
            <WalletStack
              groups={stackGroups}
              onPressGroup={(id) => router.push({ pathname: '/group/[id]', params: { id } })}
            />
          )}
        </Section>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 10 }}
        >
          {CHIPS.map((c) => {
            const active = chip === c;
            const liveCount = c === 'Live'
              ? allMatches.filter((m) => m.status === 'live').length
              : 0;
            return (
              <Pressable
                key={c}
                onPress={() => setChip(c)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 7,
                  borderRadius: 9999,
                  backgroundColor: active ? colors.paper : 'rgba(255,255,255,0.06)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, fontWeight: '800', color: active ? colors.ink : colors.paper2 }}
                >
                  {c}
                </Text>
                {c === 'Live' && liveCount > 0 ? (
                  <Text style={{ color: colors.red, fontSize: 12 }}>●</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Matchday stepper — only when Liga MX chip is active */}
        {chip === 'Liga MX' && allMatchdays.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 2 }}>
            <Pressable
              disabled={!canPrev}
              onPress={() => canPrev && setSelectedMd(allMatchdays[mdIdx - 1])}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.s800,
                alignItems: 'center', justifyContent: 'center',
                opacity: canPrev ? 1 : 0.35,
              }}
            >
              <Icon name="chev" size={16} color={colors.paper} />
            </Pressable>
            <Pressable
              onPress={() => setSelectedMd(null)}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper }}>
                Jornada {currentMd}{currentMd === activeMatchday ? ' · actual' : ''}
              </Text>
            </Pressable>
            <Pressable
              disabled={!canNext}
              onPress={() => canNext && setSelectedMd(allMatchdays[mdIdx + 1])}
              style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: colors.s800,
                alignItems: 'center', justifyContent: 'center',
                opacity: canNext ? 1 : 0.35,
                transform: [{ rotate: '180deg' }],
              }}
            >
              <Icon name="chev" size={16} color={colors.paper} />
            </Pressable>
          </View>
        ) : null}

        {/* Matches list (varies by chip) */}
        <Section
          title={
            chip === 'Today'    ? "PARTIDOS DE HOY" :
            chip === 'Live'     ? "EN VIVO" :
            chip === 'My picks' ? "TUS PICKS" :
            chip === 'Pending'  ? "PENDIENTES DE PICK" :
                                  `LIGA MX · JORNADA ${currentMd}`
          }
          action={
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}>
              {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
            </Text>
          }
        >
          {matchesLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.paper2} />
            </View>
          ) : matches.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.paper2, paddingVertical: 12 }}>
              {chip === 'Today'    ? 'No hay partidos hoy.' :
               chip === 'Live'     ? 'No hay partidos en vivo.' :
               chip === 'My picks' ? 'Aún no has hecho picks.' :
               chip === 'Pending'  ? '¡Estás al día con tus picks!' :
                                     'No hay partidos próximos.'}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {(chip === 'Liga MX' ? matches : matches.slice(0, 5)).map((m, i) => (
                <Animated.View
                  // `chip` is part of the key so changing the filter forces a
                  // fresh mount → the cards re-stagger instead of just swapping
                  // in-place. Limit the delay window so longer lists don't end
                  // up with a 1s tail of animations.
                  key={`${chip}-${m.id}`}
                  // Smooth slide-up with no bounce — card rises from below
                  // and decelerates straight into its resting position.
                  // `Easing.out(cubic)` starts fast and softly slows down,
                  // so the motion still reads as elegant rather than linear.
                  entering={FadeInDown
                    .delay(Math.min(i, 8) * 55)
                    .duration(420)
                    .easing(Easing.out(Easing.cubic))}
                >
                  <MatchRow
                    m={m}
                    onPress={() => router.push({ pathname: '/match/[id]', params: { id: m.id } })}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </Section>
      </ScrollView>

      <AddFriendModal visible={addFriendOpen} onClose={() => setAddFriendOpen(false)} />
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

// ─── Wallet-style group stack ────────────────────────────────────
//
// Apple-Wallet-inspired vertical stack of "Active Circls" cards.
//
// Visual layout (top → bottom of section):
//   • The BACK card sits at the top — only its header peeks out.
//   • Each card in front of it sits lower, covering the header below.
//   • The FRONT card (groups[0]) is at the bottom of the stack and
//     is fully visible. It's the user's "primary" group.
//
// Entry animation (Wallet "fan out" feel):
//   • The back card lands first (no delay).
//   • Each card in front lands ~95ms later than the one behind it.
//   • The front card lands last — most dramatic arrival.
//
// Tap behaviour:
//   • Card lifts ~8px and scales up subtly (Wallet "select" cue).
//   • A short delay (160ms) lets the user perceive the response
//     before navigation kicks in.
//
const CARD_H        = 134;
const STACK_OFFSET  = 76;   // visible peek of each lower card
const STAGGER_MS    = 95;

interface WalletStackProps {
  groups:       Array<{
    id:        string;
    name:      string;
    icon:      string | null;
    image_url: string | null;
    accent:    string;
    myRank:    number;
    myPts:     number;
    members:   number;
    avatars:   string[];
  }>;
  onPressGroup: (id: string) => void;
}

function WalletStack({ groups, onPressGroup }: WalletStackProps) {
  const N = groups.length;
  if (N === 0) return null;
  const stackHeight = CARD_H + (N - 1) * STACK_OFFSET;

  return (
    <View style={{ height: stackHeight, position: 'relative' }}>
      {groups.map((g, i) => {
        // groups[0] is the FRONT card (visually at the bottom):
        //   visualPos N-1 = sits at top of stack (back, peeks only)
        //   visualPos 0   = sits at bottom of stack (front, fully shown)
        const visualPos = N - 1 - i;
        // Back card lands first; front card lands last.
        const entryDelay = (N - 1 - visualPos) * STAGGER_MS;
        return (
          <WalletCard
            key={g.id}
            group={g}
            visualPos={visualPos}
            entryDelay={entryDelay}
            zIdx={N - i}
            onPress={() => onPressGroup(g.id)}
          />
        );
      })}
    </View>
  );
}

interface WalletCardProps {
  group:      WalletStackProps['groups'][number];
  visualPos:  number;
  entryDelay: number;
  zIdx:       number;
  onPress:    () => void;
}

function WalletCard({ group: g, visualPos, entryDelay, zIdx, onPress }: WalletCardProps) {
  // Press = 0 idle, Press = 1 fully "selected" (lifted & scaled).
  const press = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -press.value * 8 },
      { scale: 1 + press.value * 0.022 },
    ],
  }));

  function handlePress() {
    press.value = withSpring(1, { damping: 18, stiffness: 320 });
    // Give the user ~160ms to see the lift before we navigate.
    setTimeout(() => {
      press.value = withSpring(0, { damping: 18, stiffness: 320 });
      onPress();
    }, 160);
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(entryDelay).springify().damping(20).stiffness(320)}
      style={[
        {
          position: 'absolute',
          top: visualPos * STACK_OFFSET,
          left: 0,
          right: 0,
          height: CARD_H,
          zIndex: zIdx,
          // Shadow lifts the card off the one behind it for stack depth.
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 8,
        },
        animStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={{
          flex: 1,
          backgroundColor: colors.s800,
          borderRadius: 18,
          padding: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 4,
          borderTopColor: g.accent,
        }}
      >
        {/* ── Top row — visible in peeks ─────────────────────────
            Content here must fit in the top ~58px of the card so
            users can identify each group from its peeking header. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <GroupIcon imageUrl={g.image_url} emoji={g.icon} accent={g.accent} size={34} radius={10} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 15, color: colors.paper }}>
              {g.name}
            </Text>
            <Text style={{ fontSize: 11, color: colors.mist, fontWeight: '700', marginTop: 1 }}>
              #{g.myRank} of {g.members}
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '900', color: colors.gold }}>
            {g.myPts} pts
          </Text>
        </View>

        {/* ── Bottom row — only visible on the FRONT card ────────
            Hidden behind the next card's top edge for any card
            that isn't at the front, which is fine — this row is
            secondary info. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 18,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <AvatarStack items={g.avatars.map((s) => ({ initials: s }))} size={22} max={5} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}>
            Toca para entrar ›
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
