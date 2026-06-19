import { useEffect, useState, useMemo, useRef, type ReactNode } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withRepeat, withDelay, Easing,
  FadeIn, FadeOut, type SharedValue,
} from 'react-native-reanimated';
import {
  ScreenContainer, TopBar, CButton, TeamCrest, Icon, Jersey, ScoreWheel, WHEEL_ITEM_H,
  AnimatedNumber, StepProgress, Text, colors,
} from '../../src/components';
import { LIGAMX } from '../../src/data';
import { useAccent } from '../../src/lib/tweaks';
import type { TeamCode } from '../../src/types';
import {
  useMatch, useMyGroups, useMyMatchPickDetail, useSubmitPick, useMatchLineup,
} from '../../src/lib/queries';
import type { Prediction, LineupEntry } from '../../src/lib/queries';

// Indicative point values (final scoring TBD). One source of truth used by
// BOTH the live "pts esperados" pill on the score step AND the summary, so
// the number the user sees while picking matches the summary total.
const PTS = { winner: 10, draw: 15, exactScore: 25, scorer: 15 };
// Money-line pricing — flat, by commitment level:
//   • Single (one team, or draw alone): 10 pts.
//   • Double chance (team + draw): 5 pts — covers 2 of 3 outcomes.
const POT_MONEYLINE    = 10;
const POT_DOUBLECHANCE = 5;

type Outcome = TeamCode | 'DRAW';

/**
 * Maximum potential points for a pick — what the "Hasta +X pts" / "pts
 * esperados" badges display. This is the BEST case (every predicted goal
 * scored by a predicted scorer), so it's the same on the score step (before
 * scorers are chosen) and the summary.
 *
 *   • Money-line:  single = 10, double-chance = 5.
 *   • Exact score: winner/draw base + exact-score bonus + one scorer bonus
 *     per predicted goal (so a 3-0 can still earn 3 scorer hits).
 */
function maxPotentialPoints(opts: {
  moneyline: boolean; withDraw: boolean; isDraw: boolean;
  homeGoals: number; awayGoals: number;
}): number {
  const { moneyline, withDraw, isDraw, homeGoals, awayGoals } = opts;
  if (moneyline) {
    return withDraw && !isDraw ? POT_DOUBLECHANCE : POT_MONEYLINE;
  }
  const base = isDraw ? PTS.draw : PTS.winner;
  const totalGoals = Math.max(0, homeGoals) + Math.max(0, awayGoals);
  return base + PTS.exactScore + totalGoals * PTS.scorer;
}

/**
 * Money-line winner choice driven by the crest / empate tap when both
 * wheels sit on the unset (`-`) state. We persist this independently of
 * the score so the user can scroll wheels back to `-` `-` and the tapped
 * crest re-enlarges from memory.
 */
type MoneylineWinner = 'home' | 'away' | 'draw';

function outcomeOf(h: number, a: number, homeCode: TeamCode, awayCode: TeamCode): Outcome {
  if (h > a) return homeCode;
  if (h < a) return awayCode;
  return 'DRAW';
}
function predictionOf(h: number, a: number): Prediction {
  if (h > a) return 'home';
  if (h < a) return 'away';
  return 'draw';
}

/** Both wheels at the unset (`-`) sentinel → money-line mode is active. */
function isUnset(h: number, a: number): boolean {
  return h < 0 && a < 0;
}

/** Convert money-line winner to a Prediction for submission. */
function moneylineToPrediction(w: MoneylineWinner): Prediction {
  return w;
}


export default function MakePick() {
  const { id: matchId, groupId: lockedGroupId, groupIds: groupIdsParam } =
    useLocalSearchParams<{ id: string; groupId?: string; groupIds?: string }>();
  const router = useRouter();

  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { data: groups = [], isLoading: groupsLoading } = useMyGroups();
  const { data: detailByGroup = {} } = useMyMatchPickDetail(matchId);
  const { data: lineup } = useMatchLineup(matchId);
  const submitPick = useSubmitPick();
  const { accentColor } = useAccent();

  const isLockedToGroup = !!lockedGroupId;

  const homeCode = (match?.home ?? 'AME') as TeamCode;
  const awayCode = (match?.away ?? 'GDL') as TeamCode;
  const h = LIGAMX[homeCode];
  const a = LIGAMX[awayCode];

  // Groups this pick will count for — driven by URL params:
  //   • `groupId=...` (singular): locked to that one group
  //   • `groupIds=g1,g2,...` (plural CSV): explicit multi-group selection
  //     coming from the match screen drawer
  //   • neither: fall back to all the user's groups
  const targetGroupIds = useMemo<string[]>(() => {
    if (isLockedToGroup) return [lockedGroupId!];
    if (groupIdsParam) {
      const ids = groupIdsParam.split(',').map((s) => s.trim()).filter(Boolean);
      // Defensive: drop any IDs the user is no longer a member of.
      const valid = new Set(groups.map((g) => g.id));
      return ids.filter((id) => valid.has(id));
    }
    return groups.map((g) => g.id);
  }, [isLockedToGroup, lockedGroupId, groupIdsParam, groups]);

  // ─── Wizard state ───────────────────────────────────────────
  // Step indices: 0=Score, 1=Scorers (skipped if 0-0), 2=Summary.
  // (The old "winner picker" step was killed — the score wheel implies the
  // winner now, and Circls selection moved to the match screen drawer.)
  const [step, setStep] = useState(0);
  // -1 represents the "unset" `-` slot. Both starting at -1 means the
  // user lands in money-line mode (decision via crest / empate tap).
  const [homeGoals, setHomeGoals] = useState(-1);
  const [awayGoals, setAwayGoals] = useState(-1);
  // Money-line selection. Persists across wheel spins so scrolling back
  // to `-` `-` restores the previously highlighted crest.
  const [pickedWinner, setPickedWinner] = useState<MoneylineWinner | null>(null);
  // Double-chance modifier — when true, the empate pill is part of the
  // money-line selection ("Gana X o Empate"). Only meaningful when
  // `pickedWinner` is 'home' or 'away'.
  const [withDraw, setWithDraw] = useState(false);
  const [scorerIds, setScorerIds] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Seed score + scorers from an existing pick (once data lands).
  useEffect(() => {
    if (seeded || matchLoading || groupsLoading) return;
    const detail = isLockedToGroup
      ? detailByGroup[lockedGroupId!]
      : Object.values(detailByGroup)[0];
    if (detail) {
      const seedH = detail.homeGoals ?? -1;
      const seedA = detail.awayGoals ?? -1;
      setHomeGoals(seedH);
      setAwayGoals(seedA);
      setScorerIds(detail.scorerIds);
      // If the seed is money-line (no goals), recover the winner + the
      // double-chance modifier from the saved pick so both the crest
      // re-enlarges and the empate pill restores its state on entry.
      if (seedH < 0 && seedA < 0) {
        setPickedWinner(detail.prediction as MoneylineWinner);
        setWithDraw(detail.withDraw);
      }
    }
    setSeeded(true);
  }, [seeded, matchLoading, groupsLoading, detailByGroup, isLockedToGroup, lockedGroupId]);

  // ─── Derived bet mode + winner ──────────────────────────────
  const moneyline = isUnset(homeGoals, awayGoals);
  // For the summary step + confirm label. In exact mode we derive from
  // the score; in money-line mode we use the tapped crest.
  const selected: Outcome = moneyline
    ? (pickedWinner === 'home' ? homeCode
       : pickedWinner === 'away' ? awayCode
       : 'DRAW')
    : outcomeOf(homeGoals, awayGoals, homeCode, awayCode);

  // ─── Derived ────────────────────────────────────────────────
  const hasScorers = homeGoals > 0 || awayGoals > 0;
  const isLocked = match ? match.status !== 'upcoming' : false;

  const homeLineup: LineupEntry[] = match?.home_team_id ? (lineup?.byTeam[match.home_team_id] ?? []) : [];
  const awayLineup: LineupEntry[] = match?.away_team_id ? (lineup?.byTeam[match.away_team_id] ?? []) : [];
  const homePlayerIds = useMemo(() => new Set(homeLineup.map((e) => e.player.id)), [homeLineup]);

  const homeScorerCount = scorerIds.filter((id) => homePlayerIds.has(id)).length;
  const awayScorerCount = scorerIds.length - homeScorerCount;

  // Score setter — winner is derived from `selected`. Keeps the two wheels
  // in a valid state and prunes scorers:
  //   • Entering exact mode: if this wheel moves to a real number while the
  //     other is still on `-`, snap the other to 0. Prevents `3 –` / `– 2`.
  //   • Returning to money-line: if this wheel goes back to `-` while the
  //     other still shows a number, snap the other back to `-` too — both
  //     wheels return to the unset state together (no lingering `– 2`).
  function setScore(side: 'home' | 'away', v: number) {
    let nh = side === 'home' ? v : homeGoals;
    let na = side === 'away' ? v : awayGoals;

    if (v >= 0) {
      // → exact mode: pull the dangling `-` up to 0.
      if (side === 'home' && awayGoals < 0) { setAwayGoals(0); na = 0; }
      else if (side === 'away' && homeGoals < 0) { setHomeGoals(0); nh = 0; }
    } else {
      // → money-line: drag the other wheel back to `-` so we never sit on
      // the invalid `– 2` / `3 –` state.
      if (side === 'home' && awayGoals >= 0) { setAwayGoals(-1); na = -1; }
      else if (side === 'away' && homeGoals >= 0) { setHomeGoals(-1); nh = -1; }
    }

    if (side === 'home') setHomeGoals(v); else setAwayGoals(v);
    pruneScorers(nh, na);
  }

  function pruneScorers(nh: number, na: number) {
    // `-` (negative sentinel) counts as zero goals for the scorers step.
    const safeH = Math.max(0, nh);
    const safeA = Math.max(0, na);
    setScorerIds((prev) => {
      const home = prev.filter((id) => homePlayerIds.has(id)).slice(0, safeH);
      const away = prev.filter((id) => !homePlayerIds.has(id)).slice(0, safeA);
      return [...home, ...away];
    });
  }

  // ─── Money-line taps (crests + empate pill) ────────────────
  function tapCrest(side: 'home' | 'away') {
    if (!moneyline) return; // ignore taps when wheels are set
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPickedWinner((prev) => (prev === side ? null : side));
    // Keep `withDraw` if it was already on — the team flip preserves the
    // "+ Empate" modifier (it's a doble-chance pinned to whichever team
    // is active). Taps that toggle OFF clear `withDraw` as well.
    setWithDraw((prev) => (pickedWinner === side ? false : prev));
  }

  function tapDraw() {
    if (!moneyline) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (pickedWinner === 'home' || pickedWinner === 'away') {
      // Team is active → toggle the double-chance modifier on/off.
      setWithDraw((prev) => !prev);
    } else if (pickedWinner === 'draw') {
      // Empate-solo → deselect.
      setPickedWinner(null);
      setWithDraw(false);
    } else {
      // Nothing selected → empate solo.
      setPickedWinner('draw');
      setWithDraw(false);
    }
  }

  function toggleScorer(playerId: string) {
    const isHome = homePlayerIds.has(playerId);
    setScorerIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      const teamCount = isHome ? homeScorerCount : awayScorerCount;
      const teamMax   = isHome ? homeGoals : awayGoals;
      if (teamCount >= teamMax) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return prev; // can't exceed predicted goals
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      return [...prev, playerId];
    });
  }

  // The user has made a choice on the score step iff they're in exact
  // mode (wheels off `-`) OR they've tapped a crest / the empate pill.
  const scoreReady = !moneyline || pickedWinner !== null;

  // Per-step exit animations. Each shared value drives a synced
  // slide-down + fade-out of that step's content before the wizard
  // transitions to the next one. They reset to 0 right after `setStep`
  // so re-entering the same step shows fresh content (no flash of
  // invisibility on mount).
  const scoreExit   = useSharedValue(0);
  const scorersExit = useSharedValue(0);

  // ─── Navigation ─────────────────────────────────────────────
  // Steps: 0=Score → 1=Scorers (skipped if 0-0 or money-line) → 2=Summary
  function goNext() {
    Haptics.selectionAsync().catch(() => {});
    if (step === 0) {
      // Animate the wheel screen out — wheels/pill/label drop+fade, crests
      // slide back out to their entry edges. Wait the FULL duration before
      // swapping so the animation completes (an early swap unmounted the
      // step mid-flight, which is why it looked cut off).
      scoreExit.value = withTiming(1, { duration: 280, easing: Easing.in(Easing.quad) });
      setTimeout(() => {
        setStep(hasScorers ? 1 : 2);
        scoreExit.value = 0;
      }, 280);
    } else if (step === 1) {
      scorersExit.value = withTiming(1, { duration: 280, easing: Easing.in(Easing.quad) });
      setTimeout(() => {
        setStep(2);
        scorersExit.value = 0;
      }, 280);
    }
  }
  function goBack() {
    if (step === 0) { router.back(); return; }
    Haptics.selectionAsync().catch(() => {});
    if (step === 1) setStep(0);
    else if (step === 2) setStep(hasScorers ? 1 : 0);
  }

  async function handleConfirm() {
    if (isLocked) {
      Alert.alert('Pick bloqueado', 'El partido ya empezó. Ya no puedes hacer ni cambiar tu pick.');
      return;
    }
    const groupIds = targetGroupIds;
    if (groupIds.length === 0) {
      Alert.alert(
        'Selecciona al menos un Circl',
        'Regresa al partido y elige al menos un Circl donde quieras que cuente este pick.',
      );
      return;
    }
    // Bet mode → submission payload.
    //   • Money-line (both wheels `-`): persist null goals + prediction
    //     derived from the tapped crest + the double-chance flag.
    //   • Exact (any wheel ≥ 0): persist score + derived prediction
    //     (no double chance — an exact score is a single outcome).
    let prediction: Prediction;
    let submitHome: number | null;
    let submitAway: number | null;
    let submitWithDraw: boolean;
    if (moneyline) {
      if (!pickedWinner) {
        Alert.alert(
          'Elige tu pick',
          'Toca un escudo, el botón de empate, o gira las ruedas para definir tu marcador.',
        );
        return;
      }
      prediction = moneylineToPrediction(pickedWinner);
      submitHome = null;
      submitAway = null;
      // Double chance only applies when a team (not draw) is the base pick.
      submitWithDraw = withDraw && pickedWinner !== 'draw';
    } else {
      prediction = predictionOf(homeGoals, awayGoals);
      submitHome = homeGoals;
      submitAway = awayGoals;
      submitWithDraw = false;
    }
    try {
      await submitPick.mutateAsync({
        matchId: matchId!, prediction, groupIds,
        homeGoals: submitHome, awayGoals: submitAway,
        scorerPlayerIds: scorerIds, withDraw: submitWithDraw,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push({
        pathname: '/pick/[id]/confirmed',
        params: { id: matchId!, prediction, groupIds: groupIds.join(',') },
      });
    } catch (e: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const msg = e instanceof Error ? e.message : 'No pudimos guardar tu pick.';
      Alert.alert('Error', msg);
    }
  }

  // ─── Loading / not found ────────────────────────────────────
  if (matchLoading || groupsLoading) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Tu pick" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.paper2} />
        </View>
      </ScreenContainer>
    );
  }
  if (!match) {
    return (
      <ScreenContainer theme="dark">
        <TopBar title="Tu pick" onBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.paper2 }}>Partido no encontrado.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const confirmLabel =
    selected === 'DRAW' ? 'Empate' : (LIGAMX[selected as TeamCode]?.name ?? selected);

  // Premium dynamic backdrop — shared across all wizard steps so the
  // backdrop never changes as the user advances through the flow (matches
  // the match screen's gradient too, for continuity end-to-end). Painted
  // through the ScreenContainer.background slot so it covers the safe-area
  // insets — no dark band peeking out under the CTA at the bottom.
  const wizardBg = (
    <LinearGradient
      colors={[colors.s900, '#070912', accentColor + '2E']}
      locations={[0, 0.55, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );

  return (
    <ScreenContainer theme="dark" background={wizardBg}>
      {/* Override the default slide-from-right route transition with a
          crossfade. The match screen and this wizard share the same gradient
          backdrop, so a crossfade reads as the foreground content morphing
          in place (matching the exit animation on the match screen) rather
          than a new screen sliding over. */}
      <Stack.Screen options={{ animation: 'fade', animationDuration: 280 }} />
      <TopBar
        left={
          <Pressable onPress={goBack} hitSlop={8} style={{ marginLeft: -6, padding: 6 }}>
            <Icon name="back" size={22} color={colors.paper} />
          </Pressable>
        }
        center={
          <StepProgress
            steps={hasScorers ? 3 : 2}
            current={!hasScorers && step === 2 ? 1 : step}
          />
        }
        right={
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 6, marginRight: -6 }}>
            <Icon name="close" size={20} color={colors.paper2} />
          </Pressable>
        }
      />

      {step === 0 ? (
        <ScoreStep
          h={h} a={a} homeCode={homeCode} awayCode={awayCode}
          homeGoals={homeGoals} awayGoals={awayGoals}
          onChange={setScore} accentColor={accentColor}
          pickedWinner={pickedWinner} withDraw={withDraw}
          onTapCrest={tapCrest} onTapDraw={tapDraw}
          exitProgress={scoreExit}
        />
      ) : null}

      {step === 1 ? (
        <ScorersStep
          h={h} a={a}
          homeLineup={homeLineup} awayLineup={awayLineup}
          homeGoals={homeGoals} awayGoals={awayGoals}
          scorerIds={scorerIds} onToggle={toggleScorer}
          homeScorerCount={homeScorerCount} awayScorerCount={awayScorerCount}
          exitProgress={scorersExit}
          accentColor={accentColor}
        />
      ) : null}

      {step === 2 ? (
        <SummaryStep
          selected={selected} homeCode={homeCode} awayCode={awayCode}
          h={h} a={a} homeGoals={homeGoals} awayGoals={awayGoals}
          scorerIds={scorerIds} homeLineup={homeLineup} awayLineup={awayLineup}
          homePlayerIds={homePlayerIds}
          groupCount={targetGroupIds.length}
          moneyline={moneyline} withDraw={withDraw}
        />
      ) : null}

      {/* Footer. On step → step transitions the CTA fades + slides down
          in sync with the outgoing content so the bottom area "clears
          first" for the incoming step. Animates on both step 0 → 1/2
          and step 1 → 2 hand-offs. */}
      <FooterContainer step={step} scoreExit={scoreExit} scorersExit={scorersExit}>
        {step < 2 ? (
          <CButton
            variant="primary"
            size="lg"
            full
            lead={<Icon name="forward" size={20} color={colors.paper} />}
            onPress={goNext}
            disabled={isLocked || groups.length === 0 || (step === 0 && !scoreReady)}
          >
            {isLocked
              ? (match.status === 'live' ? 'El partido ya empezó' : 'Pick cerrado')
              : groups.length === 0
              ? 'Únete a un grupo primero'
              : targetGroupIds.length === 0
              ? 'Sin Circls seleccionados'
              : step === 0 && !scoreReady
              ? 'Elige tu pick'
              : step === 0 && !hasScorers
              ? 'Continuar (sin goles)'
              : 'Continuar'}
          </CButton>
        ) : (
          <CButton
            variant="primary"
            size="lg"
            full
            lead={<Icon name={isLocked ? 'lock' : 'check'} size={20} color={colors.paper} />}
            onPress={handleConfirm}
            disabled={submitPick.isPending || isLocked}
          >
            {isLocked ? 'Pick cerrado' : submitPick.isPending ? 'Guardando…' : `Confirmar: ${confirmLabel}`}
          </CButton>
        )}
      </FooterContainer>
    </ScreenContainer>
  );
}

// Footer wrapper that picks the active step's exit signal and pipes it
// into a small translate + fade so the CTA peels off slightly ahead of
// the outgoing content. Reads `scoreExit` on step 0 and `scorersExit` on
// step 1; on summary (step 2) it stays static.
function FooterContainer({
  step, scoreExit, scorersExit, children,
}: {
  step: number;
  scoreExit:   SharedValue<number>;
  scorersExit: SharedValue<number>;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const exit = step === 0 ? scoreExit.value
               : step === 1 ? scorersExit.value
               : 0;
    return {
      opacity: 1 - exit,
      transform: [{ translateY: exit * 30 }],
    };
  });
  return (
    <Animated.View style={[{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }, style]}>
      {children}
    </Animated.View>
  );
}


// ─── Step 0: Score (wheels) ──────────────────────────────────

interface ScoreStepProps {
  h: typeof LIGAMX[TeamCode]; a: typeof LIGAMX[TeamCode];
  homeCode: TeamCode; awayCode: TeamCode;
  homeGoals: number; awayGoals: number;
  onChange: (side: 'home' | 'away', v: number) => void;
  accentColor: string;
  pickedWinner: MoneylineWinner | null;
  withDraw: boolean;
  onTapCrest: (side: 'home' | 'away') => void;
  onTapDraw: () => void;
  /** Wizard-owned exit signal (0 idle, 1 fully exited). Drives the synced
   *  slide-down + fade-out of the entire wheel arena on "Continuar". */
  exitProgress: SharedValue<number>;
}

const CREST_BIG = 132;
// How far the wheels/pill/label drop on exit. The crests cancel this and
// slide horizontally instead (see SlideCrest), so they leave the same way
// they arrived — out the sides.
const SCORE_EXIT_DROP = 60;

function ScoreStep({
  h, a, homeCode, awayCode, homeGoals, awayGoals, onChange, accentColor,
  pickedWinner, withDraw, onTapCrest, onTapDraw, exitProgress,
}: ScoreStepProps) {
  // Whole-step exit — wheels/pill/label drop + fade as a unit. The crests
  // are children too but counteract the drop and exit sideways instead
  // (handled inside SlideCrest via the same exitProgress signal).
  const exitStyle = useAnimatedStyle(() => ({
    opacity: 1 - exitProgress.value,
    transform: [{ translateY: exitProgress.value * SCORE_EXIT_DROP }],
  }));
  // Live values track the wheel mid-scroll so the pill updates as soon as a
  // number crosses the center band — no waiting for momentum to settle.
  const [liveHome, setLiveHome] = useState(homeGoals);
  const [liveAway, setLiveAway] = useState(awayGoals);
  // Whenever the canonical settled value moves (e.g. seeded from cache),
  // resync the live mirrors.
  useEffect(() => { setLiveHome(homeGoals); }, [homeGoals]);
  useEffect(() => { setLiveAway(awayGoals); }, [awayGoals]);

  // Money-line mode: wheels still on the unset (`-`) slot.
  const liveMoneyline = liveHome < 0 && liveAway < 0;

  // Unified potential-points model (same as the summary). In money-line
  // mode with nothing picked yet it's 0 (pill dims). In exact mode it
  // includes the exact-score bonus + a scorer bonus per predicted goal, so
  // "marcador exacto" and "goles de jugadores" are reflected live.
  const pot = liveMoneyline
    ? (pickedWinner
        ? maxPotentialPoints({
            moneyline: true,
            withDraw,
            isDraw: pickedWinner === 'draw',
            homeGoals: 0, awayGoals: 0,
          })
        : 0)
    : maxPotentialPoints({
        moneyline: false, withDraw: false,
        isDraw: liveHome === liveAway,
        homeGoals: liveHome, awayGoals: liveAway,
      });

  // Dynamic label above the Continue button. Communicates exactly what the
  // user is about to commit to. Empty in idle state (Continue disabled).
  const label: { kind: 'idle' | 'team' | 'draw' | 'double' | 'exact-team' | 'exact-draw'; teamName?: string; score?: string } =
    liveMoneyline
      ? (pickedWinner === null
          ? { kind: 'idle' }
          : pickedWinner === 'draw'
            ? { kind: 'draw' }
            : (withDraw
                ? { kind: 'double', teamName: pickedWinner === 'home' ? h.name : a.name }
                : { kind: 'team',   teamName: pickedWinner === 'home' ? h.name : a.name }))
      : (liveHome === liveAway
          ? { kind: 'exact-draw', score: `${liveHome}-${liveAway}` }
          : { kind: 'exact-team',
              teamName: liveHome > liveAway ? h.name : a.name,
              score:    `${liveHome}-${liveAway}` });

  // The empate pill sits ABOVE the upper hairline and only shows while in
  // money-line mode (both wheels at `-`). When a team is selected, the pill
  // glows softly to invite the doble-chance combo. When already part of the
  // selection it sits solid.
  const drawSelected = pickedWinner === 'draw' || withDraw;
  const drawInvite   = (pickedWinner === 'home' || pickedWinner === 'away') && !withDraw;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[{ flex: 1 }, exitStyle]}>
      {/* Dynamic potential-points pill */}
      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderWidth: 1, borderColor: accentColor + '55',
            borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 7,
            opacity: pot === 0 ? 0.45 : 1,
          }}
        >
          <Icon name="sparkle" size={13} color={colors.gold} />
          <AnimatedNumber
            value={pot}
            duration={260}
            suffix=" pts"
            style={{ color: colors.gold, fontWeight: '900', fontSize: 14 }}
          />
        </View>
        <Text style={{ fontSize: 11, color: colors.paper2, marginTop: 6, fontWeight: '600' }}>
          puntos esperados a ganar
        </Text>
      </View>

      {/* Arena. Stack order matters:
            1. Center band (behind everything)
            2. Empate pill ABOVE the upper hairline (positioned absolute)
            3. Wheels themselves
            4. Crests on top so the band passes UNDER the team disc */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {/* Center band stretched across the whole arena, underneath crests */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: '50%', height: WHEEL_ITEM_H, marginTop: -WHEEL_ITEM_H / 2,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: 'rgba(255,255,255,0.14)',
          }}
        />

        {/* Empate pill — only visible while in money-line mode */}
        {liveMoneyline ? (
          <DrawPill
            selected={drawSelected}
            inviting={drawInvite}
            accent={accentColor}
            onPress={onTapDraw}
          />
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ScoreWheel
            value={homeGoals}
            nullable
            onChange={(v) => onChange('home', v)}
            onLiveChange={setLiveHome}
            accent={colors.paper}
          />

          <Text style={{ fontSize: 38, fontWeight: '200', color: 'rgba(255,255,255,0.5)', marginHorizontal: 2 }}>–</Text>

          <ScoreWheel
            value={awayGoals}
            nullable
            onChange={(v) => onChange('away', v)}
            onLiveChange={setLiveAway}
            accent={colors.paper}
          />
        </View>

        {/* Crests rendered AFTER the wheels so they sit on top of the band.
            Tappable in money-line mode; dimmed when the OTHER team is the
            current pick so the contrast is clear. */}
        <SlideCrest
          code={homeCode} side="left"
          selected={liveMoneyline && pickedWinner === 'home'}
          dim={liveMoneyline && pickedWinner === 'away'}
          onPress={liveMoneyline ? () => onTapCrest('home') : undefined}
          exitProgress={exitProgress}
        />
        <SlideCrest
          code={awayCode} side="right"
          selected={liveMoneyline && pickedWinner === 'away'}
          dim={liveMoneyline && pickedWinner === 'home'}
          onPress={liveMoneyline ? () => onTapCrest('away') : undefined}
          exitProgress={exitProgress}
        />
      </View>

      <View style={{ paddingBottom: 8, alignItems: 'center', minHeight: 22 }}>
        {label.kind === 'idle' ? (
          <Text style={{ fontSize: 12, color: colors.paper2, fontWeight: '700' }}>
            Toca un escudo, empate, o gira las ruedas
          </Text>
        ) : label.kind === 'team' ? (
          <Text style={{ fontSize: 13, color: colors.paper, fontWeight: '800' }}>
            Gana <Text style={{ color: accentColor }}>{label.teamName}</Text>
          </Text>
        ) : label.kind === 'draw' ? (
          <Text style={{ fontSize: 13, color: colors.paper, fontWeight: '800' }}>
            <Text style={{ color: accentColor }}>Empate</Text>
          </Text>
        ) : label.kind === 'double' ? (
          <Text style={{ fontSize: 13, color: colors.paper, fontWeight: '800' }}>
            Gana <Text style={{ color: accentColor }}>{label.teamName}</Text>
            {' o '}
            <Text style={{ color: accentColor }}>Empate</Text>
          </Text>
        ) : label.kind === 'exact-team' ? (
          <Text style={{ fontSize: 13, color: colors.paper, fontWeight: '800' }}>
            Gana <Text style={{ color: accentColor }}>{label.teamName}</Text>
            <Text style={{ color: colors.paper2 }}>{'  ·  '}{label.score}</Text>
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: colors.paper, fontWeight: '800' }}>
            <Text style={{ color: accentColor }}>Empate</Text>
            <Text style={{ color: colors.paper2 }}>{'  ·  '}{label.score}</Text>
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

// Floating "Empate" pill above the upper hairline. Three visual states:
//   • idle (nothing tapped):   subtle outline, awaiting attention
//   • inviting (team tapped):  pulsing accent glow → "I'm also tappable!"
//   • selected (in the bet):   solid accent fill
function DrawPill({
  selected, inviting, accent, onPress,
}: { selected: boolean; inviting: boolean; accent: string; onPress: () => void }) {
  // `inviting` (a team is picked, draw not yet added) → the pill's contour
  // glows softly like a neon outline to say "I'm tappable too". We pulse the
  // OPACITY of an accent-colored ring drawn just outside the pill, plus a
  // matching iOS shadow — no scaling, no filled background, so it reads as
  // light rather than a throbbing blob.
  const glow = useSharedValue(inviting ? 1 : 0);
  useEffect(() => {
    if (inviting) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 950, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.15, { duration: 950, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else {
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [inviting, glow]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    shadowOpacity: glow.value * 0.9,
    shadowRadius: 4 + glow.value * 8,
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 0, right: 0,
        top: '50%', marginTop: -WHEEL_ITEM_H / 2 - 38,
        alignItems: 'center',
      }}
    >
      <Pressable onPress={onPress} hitSlop={10}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* Glowing contour ring — only lights up in the inviting state */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: -3, right: -3, top: -3, bottom: -3,
                borderRadius: 9999,
                borderWidth: 1.5,
                borderColor: accent,
                shadowColor: accent,
                shadowOffset: { width: 0, height: 0 },
              },
              ringStyle,
            ]}
          />
          <View
            style={{
              paddingHorizontal: 14, paddingVertical: 6,
              borderRadius: 9999,
              backgroundColor: selected ? accent : 'rgba(0,0,0,0.55)',
              borderWidth: 1,
              borderColor: selected ? accent : 'rgba(255,255,255,0.20)',
            }}
          >
            <Text style={{
              fontSize: 11, fontWeight: '900',
              letterSpacing: 0.5,
              color: selected ? colors.ink : colors.paper,
            }}>
              EMPATE
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// A large team crest that springs in from its screen edge and rests
// partially cut off, with a soft team-colored halo behind it so the harsh
// disc edge melts into the dark background. Tappable in money-line mode
// (parent passes `onPress`); shows a selected/dim treatment that follows
// the user's current crest tap.
function SlideCrest({
  code, side, selected = false, dim = false, onPress, exitProgress,
}: {
  code: TeamCode; side: 'left' | 'right';
  selected?: boolean; dim?: boolean;
  onPress?: () => void;
  exitProgress?: SharedValue<number>;
}) {
  const OFFSCREEN = side === 'left' ? -CREST_BIG * 1.4 : CREST_BIG * 1.4;
  const tx = useSharedValue(OFFSCREEN);
  useEffect(() => {
    tx.value = withSpring(0, { damping: 13, stiffness: 120, mass: 1 });
  }, [tx]);
  // Selected → springy scale-up. Otherwise neutral.
  const sel = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    sel.value = withSpring(selected ? 1 : 0, { damping: 14, stiffness: 200, mass: 0.7 });
  }, [selected, sel]);
  const style = useAnimatedStyle(() => {
    const exit = exitProgress?.value ?? 0;
    return {
      transform: [
        // On exit, slide back out to the entry edge AND cancel the parent
        // step's downward drop so the crest leaves purely horizontally —
        // mirroring its horizontal entrance.
        { translateX: tx.value + exit * OFFSCREEN },
        { translateY: -exit * SCORE_EXIT_DROP },
        { scale: 1 + sel.value * 0.08 },
      ],
      opacity: dim ? 0.45 : 1,
    };
  });

  const team = LIGAMX[code];
  const tappable = !!onPress;

  return (
    <Animated.View
      pointerEvents={tappable ? 'box-none' : 'none'}
      style={[
        {
          position: 'absolute',
          top: 0, bottom: 0,
          justifyContent: 'center',
          [side]: 0,
        },
        style,
      ]}
    >
      {/* The disc itself sits ~30% off-screen — the halos are what visually
          "touch" the wheels. The halos are NON-interactive (pointerEvents
          none) so they don't block the wheel scroll; only the crest disc
          captures taps. Crest renders without the secondary-color outline so
          the harsh ring doesn't break the soft radial gradient. */}
      <View
        style={{
          [side === 'left' ? 'marginLeft' : 'marginRight']: -CREST_BIG * 0.32,
          width: CREST_BIG, height: CREST_BIG,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Outer halo (very soft, large) — intensifies when selected */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: CREST_BIG * 1.85, height: CREST_BIG * 1.85,
            borderRadius: CREST_BIG,
            backgroundColor: team.primary + (selected ? '22' : '12'),
          }}
        />
        {/* Mid halo */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: CREST_BIG * 1.45, height: CREST_BIG * 1.45,
            borderRadius: CREST_BIG,
            backgroundColor: team.primary + (selected ? '38' : '20'),
          }}
        />
        {/* Close halo */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: CREST_BIG * 1.18, height: CREST_BIG * 1.18,
            borderRadius: CREST_BIG,
            backgroundColor: team.primary + (selected ? '55' : '32'),
          }}
        />
        {/* Only the disc is tappable */}
        {tappable ? (
          <Pressable onPress={onPress} hitSlop={6}>
            <TeamCrest team={code} size={CREST_BIG} noBorder />
          </Pressable>
        ) : (
          <TeamCrest team={code} size={CREST_BIG} noBorder />
        )}
      </View>
    </Animated.View>
  );
}

// ─── Step 2: Scorers (pitch) ─────────────────────────────────

interface ScorersStepProps {
  h: typeof LIGAMX[TeamCode]; a: typeof LIGAMX[TeamCode];
  homeLineup: LineupEntry[]; awayLineup: LineupEntry[];
  homeGoals: number; awayGoals: number;
  scorerIds: string[]; onToggle: (playerId: string) => void;
  homeScorerCount: number; awayScorerCount: number;
  /** Wizard-owned exit signal (0 idle, 1 fully exited). Drives the synced
   *  slide-down + fade-out of the entire pitch block on "Continuar". */
  exitProgress: SharedValue<number>;
  /** User-accent color — drives the pitch-line stroke so the tactical
   *  drawing carries the user's identity across the wizard. */
  accentColor: string;
}

function ScorersStep({
  h, a, homeLineup, awayLineup, homeGoals, awayGoals,
  scorerIds, onToggle, homeScorerCount, awayScorerCount, exitProgress, accentColor,
}: ScorersStepProps) {
  // Header fades faster than the pitch on exit so the pitch reads as the
  // main object "falling off-screen" while the chrome makes way for the
  // summary card slide-in.
  const headerStyle = useAnimatedStyle(() => ({
    opacity: 1 - exitProgress.value,
    transform: [{ translateY: exitProgress.value * 20 }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
      <Animated.View style={[{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 }, headerStyle]}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.paper, textAlign: 'center' }}>
          ¿Quién <Text style={{ color: colors.gold }}>anota</Text>?
        </Text>
        <Text style={{ fontSize: 12, color: colors.paper2, marginTop: 4, textAlign: 'center' }}>
          Toca a los goleadores. Opcional — puedes dejarlo en blanco.
        </Text>
      </Animated.View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {homeGoals > 0 ? (
          <TeamScorerPitch
            teamName={h.name} primary={h.primary} secondary={h.secondary}
            lineup={homeLineup} scorerIds={scorerIds} onToggle={onToggle}
            picked={homeScorerCount} max={homeGoals}
            exitProgress={exitProgress} accentColor={accentColor}
          />
        ) : null}
        {awayGoals > 0 ? (
          <TeamScorerPitch
            teamName={a.name} primary={a.primary} secondary={a.secondary}
            lineup={awayLineup} scorerIds={scorerIds} onToggle={onToggle}
            picked={awayScorerCount} max={awayGoals}
            exitProgress={exitProgress} accentColor={accentColor}
          />
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}

const PITCH_ROWS = [
  { slots: [1] },        // GK — enters with the field
  { slots: [2, 3, 4, 5] }, // DEF — cascade L→R
  { slots: [6, 7, 8] },    // MID
  { slots: [9, 10, 11] },  // FW
];

// Inter-row stagger so the cascade reads as "GK + field together, then
// defense, then mids, then forwards". Per-slot delay within a row spreads
// the L→R sweep so each row is a deliberate beat rather than a flash.
// Tuned slower than the first pass — the user wanted the cascade to read
// clearly rather than blur past.
const ROW_DELAYS   = [0, 220, 440, 660];
const SLOT_STAGGER = 75;

function TeamScorerPitch({ teamName, primary, secondary, lineup, scorerIds, onToggle, picked, max, exitProgress, accentColor }: {
  teamName: string; primary: string; secondary: string;
  lineup: LineupEntry[]; scorerIds: string[]; onToggle: (id: string) => void;
  picked: number; max: number;
  exitProgress: SharedValue<number>;
  accentColor: string;
}) {
  const bySlot = useMemo(() => {
    const m: Record<number, LineupEntry> = {};
    for (const e of lineup) m[e.slot] = e;
    return m;
  }, [lineup]);

  // Field-level entry — slides in slightly from above (translateY -16) with
  // fade. The GK jersey shares ROW_DELAYS[0] = 0 so it lands in sync with
  // the field for the "field + portero arrive together" beat. Tuned slower
  // so the entry reads as an elegant settle, not a flash.
  const fieldEnter = useSharedValue(0);
  useEffect(() => {
    fieldEnter.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [fieldEnter]);

  // Combined entry + wizard exit. The exit slides the whole pitch down
  // 240px and fades to 0; while it runs, taps are disabled.
  const pitchStyle = useAnimatedStyle(() => ({
    opacity: fieldEnter.value * (1 - exitProgress.value),
    transform: [
      { translateY: (1 - fieldEnter.value) * -16 + exitProgress.value * 240 },
    ],
  }));

  if (lineup.length === 0) {
    return (
      <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, alignItems: 'center', gap: 6 }}>
        <Text style={{ color: colors.paper, fontWeight: '800', fontSize: 14 }}>{teamName}</Text>
        <Text style={{ color: colors.paper2, fontSize: 12, textAlign: 'center' }}>
          Alineación no disponible todavía. Podrás elegir goleadores cuando el admin la publique.
        </Text>
      </View>
    );
  }

  // Pitch dimensions for the SVG overlay. The jerseys sit ON TOP of the
  // pitch lines (no green fill — the screen-wide gradient shows through).
  const PITCH_H = 380;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
        <Text style={{ color: colors.paper, fontWeight: '800', fontSize: 14 }}>{teamName}</Text>
        <Text style={{ color: picked === max ? colors.green : colors.gold, fontWeight: '800', fontSize: 12 }}>
          {picked}/{max} goleador(es)
        </Text>
      </View>
      <Animated.View
        style={[
          {
            // Transparent pitch — only the tactical lines (SVG) provide
            // structure. The screen-wide gradient shows through, so the
            // pitch feels continuous with the rest of the wizard rather
            // than a flat green sticker.
            paddingVertical: 18, paddingHorizontal: 6,
            position: 'relative',
            minHeight: PITCH_H,
          },
          pitchStyle,
        ]}
      >
        {/* Tactical pitch lines — accent-tinted, behind the jerseys. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 6, right: 6 }}
        >
          <PitchLines color={accentColor} />
        </View>

        <View style={{ gap: 14, justifyContent: 'space-around', flex: 1 }}>
          {PITCH_ROWS.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start' }}>
              {row.slots.map((slot, si) => {
                const entry = bySlot[slot];
                if (!entry) {
                  return <View key={slot} style={{ width: 56 }} />;
                }
                const isSel = scorerIds.includes(entry.player.id);
                const delay = ROW_DELAYS[ri] + si * SLOT_STAGGER;
                return (
                  <AnimatedJersey
                    key={slot}
                    primary={primary} secondary={secondary}
                    number={entry.player.number} name={entry.player.name}
                    isSelected={isSel}
                    delay={delay}
                    onPress={() => onToggle(entry.player.id)}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// Tactical football pitch — line-only drawing scaled to fill the available
// box. Uses the user-accent color at low opacity so it reads as a "tactical
// board overlay" rather than a literal green field. Drawn vertically:
// GK at the top, opposing goal at the bottom.
function PitchLines({ color }: { color: string }) {
  // 60% / 30% opacities applied by appending hex alpha.
  const main  = color + '7A'; // ~48% — main outlines
  const faint = color + '40'; // ~25% — secondary marks
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 130" preserveAspectRatio="none">
      {/* Outer boundary (slightly inset so corners breathe) */}
      <Rect x={1.5} y={1.5} width={97} height={127} rx={3} ry={3}
        stroke={main} strokeWidth={0.5} fill="none" />

      {/* Halfway line + center circle + center spot */}
      <Line x1={1.5} y1={65} x2={98.5} y2={65} stroke={main} strokeWidth={0.5} />
      <Circle cx={50} cy={65} r={10} stroke={main} strokeWidth={0.5} fill="none" />
      <Circle cx={50} cy={65} r={0.8} fill={main} />

      {/* Top half — GK's defensive end */}
      {/* Large penalty box */}
      <Rect x={22} y={1.5} width={56} height={18} stroke={main} strokeWidth={0.5} fill="none" />
      {/* Small goal area */}
      <Rect x={36} y={1.5} width={28} height={7} stroke={main} strokeWidth={0.5} fill="none" />
      {/* Penalty spot */}
      <Circle cx={50} cy={14} r={0.7} fill={main} />
      {/* Penalty arc — curves outward from the box edge */}
      <Path d="M 41 19 A 11 11 0 0 0 59 19" stroke={faint} strokeWidth={0.5} fill="none" />
      {/* Goal posts hint — short stub at the very top edge */}
      <Line x1={42} y1={1.5} x2={58} y2={1.5} stroke={main} strokeWidth={1.2} />

      {/* Bottom half — attacking end */}
      <Rect x={22} y={110.5} width={56} height={18} stroke={main} strokeWidth={0.5} fill="none" />
      <Rect x={36} y={121.5} width={28} height={7} stroke={main} strokeWidth={0.5} fill="none" />
      <Circle cx={50} cy={116} r={0.7} fill={main} />
      <Path d="M 41 111 A 11 11 0 0 1 59 111" stroke={faint} strokeWidth={0.5} fill="none" />
      <Line x1={42} y1={128.5} x2={58} y2={128.5} stroke={main} strokeWidth={1.2} />

      {/* Subtle corner arcs */}
      <Path d="M 1.5 4 A 2.5 2.5 0 0 1 4 1.5" stroke={faint} strokeWidth={0.4} fill="none" />
      <Path d="M 96 1.5 A 2.5 2.5 0 0 1 98.5 4" stroke={faint} strokeWidth={0.4} fill="none" />
      <Path d="M 1.5 126 A 2.5 2.5 0 0 0 4 128.5" stroke={faint} strokeWidth={0.4} fill="none" />
      <Path d="M 96 128.5 A 2.5 2.5 0 0 0 98.5 126" stroke={faint} strokeWidth={0.4} fill="none" />
    </Svg>
  );
}

// Per-jersey wrapper: handles staggered entrance + the ball badge's
// appear / disappear animation. The jersey itself does NOT animate on
// selection — only the ⚽ overlay reacts so the player tile stays calm and
// the ball is the clear single signal.
//
// Entry  → opacity 0→1, translateY 24→0, scale 0.8→1.0 (slow spring).
// Ball   → on OFF→ON: scale 0→1 with a soft spring overshoot.
//          on ON→OFF: scale 1→0 with a quick ease-in fade.
//   The shared value is initialised to the current `isSelected` so that
//   re-entering the step with a previously-saved pick shows the balls in
//   place, no animation. A ref-tracked prev value ensures we only animate
//   on actual transitions.
function AnimatedJersey({
  primary, secondary, number, name, isSelected, delay, onPress,
}: {
  primary: string; secondary: string;
  number: number | null; name: string;
  isSelected: boolean; delay: number;
  onPress: () => void;
}) {
  const enter = useSharedValue(0);
  const ball  = useSharedValue(isSelected ? 1 : 0);
  const prevSel = useRef(isSelected);
  const JERSEY_SIZE = 46;

  useEffect(() => {
    // Slower, more elegant settle — `damping: 22 / stiffness: 110` reads
    // as a deliberate cloth-like landing instead of the previous snap.
    enter.value = withDelay(
      delay,
      withSpring(1, { damping: 22, stiffness: 110, mass: 1 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevSel.current === isSelected) return; // initial mount or no change
    if (isSelected) {
      // Bounce in — slight overshoot then settle so it lands with weight.
      ball.value = withSpring(1, { damping: 11, stiffness: 220, mass: 0.6 });
    } else {
      // Quick collapse + fade — the disappearance shouldn't linger.
      ball.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    }
    prevSel.current = isSelected;
  }, [isSelected, ball]);

  // Jersey entry only — no selection-driven scale on the shirt itself.
  const style = useAnimatedStyle(() => {
    const entryScale = 0.8 + enter.value * 0.2;
    return {
      opacity: enter.value,
      transform: [
        { translateY: (1 - enter.value) * 24 },
        { scale: entryScale },
      ],
    };
  });

  const ballStyle = useAnimatedStyle(() => ({
    opacity: ball.value,
    transform: [{ scale: ball.value }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable onPress={onPress}>
        <View>
          <Jersey
            primary={primary} secondary={secondary}
            number={number} name={name}
            size={JERSEY_SIZE} selected={isSelected}
          />
          {/* Animated ball overlay — pure emoji, no surrounding disc.
              Positioned to overlap the shirt's bottom-right corner so
              it visibly "sits on" the jersey instead of floating to its
              side. The jersey body's right edge (path x=72 of viewBox
              100) lands roughly 18px from the wrapper's right at size 46
              — `right: 8` puts the ball's center on top of that edge. */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: JERSEY_SIZE - 18,
                right: 6,
                width: 24, height: 24,
                alignItems: 'center', justifyContent: 'center',
              },
              ballStyle,
            ]}
          >
            <Text
              style={{
                fontSize: 20,
                textShadowColor: 'rgba(0,0,0,0.6)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
            >
              ⚽
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Step 3: Summary ─────────────────────────────────────────

interface SummaryStepProps {
  selected: Outcome; homeCode: TeamCode; awayCode: TeamCode;
  h: typeof LIGAMX[TeamCode]; a: typeof LIGAMX[TeamCode];
  homeGoals: number; awayGoals: number;
  scorerIds: string[]; homeLineup: LineupEntry[]; awayLineup: LineupEntry[];
  homePlayerIds: Set<string>;
  groupCount: number;
  /** True when the user's pick is money-line / double-chance (no exact
   * score). The exact-score row + scorers list are suppressed. */
  moneyline: boolean;
  withDraw: boolean;
}

function SummaryStep({ selected, homeCode, awayCode, h, a, homeGoals, awayGoals, scorerIds, homeLineup, awayLineup, homePlayerIds, groupCount, moneyline, withDraw }: SummaryStepProps) {
  const winnerLabel = selected === 'DRAW' ? 'Empate' : LIGAMX[selected as TeamCode].name;
  // Money-line: 10 single, 5 double-chance. Exact: classic winner + exact + scorers.
  const winnerPts = moneyline
    ? (withDraw && selected !== 'DRAW' ? POT_DOUBLECHANCE : POT_MONEYLINE)
    : (selected === 'DRAW' ? PTS.draw : PTS.winner);

  const nameOf = (id: string) => {
    const all = [...homeLineup, ...awayLineup];
    const e = all.find((x) => x.player.id === id);
    return e ? `${e.player.number != null ? e.player.number + ' · ' : ''}${e.player.name}` : '—';
  };
  const scorers = scorerIds.map((id) => ({ id, name: nameOf(id), home: homePlayerIds.has(id) }));
  // "Hasta +X" = best case: same unified model as the live pill (a scorer
  // bonus available per predicted goal, whether or not the user filled them
  // all in). Keeps the score-step pill and this header consistent.
  const totalPts = maxPotentialPoints({
    moneyline, withDraw,
    isDraw: selected === 'DRAW',
    homeGoals, awayGoals,
  });

  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* Total points badge */}
        <View style={{ alignSelf: 'center', backgroundColor: 'rgba(255,185,56,0.14)', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 7, marginBottom: 2 }}>
          <Text style={{ color: colors.gold, fontWeight: '900', fontSize: 14 }}>Hasta +{totalPts} pts</Text>
        </View>

        <SummaryRow
          icon={<TeamCrest team={selected === 'DRAW' ? homeCode : (selected as TeamCode)} size={30} />}
          title={moneyline ? (withDraw && selected !== 'DRAW' ? 'Doble oportunidad' : 'Ganador') : 'Ganador'}
          value={moneyline && withDraw && selected !== 'DRAW' ? `${winnerLabel} o Empate` : winnerLabel}
          pts={winnerPts}
        />
        {!moneyline ? (
          <SummaryRow
            icon={<Text style={{ fontSize: 20 }}>⚽</Text>}
            title="Marcador exacto" value={`${homeGoals} - ${awayGoals}`} pts={PTS.exactScore}
          />
        ) : null}
        {!moneyline && scorers.length > 0 ? (
          <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
            <Text style={{ color: colors.paper, fontSize: 14, fontWeight: '900', marginBottom: 8 }}>Goleadores</Text>
            {scorers.map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 }}>
                <Text style={{ fontSize: 14 }}>⚽</Text>
                <Text style={{ flex: 1, color: colors.paper, fontSize: 13, fontWeight: '700' }}>{s.name}</Text>
                <Text style={{ color: selected === 'DRAW' ? colors.gold : (s.home ? h.primary : a.primary), fontSize: 10, fontWeight: '800' }}>
                  {s.home ? h.name : a.name}
                </Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: colors.paper2, fontSize: 11, fontWeight: '800' }}>+{PTS.scorer}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={{ fontSize: 11, color: colors.mist, textAlign: 'center', lineHeight: 17, marginTop: 4 }}>
          Cuenta en {groupCount} circl{groupCount === 1 ? '' : 's'}.{'\n'}
          Puntos indicativos, sujetos a ajuste.
        </Text>
      </ScrollView>
    </Animated.View>
  );
}

function SummaryRow({ icon, title, value, pts }: { icon: React.ReactNode; title: string; value: string; pts: number }) {
  return (
    <View style={{ backgroundColor: colors.s800, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' }}>
      <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.mist, fontSize: 11, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: colors.paper, fontSize: 16, fontWeight: '900' }}>{value}</Text>
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5 }}>
        <Text style={{ color: colors.paper2, fontSize: 12, fontWeight: '800' }}>+{pts}</Text>
      </View>
    </View>
  );
}

