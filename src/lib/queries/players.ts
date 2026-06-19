import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useIsAdmin } from './admin';

// ─── Types ────────────────────────────────────────────────────

export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FW';

export interface Player {
  id:       string;
  team_id:  string;
  name:     string;
  number:   number | null;
  position: PlayerPosition;
  active:   boolean;
}

/**
 * Fixed 4-3-3 formation. Each slot maps to a pitch position; the UI lays
 * these out in rows (1 GK · 4 DEF · 3 MID · 3 FW) from goal to attack.
 */
export const FORMATION_433: { slot: number; position: PlayerPosition }[] = [
  { slot: 1,  position: 'GK'  },
  { slot: 2,  position: 'DEF' },
  { slot: 3,  position: 'DEF' },
  { slot: 4,  position: 'DEF' },
  { slot: 5,  position: 'DEF' },
  { slot: 6,  position: 'MID' },
  { slot: 7,  position: 'MID' },
  { slot: 8,  position: 'MID' },
  { slot: 9,  position: 'FW'  },
  { slot: 10, position: 'FW'  },
  { slot: 11, position: 'FW'  },
];

/** Display order so rosters sort GK → DEF → MID → FW, then by number. */
const POSITION_ORDER: Record<PlayerPosition, number> = { GK: 0, DEF: 1, MID: 2, FW: 3 };

function sortRoster(a: Player, b: Player): number {
  const po = POSITION_ORDER[a.position] - POSITION_ORDER[b.position];
  if (po !== 0) return po;
  return (a.number ?? 999) - (b.number ?? 999);
}

// ─── Roster (per team) ────────────────────────────────────────

/** Active players for a team, sorted by position then number. */
export function useTeamPlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-players', teamId],
    enabled: !!teamId,
    staleTime: 60_000,
    queryFn: async (): Promise<Player[]> => {
      const { data, error } = await supabase
        .from('players')
        .select('id, team_id, name, number, position, active')
        .eq('team_id', teamId!)
        .eq('active', true);
      if (error) throw error;
      return ((data ?? []) as Player[]).sort(sortRoster);
    },
  });
}

export interface UpsertPlayerInput {
  id?:       string;
  team_id:   string;
  name:      string;
  number:    number | null;
  position:  PlayerPosition;
}

/** Create or update a single player. */
export function useUpsertPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertPlayerInput): Promise<string> => {
      if (input.id) {
        const { error } = await supabase
          .from('players')
          .update({
            name: input.name,
            number: input.number,
            position: input.position,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.id);
        if (error) throw new Error(error.message);
        return input.id;
      }
      const { data, error } = await supabase
        .from('players')
        .insert({
          team_id: input.team_id,
          name: input.name,
          number: input.number,
          position: input.position,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data.id;
    },
    onSuccess: (_id, input) => {
      qc.invalidateQueries({ queryKey: ['team-players', input.team_id] });
    },
  });
}

/** Soft-delete a player (active = false) so historic lineups/goals stay intact. */
export function useDeletePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; teamId: string }) => {
      const { error } = await supabase
        .from('players')
        .update({ active: false })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_v, { teamId }) => {
      qc.invalidateQueries({ queryKey: ['team-players', teamId] });
    },
  });
}

// ─── Lineups (per match + side) ───────────────────────────────

export interface LineupEntry {
  slot:   number;
  player: Player;
}

export interface MatchLineupData {
  /** Keyed by team_id → ordered slot entries. */
  byTeam: Record<string, LineupEntry[]>;
}

/** Full lineup for a match (both sides), with player info joined. */
export function useMatchLineup(matchId: string | undefined) {
  return useQuery({
    queryKey: ['match-lineup', matchId],
    enabled: !!matchId,
    queryFn: async (): Promise<MatchLineupData> => {
      const { data, error } = await supabase
        .from('match_lineups')
        .select('slot, team_id, players ( id, team_id, name, number, position, active )')
        .eq('match_id', matchId!);
      if (error) throw error;
      const byTeam: Record<string, LineupEntry[]> = {};
      for (const row of (data ?? []) as Array<{
        slot: number;
        team_id: string;
        players: Player | Player[] | null;
      }>) {
        const player = Array.isArray(row.players) ? row.players[0] : row.players;
        if (!player) continue;
        (byTeam[row.team_id] ??= []).push({ slot: row.slot, player });
      }
      for (const k of Object.keys(byTeam)) byTeam[k].sort((a, b) => a.slot - b.slot);
      return { byTeam };
    },
  });
}

export interface SaveLineupInput {
  matchId: string;
  teamId:  string;
  /** Exactly the slots to persist: { slot, playerId }. */
  slots:   { slot: number; playerId: string }[];
}

/** Replace a team's lineup for a match (delete-then-insert for idempotency). */
export function useSaveLineup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, teamId, slots }: SaveLineupInput) => {
      const { error: delErr } = await supabase
        .from('match_lineups')
        .delete()
        .eq('match_id', matchId)
        .eq('team_id', teamId);
      if (delErr) throw new Error(delErr.message);

      if (slots.length === 0) return;

      const rows = slots.map((s) => ({
        match_id:  matchId,
        team_id:   teamId,
        player_id: s.playerId,
        slot:      s.slot,
      }));
      const { error: insErr } = await supabase.from('match_lineups').insert(rows);
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: (_v, { matchId }) => {
      qc.invalidateQueries({ queryKey: ['match-lineup', matchId] });
    },
  });
}

/**
 * Most recent lineup for a team from a DIFFERENT match — used to "load
 * previous lineup" so admins don't re-enter the same 11 every week.
 * Returns slot→playerId pairs, or null if the team has no prior lineup.
 */
export function useLastTeamLineup(teamId: string | undefined, excludeMatchId: string | undefined) {
  return useQuery({
    queryKey: ['last-team-lineup', teamId, excludeMatchId],
    enabled: !!teamId,
    queryFn: async (): Promise<{ slot: number; playerId: string }[] | null> => {
      // Find the team's lineups in other matches, newest match first.
      const { data, error } = await supabase
        .from('match_lineups')
        .select('match_id, slot, player_id, matches!inner ( kickoff_at )')
        .eq('team_id', teamId!)
        .neq('match_id', excludeMatchId ?? '00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Array<{ match_id: string; slot: number; player_id: string }>;
      if (rows.length === 0) return null;
      // Pick the most-recently-created match's full set of 11.
      const newestMatch = rows[0].match_id;
      return rows
        .filter((r) => r.match_id === newestMatch)
        .map((r) => ({ slot: r.slot, playerId: r.player_id }))
        .sort((a, b) => a.slot - b.slot);
    },
  });
}

// ─── Actual match goals (admin-entered, for scoring) ──────────

export interface MatchGoalEntry {
  id:        string;
  player_id: string;
  team_id:   string;
}

export function useMatchGoals(matchId: string | undefined) {
  return useQuery({
    queryKey: ['match-goals', matchId],
    enabled: !!matchId,
    queryFn: async (): Promise<MatchGoalEntry[]> => {
      const { data, error } = await supabase
        .from('match_goals')
        .select('id, player_id, team_id')
        .eq('match_id', matchId!);
      if (error) throw error;
      return (data ?? []) as MatchGoalEntry[];
    },
  });
}

export interface SetMatchGoalsInput {
  matchId: string;
  /** One entry per goal scored: { playerId, teamId }. */
  goals:   { playerId: string; teamId: string }[];
}

/** Replace the actual scorers of a match (delete-then-insert). */
export function useSetMatchGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, goals }: SetMatchGoalsInput) => {
      const { error: delErr } = await supabase
        .from('match_goals')
        .delete()
        .eq('match_id', matchId);
      if (delErr) throw new Error(delErr.message);

      if (goals.length === 0) return;

      const rows = goals.map((g) => ({
        match_id:  matchId,
        player_id: g.playerId,
        team_id:   g.teamId,
      }));
      const { error: insErr } = await supabase.from('match_goals').insert(rows);
      if (insErr) throw new Error(insErr.message);
    },
    onSuccess: (_v, { matchId }) => {
      qc.invalidateQueries({ queryKey: ['match-goals', matchId] });
    },
  });
}
