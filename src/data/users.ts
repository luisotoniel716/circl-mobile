import type { User } from '../types';

// `gradient` replaces the web CSS `linear-gradient(...)` strings, which RN
// can't parse — the Avatar renders it via expo-linear-gradient when present.
export const USERS: Record<string, User> = {
  me: { id: 'me', name: 'Diego Reyes',   username: '@dreyes',   initials: 'DR', color: '#FFB938', gradient: ['#FFB938', '#E89A12'], points: 1840, accuracy: 67, picks: 142, correct: 95 },
  u1: { id: 'u1', name: 'Mariana López', username: '@mari',     initials: 'ML', color: '#5C7BFF', gradient: ['#5C7BFF', '#002DE8'], points: 2105, accuracy: 71 },
  u2: { id: 'u2', name: 'Sofía Ramírez', username: '@sofiarmz', initials: 'SR', color: '#D43530', points: 1980, accuracy: 69 },
  u3: { id: 'u3', name: 'Andrés Galván', username: '@andresg',  initials: 'AG', color: '#0E7A3A', points: 1755, accuracy: 64 },
  u4: { id: 'u4', name: 'Luis Cárdenas', username: '@luisc',    initials: 'LC', color: '#272B45', points: 1620, accuracy: 60 },
  u5: { id: 'u5', name: 'Karla Mendoza', username: '@karlam',   initials: 'KM', color: '#FFB938', gradient: ['#FFB938', '#D31E2C'], points: 1410, accuracy: 56 },
  u6: { id: 'u6', name: 'Pablo Vázquez', username: '@pvaz',     initials: 'PV', color: '#1C1E37', points: 1180, accuracy: 52 },
  u7: { id: 'u7', name: 'Renata Ortiz',  username: '@renata',   initials: 'RO', color: '#1A7A3C', points: 980,  accuracy: 49 },
  u8: { id: 'u8', name: 'Iván Cabrera',  username: '@ivan_c',   initials: 'IC', color: '#003DA5', points: 820,  accuracy: 46 },
};
