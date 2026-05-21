import { USERS } from '../../data';
import type { User } from '../../types';

export type Scope = 'season' | 'jornada' | 'last5';

export const leaderboardRepo = {
  // Sorted standings for a group. Mock ignores scope/groupId for now.
  standings: async (_groupId?: string, _scope: Scope = 'season'): Promise<User[]> =>
    Object.values(USERS).sort((a, b) => b.points - a.points),
};
