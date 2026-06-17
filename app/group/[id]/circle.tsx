import { useState, useMemo, useRef, useCallback, memo, useEffect } from 'react';
import {
  View, ScrollView, Pressable, ActivityIndicator,
  useWindowDimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay,
  runOnJS, interpolateColor, Easing,
  FadeIn, FadeOut,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ScreenContainer, TopBar, Avatar, TeamCrest, Icon, Text, colors,
} from '../../../src/components';
import { useAuth } from '../../../src/lib/auth';
import { useAccent } from '../../../src/lib/tweaks';
import {
  useGroup, useGroupMembers, useLeagueMatches, useMatchPicksInGroup,
  type GroupMember,
} from '../../../src/lib/queries';
import { LIGAMX } from '../../../src/data';
import type { TeamCode, Match } from '../../../src/types';


function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function predLabel(p: 'home' | 'draw' | 'away' | undefined, home: TeamCode, away: TeamCode): string {
  if (p === 'home') return LIGAMX[home]?.name ?? 'Local';
  if (p === 'away') return LIGAMX[away]?.name ?? 'Visita';
  if (p === 'draw') return 'Empate';
  return 'Sin pick';
}

const TAU = Math.PI * 2;
const TOP_ANGLE = -Math.PI / 2; // 12 o'clock in math coordinates

/**
 * The "Circle" view of a group — a spinnable wheel of members. The current
 * user starts at the 12 o'clock position; every other member is evenly
 * distributed around the ring. The user can drag the wheel by touching
 * anywhere on it, tap an avatar to spin the wheel to that member, and
 * scroll the match list below. Tapping a match expands it to show a
 * comparison between the *focused* member (the one currently at the top)
 * and the current user.
 *
 * The matches list also drives a sticky pill that names whichever match is
 * passing under it as the user scrolls.
 */
export default function GroupCircle() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { accentColor } = useAccent();
  const { width: screenW } = useWindowDimensions();

  const { data: group } = useGroup(groupId);
  const { data: members = [], isLoading: membersLoading } = useGroupMembers(groupId);
  const { data: leagueMatches = [], isLoading: matchesLoading } = useLeagueMatches(group?.league_id);

  // Order members so the current user is first → they start at the top of
  // the wheel. The rest keeps the leaderboard order (by points desc).
  const orderedMembers = useMemo<GroupMember[]>(() => {
    const sorted = [...members].sort((a, b) => b.points - a.points);
    const meIdx  = sorted.findIndex((m) => m.user_id === user?.id);
    if (meIdx <= 0) return sorted;
    const me = sorted[meIdx];
    return [me, ...sorted.slice(0, meIdx), ...sorted.slice(meIdx + 1)];
  }, [members, user?.id]);

  const N = orderedMembers.length;

  // ── Wheel geometry ────────────────────────────────────────────
  // Slightly smaller so there's room for the focused-user header above and
  // a comfortable matches scroll area below — the wheel is now FIXED and
  // doesn't scroll out of the way.
  const wheelSize = Math.min(screenW - 80, 260);
  const radius    = wheelSize / 2 - 28;
  const cx        = wheelSize / 2;
  const cy        = wheelSize / 2;

  // ── Rotation state ───────────────────────────────────────────
  const rotation      = useSharedValue(0);
  const startRotation = useSharedValue(0);
  const startAngle    = useSharedValue(0);

  // Index of the member currently at the top of the wheel. Initially that's
  // the current user (index 0). We surface it to JS so we can show details
  // about the focused person below.
  const [focusedIdx, setFocusedIdx] = useState(0);

  // ── Snap pulse ───────────────────────────────────────────────
  // A "ping" effect that confirms a member just landed in the focus
  // position. `pulseScale` is the per-pulse multiplier (1 → 1.18 → 1) and
  // `focusedIdxShared` tells each WheelMember whether it should react.
  // Only the wheel member at this index applies pulseScale; everyone else
  // keeps scale 1, so the "ping" reads as a single bounce on the chosen
  // avatar instead of a wave across the whole wheel.
  const pulseScale       = useSharedValue(1);
  const focusedIdxShared = useSharedValue(0);

  // ── Sonar ripples ────────────────────────────────────────────
  // Two concentric rings that pulse outward from the focused avatar
  // each time it lands at the top. They reinforce the "snap arrival"
  // moment without competing with the avatar's pulse — second ring
  // is staggered so the effect reads as a wave, not a single flash.
  const ring1Progress = useSharedValue(0);   // 0 = at avatar size, 1 = fully expanded
  const ring2Progress = useSharedValue(0);

  function fireRipples(arrivalDelay: number) {
    'worklet';
    ring1Progress.value = 0;
    ring2Progress.value = 0;
    ring1Progress.value = withDelay(
      arrivalDelay,
      withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
    );
    ring2Progress.value = withDelay(
      arrivalDelay + 130,
      withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
    );
  }

  const computeFocused = useCallback((r: number): number => {
    'worklet';
    if (N === 0) return 0;
    const step = TAU / N;
    // We want the i such that  i*step + r ≡ 0 (mod TAU).
    // → i ≈ -r / step
    let idx = Math.round(-r / step) % N;
    if (idx < 0) idx += N;
    return idx;
  }, [N]);

  // Spring config tuned for a "soft magnetic" snap that feels weighty but
  // never jittery — the wheel settles smoothly rather than bouncing.
  const SPRING = { damping: 14, stiffness: 90, mass: 1.1 };

  function spinTo(idx: number) {
    // Bring member `idx` to the top, choosing the rotation closest to current
    // so the wheel never spins "the long way around".
    if (N === 0) return;
    const step = TAU / N;
    const desired = -idx * step;
    const current = rotation.value;
    // Normalize the difference into (-π, π] so we always take the shorter arc.
    let delta = desired - current;
    delta = ((delta + Math.PI) % TAU + TAU) % TAU - Math.PI;

    // Update React state IMMEDIATELY so the header, "Ver perfil" button and
    // expanded picks reflect the new selection while the wheel is still
    // animating into place. Waiting for the spring to finish made the UI
    // feel laggy.
    setFocusedIdx(idx);
    focusedIdxShared.value = idx;

    // The pulse + ripples are split intentionally:
    //   • Pulse fires on a fixed delay because it's a scale TRANSFORM
    //     on the avatar itself — it travels with the avatar, so a slight
    //     anticipation reads fine (and actually feels snappier than
    //     waiting for full settle).
    //   • Ripples emit from a FIXED point on screen. If we fire them
    //     while the avatar is still oscillating (the spring's
    //     under-damped tail wobbles for ~700ms), they look detached
    //     from the moving target. So we tie ripples to the spring's
    //     `finished` callback — they only emit once Reanimated has
    //     declared the wheel actually settled.
    rotation.value = withSpring(current + delta, SPRING, (finished) => {
      'worklet';
      if (finished) {
        fireRipples(0);
      }
    });
    pulseScale.value = withDelay(
      280,
      withSequence(
        withTiming(1.18, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 7, stiffness: 200, mass: 0.6 }),
      ),
    );
  }

  // Pan gesture: angular drag around the wheel center. We track the touch's
  // angle relative to the wheel center and apply the delta to rotation.
  const wheelGesture = Gesture.Pan()
    .onBegin((e) => {
      'worklet';
      const dx = e.x - cx;
      const dy = e.y - cy;
      startAngle.value = Math.atan2(dy, dx);
      startRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.x - cx;
      const dy = e.y - cy;
      const currentAngle = Math.atan2(dy, dx);
      let delta = currentAngle - startAngle.value;
      // Unwrap so dragging across the angle discontinuity (-π / π) doesn't
      // teleport the wheel by 2π.
      if (delta > Math.PI)  delta -= TAU;
      if (delta < -Math.PI) delta += TAU;
      rotation.value = startRotation.value + delta;
    })
    .onEnd(() => {
      'worklet';
      if (N === 0) return;
      const step = TAU / N;
      const snapped = Math.round(rotation.value / step) * step;
      const landedIdx = computeFocused(snapped);

      // Decide & propagate the new focused index IMMEDIATELY as the user
      // releases — so the header, picks and "Ver perfil" button update
      // while the wheel is still snapping into place.
      focusedIdxShared.value = landedIdx;
      runOnJS(setFocusedIdx)(landedIdx);

      // Pulse on perceived-arrival; ripples on actual spring settle.
      // See the matching comment in spinTo() above for the rationale —
      // ripples emit from a fixed point so they must wait for the wheel
      // to actually stop, otherwise they look detached from the still-
      // wobbling avatar.
      rotation.value = withSpring(snapped, SPRING, (finished) => {
        'worklet';
        if (finished) {
          fireRipples(0);
        }
      });
      pulseScale.value = withDelay(
        220,
        withSequence(
          withTiming(1.18, { duration: 140, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 7, stiffness: 200, mass: 0.6 }),
        ),
      );
    });

  const focusedMember = orderedMembers[focusedIdx];
  const isFocusedMe = focusedMember?.user_id === user?.id;

  // ── Matches state ────────────────────────────────────────────
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [centeredMatchId, setCenteredMatchId] = useState<string | null>(null);

  function toggleExpand(matchId: string) {
    setExpandedMatchId((prev) => (prev === matchId ? null : matchId));
  }

  // ── Pill content — name of centered match or default label ───
  const centeredMatch = leagueMatches.find((m) => m.id === centeredMatchId) ?? null;
  const pillLabel = centeredMatch
    ? `${LIGAMX[centeredMatch.home]?.code ?? centeredMatch.home} vs ${LIGAMX[centeredMatch.away]?.code ?? centeredMatch.away}`
    : 'Liga MX';
  const pillSub = centeredMatch ? centeredMatch.kickoff : 'Todos los partidos';

  // Track which match is under the pill as the user scrolls. We keep a
  // ref to the last value so the onScroll handler doesn't depend on React
  // state — that way it doesn't capture stale closures and we can compare
  // freely without triggering re-renders.
  const matchPositions = useRef<Map<string, { y: number; h: number }>>(new Map());
  const lastCenteredRef = useRef<string | null>(null);
  function recordPosition(matchId: string, y: number, h: number) {
    matchPositions.current.set(matchId, { y, h });
  }

  function handleScroll(scrollY: number) {
    // Initial state — before the user has scrolled enough for a match to
    // pass under the pill — show the league label.
    if (scrollY < 30) {
      if (lastCenteredRef.current !== null) {
        lastCenteredRef.current = null;
        setCenteredMatchId(null);
      }
      return;
    }
    // Pill stays on a match while scrollY is anywhere inside the match's
    // [top, bottom] range. This means a match "owns" the pill for the
    // entire time it's passing through — the pill doesn't flicker to the
    // next one at the midpoint, which was the bug. When scrollY is in the
    // gap BETWEEN matches we keep the previous selection sticky.
    let containing: string | null = null;
    matchPositions.current.forEach((pos, id) => {
      if (scrollY >= pos.y && scrollY < pos.y + pos.h) {
        containing = id;
      }
    });
    if (containing !== null && containing !== lastCenteredRef.current) {
      lastCenteredRef.current = containing;
      setCenteredMatchId(containing);
    }
  }

  // ── Render ────────────────────────────────────────────────────
  if (membersLoading || !group) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Circl" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer theme="dark">
      <TopBar title={group.name} onBack />

      {/* ── FIXED region: header + wheel ──────────────────────
          This whole block does NOT scroll. Only the matches list below
          the pill is scrollable. The pill itself acts as the divider. */}
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        {/* Focused member header — sits ABOVE the wheel so the "Ver perfil"
            button is contextually next to the person it refers to. The
            button area is rendered with a fixed minHeight so switching
            from "me" (no button) to another member (button shown) doesn't
            jump the rest of the UI. */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.mist, letterSpacing: 1 }}>
            {isFocusedMe ? 'TÚ' : 'COMPARANDO CON'}
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '900', color: colors.paper, marginTop: 2 }} numberOfLines={1}>
            {isFocusedMe
              ? (focusedMember?.profile?.name ?? 'Tú')
              : (focusedMember?.profile?.name ?? '—')}
          </Text>
          {focusedMember?.profile?.username ? (
            <Text style={{ fontSize: 11, color: colors.mist, marginTop: 2 }}>
              @{focusedMember.profile.username}
            </Text>
          ) : null}

          {/* Reserved space for the "Ver perfil" button — always 34px tall
              so the wheel doesn't shift between me-focused and other-focused
              states. */}
          <View style={{ height: 34, marginTop: 6, justifyContent: 'center' }}>
            {!isFocusedMe && focusedMember ? (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/user/[id]', params: { id: focusedMember.user_id } })
                }
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 9999,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.10)',
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Icon name="user" size={12} color={colors.paper2} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.paper2 }}>
                  Ver perfil
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <GestureDetector gesture={wheelGesture}>
          <View
            style={{
              width: wheelSize,
              height: wheelSize,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            {/* Dashed ring drawn with SVG so the dashes stay crisp at
                any density and we can colour-tint with the accent. */}
            <Svg
              width={wheelSize}
              height={wheelSize}
              style={{ position: 'absolute' }}
            >
              <SvgCircle
                cx={cx}
                cy={cy}
                r={radius}
                stroke="rgba(255,255,255,0.10)"
                strokeWidth={1.5}
                fill="none"
                strokeDasharray="4 8"
              />
              {/* Accent arc at the top to mark the focus zone */}
              <Path
                d={describeArc(cx, cy, radius, -110, -70)}
                stroke={accentColor}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>

            {/* Center decoration */}
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.10)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: accentColor,
                }}
              />
            </View>

            {/* Member avatars — each one positions itself based on its
                index and the current rotation. */}
            {orderedMembers.map((m, i) => (
              <WheelMember
                key={m.user_id}
                member={m}
                index={i}
                total={N}
                cx={cx}
                cy={cy}
                radius={radius}
                rotation={rotation}
                pulseScale={pulseScale}
                focusedIdxShared={focusedIdxShared}
                accentColor={accentColor}
                groupAccent={group.accent}
                onPress={() => spinTo(i)}
                isMe={m.user_id === user?.id}
              />
            ))}

            {/* ── Sonar ripples ──────────────────────────────────
                Two concentric rings radiate out from the focused
                avatar's resting position each time a snap completes.
                pointerEvents:'none' so they don't intercept taps. */}
            <SonarRing
              cx={cx}
              topY={cy - radius}
              progress={ring1Progress}
              color={accentColor}
            />
            <SonarRing
              cx={cx}
              topY={cy - radius}
              progress={ring2Progress}
              color={accentColor}
            />
          </View>
        </GestureDetector>
      </View>

      {/* ── Pill divider ────────────────────────────────────
          The outer capsule stays mounted so its shape/shadow never
          flicker. Only the inner content remounts on identity change,
          driven by a `key` tied to the centered match id. Reanimated's
          FadeIn/FadeOut layout transitions crossfade old → new with a
          subtle vertical slide for the iOS-header-morph feel. */}
      <View style={{ alignItems: 'center', paddingTop: 14, paddingBottom: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 9999,
            backgroundColor: colors.s800,
            borderWidth: 1,
            borderColor: centeredMatch ? accentColor + '60' : 'rgba(255,255,255,0.08)',
            // Subtle shadow so the pill visually sits above the matches
            ...Platform.select({
              ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
              android: { elevation: 6 },
            }),
            // Use a tiny overflow buffer so the slide-in/out content
            // doesn't get clipped by the rounded edge during the
            // animation window.
            overflow: 'hidden',
          }}
        >
          {/* Inner content is keyed by the centered match (or 'default').
              When the key changes, the old node fades+slides out, the new
              one fades+slides in — same elegant transition iOS uses for
              changing nav titles. */}
          <Animated.View
            key={centeredMatch?.id ?? 'default'}
            entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}
            exiting={FadeOut.duration(160).easing(Easing.in(Easing.cubic))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            {centeredMatch ? (
              <>
                <TeamCrest team={LIGAMX[centeredMatch.home]} size={18} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper }}>
                  {pillLabel}
                </Text>
                <TeamCrest team={LIGAMX[centeredMatch.away]} size={18} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mist, marginLeft: 4 }}>
                  · {pillSub}
                </Text>
              </>
            ) : (
              <>
                <View
                  style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: accentColor,
                  }}
                />
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.paper }}>
                  {pillLabel}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mist }}>
                  · {pillSub}
                </Text>
              </>
            )}
          </Animated.View>
        </View>
      </View>

      {/* ── SCROLLABLE region: matches only ───────────────────
          The pill above is fixed; matches scroll into and out of view
          here. A soft gradient overlay at the top fades the cards out
          before they reach the pill, giving the impression that the
          pill is "consuming" them as they pass — a more premium feel
          than a hard line divider. */}
      <View style={{ flex: 1, position: 'relative' }}>
        <ScrollView
          // 64ms ≈ 15 fps for the JS-side pill update — plenty smooth for a
          // textual badge while keeping React work off the scroll path so
          // iOS doesn't snap the scroll back when re-renders happen mid-fling.
          scrollEventThrottle={64}
          onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {matchesLoading ? (
            <ActivityIndicator color={colors.paper2} style={{ marginTop: 12 }} />
          ) : leagueMatches.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.paper2, textAlign: 'center', paddingVertical: 20 }}>
              No hay partidos próximos.
            </Text>
          ) : (
            leagueMatches.map((m) => (
              <View
                key={m.id}
                onLayout={(e) =>
                  recordPosition(m.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height)
                }
              >
                <MatchComparisonCard
                  match={m}
                  groupId={groupId!}
                  expanded={expandedMatchId === m.id}
                  onToggle={() => toggleExpand(m.id)}
                  focusedMember={focusedMember}
                  meId={user?.id ?? null}
                  isCentered={m.id === centeredMatchId}
                  accentColor={accentColor}
                />
              </View>
            ))
          )}
        </ScrollView>

        {/* Top fade — solid screen color at the very top → transparent
            ~24px down. Matches fade out as they scroll past the pill. */}
        <LinearGradient
          colors={[colors.s900, 'rgba(10,11,31,0)']}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 22,
          }}
        />
      </View>
    </ScreenContainer>
  );
}

// ─── Wheel member avatar ──────────────────────────────────────

interface WheelMemberProps {
  member:           GroupMember;
  index:            number;
  total:            number;
  cx:               number;
  cy:               number;
  radius:           number;
  rotation:         SharedValue<number>;
  pulseScale:       SharedValue<number>;
  focusedIdxShared: SharedValue<number>;
  accentColor:      string;
  groupAccent:      string;
  onPress:          () => void;
  isMe:             boolean;
}

function WheelMember({
  member, index, total, cx, cy, radius, rotation,
  pulseScale, focusedIdxShared,
  accentColor, groupAccent, onPress, isMe,
}: WheelMemberProps) {
  const SIZE = 50;
  const HALF = SIZE / 2;

  // Position around the wheel center based on the shared rotation.
  const positionStyle = useAnimatedStyle(() => {
    const angle = TOP_ANGLE + (index * TAU / total) + rotation.value;
    return {
      position: 'absolute',
      left: cx + radius * Math.cos(angle) - HALF,
      top:  cy + radius * Math.sin(angle) - HALF,
    };
  });

  // Proximity to the top of the wheel (0 = far away, 1 = exactly at top).
  // We use it to interpolate the border color and the avatar scale so the
  // focused member "lights up" gradually as they enter the focus arc,
  // instead of switching on/off when they cross the snap threshold.
  const idleBorder = isMe ? colors.gold : 'rgba(255,255,255,0.18)';
  const glowStyle = useAnimatedStyle(() => {
    'worklet';
    const angle = TOP_ANGLE + (index * TAU / total) + rotation.value;
    // Distance (in radians) from the top angle, wrapped to [0, π].
    let diff = angle - TOP_ANGLE;
    diff = ((diff + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const distance = Math.abs(diff);
    // The focus zone extends ±π/4 (45°) each side of top. Anything inside
    // ramps up; anything outside reads idle.
    const FOCUS_RANGE = Math.PI / 4;
    const proximity = Math.max(0, 1 - distance / FOCUS_RANGE);
    const eased = proximity * proximity * (3 - 2 * proximity); // smoothstep

    // Snap-pulse: only the avatar at `focusedIdxShared` gets the pulse;
    // for everyone else the multiplier stays at 1. The combined scale
    // is "focus zoom" × "pulse" so the focused member starts a hair
    // bigger AND gets the extra punch when it lands.
    const isFocused = focusedIdxShared.value === index;
    const pulse = isFocused ? pulseScale.value : 1;

    return {
      borderWidth: 1.5 + eased * 1.5,
      borderColor: interpolateColor(eased, [0, 1], [idleBorder, accentColor]),
      transform: [{ scale: (1 + eased * 0.08) * pulse }],
    };
  });

  return (
    <Animated.View style={positionStyle}>
      <Pressable onPress={onPress} hitSlop={6}>
        <Animated.View
          style={[
            {
              width: SIZE,
              height: SIZE,
              borderRadius: HALF,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.s900,
              // Always-on subtle accent glow — opacity is uniform; the
              // brighter border color when focused gives the perceived
              // glow ramp without us having to animate shadowOpacity
              // (which iOS does NOT interpolate smoothly).
              ...Platform.select({
                ios: { shadowColor: accentColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 6 },
                android: { elevation: 4 },
              }),
            },
            glowStyle,
          ]}
        >
          <Avatar
            initials={initialsOf(member.profile?.name)}
            size={SIZE - 8}
            bg={groupAccent}
            imageUrl={member.profile?.avatar_url}
          />
          {isMe ? (
            <View
              style={{
                position: 'absolute',
                bottom: -5,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 9999,
                backgroundColor: colors.gold,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: '900', color: colors.ink }}>YOU</Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Match comparison card ────────────────────────────────────

interface CardProps {
  match:          Match;
  groupId:        string;
  expanded:       boolean;
  onToggle:       () => void;
  focusedMember:  GroupMember | undefined;
  meId:           string | null;
  isCentered:     boolean;
  accentColor:    string;
}

function MatchComparisonCardImpl({
  match, groupId, expanded, onToggle, focusedMember, meId, isCentered, accentColor,
}: CardProps) {
  const home = LIGAMX[match.home];
  const away = LIGAMX[match.away];

  // Spring value: 0 = fully collapsed, 1 = fully expanded.
  // Initialized from the current `expanded` prop so if the card mounts
  // already-expanded (rare but possible) it starts in the right state.
  const expandAnim = useSharedValue(expanded ? 1 : 0);
  useEffect(() => {
    expandAnim.value = withSpring(expanded ? 1 : 0, {
      damping: 22,
      stiffness: 170,
      mass: 0.7,
    });
  }, [expanded, expandAnim]);

  // Expanded comparison section: fades + slides in from below.
  const expandedSectionStyle = useAnimatedStyle(() => ({
    opacity: expandAnim.value,
    // maxHeight caps the height so it can animate smoothly from 0.
    // 260 is comfortably larger than the tallest possible content (~2 rows).
    maxHeight: expandAnim.value * 260,
    overflow: 'hidden',
  }));

  // Collapsed footer: fades + collapses upward as the card opens.
  const collapsedFooterStyle = useAnimatedStyle(() => ({
    opacity: 1 - expandAnim.value,
    maxHeight: (1 - expandAnim.value) * 48,
    overflow: 'hidden',
  }));

  // Fetch picks only when expanded — keeps the list cheap at rest.
  const { data: picks = {} } = useMatchPicksInGroup(expanded ? match.id : undefined, groupId);

  const focusedPick = focusedMember ? picks[focusedMember.user_id] : undefined;
  const myPick      = meId ? picks[meId] : undefined;
  const isFocusedMe = focusedMember?.user_id === meId;

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        backgroundColor: colors.s800,
        borderRadius: 16,
        // Border width is constant — only colour changes to avoid layout shifts.
        borderWidth: 1.5,
        borderColor: isCentered ? accentColor + 'AA' : 'rgba(255,255,255,0.04)',
        padding: 14,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* ── Header row — always visible ──────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TeamCrest team={home} size={28} />
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: colors.paper, marginTop: 4 }}>
            {home.name}
          </Text>
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.mist }}>
            {match.kickoff}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '900', color: colors.paper2, marginTop: 2 }}>
            VS
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TeamCrest team={away} size={28} />
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: colors.paper, marginTop: 4 }}>
            {away.name}
          </Text>
        </View>
      </View>

      {/* ── Collapsed footer — visible at rest, fades away on expand ── */}
      <Animated.View style={collapsedFooterStyle}>
        <View
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.04)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mist }}>
            Liga MX · {match.round}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: accentColor }}>
            {match.status === 'finished' ? 'Final ›' : 'Toca para comparar ›'}
          </Text>
        </View>
      </Animated.View>

      {/* ── Expanded comparison — fades + grows in on tap ─────── */}
      <Animated.View style={expandedSectionStyle}>
        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.06)',
            gap: 8,
          }}
        >
          {focusedMember && !isFocusedMe ? (
            <ComparisonRow
              label={focusedMember.profile?.name?.split(' ')[0] ?? 'Otro'}
              prediction={focusedPick?.prediction}
              home={match.home}
              away={match.away}
              tint={accentColor}
            />
          ) : null}
          <ComparisonRow
            label="Tu apuesta"
            prediction={myPick?.prediction}
            home={match.home}
            away={match.away}
            tint={colors.gold}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// Memoized so plain scroll re-renders of the parent (caused by the pill
// updating its centered match) don't redraw every card. Cards only
// re-render when their own props actually change.
const MatchComparisonCard = memo(MatchComparisonCardImpl);

function ComparisonRow({
  label, prediction, home, away, tint,
}: {
  label: string;
  prediction: 'home' | 'draw' | 'away' | undefined;
  home: TeamCode;
  away: TeamCode;
  tint: string;
}) {
  const hasPick = !!prediction;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: hasPick ? tint + '15' : 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: hasPick ? tint + '50' : 'rgba(255,255,255,0.06)',
      }}
    >
      <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: colors.paper }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '900', color: hasPick ? tint : colors.mist }}>
        {predLabel(prediction, home, away)}
      </Text>
    </View>
  );
}

// ─── Sonar ring ───────────────────────────────────────────────
//
// Anchored at the focused-member resting position (top of the wheel).
// `progress` 0 → 1:
//   • size scales from the avatar's diameter up to ~3×
//   • opacity ramps 0.55 → 0 so the ring fades as it grows
// Rendered with a transparent fill + accent-coloured border so two of
// them stacked feel like concentric sonar pings rather than solid blobs.

interface SonarRingProps {
  cx:       number;
  topY:     number;
  progress: SharedValue<number>;
  color:    string;
}

function SonarRing({ cx, topY, progress, color }: SonarRingProps) {
  // Match the WheelMember avatar size (50px) so the ring grows out of
  // it instead of appearing detached.
  const START = 50;
  const END   = 150;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const size = START + (END - START) * p;
    // Hide entirely at rest (p === 0) so the ring doesn't show as a
    // static circle behind the avatar between snaps.
    const opacity = p === 0 ? 0 : 0.55 * (1 - p);
    return {
      position: 'absolute',
      left: cx - size / 2,
      top:  topY - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 2,
      borderColor: color,
      opacity,
    };
  });

  return <Animated.View pointerEvents="none" style={style} />;
}

// ─── SVG helpers ──────────────────────────────────────────────

/**
 * Build an SVG arc path between two angles (degrees).
 * 0° = 3 o'clock, increases clockwise (SVG convention).
 */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const start = { x: cx + r * Math.cos(toRad(endDeg)),   y: cy + r * Math.sin(toRad(endDeg))   };
  const end   = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
  const large = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}
