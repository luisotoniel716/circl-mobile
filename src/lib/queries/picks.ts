import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

// ─── Types ────────────────────────────────────────────────────

export type Prediction = 'home' | 'draw' | 'away';

export interface PickDist {
  home:  number;
  draw:  number;
  away:  number;
  total: number;
}

// ─── Queries ──────────────────────────────────────────────────

/** My pick for a specific match in a specific group. */
export function useMyPick(
  matchId: string | undefined,
  groupId: string | undefined,
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-pick', matchId, groupId, user?.id ?? null],
    enabled: !!matchId && !!groupId && !!user,
    queryFn: async (): Promise<Prediction | null> => {
      const { data, error } = await supabase
        .from('picks')
        .select('prediction')
        .eq('match_id', matchId!)
        .eq('group_id', groupId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.prediction as Prediction) ?? null;
    },
  });
}

/**
 * My picks for a specific match across ALL my groups.
 * Returns a map of groupId → prediction.
 */
export function useMyPicksForMatch(matchId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-picks-match', matchId, user?.id ?? null],
    enabled: !!matchId && !!user,
    queryFn: async (): Promise<Record<string, Prediction>> => {
      const { data, error } = await supabase
        .from('picks')
        .select('group_id, prediction')
        .eq('match_id', matchId!)
        .eq('user_id', user!.id);
      if (error) throw error;
      const map: Record<string, Prediction> = {};
      for (const row of data ?? []) {
        map[row.group_id] = row.prediction as Prediction;
      }
      return map;
    },
  });
}

/**
 * All picks for a specific match within a group, keyed by user_id.
 * Includes the result info if the match has finished. Used by the
 * circle (wheel) view to compare any member's pick to the current user.
 *
 * Note: Supabase RLS hides other users' picks until kickoff, so the
 * returned map only reflects rows the current user can actually see —
 * before kickoff this is just the user's own pick.
 */
export function useMatchPicksInGroup(
  matchId: string | undefined,
  groupId: string | undefined,
) {
  return useQuery({
    queryKey: ['match-picks-in-group', matchId, groupId],
    enabled: !!matchId && !!groupId,
    queryFn: async (): Promise<Record<string, PickWithResult>> => {
      const { data, error } = await supabase
        .from('picks')
        .select(`
          user_id, prediction, home_goals, away_goals,
          pick_results ( correct, points ),
          scorer_picks ( player_id, players ( name, number ) )
        `)
        .eq('match_id', matchId!)
        .eq('group_id', groupId!);
      if (error) throw error;
      const out: Record<string, PickWithResult> = {};
      for (const row of (data ?? []) as Array<{
        user_id:    string;
        prediction: string;
        home_goals: number | null;
        away_goals: number | null;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
        scorer_picks: Array<{ player_id: string; players: { name: string; number: number | null } | { name: string; number: number | null }[] | null }> | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        out[row.user_id] = {
          prediction: row.prediction as Prediction,
          correct:    pr?.correct ?? null,
          points:     pr?.points  ?? 0,
          homeGoals:  row.home_goals,
          awayGoals:  row.away_goals,
          scorers:    mapScorers(row.scorer_picks),
        };
      }
      return out;
    },
  });
}

/**
 * Pick distribution for a match in a group.
 * Supabase RLS only returns rows after kickoff (or for own picks),
 * so before kickoff totals will reflect only the current user's pick.
 */
export function useGroupPickDist(
  matchId: string | undefined,
  groupId: string | undefined,
) {
  return useQuery({
    queryKey: ['group-pick-dist', matchId, groupId],
    enabled: !!matchId && !!groupId,
    queryFn: async (): Promise<PickDist> => {
      const { data, error } = await supabase
        .from('picks')
        .select('prediction')
        .eq('match_id', matchId!)
        .eq('group_id', groupId!);
      if (error) throw error;
      const rows = data ?? [];
      const dist: PickDist = { home: 0, draw: 0, away: 0, total: rows.length };
      for (const r of rows) dist[r.prediction as Prediction]++;
      return dist;
    },
  });
}

/** A scorer prediction with the player's display info (joined). */
export interface ScorerPickInfo {
  player_id: string;
  name:      string;
  number:    number | null;
}

export interface PickWithResult {
  prediction: Prediction;
  correct:    boolean | null;   // null = match not finished yet
  points:     number;
  /** Predicted exact score (null when the user didn't predict a score). */
  homeGoals:  number | null;
  awayGoals:  number | null;
  /** Predicted scorers (empty when none or for a 0-0 prediction). */
  scorers:    ScorerPickInfo[];
}

/** Normalizes the joined scorer_picks shape into a flat ScorerPickInfo[]. */
function mapScorers(
  rows: Array<{ player_id: string; players: { name: string; number: number | null } | { name: string; number: number | null }[] | null }> | null,
): ScorerPickInfo[] {
  if (!rows) return [];
  return rows.map((r) => {
    const p = Array.isArray(r.players) ? r.players[0] : r.players;
    return { player_id: r.player_id, name: p?.name ?? '—', number: p?.number ?? null };
  });
}

/**
 * Same as PickWithResult but adds the count of distinct groups where the
 * user has picked this match. Used by home to show "partial" pick status.
 */
export interface PickWithResultAndCount extends PickWithResult {
  /** Number of distinct groups in which the user has a pick for this match. */
  groupCount: number;
  /** True when the user's prediction differs between groups for this match. */
  varies: boolean;
}

/** All my picks in a group, keyed by match_id, with result info if finished. */
export function useMyPicksInGroup(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-picks-in-group', groupId, user?.id ?? null],
    enabled: !!groupId && !!user,
    queryFn: async (): Promise<Record<string, PickWithResult>> => {
      const { data, error } = await supabase
        .from('picks')
        .select(`
          match_id, prediction, home_goals, away_goals,
          pick_results ( correct, points ),
          scorer_picks ( player_id, players ( name, number ) )
        `)
        .eq('group_id', groupId!)
        .eq('user_id', user!.id);
      if (error) throw error;
      const out: Record<string, PickWithResult> = {};
      for (const row of (data ?? []) as Array<{
        match_id:     string;
        prediction:   string;
        home_goals:   number | null;
        away_goals:   number | null;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
        scorer_picks: Array<{ player_id: string; players: { name: string; number: number | null } | { name: string; number: number | null }[] | null }> | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        out[row.match_id] = {
          prediction: row.prediction as Prediction,
          correct:    pr?.correct ?? null,
          points:     pr?.points  ?? 0,
          homeGoals:  row.home_goals,
          awayGoals:  row.away_goals,
          scorers:    mapScorers(row.scorer_picks),
        };
      }
      return out;
    },
  });
}

/**
 * All my picks across all groups, keyed by match_id.
 * Picks are per-group, so the same match can have DIFFERENT predictions in
 * different groups. We surface a `varies` flag for that case so home can say
 * "varía por grupo" instead of misleadingly showing a single team. Used in
 * home to enrich the matches list with my pick + result for the "My picks" chip.
 */
export function useMyAllPicks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-all-picks', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<Record<string, PickWithResultAndCount>> => {
      const { data, error } = await supabase
        .from('picks')
        .select('match_id, group_id, prediction, pick_results ( correct, points )')
        .eq('user_id', user!.id);
      if (error) throw error;
      const out: Record<string, PickWithResultAndCount> = {};
      // Track distinct group_ids per match so we can report the partial-coverage
      // count, and the set of distinct predictions to detect divergence.
      const seenGroups: Record<string, Set<string>> = {};
      const seenPreds:  Record<string, Set<string>> = {};
      for (const row of (data ?? []) as Array<{
        match_id:     string;
        group_id:     string;
        prediction:   string;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        const groups = seenGroups[row.match_id] ?? (seenGroups[row.match_id] = new Set());
        groups.add(row.group_id);
        const preds = seenPreds[row.match_id] ?? (seenPreds[row.match_id] = new Set());
        preds.add(row.prediction);
        // Keep first-seen pick per match; later groups overwrite only if they
        // have a result and the current one doesn't.
        const existing = out[row.match_id];
        if (!existing || (existing.correct === null && pr?.correct != null)) {
          out[row.match_id] = {
            prediction: row.prediction as Prediction,
            correct:    pr?.correct ?? null,
            points:     pr?.points  ?? 0,
            homeGoals:  null,
            awayGoals:  null,
            scorers:    [],
            groupCount: groups.size,
            varies:     preds.size > 1,
          };
        } else {
          // Already kept an entry — just bump the count + divergence flag.
          existing.groupCount = groups.size;
          existing.varies = preds.size > 1;
        }
      }
      return out;
    },
  });
}

/**
 * Set of match IDs where the current user has at least one pick (in any group).
 * Used for the "My picks" / "Pending" chips on home.
 */
export function useMyPickedMatchIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-picked-match-ids', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('picks')
        .select('match_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.match_id));
    },
  });
}

// ─── Global user stats ────────────────────────────────────────

export interface MyStats {
  /** Sum of points across ALL groups (each group scores independently). */
  totalPoints:    number;
  /** Unique matches where user made at least one pick. */
  totalPicks:     number;
  /** Unique finished matches where user got the pick right in any group. */
  correctPicks:   number;
  /** Accuracy 0-100, only counting finished matches. */
  accuracy:       number;
}

/**
 * Aggregate cross-group pick stats for the current user.
 * Deduplicates by match so each match counts once regardless of how many
 * groups the user picked in.
 */
export function useMyStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-stats', user?.id ?? null],
    enabled: !!user,
    queryFn: async (): Promise<MyStats> => {
      const { data, error } = await supabase
        .from('picks')
        .select('match_id, pick_results ( correct, points )')
        .eq('user_id', user!.id);
      if (error) throw error;

      // Deduplicate by match_id.
      // If user has multiple group picks for the same match, keep the one
      // that has a result (correct !== null), preferring the correct one.
      const byMatch = new Map<string, { correct: boolean | null; points: number }>();
      for (const row of (data ?? []) as Array<{
        match_id:     string;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        const existing = byMatch.get(row.match_id);
        // Prefer entry that has a result; among those, prefer correct=true
        if (
          !existing ||
          (existing.correct === null && pr?.correct != null) ||
          (existing.correct === false && pr?.correct === true)
        ) {
          byMatch.set(row.match_id, {
            correct: pr?.correct ?? null,
            points:  pr?.points  ?? 0,
          });
        }
      }

      const entries       = Array.from(byMatch.values());
      const finished      = entries.filter((e) => e.correct !== null);
      const correctPicks  = finished.filter((e) => e.correct === true).length;
      const totalPoints   = entries.reduce((s, e) => s + e.points, 0);

      return {
        totalPoints,
        totalPicks:  byMatch.size,
        correctPicks,
        accuracy:    finished.length > 0
          ? Math.round((correctPicks / finished.length) * 100)
          : 0,
      };
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────

export interface SubmitPickInput {
  matchId:    string;
  prediction: Prediction;
  groupIds:   string[];
  /**
   * Optional exact-score prediction. Pass `null` for "no score predicted".
   * When omitted entirely the existing score is left untouched.
   */
  homeGoals?: number | null;
  awayGoals?: number | null;
  /**
   * Optional scorer prediction (player IDs), applied to every selected group.
   * When provided (even as an empty array) it REPLACES existing scorers for
   * those picks. When omitted, scorers are left untouched.
   */
  scorerPlayerIds?: string[];
  /**
   * Double-chance modifier. When true the pick covers the predicted team OR
   * a draw ("Gana X o Empate"). Only meaningful for money-line picks with
   * prediction 'home' | 'away'. Defaults false.
   */
  withDraw?: boolean;
}

/**
 * Upsert a pick for one or more groups at once.
 * Uses the UNIQUE(user_id, match_id, group_id) constraint
 * to update existing picks instead of erroring. Also persists the optional
 * exact-score prediction and scorer predictions (per group, via scorer_picks).
 */
export function useSubmitPick() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      matchId, prediction, groupIds, homeGoals, awayGoals, scorerPlayerIds, withDraw,
    }: SubmitPickInput) => {
      if (!user) throw new Error('No estás autenticado.');
      if (groupIds.length === 0) throw new Error('Selecciona al menos un grupo.');

      const includeScore = homeGoals !== undefined && awayGoals !== undefined;

      const rows = groupIds.map((gid) => ({
        match_id:   matchId,
        group_id:   gid,
        user_id:    user.id,
        prediction,
        ...(includeScore ? { home_goals: homeGoals, away_goals: awayGoals } : {}),
        ...(withDraw !== undefined ? { with_draw: withDraw } : {}),
        updated_at: new Date().toISOString(),
      }));

      // Upsert and read back the affected pick ids so we can manage scorers.
      const { data: upserted, error } = await supabase
        .from('picks')
        .upsert(rows, { onConflict: 'user_id,match_id,group_id' })
        .select('id, group_id');
      if (error) throw new Error(error.message);

      // Manage scorer predictions only when explicitly provided.
      if (scorerPlayerIds !== undefined) {
        const pickIds = (upserted ?? []).map((p) => p.id);
        if (pickIds.length > 0) {
          // Replace: clear existing scorers for these picks first.
          const { error: delErr } = await supabase
            .from('scorer_picks')
            .delete()
            .in('pick_id', pickIds);
          if (delErr) throw new Error(delErr.message);

          if (scorerPlayerIds.length > 0) {
            const scorerRows = pickIds.flatMap((pid) =>
              scorerPlayerIds.map((playerId) => ({ pick_id: pid, player_id: playerId })),
            );
            const { error: insErr } = await supabase.from('scorer_picks').insert(scorerRows);
            if (insErr) throw new Error(insErr.message);
          }
        }
      }
    },
    onSuccess: (_v, { matchId, groupIds }) => {
      qc.invalidateQueries({ queryKey: ['my-picks-match', matchId] });
      qc.invalidateQueries({ queryKey: ['my-match-pick-detail', matchId] });
      qc.invalidateQueries({ queryKey: ['match-picks-in-group', matchId] });
      // Home tab depends on these — without invalidating them the chip
      // badges and pick labels won't update until next cold load.
      qc.invalidateQueries({ queryKey: ['my-all-picks'] });
      qc.invalidateQueries({ queryKey: ['my-picked-match-ids'] });
      qc.invalidateQueries({ queryKey: ['my-stats'] });
      qc.invalidateQueries({ queryKey: ['groups', 'me'] }); // myPts/myRank may change
      for (const gid of groupIds) {
        qc.invalidateQueries({ queryKey: ['my-pick', matchId, gid] });
        qc.invalidateQueries({ queryKey: ['group-pick-dist', matchId, gid] });
        qc.invalidateQueries({ queryKey: ['my-picks-in-group', gid] });
      }
    },
  });
}

// ─── Pre-load: my full pick detail for a match (per group) ────

export interface MyMatchPickDetail {
  groupId:    string;
  prediction: Prediction;
  homeGoals:  number | null;
  awayGoals:  number | null;
  scorerIds:  string[];
  withDraw:   boolean;
}

/**
 * My pick detail for a match across all my groups — used to pre-select the
 * winner, score, and scorers when re-entering the pick flow.
 */
export function useMyMatchPickDetail(matchId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-match-pick-detail', matchId, user?.id ?? null],
    enabled: !!matchId && !!user,
    queryFn: async (): Promise<Record<string, MyMatchPickDetail>> => {
      const { data, error } = await supabase
        .from('picks')
        .select('group_id, prediction, home_goals, away_goals, with_draw, scorer_picks ( player_id )')
        .eq('match_id', matchId!)
        .eq('user_id', user!.id);
      if (error) throw error;
      const out: Record<string, MyMatchPickDetail> = {};
      for (const row of (data ?? []) as Array<{
        group_id:    string;
        prediction:  string;
        home_goals:  number | null;
        away_goals:  number | null;
        with_draw:   boolean | null;
        scorer_picks: Array<{ player_id: string }> | null;
      }>) {
        out[row.group_id] = {
          groupId:    row.group_id,
          prediction: row.prediction as Prediction,
          homeGoals:  row.home_goals,
          awayGoals:  row.away_goals,
          scorerIds:  (row.scorer_picks ?? []).map((s) => s.player_id),
          withDraw:   row.with_draw ?? false,
        };
      }
      return out;
    },
  });
}
