import { useMemo, useState } from 'react';
import { View, ScrollView, Pressable, Image, Alert, ActivityIndicator, Share, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import {
  ScreenContainer, TopBar, Section, CButton, Avatar, MatchRow, Icon, Text, colors,
} from '../../src/components';
import { LIGAMX } from '../../src/data';
import type { TeamCode } from '../../src/types';
import { useAuth } from '../../src/lib/auth';
import {
  useGroup, useGroupMembers, useLeagueMatches, useMyPicksInGroup,
} from '../../src/lib/queries';
import type { PickWithResult } from '../../src/lib/queries';
import type { Match } from '../../src/types';

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: group,    isLoading: groupLoading }   = useGroup(id);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(id);
  const { data: leagueMatches = [] } = useLeagueMatches(group?.league_id);
  const { data: myPicks = {} } = useMyPicksInGroup(id);

  // ─── Matches section state ──────────────────────
  const [matchChip, setMatchChip] = useState<'upcoming' | 'finished'>('upcoming');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [teamFilter,  setTeamFilter]  = useState<string | null>(null);  // team code
  const [liveOnly,    setLiveOnly]    = useState(false);
  const [matchdayFilter, setMatchdayFilter] = useState<number | null>(null);

  const matchdayOf = (m: Match) => {
    const n = parseInt(m.round.replace(/\D+/g, ''), 10);
    return Number.isNaN(n) ? 0 : n;
  };

  const filteredMatches = useMemo<Match[]>(() => {
    let out = leagueMatches;
    if (matchChip === 'upcoming') {
      out = out.filter((m) => m.status !== 'finished');
    } else {
      out = out.filter((m) => m.status === 'finished');
    }
    if (liveOnly && matchChip === 'upcoming') {
      out = out.filter((m) => m.status === 'live');
    }
    if (teamFilter) {
      out = out.filter((m) => m.home === teamFilter || m.away === teamFilter);
    }
    if (matchdayFilter != null) {
      out = out.filter((m) => matchdayOf(m) === matchdayFilter);
    }
    return out;
  }, [leagueMatches, matchChip, liveOnly, teamFilter, matchdayFilter]);

  const activeFilterCount =
    (teamFilter ? 1 : 0) +
    (matchdayFilter != null ? 1 : 0) +
    (liveOnly && matchChip === 'upcoming' ? 1 : 0);

  // Matchdays present in the matches matching the current chip
  const availableMatchdays = useMemo(() => {
    const base = matchChip === 'upcoming'
      ? leagueMatches.filter((m) => m.status !== 'finished')
      : leagueMatches.filter((m) => m.status === 'finished');
    const set = new Set<number>();
    for (const m of base) {
      const md = matchdayOf(m);
      if (md > 0) set.add(md);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [leagueMatches, matchChip]);

  // Available teams in current league matches (for filter modal)
  const availableTeams = useMemo(() => {
    const codes = new Set<string>();
    for (const m of leagueMatches) {
      codes.add(m.home);
      codes.add(m.away);
    }
    return Array.from(codes).sort();
  }, [leagueMatches]);

  if (groupLoading || !group) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  // Podium = top 3 by points (all 0 for now → falls back to join order)
  const ranked = [...members].sort((a, b) => b.points - a.points);
  const podium = ranked.slice(0, 3);
  const myRank = ranked.findIndex((m) => m.user_id === user?.id) + 1;
  const myPts  = ranked.find((m) => m.user_id === user?.id)?.points ?? 0;

  async function handleShareInvite() {
    if (!group) return;
    const msg = `Únete a "${group.name}" en Circl con el código: ${group.invite_code}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // fallback: copy
      await Clipboard.setStringAsync(group.invite_code);
      Alert.alert('Código copiado', group.invite_code);
    }
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar
        title={group.name}
        onBack
        right={
          <Pressable
            onPress={() => router.push(`/group/${group.id}/settings` as never)}
            hitSlop={8}
          >
            <Icon name="settings" size={20} color={colors.paper} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
          <LinearGradient
            colors={[group.accent, '#0024BD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 18, overflow: 'hidden' }}
          >
            {/* Cover photo as washed-out background, if available */}
            {group.image_url ? (
              <Image
                source={{ uri: group.image_url }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.35 }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: 'rgba(255,255,255,0.18)',
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {group.image_url ? (
                  <Image source={{ uri: group.image_url }} style={{ width: 48, height: 48 }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 24 }}>{group.icon}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '900', fontSize: 18, color: colors.paper }}>{group.name}</Text>
                <Text style={{ fontSize: 12, color: colors.paper, opacity: 0.85 }}>
                  Liga MX · {group.members} {group.members === 1 ? 'miembro' : 'miembros'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>YOUR RANK</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: colors.paper }}>
                  {myRank ? `#${myRank}` : '—'}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>POINTS</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: colors.paper }}>{myPts}</Text>
              </View>
              <View style={{ marginLeft: 'auto' }}>
                <CButton
                  variant="light"
                  size="sm"
                  lead={<Icon name="addUser" size={14} color={colors.ink} />}
                  onPress={handleShareInvite}
                >
                  Invite
                </CButton>
              </View>
            </View>

            {/* Members preview row — promoted from the bottom of the screen
                into the hero card so the group "feels alive" at first glance.
                Tapping anywhere on the strip opens the Circle wheel where
                the full member list lives. The avatar overlap + count chip
                pattern keeps the strip compact even with bigger groups. */}
            {!membersLoading && members.length > 0 ? (
              <Pressable
                onPress={() => router.push({ pathname: '/group/[id]/circle', params: { id: group.id } })}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <View style={{ flexDirection: 'row' }}>
                  {members.slice(0, 4).map((m, i) => (
                    <View
                      key={m.user_id}
                      style={{
                        marginLeft: i === 0 ? 0 : -10,
                        // White border so overlapping avatars read as
                        // separate disks even when crests/photos blend.
                        borderWidth: 2,
                        borderColor: colors.paper,
                        borderRadius: 16,
                      }}
                    >
                      <Avatar
                        initials={initialsOf(m.profile?.name)}
                        size={28}
                        bg={group.accent}
                        imageUrl={m.profile?.avatar_url}
                      />
                    </View>
                  ))}
                  {members.length > 4 ? (
                    <View
                      style={{
                        marginLeft: -10,
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: 'rgba(255,255,255,0.22)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: colors.paper,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '900', color: colors.paper }}>
                        +{members.length - 4}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.paper, opacity: 0.85 }}>
                  {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.paper, opacity: 0.85 }}>
                  Ver todos ›
                </Text>
              </Pressable>
            ) : null}
          </LinearGradient>
        </View>

        {/* Podium */}
        <Section
          title="TOP 3"
          action={
            <Text
              onPress={() => router.push({ pathname: '/group/[id]/leaderboard', params: { id: group.id } })}
              style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}
            >
              Full leaderboard ›
            </Text>
          }
        >
          {membersLoading ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator color={colors.paper2} />
            </View>
          ) : podium.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.paper2, paddingVertical: 12 }}>
              Aún no hay miembros con puntos.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {podium.map((m, idx) => {
                const me = m.user_id === user?.id;
                const rank = idx + 1;
                const gold = rank === 1;
                const icon = gold ? '👑' : `#${rank}`;
                return (
                  <View
                    key={m.user_id}
                    style={{
                      flex: 1,
                      backgroundColor: colors.s800,
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 6,
                      borderWidth: me ? 1.5 : 1,
                      borderColor: me ? colors.gold : 'rgba(255,255,255,0.04)',
                      alignItems: 'center',
                      marginTop: 7,
                    }}
                  >
                    {/* Rank pill above the card. The previous pill used a
                        semi-transparent white background — the "me" card's
                        gold border showed through, making it look like the
                        border was on top. Opaque background (s900) covers
                        the border cleanly. Lifted with zIndex too. */}
                    <View
                      style={{
                        position: 'absolute', top: -8,
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: gold ? colors.gold : colors.s900,
                        borderWidth: gold ? 0 : 1.5,
                        borderColor: 'rgba(255,255,255,0.18)',
                        alignItems: 'center', justifyContent: 'center',
                        zIndex: 10,
                        elevation: 10,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '900', color: gold ? colors.ink : colors.paper }}>{icon}</Text>
                    </View>
                    <View style={{ marginTop: 4 }}>
                      <Avatar initials={initialsOf(m.profile?.name)} size={32} bg={group.accent} imageUrl={m.profile?.avatar_url} />
                    </View>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '800', marginTop: 3, color: colors.paper }}>
                      {me ? 'You' : (m.profile?.name?.split(' ')[0] ?? '—')}
                    </Text>
                    <Text style={{ fontSize: 10.5, color: colors.gold, fontWeight: '800' }}>{m.points} pts</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Section>

        {/* Matches in group (upcoming + finished, with my picks) */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {/* Section header with chips + filter button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Pressable
              onPress={() => setMatchChip('upcoming')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: matchChip === 'upcoming' ? colors.paper : 'rgba(255,255,255,0.06)',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '800',
                color: matchChip === 'upcoming' ? colors.ink : colors.paper2,
              }}>Próximos</Text>
            </Pressable>

            <Pressable
              onPress={() => setMatchChip('finished')}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: matchChip === 'finished' ? colors.paper : 'rgba(255,255,255,0.06)',
              }}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '800',
                color: matchChip === 'finished' ? colors.ink : colors.paper2,
              }}>Resultados</Text>
            </Pressable>

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={() => setFiltersOpen(true)}
              style={{
                width: 36,
                height: 32,
                borderRadius: 9999,
                backgroundColor: activeFilterCount > 0 ? colors.gold + '33' : 'rgba(255,255,255,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="filter" size={16} color={activeFilterCount > 0 ? colors.gold : colors.paper2} />
              {activeFilterCount > 0 ? (
                <View style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: colors.ink }}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {filteredMatches.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.paper2, paddingVertical: 16, textAlign: 'center' }}>
              {matchChip === 'upcoming'
                ? 'No hay partidos próximos con estos filtros.'
                : 'Aún no hay partidos finalizados.'}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredMatches.slice(0, 10).map((m, i) => (
                <Animated.View
                  // `matchChip` is part of the key so switching between
                  // Próximos/Resultados forces a fresh mount → the cards
                  // re-stagger from the new list instead of swapping
                  // in-place. Same pattern as the home tab — keeps the
                  // animation feeling identical across screens.
                  key={`${matchChip}-${m.id}`}
                  entering={FadeInDown
                    .delay(Math.min(i, 8) * 55)
                    .duration(420)
                    .easing(Easing.out(Easing.cubic))}
                >
                  {matchChip === 'upcoming' ? (
                    <MatchRow
                      m={m}
                      onPress={() =>
                        router.push({
                          pathname: '/match/[id]',
                          params: { id: m.id, groupId: group.id },
                        })
                      }
                    />
                  ) : (
                    <ResultRow
                      match={m}
                      pick={myPicks[m.id]}
                      onPress={() =>
                        router.push({ pathname: '/match/[id]', params: { id: m.id, groupId: group.id } })
                      }
                    />
                  )}
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {/* Advanced filters modal */}
        <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.s900, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '800', flex: 1 }}>
                  Filtros
                </Text>
                <Pressable onPress={() => setFiltersOpen(false)} hitSlop={8}>
                  <Icon name="close" size={20} color={colors.paper2} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Live toggle — only for upcoming */}
                {matchChip === 'upcoming' && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>
                      ESTADO
                    </Text>
                    <Pressable
                      onPress={() => setLiveOnly((v) => !v)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: liveOnly ? colors.red + '22' : colors.s800,
                        borderWidth: 1,
                        borderColor: liveOnly ? colors.red : 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red }} />
                      <Text style={{ color: colors.paper, fontSize: 14, fontWeight: '800', flex: 1 }}>
                        Solo en vivo
                      </Text>
                      <View style={{
                        width: 22, height: 22, borderRadius: 6,
                        backgroundColor: liveOnly ? colors.red : 'transparent',
                        borderWidth: liveOnly ? 0 : 1.5,
                        borderColor: 'rgba(255,255,255,0.22)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {liveOnly ? <Icon name="check" size={14} color={colors.paper} stroke={3} /> : null}
                      </View>
                    </Pressable>
                  </View>
                )}

                {/* Matchday filter */}
                {availableMatchdays.length > 0 && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>
                      JORNADA
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <Pressable
                        onPress={() => setMatchdayFilter(null)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 9999,
                          backgroundColor: matchdayFilter == null ? colors.gold : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <Text style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: matchdayFilter == null ? colors.ink : colors.paper2,
                        }}>Todas</Text>
                      </Pressable>
                      {availableMatchdays.map((md) => {
                        const active = matchdayFilter === md;
                        return (
                          <Pressable
                            key={md}
                            onPress={() => setMatchdayFilter(md)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 9999,
                              backgroundColor: active ? colors.gold : 'rgba(255,255,255,0.06)',
                            }}
                          >
                            <Text style={{
                              fontSize: 11.5,
                              fontWeight: '800',
                              color: active ? colors.ink : colors.paper2,
                            }}>J{md}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Team filter */}
                {availableTeams.length > 0 && (
                  <View style={{ marginBottom: 18 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist, marginBottom: 8 }}>
                      EQUIPO
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <Pressable
                        onPress={() => setTeamFilter(null)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 9999,
                          backgroundColor: !teamFilter ? colors.gold : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <Text style={{
                          fontSize: 11.5,
                          fontWeight: '800',
                          color: !teamFilter ? colors.ink : colors.paper2,
                        }}>Todos</Text>
                      </Pressable>
                      {availableTeams.map((code) => {
                        const team = LIGAMX[code as TeamCode];
                        const active = teamFilter === code;
                        return (
                          <Pressable
                            key={code}
                            onPress={() => setTeamFilter(code)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 9999,
                              backgroundColor: active ? colors.gold : 'rgba(255,255,255,0.06)',
                            }}
                          >
                            <Text style={{
                              fontSize: 11.5,
                              fontWeight: '800',
                              color: active ? colors.ink : colors.paper2,
                            }}>{team?.name ?? code}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <CButton
                    variant="ghostDark"
                    size="md"
                    full
                    onPress={() => {
                      setTeamFilter(null);
                      setLiveOnly(false);
                      setMatchdayFilter(null);
                    }}
                  >
                    Limpiar
                  </CButton>
                </View>
                <View style={{ flex: 1 }}>
                  <CButton variant="primary" size="md" full onPress={() => setFiltersOpen(false)}>
                    Aplicar
                  </CButton>
                </View>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </ScreenContainer>
  );
}

// ─── ResultRow: finished match with my pick + outcome ──────

function ResultRow({
  match, pick, onPress,
}: {
  match: Match;
  pick:  PickWithResult | undefined;
  onPress: () => void;
}) {
  const h = LIGAMX[match.home as TeamCode];
  const a = LIGAMX[match.away as TeamCode];
  const [hs, as] = match.score ?? [0, 0];

  // What was the actual outcome?
  const outcome: 'home' | 'draw' | 'away' =
    hs > as ? 'home' : hs < as ? 'away' : 'draw';

  const myLabel = !pick
    ? 'Sin pick'
    : pick.prediction === 'home' ? h.name
    : pick.prediction === 'away' ? a.name
    : 'Empate';

  const correct = pick?.correct;
  const accent =
    correct === true  ? colors.green :
    correct === false ? colors.red :
                        colors.mist;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.s800,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        borderLeftWidth: 3,
        borderLeftColor: accent,
      }}
    >
      {/* Top row: matchday + outcome badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist, flex: 1 }}>
          {match.round.toUpperCase()} · FINAL
        </Text>
        {pick ? (
          <View style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: accent + '22',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
            <Icon
              name={correct ? 'check' : 'close'}
              size={10}
              color={accent}
              stroke={3}
            />
            <Text style={{ fontSize: 10, fontWeight: '900', color: accent }}>
              {pick.points} pts
            </Text>
          </View>
        ) : null}
      </View>

      {/* Score */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.paper,
            opacity: outcome === 'home' ? 1 : 0.6,
          }}>
            {h.name}
          </Text>
        </View>
        <View style={{
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 3,
          minWidth: 60,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: colors.paper }}>
            {hs} - {as}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.paper,
            opacity: outcome === 'away' ? 1 : 0.6,
          }}>
            {a.name}
          </Text>
        </View>
      </View>

      {/* Your pick */}
      <View style={{
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.04)',
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Text style={{ fontSize: 11, color: colors.mist, flex: 1 }}>
          Tu pick: <Text style={{ color: colors.paper, fontWeight: '800' }}>{myLabel}</Text>
        </Text>
        {pick ? (
          <Text style={{ fontSize: 10, fontWeight: '800', color: accent }}>
            {correct ? '¡CORRECTO!' : 'INCORRECTO'}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
