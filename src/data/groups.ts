import type { Group } from '../types';

export const GROUPS: Group[] = [
  { id: 'g1', name: 'La Quiniela', icon: '⚽', accent: '#002DE8', members: 8,  myRank: 3,  myPts: 480, lastMatch: 'AME vs GDL', avatars: ['DR', 'ML', 'SR', 'AG', 'LC'] },
  { id: 'g2', name: 'Oficina FC',  icon: '🏆', accent: '#FFB938', members: 14, myRank: 7,  myPts: 312, lastMatch: 'CAZ vs PUM', avatars: ['DR', 'KM', 'PV', 'RO'] },
  { id: 'g3', name: 'Los Compas',  icon: '🔥', accent: '#D43530', members: 5,  myRank: 1,  myPts: 625, lastMatch: 'MTY vs TIG', avatars: ['DR', 'IC', 'AG'] },
  { id: 'g4', name: 'Liga MX Pro', icon: '⭐', accent: '#1A7A3C', members: 32, myRank: 14, myPts: 218, lastMatch: 'TOL vs LEO', avatars: ['DR', 'ML', 'SR', 'LC', 'PV', 'RO'] },
];
