import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
  withSpring, interpolate, Easing, FadeIn, FadeOut, FadeInDown, FadeOutUp,
} from 'react-native-reanimated';
import {
  ScreenContainer, TopBar, TeamCrest, Icon, Avatar, Text, colors,
} from '../../src/components';
import { LIGAMX } from '../../src/data';
import { useAccent } from '../../src/lib/tweaks';
import type { TeamCode } from '../../src/types';
import {
  useMatch, useMyGroups, useMyPicksForMatch, useMyMatchPickDetail,
  useMatchLineup, useGroupMembers, useMatchPicksInGroup,
} from '../../src/lib/queries';
import type { Prediction } from '../../src/lib/queries';

export default function MatchDetail() {
  const { id: matchId, groupId } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const router = useRouter();
  const { accentColor } = useAccent();

  const { data: match, isLoading } = useMatch(matchId);
  const { data: groups = [] }      = useMyGroups();
  const { data: myPicks = {} }     = useMyPicksForMatch(matchId);
  const { data: detailByGroup = {} } = useMyMatchPickDetail(matchId);
  const { data: lineup }           = useMatchLineup(matchId);
  const { data: members = [] }     = useGroupMembers(groupId);
  const { data: groupPicks = {} }  = useMatchPicksInGroup(matchId, groupId);

  const [drawerOpen, setDrawerOpen] = useState(false);
  // Circls where this NEW pick will count. Group context locks the set
  // to the one group; otherwise default to all the user's groups and let
  // them toggle. Empty until groups are loaded — initialized lazily below.
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupsSeeded, setGroupsSeeded] = useState(false);

  useEffect(() => {
    if (groupsSeeded || groups.length === 0) return;
    if (groupId) {
      setSelectedGroupIds(new Set([groupId]));
    } else {
      setSelectedGroupIds(new Set(groups.map((g) => g.id)));
    }
    setGroupsSeeded(true);
  }, [groupsSeeded, groups, groupId]);

  function toggleCircle(gid: string) {
    if (groupId) return; // locked context — can't toggle
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(gid)) next.delete(gid);
      else next.add(gid);
      return next;
    });
  }

  // ── Exit transition ───────────────────────────────────────────
  // On "tap to bet" the foreground elements animate OUT (escudos slide down
  // toward center + fade, the center circle expands + fades, friends slide
  // down + fade) while the shared gradient background stays put. Then we
  // navigate — the wheel screen slides in over the now-empty match screen,
  // and because both share the same gradient the backdrop reads continuous.
  const exit = useSharedValue(0);

  // Reset when the screen regains focus (returning from the wheel) so the
  // elements are visible again — animate back in for a smooth return.
  useFocusEffect(
    useCallback(() => {
      exit.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) });
    }, [exit]),
  );

  const fadeExit = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const teamsExit = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ translateY: exit.value * 70 }],
  }));
  const centerExit = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: 1 + exit.value * 0.45 }],
  }));
  const friendsExit = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ translateY: exit.value * 50 }],
  }));

  // Background gradient — same accent-tinted base used by the score step,
  // so when the user taps to bet and the wizard launches, the backdrop
  // doesn't change (only the foreground rearranges).
  const bg = useMemo(() => (
    <LinearGradient
      colors={[colors.s900, '#070912', accentColor + '2E']}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
    />
  ), [accentColor]);

  if (isLoading || !match) {
    return (
      <ScreenContainer theme="dark" background={bg}>
        <TopBar
          left={
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 6, marginLeft: -6 }}>
              <Icon name="back" size={22} color={colors.paper} />
            </Pressable>
          }
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {isLoading ? (
            <ActivityIndicator color={colors.paper2} />
          ) : (
            <Text style={{ color: colors.paper2 }}>Partido no encontrado.</Text>
          )}
        </View>
      </ScreenContainer>
    );
  }

  const homeCode = match.home as TeamCode;
  const awayCode = match.away as TeamCode;
  const h = LIGAMX[homeCode];
  const a = LIGAMX[awayCode];

  const isFinished  = match.status === 'finished';
  const isLive      = match.status === 'live';
  const isPreKickoff = !isFinished && !isLive;

  // Pick context: a group route → that group's pick; home route → first
  // existing pick across user's groups (used for the "your pick" summary).
  const contextPick   = groupId ? myPicks[groupId] ?? null : (Object.values(myPicks)[0] ?? null);
  const contextDetail = groupId ? detailByGroup[groupId] : Object.values(detailByGroup)[0];
  const hasPick       = !!contextPick;

  // Resolve scorer names via the lineup (for picked + actual scorers).
  const playerNameById: Record<string, string> = {};
  if (lineup && match.home_team_id && match.away_team_id) {
    for (const e of [...(lineup.byTeam[match.home_team_id] ?? []), ...(lineup.byTeam[match.away_team_id] ?? [])]) {
      playerNameById[e.player.id] = e.player.name;
    }
  }

  // Friends who already picked. Currently only populated when entered via
  // a group context — multi-group aggregation across all the user's groups
  // happens in a later pass (would require N parallel queries).
  const pickedMembers = members.filter((m) => groupPicks[m.user_id]);
  const friendsCount  = pickedMembers.length;

  function navigateToWizard() {
    if (groupId) {
      router.push({ pathname: '/pick/[id]', params: { id: matchId, groupId } });
      return;
    }
    // From home: pass the user's drawer selection. Empty selection falls
    // through to a wizard-side validation alert (so user understands why
    // nothing happens).
    const ids = Array.from(selectedGroupIds);
    router.push({
      pathname: '/pick/[id]',
      params: ids.length > 0
        ? { id: matchId, groupIds: ids.join(',') }
        : { id: matchId },
    });
  }

  function goToPickWizard() {
    // Two-layer transition for seamless continuity:
    //   1. The foreground elements (escudos, central circle, friends) fade
    //      out via `exit.value` over ~200ms.
    //   2. Right after, navigate — the wizard route is configured with a
    //      crossfade transition (`animation: 'fade'` in its <Stack.Screen>),
    //      so the new content fades in over the now-empty match screen.
    //   3. Both screens share the same gradient (s900 → accent), so the
    //      backdrop never appears to change — reads as "content morphs".
    exit.value = withTiming(1, { duration: 200, easing: Easing.in(Easing.cubic) });
    setTimeout(navigateToWizard, 180);
  }

  return (
    <ScreenContainer theme="dark" background={bg}>
      <TopBar
        left={
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 6, marginLeft: -6 }}>
            <Icon name="back" size={22} color={colors.paper} />
          </Pressable>
        }
      />

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* ── Top: round + kickoff text ────────────────────── */}
        <Animated.Text style={[{
          textAlign: 'center', color: colors.paper2, fontSize: 11,
          fontWeight: '800', letterSpacing: 1, marginTop: 4,
        }, fadeExit]}>
          {match.round.toUpperCase()} · {match.kickoff.toUpperCase()}
        </Animated.Text>

        {/* ── Teams row with chevron ───────────────────────── */}
        <Animated.View style={[{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 18, paddingHorizontal: 6,
        }, teamsExit]}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <TeamCrest team={h} size={72} bare />
            <Text style={{ color: colors.paper, fontWeight: '800', fontSize: 15, marginTop: 8 }}>
              {h.name}
            </Text>
          </View>

          <Pressable
            onPress={() => setDrawerOpen((v) => !v)}
            hitSlop={10}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 22,
            }}
            accessibilityLabel="Ver Circls"
          >
            <Chevron open={drawerOpen} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <TeamCrest team={a} size={72} bare />
            <Text style={{ color: colors.paper, fontWeight: '800', fontSize: 15, marginTop: 8 }}>
              {a.name}
            </Text>
          </View>
        </Animated.View>

        {/* Hint text under chevron when drawer is closed */}
        {!drawerOpen ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(120)}
            style={[{ alignItems: 'center', marginTop: 4 }, fadeExit]}
          >
            <Text style={{ color: colors.paper2, fontSize: 11, fontWeight: '600' }}>
              {groups.length === 0
                ? 'Únete a un Circl para apostar'
                : groupId
                ? `Cuenta en este Circl`
                : `Cuenta en ${selectedGroupIds.size}/${groups.length} Circls · toca ▾`}
            </Text>
          </Animated.View>
        ) : null}

        {/* ── Drawer: Circls picker ────────────────────────── */}
        {drawerOpen ? (
          <Animated.View
            entering={FadeInDown.duration(260).springify().damping(18)}
            exiting={FadeOutUp.duration(180)}
            style={[{
              marginTop: 14,
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 14, padding: 12, gap: 4,
            }, fadeExit]}
          >
            <CirclsList
              groups={groups}
              myPicks={myPicks}
              detailByGroup={detailByGroup}
              selectedGroupIds={selectedGroupIds}
              onToggle={toggleCircle}
              lockedGroupId={groupId}
              homeName={h.name}
              awayName={a.name}
            />
          </Animated.View>
        ) : null}

        {/* ── Center action ────────────────────────────────── */}
        <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, centerExit]}>
          <CenterAction
            state={
              isFinished || isLive
                ? 'result'
                : hasPick
                ? 'picked'
                : 'idle'
            }
            accent={accentColor}
            onPress={goToPickWizard}
            match={match}
            pickPrediction={contextPick}
            pickHomeGoals={contextDetail?.homeGoals ?? null}
            pickAwayGoals={contextDetail?.awayGoals ?? null}
            homeName={h.name}
            awayName={a.name}
          />
        </Animated.View>

        {/* ── Friends section ──────────────────────────────── */}
        <Animated.View style={[{ alignItems: 'center', paddingBottom: 16, gap: 8 }, friendsExit]}>
          <Text style={{ color: colors.paper2, fontSize: 12, fontWeight: '700' }}>
            {isPreKickoff
              ? (friendsCount > 0
                  ? `${friendsCount} compa${friendsCount === 1 ? '' : 's'} ya ${friendsCount === 1 ? 'jugó' : 'jugaron'}`
                  : groupId ? 'Sé el primero' : 'Apuesta y reta a tus compas')
              : (friendsCount > 0
                  ? `${friendsCount} compa${friendsCount === 1 ? '' : 's'} jugaron`
                  : 'Sin jugadas')}
          </Text>
          {pickedMembers.length > 0 ? (
            <FriendAvatarRow members={pickedMembers} />
          ) : null}
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  const rot = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    rot.value = withSpring(open ? 1 : 0, { damping: 18, stiffness: 220, mass: 0.7 });
  }, [open, rot]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value * 180}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <Icon name="chevDown" size={18} color={colors.paper} />
    </Animated.View>
  );
}

interface CirclsListProps {
  groups: { id: string; name: string; icon: string; accent: string }[];
  myPicks: Record<string, Prediction>;
  detailByGroup: Record<string, { homeGoals: number | null; awayGoals: number | null }>;
  selectedGroupIds: Set<string>;
  onToggle: (gid: string) => void;
  /** When set (group context), Circls are locked and toggles disabled. */
  lockedGroupId?: string;
  homeName: string;
  awayName: string;
}

function CirclsList({
  groups, myPicks, detailByGroup, selectedGroupIds, onToggle,
  lockedGroupId, homeName, awayName,
}: CirclsListProps) {
  const locked = !!lockedGroupId;

  return (
    <>
      {!locked ? (
        <Text style={{
          color: colors.paper2, fontSize: 10, fontWeight: '800',
          letterSpacing: 1, paddingHorizontal: 4, paddingBottom: 4,
        }}>
          ELIGE DÓNDE CUENTA
        </Text>
      ) : null}
      {groups.map((g) => {
        const p = myPicks[g.id];
        const d = detailByGroup[g.id];
        const label = predLabel(p, homeName, awayName);
        const score = d && d.homeGoals != null && d.awayGoals != null
          ? `${d.homeGoals}-${d.awayGoals}` : null;
        const isSelected = selectedGroupIds.has(g.id);
        const isLockedRow = locked && g.id !== lockedGroupId;
        return (
          <Pressable
            key={g.id}
            onPress={() => !locked && onToggle(g.id)}
            disabled={locked}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingVertical: 6, paddingHorizontal: 4,
              opacity: isLockedRow ? 0.35 : 1,
            }}
          >
            <View style={{
              width: 26, height: 26, borderRadius: 8,
              backgroundColor: g.accent + '22',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 13 }}>{g.icon}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.paper }}>
              {g.name}
            </Text>
            {label ? (
              <View style={{
                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                backgroundColor: colors.green + '22',
              }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.green }}>
                  {label}{score ? ` ${score}` : ''} ✓
                </Text>
              </View>
            ) : null}
            {/* Checkbox — checked = will be saved to. Locked context keeps
                the one current group always checked and others dimmed. */}
            <View style={{
              width: 22, height: 22, borderRadius: 6,
              backgroundColor: isSelected ? colors.paper : 'transparent',
              borderWidth: isSelected ? 0 : 1.5,
              borderColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {isSelected ? <Icon name="check" size={14} color={colors.ink} stroke={3} /> : null}
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

function predLabel(p: Prediction | null | undefined, homeName: string, awayName: string): string | null {
  if (!p) return null;
  if (p === 'home') return homeName;
  if (p === 'away') return awayName;
  return 'Empate';
}

interface CenterActionProps {
  state: 'idle' | 'picked' | 'result';
  accent: string;
  onPress: () => void;
  match: { score?: [number, number] | null; status: string };
  pickPrediction: Prediction | null;
  pickHomeGoals: number | null;
  pickAwayGoals: number | null;
  homeName: string;
  awayName: string;
}

const TAP_SIZE = 180;

function CenterAction({
  state, accent, onPress, match, pickPrediction,
  pickHomeGoals, pickAwayGoals, homeName, awayName,
}: CenterActionProps) {
  // Continuous breathing on the translucent halo + label. Drives a 0→1
  // shared value back and forth on a slow ease; everything else interpolates
  // off it. The result reads as "alive, tap me" without screaming.
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  // Soft outer halo (translucent disc) — bigger swing than the inner ring
  // so it reads as an exhale.
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.18]) }],
    opacity:   interpolate(pulse.value, [0, 1], [0.18, 0.34]),
  }));
  // Inner ring — subtler, gives the disc body
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.05]) }],
    opacity:   interpolate(pulse.value, [0, 1], [0.55, 1]),
  }));

  // Picked state pulses much more subtly so it doesn't fight the score
  // numbers visually.
  const subtleHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
    opacity:   interpolate(pulse.value, [0, 1], [0.14, 0.22]),
  }));

  if (state === 'result') {
    // Live or finished: actual score, no tap, no pulse.
    const [hs, as] = match.score ?? [null, null];
    const finalLabel = match.status === 'live' ? '● EN VIVO' : 'FINAL';
    const myScore = pickHomeGoals != null && pickAwayGoals != null
      ? `${pickHomeGoals}-${pickAwayGoals}` : null;
    const myLabel = predLabel(pickPrediction, homeName, awayName);
    const correct = hs != null && as != null && pickPrediction
      ? (pickPrediction === 'home' && hs > as)
        || (pickPrediction === 'away' && as > hs)
        || (pickPrediction === 'draw' && hs === as)
      : null;
    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={{
          color: match.status === 'live' ? colors.red : colors.gold,
          fontSize: 11, fontWeight: '800', letterSpacing: 1,
        }}>
          {finalLabel}
        </Text>
        <Text style={{ color: colors.paper, fontSize: 76, fontWeight: '200', marginTop: 6, lineHeight: 84 }}>
          {hs ?? '-'} - {as ?? '-'}
        </Text>
        {myLabel ? (
          <View style={{
            marginTop: 18,
            paddingHorizontal: 14, paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: (correct === null ? colors.paper2 : correct ? colors.green : colors.red) + '20',
            borderWidth: 1,
            borderColor: (correct === null ? colors.paper2 : correct ? colors.green : colors.red) + '50',
          }}>
            <Text style={{ color: colors.paper, fontSize: 12, fontWeight: '700' }}>
              Tu pick: {myLabel}{myScore ? ` · ${myScore}` : ''}{correct === true ? ' ✓' : correct === false ? ' ✗' : ''}
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.paper2, fontSize: 12, marginTop: 18, fontWeight: '700' }}>
            No jugaste este partido
          </Text>
        )}
      </View>
    );
  }

  if (state === 'picked') {
    // Pre-kickoff with an existing pick: show the prediction big, soft
    // pulse, tap → edit wizard.
    const score = pickHomeGoals != null && pickAwayGoals != null
      ? `${pickHomeGoals} - ${pickAwayGoals}` : null;
    const label = predLabel(pickPrediction, homeName, awayName);
    return (
      <Pressable onPress={onPress} hitSlop={20} style={{ alignItems: 'center' }}>
        <View style={{ width: TAP_SIZE, height: TAP_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: TAP_SIZE, height: TAP_SIZE,
                borderRadius: TAP_SIZE / 2,
                backgroundColor: accent,
              },
              subtleHaloStyle,
            ]}
          />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.paper2, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
              TU PICK
            </Text>
            {score ? (
              <Text style={{ color: colors.paper, fontSize: 56, fontWeight: '200', marginTop: 2, lineHeight: 64 }}>
                {score}
              </Text>
            ) : null}
            <Text style={{ color: colors.paper, fontSize: 14, fontWeight: '800', marginTop: score ? 2 : 8 }}>
              {label}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.paper2, fontSize: 12, fontWeight: '700', marginTop: 8 }}>
          toca para editar
        </Text>
      </Pressable>
    );
  }

  // Idle state: pulsing tap-to-bet circle.
  return (
    <Pressable onPress={onPress} hitSlop={20} style={{ alignItems: 'center' }}>
      <View style={{ width: TAP_SIZE, height: TAP_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer halo */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: TAP_SIZE, height: TAP_SIZE,
              borderRadius: TAP_SIZE / 2,
              backgroundColor: accent,
            },
            haloStyle,
          ]}
        />
        {/* Inner ring (border-only) for body */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: TAP_SIZE * 0.72, height: TAP_SIZE * 0.72,
              borderRadius: (TAP_SIZE * 0.72) / 2,
              borderWidth: 1.5,
              borderColor: accent,
            },
            ringStyle,
          ]}
        />
        <Text style={{ color: colors.paper, fontSize: 14, fontWeight: '800', letterSpacing: 1 }}>
          TOCA PARA{'\n'}APOSTAR
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Friend avatar row ─────────────────────────────────────────

interface FriendAvatarRowProps {
  members: { user_id: string; profile: { name?: string | null; username?: string | null; avatar_url?: string | null } }[];
}

function FriendAvatarRow({ members }: FriendAvatarRowProps) {
  const MAX = 5;
  const shown = members.slice(0, MAX);
  const extra = members.length - MAX;
  const SIZE  = 32;
  return (
    <View style={{ flexDirection: 'row' }}>
      {shown.map((m, i) => {
        const display = (m.profile.name ?? m.profile.username ?? '?').trim();
        const initials = display.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
        return (
          <View
            key={m.user_id}
            style={{
              marginLeft: i ? -SIZE * 0.35 : 0,
              borderRadius: SIZE / 2,
              borderWidth: 2,
              borderColor: colors.s900,
            }}
          >
            <Avatar imageUrl={m.profile.avatar_url} initials={initials} size={SIZE} />
          </View>
        );
      })}
      {extra > 0 ? (
        <View
          style={{
            marginLeft: -SIZE * 0.35,
            width: SIZE, height: SIZE, borderRadius: SIZE / 2,
            backgroundColor: 'rgba(255,255,255,0.10)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: colors.s900,
          }}
        >
          <Text style={{ color: colors.paper, fontWeight: '800', fontSize: 12 }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}
