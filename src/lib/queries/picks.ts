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
        .select('user_id, prediction, pick_results ( correct, points )')
        .eq('match_id', matchId!)
        .eq('group_id', groupId!);
      if (error) throw error;
      const out: Record<string, PickWithResult> = {};
      for (const row of (data ?? []) as Array<{
        user_id:    string;
        prediction: string;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        out[row.user_id] = {
          prediction: row.prediction as Prediction,
          correct:    pr?.correct ?? null,
          points:     pr?.points  ?? 0,
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

export interface PickWithResult {
  prediction: Prediction;
  correct:    boolean | null;   // null = match not finished yet
  points:     number;
}

/**
 * Same as PickWithResult but adds the count of distinct groups where the
 * user has picked this match. Used by home to show "partial" pick status.
 */
export interface PickWithResultAndCount extends PickWithResult {
  /** Number of distinct groups in which the user has a pick for this match. */
  groupCount: number;
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
        .select('match_id, prediction, pick_results ( correct, points )')
        .eq('group_id', groupId!)
        .eq('user_id', user!.id);
      if (error) throw error;
      const out: Record<string, PickWithResult> = {};
      for (const row of (data ?? []) as Array<{
        match_id:     string;
        prediction:   string;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        out[row.match_id] = {
          prediction: row.prediction as Prediction,
          correct:    pr?.correct ?? null,
          points:     pr?.points  ?? 0,
        };
      }
      return out;
    },
  });
}

/**
 * All my picks across all groups, keyed by match_id.
 * If user has picks in multiple groups for the same match, returns any one
 * (predictions should usually match across groups). Used in home to enrich
 * the matches list with my pick + result for "My picks" chip.
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
      // count alongside the chosen prediction.
      const seenGroups: Record<string, Set<string>> = {};
      for (const row of (data ?? []) as Array<{
        match_id:     string;
        group_id:     string;
        prediction:   string;
        pick_results: { correct: boolean; points: number } | { correct: boolean; points: number }[] | null;
      }>) {
        const pr = Array.isArray(row.pick_results) ? row.pick_results[0] : row.pick_results;
        const groups = seenGroups[row.match_id] ?? (seenGroups[row.match_id] = new Set());
        groups.add(row.group_id);
        // Keep first-seen pick per match; later groups overwrite only if they
        // have a result and the current one doesn't.
        const existing = out[row.match_id];
        if (!existing || (existing.correct === null && pr?.correct != null)) {
          out[row.match_id] = {
            prediction: row.prediction as Prediction,
            correct:    pr?.correct ?? null,
            points:     pr?.points  ?? 0,
            groupCount: groups.size,
          };
        } else {
          // Already kept an entry — just bump the count.
          existing.groupCount = groups.size;
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
}

/**
 * Upsert a pick for one or more groups at once.
 * Uses the UNIQUE(user_id, match_id, group_id) constraint
 * to update existing picks instead of erroring.
 */
export function useSubmitPick() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ matchId, prediction, groupIds }: SubmitPickInput) => {
      if (!user) throw new Error('No estás autenticado.');
      if (groupIds.length === 0) throw new Error('Selecciona al menos un grupo.');

      const rows = groupIds.map((gid) => ({
        match_id:   matchId,
        group_id:   gid,
        user_id:    user.id,
        prediction,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('picks')
        .upsert(rows, { onConflict: 'user_id,match_id,group_id' });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_v, { matchId, groupIds }) => {
      qc.invalidateQueries({ queryKey: ['my-picks-match', matchId] });
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
