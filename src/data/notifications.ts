import type { AppNotification } from '../types';

export const NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', type: 'friend_req',    user: 'u2', when: '2m' },
  { id: 'n2', type: 'group_invite',  group: { name: 'Pumas Hasta La Muerte', members: 11, by: 'u3' }, when: '18m' },
  { id: 'n3', type: 'pick_correct',  match: 'PAC vs SAN', points: 12, when: '1h' },
  { id: 'n4', type: 'rank_up',       group: 'La Quiniela', from: 5, to: 3, when: '1h' },
  { id: 'n5', type: 'match_soon',    match: 'AME vs GDL', in: '30 min', when: '2h' },
  { id: 'n6', type: 'friend_accept', user: 'u4', when: '4h' },
  { id: 'n7', type: 'result',        match: 'NEC vs ATL', pts: '0', correct: false, when: '1d' },
];
