// Domain types for Circl. Shaped so the mock data layer can later be
// swapped for Supabase queries without changing component code.

export type TeamCode =
  | 'AME' | 'GDL' | 'CAZ' | 'PUM' | 'MTY' | 'TIG' | 'TOL'
  | 'LEO' | 'PAC' | 'SAN' | 'NEC' | 'ATL' | 'PUE' | 'JUA'
  | 'QRO' | 'TIJ' | 'MAZ' | 'ATSL';

export interface Team {
  code: TeamCode;
  name: string;
  city: string;
  primary: string;
  secondary: string;
  text: string;
  initial: string;
  /** Local require()'d PNG asset. Falls back to initial-circle when missing. */
  logo?: number;
}

export interface User {
  id: string;
  name: string;
  username: string;
  initials: string;
  /** Solid color background for the avatar. */
  color: string;
  /** Optional 2-stop gradient for the avatar (overrides color when present). */
  gradient?: [string, string];
  points: number;
  accuracy: number;
  picks?: number;
  correct?: number;
}

export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Match {
  id: string;
  home: TeamCode;
  away: TeamCode;
  kickoff: string;
  /** Raw ISO string of kickoff time, when sourced from Supabase. */
  kickoff_at?: string;
  stadium: string;
  round: string;
  status: MatchStatus;
  /** Team UUIDs (when sourced from Supabase) — used to look up lineups. */
  home_team_id?: string;
  away_team_id?: string;
  myPick: TeamCode | null;
  pts: string | null;
  score: [number, number] | null;
  correct?: boolean;
  /**
   * Per-group pick coverage for the current user. When the user belongs to
   * multiple groups but has only picked in some, the UI shows N/M alongside
   * the pick label so it's clear it isn't applied everywhere.
   */
  myPickGroupsPicked?: number;
  myPickGroupsTotal?: number;
  /** True when the user's prediction differs between groups for this match. */
  myPickVaries?: boolean;
}

export interface Group {
  id: string;
  name: string;
  icon: string;
  accent: string;
  /** Optional cover photo. When present, UIs should render this instead of the emoji icon. */
  image_url?: string | null;
  members: number;
  myRank: number;
  myPts: number;
  lastMatch: string;
  avatars: string[];
}

export type NotificationType =
  | 'friend_req'
  | 'group_invite'
  | 'pick_correct'
  | 'rank_up'
  | 'match_soon'
  | 'friend_accept'
  | 'result';

export interface AppNotification {
  id: string;
  type: NotificationType;
  when: string;
  user?: string;
  group?: string | { name: string; members: number; by: string };
  match?: string;
  points?: number;
  pts?: string;
  from?: number;
  to?: number;
  in?: string;
  correct?: boolean;
}
