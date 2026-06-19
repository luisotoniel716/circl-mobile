import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Match, TeamCode } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────

function formatKickoff(iso: string, status: string): string {
  if (status === 'live')     return '';        // badge handles "LIVE"
  if (status === 'finished') return 'Final';

  const d  = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (sameDay) return `Tonight · ${time}`;

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${days[d.getDay()]} · ${time}`;
}

type MatchRow = {
  id: string;
  kickoff_at: string;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  home_score: number | null;
  away_score: number | null;
  matchday: number;
  home_team_id?: string;
  away_team_id?: string;
  home: { code: string; short_name: string } | null;
  away: { code: string; short_name: string } | null;
};

function toUI(row: MatchRow, myPickCode: TeamCode | null = null): Match {
  // Auto-promote scheduled → live if kickoff has passed but admin hasn't
  // flipped the status yet. Admin "finished" always wins.
  const now = Date.now();
  const kickoffMs = new Date(row.kickoff_at).getTime();
  const autoLive = row.status === 'scheduled' && kickoffMs <= now;

  const status: Match['status'] =
    row.status === 'finished' ? 'finished' :
    row.status === 'live' || autoLive ? 'live' :
    'upcoming';

  return {
    id:         row.id,
    home:       (row.home?.code ?? 'AME') as TeamCode,
    away:       (row.away?.code ?? 'GDL') as TeamCode,
    home_team_id: row.home_team_id,
    away_team_id: row.away_team_id,
    kickoff:    formatKickoff(row.kickoff_at, status === 'live' ? 'live' : row.status),
    kickoff_at: row.kickoff_at,
    stadium:    '',                                // not in schema yet
    round:      `Jornada ${row.matchday}`,
    status,
    myPick:     myPickCode,
    pts:        null,
    score:      row.home_score != null && row.away_score != null
                  ? [row.home_score, row.away_score]
                  : null,
  };
}

// ─── Hooks ────────────────────────────────────────────────────

/** All matches in the active season, ordered by kickoff. */
export function useMatches(opts?: { matchday?: number; limit?: number }) {
  return useQuery({
    queryKey: ['matches', opts?.matchday ?? 'all', opts?.limit ?? null],
    refetchInterval: 30_000,        // refresh so scheduled→live auto-promotes
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Match[]> => {
      let q = supabase
        .from('matches')
        .select(`
          id, kickoff_at, status, home_score, away_score, matchday,
          home:home_team_id ( code, short_name ),
          away:away_team_id ( code, short_name )
        `)
        .order('kickoff_at', { ascending: true });

      if (opts?.matchday) q = q.eq('matchday', opts.matchday);
      if (opts?.limit)    q = q.limit(opts.limit);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => toUI(r as unknown as MatchRow));
    },
  });
}

/** All matches for a specific league. */
export function useLeagueMatches(leagueId: string | undefined) {
  return useQuery({
    queryKey: ['matches', 'league', leagueId],
    enabled: !!leagueId,
    queryFn: async (): Promise<Match[]> => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, kickoff_at, status, home_score, away_score, matchday,
          home:home_team_id ( code, short_name ),
          away:away_team_id ( code, short_name )
        `)
        .eq('league_id', leagueId!)
        .order('kickoff_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => toUI(r as unknown as MatchRow));
    },
  });
}

/** Single match by ID. */
export function useMatch(matchId: string | undefined) {
  return useQuery({
    queryKey: ['match', matchId],
    enabled: !!matchId,
    queryFn: async (): Promise<Match | null> => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, kickoff_at, status, home_score, away_score, matchday,
          home_team_id, away_team_id,
          home:home_team_id ( code, short_name ),
          away:away_team_id ( code, short_name )
        `)
        .eq('id', matchId!)
        .single();
      if (error) throw error;
      if (!data) return null;
      return toUI(data as unknown as MatchRow);
    },
  });
}

/** Today's matches — live + scheduled within next ~36h. */
export function useTodayMatches() {
  return useQuery({
    queryKey: ['matches', 'today'],
    staleTime: 30_000,
    queryFn: async (): Promise<Match[]> => {
      const now    = new Date();
      const cutoff = new Date(now.getTime() + 36 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, kickoff_at, status, home_score, away_score, matchday,
          home:home_team_id ( code, short_name ),
          away:away_team_id ( code, short_name )
        `)
        .in('status', ['scheduled', 'live'])
        .lte('kickoff_at', cutoff.toISOString())
        .order('kickoff_at', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((r) => toUI(r as unknown as MatchRow));
    },
  });
}
