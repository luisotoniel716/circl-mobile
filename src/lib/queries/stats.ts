import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

// ─── Types ─────────────────────────────────────────────────────

export interface RecentPick {
  matchId:    string;
  kickoffAt:  string;
  homeCode:   string;
  awayCode:   string;
  prediction: 'home' | 'draw' | 'away';
  correct:    boolean | null;       // null = match not finished
  points:     number;
  matchday:   number;
}

export interface MatchdaySummary {
  matchday:     number;
  picks:        number;
  correct:      number;
  points:       number;
  perfect:      boolean;            // all picks correct, min 1 pick
  cumulative:   number;             // running total of points after this matchday
}

export interface TeamUsage {
  code:    string;       // team code (e.g. AME)
  name:    string;
  picks:   number;       // how many times picked
  correct: number;       // how many of those finished and were correct
}

export interface DeepStats {
  // Overall (deduplicated per match)
  totalPoints:        number;
  totalPicks:         number;
  correctPicks:       number;
  accuracy:           number;       // 0-100

  // Pattern breakdown — counts of finished picks per side (any result)
  predictionBreakdown: { home: number; draw: number; away: number };
  // Pattern breakdown — counts of CORRECT picks per side
  correctBreakdown:    { home: number; draw: number; away: number };

  // Streaks (over finished picks ordered chronologically)
  currentStreak:      number;       // consecutive correct picks at the tail
  bestStreak:         number;
  streakBroken:       boolean;      // last pick was wrong

  // Per-matchday breakdown
  matchdays:          MatchdaySummary[];
  bestMatchday:       MatchdaySummary | null;

  // Team usage
  topTeams:           TeamUsage[];  // top 3 by picks count
  favoriteTeamPicks:  number;       // picks on user's favorite team
  favoriteTeamCode:   string | null;

  // Recent picks for the dot grid (latest 20 first)
  recent:             RecentPick[];

  // Records
  perfectMatchdays:   number;
  highestMatchdayPts: number;
}

// ─── Hook ──────────────────────────────────────────────────────

/**
 * Deep stats for the current user. Heavier than useMyStats — pulls
 * full picks + match + team join. Cached per user.
 *
 * Deduplication strategy: a pick on a match counts once (the user might
 * have 5 group-scoped picks on the same match — they're all the same
 * prediction in practice). Points are taken from any single group's
 * pick_result (they're equal across groups since the predictor scored
 * the same way), so totalPoints is a per-match skill score.
 */
export function useMyDeepStats() {
  const { user, profile } = useAuth();
  const favTeamId = profile?.favorite_team_id ?? null;

  return useQuery({
    queryKey: ['my-deep-stats', user?.id ?? null, favTeamId],
    enabled: !!user,
    queryFn: async (): Promise<DeepStats> => {
      // 1) Picks + results
      const { data: pickRows, error: pErr } = await supabase
        .from('picks')
        .select('match_id, prediction, pick_results ( correct, points )')
        .eq('user_id', user!.id);
      if (pErr) throw pErr;

      // 2) Matches for those picks (separate query to avoid nested-join ambiguity)
      const matchIds = Array.from(new Set((pickRows ?? []).map((r) => r.match_id)));
      const matchMap = new Map<string, {
        kickoff_at: string;
        matchday:   number;
        status:     string;
        home: { id: string; code: string; name: string } | null;
        away: { id: string; code: string; name: string } | null;
      }>();
      if (matchIds.length > 0) {
        const { data: mRows, error: mErr } = await supabase
          .from('matches')
          .select(`
            id, kickoff_at, matchday, status,
            home:home_team_id ( id, code, name ),
            away:away_team_id ( id, code, name )
          `)
          .in('id', matchIds);
        if (mErr) throw mErr;
        for (const m of (mRows ?? []) as unknown as Array<{
          id:         string;
          kickoff_at: string;
          matchday:   number;
          status:     string;
          home: { id: string; code: string; name: string } | null;
          away: { id: string; code: string; name: string } | null;
        }>) {
          matchMap.set(m.id, {
            kickoff_at: m.kickoff_at,
            matchday:   m.matchday,
            status:     m.status,
            home:       m.home,
            away:       m.away,
          });
        }
      }

      // 3) Stitch + dedup by match_id, preferring entries with a result and correct=true
      type Row = {
        match_id:     string;
        prediction:   'home' | 'draw' | 'away';
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
        matches: {
          kickoff_at: string;
          matchday:   number;
          status:     string;
          home: { id: string; code: string; name: string } | null;
          away: { id: string; code: string; name: string } | null;
        } | null;
      };

      const byMatch = new Map<string, Row & { _result: { correct: boolean | null; points: number } }>();
      const rows: Row[] = (pickRows ?? []).map((r) => ({
        match_id:     r.match_id,
        prediction:   r.prediction as Row['prediction'],
        pick_results: r.pick_results as Row['pick_results'],
        matches:      matchMap.get(r.match_id) ?? null,
      }));
      for (const raw of rows) {
        const pr = Array.isArray(raw.pick_results) ? raw.pick_results[0] : raw.pick_results;
        const result = { correct: pr?.correct ?? null, points: pr?.points ?? 0 };
        const existing = byMatch.get(raw.match_id);
        if (
          !existing ||
          (existing._result.correct === null && result.correct != null) ||
          (existing._result.correct === false && result.correct === true)
        ) {
          byMatch.set(raw.match_id, { ...raw, _result: result });
        }
      }

      const entries = Array.from(byMatch.values()).filter((e) => e.matches);

      // 3) Aggregates
      const totalPicks   = entries.length;
      const finished     = entries.filter((e) => e._result.correct !== null);
      const correctPicks = finished.filter((e) => e._result.correct === true).length;
      const totalPoints  = entries.reduce((s, e) => s + e._result.points, 0);
      const accuracy     = finished.length > 0
        ? Math.round((correctPicks / finished.length) * 100)
        : 0;

      // 4) Prediction breakdown (only finished picks for honesty)
      const predictionBreakdown = { home: 0, draw: 0, away: 0 };
      const correctBreakdown    = { home: 0, draw: 0, away: 0 };
      for (const e of finished) {
        predictionBreakdown[e.prediction]++;
        if (e._result.correct === true) correctBreakdown[e.prediction]++;
      }

      // 5) Streaks — order finished picks chronologically by kickoff
      const finishedSorted = finished
        .slice()
        .sort((a, b) => new Date(a.matches!.kickoff_at).getTime() - new Date(b.matches!.kickoff_at).getTime());

      let bestStreak    = 0;
      let runningStreak = 0;
      let currentStreak = 0;
      let streakBroken  = false;
      for (let i = 0; i < finishedSorted.length; i++) {
        const ok = finishedSorted[i]._result.correct === true;
        if (ok) {
          runningStreak++;
          if (runningStreak > bestStreak) bestStreak = runningStreak;
        } else {
          runningStreak = 0;
        }
      }
      // Current streak = trailing consecutive correct from the end
      for (let i = finishedSorted.length - 1; i >= 0; i--) {
        if (finishedSorted[i]._result.correct === true) currentStreak++;
        else break;
      }
      if (finishedSorted.length > 0 && finishedSorted[finishedSorted.length - 1]._result.correct === false) {
        streakBroken = true;
      }

      // 6) Matchday breakdown (only finished picks for points totals)
      const byMatchday = new Map<number, { picks: number; correct: number; points: number }>();
      for (const e of finished) {
        const md = e.matches!.matchday;
        const cur = byMatchday.get(md) ?? { picks: 0, correct: 0, points: 0 };
        cur.picks++;
        if (e._result.correct === true) cur.correct++;
        cur.points += e._result.points;
        byMatchday.set(md, cur);
      }
      const matchdayList = Array.from(byMatchday.entries())
        .map(([md, v]) => ({ matchday: md, ...v, perfect: v.picks > 0 && v.correct === v.picks }))
        .sort((a, b) => a.matchday - b.matchday);

      let cumulative = 0;
      const matchdays: MatchdaySummary[] = matchdayList.map((m) => {
        cumulative += m.points;
        return { ...m, cumulative };
      });

      const bestMatchday = matchdays.length > 0
        ? matchdays.reduce((b, m) => (m.points > b.points ? m : b), matchdays[0])
        : null;

      // 7) Team usage
      const teamMap = new Map<string, { name: string; picks: number; correct: number }>();
      for (const e of entries) {
        // Which team did they pick? (draw → skip team count)
        let teamCode: string | null = null;
        let teamName: string | null = null;
        if (e.prediction === 'home' && e.matches?.home) {
          teamCode = e.matches.home.code;
          teamName = e.matches.home.name;
        } else if (e.prediction === 'away' && e.matches?.away) {
          teamCode = e.matches.away.code;
          teamName = e.matches.away.name;
        }
        if (!teamCode) continue;
        const cur = teamMap.get(teamCode) ?? { name: teamName ?? teamCode, picks: 0, correct: 0 };
        cur.picks++;
        if (e._result.correct === true) cur.correct++;
        teamMap.set(teamCode, cur);
      }
      const topTeams: TeamUsage[] = Array.from(teamMap.entries())
        .map(([code, v]) => ({ code, ...v }))
        .sort((a, b) => b.picks - a.picks)
        .slice(0, 3);

      // 8) Favorite team picks (resolved via favTeamId if set)
      let favoriteTeamPicks = 0;
      let favoriteTeamCode: string | null = null;
      if (favTeamId) {
        for (const e of entries) {
          const homeId = (e.matches?.home as { id?: string } | null | undefined)?.id;
          const awayId = (e.matches?.away as { id?: string } | null | undefined)?.id;
          const pickedHome = e.prediction === 'home' && homeId === favTeamId;
          const pickedAway = e.prediction === 'away' && awayId === favTeamId;
          if (pickedHome || pickedAway) {
            favoriteTeamPicks++;
            favoriteTeamCode = pickedHome ? e.matches!.home!.code : e.matches!.away!.code;
          }
        }
      }

      // 9) Recent picks (latest 20 by kickoff_at desc)
      const recent: RecentPick[] = entries
        .slice()
        .sort((a, b) => new Date(b.matches!.kickoff_at).getTime() - new Date(a.matches!.kickoff_at).getTime())
        .slice(0, 20)
        .map((e) => ({
          matchId:    e.match_id,
          kickoffAt:  e.matches!.kickoff_at,
          homeCode:   e.matches!.home?.code ?? '',
          awayCode:   e.matches!.away?.code ?? '',
          prediction: e.prediction,
          correct:    e._result.correct,
          points:     e._result.points,
          matchday:   e.matches!.matchday,
        }));

      // 10) Records
      const perfectMatchdays   = matchdays.filter((m) => m.perfect).length;
      const highestMatchdayPts = matchdays.reduce((max, m) => Math.max(max, m.points), 0);

      return {
        totalPoints,
        totalPicks,
        correctPicks,
        accuracy,
        predictionBreakdown,
        correctBreakdown,
        currentStreak,
        bestStreak,
        streakBroken,
        matchdays,
        bestMatchday,
        topTeams,
        favoriteTeamPicks,
        favoriteTeamCode,
        recent,
        perfectMatchdays,
        highestMatchdayPts,
      };
    },
  });
}

// ─── Badges ────────────────────────────────────────────────────

export type BadgeId =
  | 'en_racha'
  | 'imparable'
  | 'francotirador'
  | 'jornada_perfecta'
  | 'master_empate'
  | 'campeon'
  | 'fiel'
  | 'sorpresa'
  | 'constante';

export interface Badge {
  id:          BadgeId;
  emoji:       string;
  name:        string;
  description: string;
  unlocked:    boolean;
  progress:    number;          // 0-1
  progressLabel: string;        // e.g. "3 / 5"
}

/**
 * Compute the user's badges from deep stats.
 * Note: `campeon` (best rank #1) needs group context; we treat it as unlocked
 * if `bestRank === 1` is passed in (computed by the caller from useMyGroups).
 */
export function computeBadges(stats: DeepStats, bestRankAcrossGroups: number | null): Badge[] {
  // Helper to clamp
  const pct = (n: number, target: number) => Math.min(1, n / target);

  const out: Badge[] = [];

  // 1) En racha — 3 picks correctos seguidos
  out.push({
    id: 'en_racha',
    emoji: '🔥',
    name: 'En racha',
    description: '3 picks correctos seguidos',
    unlocked: stats.bestStreak >= 3,
    progress: pct(stats.bestStreak, 3),
    progressLabel: `${Math.min(stats.bestStreak, 3)} / 3`,
  });

  // 2) Imparable — 7 seguidos
  out.push({
    id: 'imparable',
    emoji: '🚀',
    name: 'Imparable',
    description: '7 picks correctos seguidos',
    unlocked: stats.bestStreak >= 7,
    progress: pct(stats.bestStreak, 7),
    progressLabel: `${Math.min(stats.bestStreak, 7)} / 7`,
  });

  // 3) Francotirador — >70% accuracy con mín 15 picks
  const sharpEligible = stats.totalPicks >= 15;
  const sharpUnlocked = sharpEligible && stats.accuracy >= 70;
  out.push({
    id: 'francotirador',
    emoji: '🎯',
    name: 'Francotirador',
    description: '70%+ accuracy con mín. 15 picks',
    unlocked: sharpUnlocked,
    progress: sharpEligible
      ? Math.min(1, stats.accuracy / 70)
      : pct(stats.totalPicks, 15),
    progressLabel: sharpEligible
      ? `${stats.accuracy}% / 70%`
      : `${stats.totalPicks} / 15 picks`,
  });

  // 4) Jornada perfecta — todas las picks de una jornada correctas (mín 1 pick)
  out.push({
    id: 'jornada_perfecta',
    emoji: '💯',
    name: 'Jornada perfecta',
    description: 'Acertar todos los picks de una jornada',
    unlocked: stats.perfectMatchdays >= 1,
    progress: stats.perfectMatchdays >= 1 ? 1 : 0,
    progressLabel: stats.perfectMatchdays >= 1 ? '¡Logrado!' : 'Pendiente',
  });

  // 5) Master del empate — 3 empates correctos
  const correctDraws = stats.correctBreakdown.draw;
  out.push({
    id: 'master_empate',
    emoji: '🤝',
    name: 'Master del empate',
    description: '3 empates correctos',
    unlocked: correctDraws >= 3,
    progress: pct(correctDraws, 3),
    progressLabel: `${Math.min(correctDraws, 3)} / 3`,
  });

  // 6) Campeón — #1 en algún grupo
  out.push({
    id: 'campeon',
    emoji: '🏆',
    name: 'Campeón',
    description: '#1 en algún grupo',
    unlocked: bestRankAcrossGroups === 1,
    progress: bestRankAcrossGroups === 1 ? 1 : 0,
    progressLabel: bestRankAcrossGroups
      ? `Mejor rank: #${bestRankAcrossGroups}`
      : 'Sin grupos aún',
  });

  // 7) Fiel — 10+ picks por equipo favorito
  out.push({
    id: 'fiel',
    emoji: '🦅',
    name: 'Fiel',
    description: '10+ picks por tu equipo favorito',
    unlocked: stats.favoriteTeamPicks >= 10,
    progress: pct(stats.favoriteTeamPicks, 10),
    progressLabel: stats.favoriteTeamCode
      ? `${Math.min(stats.favoriteTeamPicks, 10)} / 10`
      : 'Elige equipo favorito',
  });

  // 8) Sorpresa — acertar contra el pronóstico (proxy: 1 correct draw OR 5+ correct away)
  // Sin distribución de picks por grupo es solo un proxy razonable.
  const awayCorrectProxy = stats.correctBreakdown.away;
  out.push({
    id: 'sorpresa',
    emoji: '⚡',
    name: 'Sorpresa',
    description: 'Acertar contra el pronóstico',
    unlocked: correctDraws >= 1 || awayCorrectProxy >= 5,
    progress: Math.max(pct(correctDraws, 1), pct(awayCorrectProxy, 5)),
    progressLabel: correctDraws >= 1 ? '¡Logrado!' : `${awayCorrectProxy} / 5 visitas`,
  });

  // 9) Constante — picks en 5 jornadas consecutivas
  // Approximation: 5+ distinct matchdays with at least one pick
  out.push({
    id: 'constante',
    emoji: '📅',
    name: 'Constante',
    description: 'Picks en 5 jornadas consecutivas',
    unlocked: stats.matchdays.length >= 5,
    progress: pct(stats.matchdays.length, 5),
    progressLabel: `${Math.min(stats.matchdays.length, 5)} / 5 jornadas`,
  });

  return out;
}
