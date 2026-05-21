import type { Match } from '../types';

export const MATCHES: Match[] = [
  { id: 'm1', home: 'AME', away: 'GDL', kickoff: 'Tonight · 21:00', stadium: 'Estadio Azteca', round: 'Jornada 14', status: 'upcoming', myPick: null,  pts: null,  score: null },
  { id: 'm2', home: 'CAZ', away: 'PUM', kickoff: 'Tonight · 19:00', stadium: 'Estadio Azul',   round: 'Jornada 14', status: 'upcoming', myPick: 'CAZ', pts: null,  score: null },
  { id: 'm3', home: 'MTY', away: 'TIG', kickoff: "Live · 67'",      stadium: 'BBVA',           round: 'Jornada 14', status: 'live',     myPick: 'MTY', pts: null,  score: [2, 1] },
  { id: 'm4', home: 'TOL', away: 'LEO', kickoff: 'Sat · 17:00',     stadium: 'Nemesio Díez',   round: 'Jornada 14', status: 'upcoming', myPick: null,  pts: null,  score: null },
  { id: 'm5', home: 'PAC', away: 'SAN', kickoff: 'Final',           stadium: 'Hidalgo',        round: 'Jornada 13', status: 'finished', myPick: 'PAC', pts: '+12', score: [3, 1], correct: true },
  { id: 'm6', home: 'NEC', away: 'ATL', kickoff: 'Final',           stadium: 'Victoria',       round: 'Jornada 13', status: 'finished', myPick: 'ATL', pts: '0',   score: [2, 0], correct: false },
];
