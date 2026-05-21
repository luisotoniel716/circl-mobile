import { GROUPS } from '../../data';
import type { Group } from '../../types';

export const groupsRepo = {
  list: async (): Promise<Group[]> => GROUPS,
  get: async (id: string): Promise<Group | null> => GROUPS.find((g) => g.id === id) ?? null,
  create: async (input: Pick<Group, 'name' | 'icon' | 'accent'>): Promise<Group> => ({
    id: `g${Date.now()}`,
    members: 1,
    myRank: 1,
    myPts: 0,
    lastMatch: '—',
    avatars: ['DR'],
    ...input,
  }),
};
