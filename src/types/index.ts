// Domain types for Circl. Shaped so the mock data layer can later be
// swapped for Supabase queries without changing component code.

export type TeamCode =
  | 'AME' | 'GDL' | 'CAZ' | 'PUM' | 'MTY' | 'TIG' | 'TOL'
  | 'LEO' | 'PAC' | 'SAN' | 'NEC' | 'ATL' | 'PUE' | 'JUA';

export interface Team {
  code: TeamCode;
  name: string;
  city: string;
  primary: string;
  secondary: string;
  text: string;
  initial: string;
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
  stadium: string;
  round: string;
  status: MatchStatus;
  myPick: TeamCode | null;
  pts: string | null;
  score: [number, number] | null;
  correct?: boolean;
}

export interface Group {
  id: string;
  name: string;
  icon: string;
  accent: string;
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
