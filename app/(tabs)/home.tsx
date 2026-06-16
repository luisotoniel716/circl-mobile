import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ScreenContainer, Section, Avatar, AvatarStack, GroupIcon, MatchRow, Icon, Text, colors,
  AddFriendModal,
} from '../../src/components';
import { useAccent } from '../../src/lib/tweaks';
import { useAuth } from '../../src/lib/auth';
import { useMatches, useMyGroups, useMyPickedMatchIds, useMyAllPicks, useUnreadCount } from '../../src/lib/queries';
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
  const { data: unreadCount = 0 } = useUnreadCount();

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
              {(chip === 'Liga MX' ? matches : matches.slice(0, 5)).map((m) => (
                <MatchRow
                  key={m.id}
                  m={m}
                  onPress={() => router.push({ pathname: '/match/[id]', params: { id: m.id } })}
                />
              ))}
            </View>
          )}
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {groups.slice(0, 3).map((g) => (
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
                    <GroupIcon imageUrl={g.image_url} emoji={g.icon} accent={g.accent} size={30} radius={8} />
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
