import { MATCHES } from '../../data';
import type { Match, TeamCode } from '../../types';

export const picksRepo = {
  matches: async (): Promise<Match[]> => MATCHES,
  get: async (id: string): Promise<Match | null> => MATCHES.find((m) => m.id === id) ?? null,
  makePick: async (matchId: string, pick: TeamCode): Promise<void> => {
    const m = MATCHES.find((x) => x.id === matchId);
    if (m && m.status === 'upcoming') m.myPick = pick;
  },
};
