import { useEffect, useMemo, useState } from 'react';
import {
  View, Pressable, ScrollView, Platform, useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  FadeInDown, Easing, runOnJS,
} from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { TeamCrest } from './TeamCrest';
import { Icon } from './Icon';
import { Text, colors } from '../design-system';
import { LIGAMX } from '../data';
import type { Match, TeamCode } from '../types';
import type { GroupMember } from '../lib/queries/groups';
import type { PickWithResult } from '../lib/queries/picks';

// ─── Types ────────────────────────────────────────────────────

interface MatchPicksSheetProps {
  // No `visible` prop — the parent controls mount/unmount with a key tied
  // to the match id. While mounted the sheet is always "visible"; on close
  // we run the dismiss spring, then call onClose to let the parent unmount.
  match:     Match;
  members:   GroupMember[];
  picks:     Record<string, PickWithResult>;
  loading:   boolean;
  meId:      string | null;
  accentColor: string;
  /** When true and the match hasn't started, other members' picks are
      hidden by RLS — we show a lock instead of a misleading "Sin pick". */
  hidePicksUntilKickoff: boolean;
  onClose:   () => void;
}

type LiveStatus =
  | { kind: 'nopick' }
  | { kind: 'pending' }                    // upcoming match, has pick
  | { kind: 'winning'; lead: number }      // live, going right
  | { kind: 'losing';  deficit: number }   // live, going wrong
  | { kind: 'drawing' }                    // live, currently drawing
  | { kind: 'correct'; points: number }    // finished correctly
  | { kind: 'wrong' };                     // finished wrong

// ─── Helpers ──────────────────────────────────────────────────

function initialsOf(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function predictionLabel(p: 'home' | 'draw' | 'away', home: TeamCode, away: TeamCode): string {
  if (p === 'home') return LIGAMX[home]?.name ?? 'Local';
  if (p === 'away') return LIGAMX[away]?.name ?? 'Visita';
  return 'Empate';
}

function computeStatus(
  match: Match,
  pick: PickWithResult | undefined,
): LiveStatus {
  if (!pick) return { kind: 'nopick' };

  if (match.status === 'finished') {
    if (pick.correct === true) return { kind: 'correct', points: pick.points };
    return { kind: 'wrong' };
  }

  // Live: judge against current score
  if (match.status === 'live' && match.score) {
    const [h, a] = match.score;
    if (pick.prediction === 'home') {
      if (h > a)  return { kind: 'winning', lead: h - a };
      if (h < a)  return { kind: 'losing',  deficit: a - h };
      return { kind: 'drawing' };
    }
    if (pick.prediction === 'away') {
      if (a > h)  return { kind: 'winning', lead: a - h };
      if (a < h)  return { kind: 'losing',  deficit: h - a };
      return { kind: 'drawing' };
    }
    // draw pick
    if (h === a) return { kind: 'winning', lead: 0 };
    return { kind: 'losing', deficit: Math.abs(h - a) };
  }

  // upcoming, has pick
  return { kind: 'pending' };
}

// Returns { fg, bg, border, dot } based on status — used by the prediction chip
function statusColors(s: LiveStatus, accent: string) {
  switch (s.kind) {
    case 'nopick':
      return { fg: colors.mist,  bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };
    case 'pending':
      return { fg: accent,       bg: accent + '15',            border: accent + '50' };
    case 'winning':
      return { fg: '#34d399',    bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.50)' };
    case 'losing':
      return { fg: '#f87171',    bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.35)' };
    case 'drawing':
      return { fg: colors.gold,  bg: 'rgba(212,175,55,0.10)',  border: 'rgba(212,175,55,0.40)' };
    case 'correct':
      return { fg: '#34d399',    bg: 'rgba(52,211,153,0.16)',  border: 'rgba(52,211,153,0.55)' };
    case 'wrong':
      return { fg: '#f87171',    bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.30)' };
  }
}

function statusSublabel(s: LiveStatus): string | null {
  switch (s.kind) {
    case 'nopick':   return 'Sin pick';
    case 'pending':  return 'Esperando partido';
    case 'winning':  return 'Va ganando';
    case 'losing':   return 'Va perdiendo';
    case 'drawing':  return 'Empate';
    case 'correct':  return `+${s.points} pts`;
    case 'wrong':    return 'Falló';
  }
}

// ─── Component ────────────────────────────────────────────────

export function MatchPicksSheet({
  match, members, picks, loading, meId, accentColor, hidePicksUntilKickoff, onClose,
}: MatchPicksSheetProps) {
  const { height: screenH } = useWindowDimensions();

  // Sheet starts off-screen and slides up. We drive everything with one
  // shared value (translateY) so the spring + drag + dismiss can all
  // share the same physics. Initial value is screenH because the parent
  // keys us per match — every mount is a fresh slide-up from the bottom.
  const translateY = useSharedValue(screenH);

  // Slide up on mount. The parent uses key={match.id} on us, so this
  // effect fires exactly once per open with the value starting at screenH.
  useEffect(() => {
    translateY.value = withSpring(0, {
      damping: 22,
      stiffness: 220,
      mass: 0.95,
    });
  }, [translateY]);

  // Gate the picks rows behind a one-tick delay so they ALWAYS mount AFTER
  // the sheet container itself has mounted — never on the same frame.
  //
  // Why: Reanimated's `entering` animation is unreliable when a node mounts
  // in the very same commit as one of its ancestors (the sheet). On the
  // first open the rows happened to mount late (after the async picks query
  // resolved) so the stagger played; on subsequent opens the query was
  // cached and the rows mounted instantly alongside the sheet → Reanimated
  // skipped their entering animation. Forcing the rows to appear one frame
  // later makes the stagger fire deterministically on every open.
  const [rowsReady, setRowsReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRowsReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Sort members: current user first, then by points desc so the most
  // active/relevant members are visible without scrolling.
  const orderedMembers = useMemo(() => {
    const sorted = [...members].sort((a, b) => b.points - a.points);
    if (!meId) return sorted;
    const meIdx = sorted.findIndex((m) => m.user_id === meId);
    if (meIdx <= 0) return sorted;
    const me = sorted[meIdx];
    return [me, ...sorted.slice(0, meIdx), ...sorted.slice(meIdx + 1)];
  }, [members, meId]);

  function closeAnimated() {
    translateY.value = withSpring(
      screenH,
      { damping: 28, stiffness: 200, mass: 0.9 },
      (finished) => {
        'worklet';
        if (finished) runOnJS(onClose)();
      },
    );
  }

  // Pan: drag down to dismiss; pulls the sheet with the finger and either
  // releases back to 0 or commits to onClose if pulled past the threshold
  // or flicked with enough velocity.
  const dragGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])   // require a real vertical intent before grabbing
    .onUpdate((e) => {
      'worklet';
      // Only allow dragging DOWN. Upward translation gets clamped to 0 with
      // mild rubber-band so it feels physical instead of locked.
      const dy = e.translationY;
      translateY.value = dy > 0 ? dy : dy * 0.08;
    })
    .onEnd((e) => {
      'worklet';
      const dy = e.translationY;
      const vy = e.velocityY;
      const shouldClose = dy > 130 || vy > 900;
      if (shouldClose) {
        translateY.value = withSpring(
          screenH,
          { damping: 28, stiffness: 200, mass: 0.9 },
          (finished) => {
            'worklet';
            if (finished) runOnJS(onClose)();
          },
        );
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220, mass: 0.95 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Backdrop opacity follows translateY so when the user drags the sheet
  // down, the backdrop dims along with it — gives the sense the sheet is
  // pulling the dark layer with it.
  const backdropStyle = useAnimatedStyle(() => {
    const p = 1 - Math.min(1, Math.max(0, translateY.value / screenH));
    return { opacity: p * 0.72 };
  });

  const home   = LIGAMX[match.home];
  const away   = LIGAMX[match.away];
  const status = match.status;
  const score  = match.score;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {/* Backdrop — tap to dismiss. Animated so it fades with the sheet. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000' },
          backdropStyle,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated} />
      </Animated.View>

      {/* The sheet itself. Sits at the bottom, takes ~88% of screen height. */}
      <GestureDetector gesture={dragGesture}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              height: screenH * 0.86,
              backgroundColor: colors.s900,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderTopWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 24,
                },
                android: { elevation: 24 },
              }),
            },
            sheetStyle,
          ]}
        >
          {/* Drag handle — visual affordance for swipe-down-to-dismiss */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.18)',
              }}
            />
          </View>

          {/* Header — match summary */}
          <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: colors.mist,
                letterSpacing: 1.2,
                marginBottom: 8,
              }}
            >
              PICKS DEL GRUPO
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <TeamCrest team={home} size={42} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13, fontWeight: '900',
                    color: colors.paper, marginTop: 6,
                  }}
                >
                  {home.name}
                </Text>
              </View>

              <View style={{ alignItems: 'center', paddingHorizontal: 4 }}>
                {status !== 'upcoming' && score ? (
                  <Text
                    style={{
                      fontSize: 26, fontWeight: '900',
                      color: colors.paper, letterSpacing: 1,
                    }}
                  >
                    {score[0]} – {score[1]}
                  </Text>
                ) : (
                  <Text
                    style={{
                      fontSize: 18, fontWeight: '900',
                      color: colors.paper2, letterSpacing: 1,
                    }}
                  >
                    VS
                  </Text>
                )}
                <View
                  style={{
                    marginTop: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor:
                      status === 'live'     ? 'rgba(248,113,113,0.12)' :
                      status === 'finished' ? 'rgba(255,255,255,0.05)' :
                                              accentColor + '15',
                    borderWidth: 1,
                    borderColor:
                      status === 'live'     ? 'rgba(248,113,113,0.45)' :
                      status === 'finished' ? 'rgba(255,255,255,0.08)' :
                                              accentColor + '40',
                  }}
                >
                  {status === 'live' ? (
                    <View
                      style={{
                        width: 6, height: 6, borderRadius: 3,
                        backgroundColor: '#f87171',
                      }}
                    />
                  ) : null}
                  <Text
                    style={{
                      fontSize: 10, fontWeight: '900',
                      color:
                        status === 'live'     ? '#f87171' :
                        status === 'finished' ? colors.mist :
                                                accentColor,
                      letterSpacing: 0.8,
                    }}
                  >
                    {status === 'live'     ? 'EN VIVO' :
                     status === 'finished' ? 'FINAL'  :
                                             match.kickoff.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <TeamCrest team={away} size={42} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13, fontWeight: '900',
                    color: colors.paper, marginTop: 6,
                  }}
                >
                  {away.name}
                </Text>
              </View>
            </View>

            <Text
              style={{
                marginTop: 14,
                fontSize: 11, fontWeight: '700',
                color: colors.mist, textAlign: 'center',
                letterSpacing: 0.4,
              }}
            >
              Liga MX · {match.round}
            </Text>

            {/* Locked notice — only when picks are hidden pre-kickoff. */}
            {hidePicksUntilKickoff && match.status === 'upcoming' ? (
              <View
                style={{
                  marginTop: 12,
                  alignSelf: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 9999,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <Icon name="lock" size={11} color={colors.mist} />
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.mist, letterSpacing: 0.2 }}>
                  Los picks se revelan al iniciar el partido
                </Text>
              </View>
            ) : null}
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              marginHorizontal: 22,
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}
          />

          {/* Picks list — staggered entrance */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 40,
              gap: 8,
            }}
            showsVerticalScrollIndicator={false}
          >
            {loading || !rowsReady ? (
              <Text
                style={{
                  color: colors.mist, fontSize: 12,
                  textAlign: 'center', paddingVertical: 24,
                }}
              >
                Cargando picks…
              </Text>
            ) : orderedMembers.length === 0 ? (
              <Text
                style={{
                  color: colors.mist, fontSize: 12,
                  textAlign: 'center', paddingVertical: 24,
                }}
              >
                No hay miembros en este grupo.
              </Text>
            ) : (
              orderedMembers.map((m, i) => {
                const pick   = picks[m.user_id];
                const isMe   = m.user_id === meId;

                // Before kickoff, when the group hides picks, OTHER members'
                // picks aren't readable (RLS returns no row). Show a lock so
                // it's clear the pick exists but is hidden — not "Sin pick".
                const matchStarted = match.status !== 'upcoming';
                const locked = !isMe && hidePicksUntilKickoff && !matchStarted;

                const s      = computeStatus(match, pick);
                const sc     = locked
                  ? { fg: colors.mist, bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' }
                  : statusColors(s, accentColor);
                const subLbl = locked ? 'Se revela al iniciar' : statusSublabel(s);

                return (
                  <Animated.View
                    // The parent re-mounts us per match, so user_id alone
                    // is enough — but we keep match.id in the key as
                    // belt-and-suspenders in case the parent strategy
                    // ever changes.
                    key={`${match.id}-${m.user_id}`}
                    entering={FadeInDown
                      .delay(Math.min(i, 10) * 50)
                      .duration(380)
                      .easing(Easing.out(Easing.cubic))}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 14,
                        backgroundColor: isMe
                          ? 'rgba(212,175,55,0.06)'
                          : 'rgba(255,255,255,0.025)',
                        borderWidth: 1,
                        borderColor: isMe
                          ? 'rgba(212,175,55,0.30)'
                          : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Avatar
                        initials={initialsOf(m.profile?.name)}
                        size={40}
                        bg={accentColor}
                        imageUrl={m.profile?.avatar_url}
                      />

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 13, fontWeight: '800',
                              color: colors.paper,
                              maxWidth: '85%',
                            }}
                          >
                            {m.profile?.name ?? '—'}
                          </Text>
                          {isMe ? (
                            <View
                              style={{
                                paddingHorizontal: 6, paddingVertical: 1,
                                borderRadius: 9999,
                                backgroundColor: colors.gold,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 8, fontWeight: '900',
                                  color: colors.ink,
                                }}
                              >
                                YOU
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {subLbl ? (
                          <View
                            style={{
                              flexDirection: 'row', alignItems: 'center',
                              gap: 5, marginTop: 2,
                            }}
                          >
                            {s.kind === 'winning' || s.kind === 'losing' || s.kind === 'drawing' ? (
                              <View
                                style={{
                                  width: 5, height: 5, borderRadius: 3,
                                  backgroundColor: sc.fg,
                                }}
                              />
                            ) : null}
                            <Text
                              style={{
                                fontSize: 11, fontWeight: '700',
                                color: sc.fg,
                              }}
                            >
                              {subLbl}
                            </Text>
                          </View>
                        ) : null}

                        {/* Predicted score + scorers (when visible) */}
                        {!locked && pick && (pick.homeGoals != null || pick.scorers.length > 0) ? (
                          <View style={{ marginTop: 3, gap: 1 }}>
                            {pick.homeGoals != null && pick.awayGoals != null ? (
                              <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.paper2 }}>
                                Marcador {pick.homeGoals}-{pick.awayGoals}
                              </Text>
                            ) : null}
                            {pick.scorers.length > 0 ? (
                              <Text numberOfLines={1} style={{ fontSize: 10.5, color: colors.mist }}>
                                ⚽ {pick.scorers.map((sp) => sp.name).join(', ')}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>

                      {/* Prediction chip on the right */}
                      <View
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6,
                          borderRadius: 9999,
                          backgroundColor: sc.bg,
                          borderWidth: 1,
                          borderColor: sc.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {locked ? (
                          <Icon name="lock" size={11} color={sc.fg} />
                        ) : s.kind === 'correct' ? (
                          <Icon name="check" size={11} color={sc.fg} />
                        ) : s.kind === 'wrong' ? (
                          <Icon name="close" size={11} color={sc.fg} />
                        ) : null}
                        <Text
                          style={{
                            fontSize: 12, fontWeight: '900', color: sc.fg,
                          }}
                        >
                          {locked
                            ? 'Oculto'
                            : pick
                              ? predictionLabel(pick.prediction, match.home, match.away)
                              : '—'}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
