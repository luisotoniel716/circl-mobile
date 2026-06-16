import type { Team, TeamCode } from '../types';
import { TEAM_LOGOS } from './teamLogos';

const RAW: Record<TeamCode, Omit<Team, 'logo'>> = {
  AME:  { code: 'AME',  name: 'América',        city: 'CDMX',           primary: '#FFE600', secondary: '#001E62', text: '#001E62', initial: 'A' },
  GDL:  { code: 'GDL',  name: 'Chivas',         city: 'Guadalajara',    primary: '#C8102E', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'C' },
  CAZ:  { code: 'CAZ',  name: 'Cruz Azul',      city: 'CDMX',           primary: '#1B449C', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'C' },
  PUM:  { code: 'PUM',  name: 'Pumas',          city: 'UNAM',           primary: '#001E62', secondary: '#D9B863', text: '#D9B863', initial: 'P' },
  MTY:  { code: 'MTY',  name: 'Rayados',        city: 'Monterrey',      primary: '#003DA5', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'M' },
  TIG:  { code: 'TIG',  name: 'Tigres',         city: 'UANL',           primary: '#F4B300', secondary: '#000000', text: '#000000', initial: 'T' },
  TOL:  { code: 'TOL',  name: 'Toluca',         city: 'Toluca',         primary: '#D31E2C', secondary: '#000000', text: '#FFFFFF', initial: 'T' },
  LEO:  { code: 'LEO',  name: 'León',           city: 'León',           primary: '#1A7A3C', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'L' },
  PAC:  { code: 'PAC',  name: 'Pachuca',        city: 'Pachuca',        primary: '#0B4B9F', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'P' },
  SAN:  { code: 'SAN',  name: 'Santos',         city: 'Laguna',         primary: '#00803B', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'S' },
  NEC:  { code: 'NEC',  name: 'Necaxa',         city: 'Aguascalientes', primary: '#E62235', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'N' },
  ATL:  { code: 'ATL',  name: 'Atlas',          city: 'Guadalajara',    primary: '#D7102A', secondary: '#000000', text: '#FFFFFF', initial: 'A' },
  PUE:  { code: 'PUE',  name: 'Puebla',         city: 'Puebla',         primary: '#003B7A', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'P' },
  JUA:  { code: 'JUA',  name: 'Juárez',         city: 'Cd. Juárez',     primary: '#0BA15C', secondary: '#000000', text: '#FFFFFF', initial: 'J' },
  QRO:  { code: 'QRO',  name: 'Querétaro',      city: 'Querétaro',      primary: '#0E1A3C', secondary: '#000000', text: '#FFFFFF', initial: 'Q' },
  TIJ:  { code: 'TIJ',  name: 'Xolos',          city: 'Tijuana',        primary: '#C8102E', secondary: '#000000', text: '#FFFFFF', initial: 'X' },
  MAZ:  { code: 'MAZ',  name: 'Mazatlán',       city: 'Mazatlán',       primary: '#5C2D8B', secondary: '#E6C46A', text: '#FFFFFF', initial: 'M' },
  ATSL: { code: 'ATSL', name: 'Atlético San Luis', city: 'San Luis Potosí', primary: '#D7102A', secondary: '#FFFFFF', text: '#FFFFFF', initial: 'S' },
};

// Attach bundled logo asset to each team.
export const LIGAMX: Record<TeamCode, Team> = Object.fromEntries(
  (Object.keys(RAW) as TeamCode[]).map((code) => [code, { ...RAW[code], logo: TEAM_LOGOS[code] }]),
) as Record<TeamCode, Team>;
