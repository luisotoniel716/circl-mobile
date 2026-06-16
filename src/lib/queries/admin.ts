import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

// ─── Types ────────────────────────────────────────────────────

export type MatchStatusDB = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface AdminMatch {
  id:           string;
  kickoff_at:   string;     // ISO
  status:       MatchStatusDB;
  home_score:   number | null;
  away_score:   number | null;
  matchday:     number;
  league_id:    string;
  season_id:    string;
  home_team_id: string;
  away_team_id: string;
  /** Joined */
  home: { id: string; code: string; short_name: string; name: string };
  away: { id: string; code: string; short_name: string; name: string };
  /** Aggregate */
  picks_count: number;
}

export interface AdminTeam {
  id:         string;
  code:       string;
  short_name: string;
  name:       string;
  league_id:  string;
}

// ─── Admin status ─────────────────────────────────────────────

export function useIsAdmin() {
  const { profile } = useAuth();
  return profile?.is_admin ?? false;
}

// ─── Matches (admin view) ─────────────────────────────────────

/** All matches, ordered by kickoff DESC. Includes pick counts.
 *  Note: status filtering is done client-side in the consumer so that
 *  "live" can include scheduled matches whose kickoff has passed (auto-live).
 */
export function useAdminMatches(opts?: { matchday?: number }) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ['admin-matches', opts?.matchday ?? 'all'],
    enabled: isAdmin,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<AdminMatch[]> => {
      let q = supabase
        .from('matches')
        .select(`
          id, kickoff_at, status, home_score, away_score,
          matchday, league_id, season_id,
          home_team_id, away_team_id,
          home:home_team_id ( id, code, short_name, name ),
          away:away_team_id ( id, code, short_name, name )
        `)
        .order('kickoff_at', { ascending: false });

      if (opts?.matchday) q = q.eq('matchday', opts.matchday);

      const { data, error } = await q;
      if (error) throw error;

      const matches = (data ?? []) as unknown as Array<Omit<AdminMatch, 'picks_count'>>;

      // Get pick counts in parallel
      const counts = await Promise.all(
        matches.map(async (m) => {
          const { count } = await supabase
            .from('picks')
            .select('id', { count: 'exact', head: true })
            .eq('match_id', m.id);
          return [m.id, count ?? 0] as const;
        }),
      );
      const countMap = Object.fromEntries(counts);

      return matches.map((m) => ({ ...m, picks_count: countMap[m.id] ?? 0 }));
    },
  });
}

/** Single match with full details. */
export function useAdminMatch(matchId: string | undefined) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ['admin-match', matchId],
    enabled: isAdmin && !!matchId,
    queryFn: async (): Promise<AdminMatch | null> => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, kickoff_at, status, home_score, away_score,
          matchday, league_id, season_id,
          home_team_id, away_team_id,
          home:home_team_id ( id, code, short_name, name ),
          away:away_team_id ( id, code, short_name, name )
        `)
        .eq('id', matchId!)
        .single();
      if (error) throw error;
      if (!data) return null;

      const { count } = await supabase
        .from('picks')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', matchId!);

      return { ...(data as unknown as Omit<AdminMatch, 'picks_count'>), picks_count: count ?? 0 };
    },
  });
}

/** All teams (used in pickers). */
export function useAdminTeams() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ['admin-teams'],
    enabled: isAdmin,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AdminTeam[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, code, short_name, name, league_id')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminTeam[];
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────

export interface UpdateMatchInput {
  id:            string;
  kickoff_at?:   string;
  status?:       MatchStatusDB;
  home_score?:   number | null;
  away_score?:   number | null;
  matchday?:     number;
  home_team_id?: string;
  away_team_id?: string;
}

/** Update any match field. Trigger auto-recalculates pick_results when relevant. */
export function useUpdateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateMatchInput) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from('matches')
        .update(patch)
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_v, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin-matches'] });
      qc.invalidateQueries({ queryKey: ['admin-match', id] });
      qc.invalidateQueries({ queryKey: ['match', id] });
      qc.invalidateQueries({ queryKey: ['matches'] });
      qc.invalidateQueries({ queryKey: ['group-members'] });
      qc.invalidateQueries({ queryKey: ['my-stats'] });
      qc.invalidateQueries({ queryKey: ['my-all-picks'] });
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
    },
  });
}

/** Manually recalculate pick_results for a match. */
export function useRecalcResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string): Promise<number> => {
      const { data, error } = await supabase.rpc('calculate_pick_results', { p_match_id: matchId });
      if (error) throw new Error(error.message);
      return (data as number) ?? 0;
    },
    onSuccess: (_n, matchId) => {
      qc.invalidateQueries({ queryKey: ['admin-match', matchId] });
      qc.invalidateQueries({ queryKey: ['group-members'] });
      qc.invalidateQueries({ queryKey: ['my-stats'] });
      qc.invalidateQueries({ queryKey: ['my-all-picks'] });
      qc.invalidateQueries({ queryKey: ['groups', 'me'] });
    },
  });
}

export interface CreateMatchInput {
  home_team_id: string;
  away_team_id: string;
  kickoff_at:   string;
  matchday:     number;
  league_id:    string;
  season_id:    string;
  status?:      MatchStatusDB;
}

export function useCreateMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMatchInput): Promise<string> => {
      const { data, error } = await supabase
        .from('matches')
        .insert({ ...input, status: input.status ?? 'scheduled' })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-matches'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-matches'] });
      qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
