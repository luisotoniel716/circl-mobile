// Static map of team code → bundled PNG logo.
// Metro requires literal require() calls — do not refactor to a loop.
import type { TeamCode } from '../types';

export const TEAM_LOGOS: Record<TeamCode, number> = {
  AME:  require('../../assets/teams/america.png'),
  GDL:  require('../../assets/teams/guadalajara.png'),
  CAZ:  require('../../assets/teams/cruzazul.png'),
  PUM:  require('../../assets/teams/pumas.png'),
  MTY:  require('../../assets/teams/monterrey.png'),
  TIG:  require('../../assets/teams/tigres.png'),
  TOL:  require('../../assets/teams/toluca.png'),
  LEO:  require('../../assets/teams/leon.png'),
  PAC:  require('../../assets/teams/pachuca.png'),
  SAN:  require('../../assets/teams/santos.png'),
  NEC:  require('../../assets/teams/necaxa.png'),
  ATL:  require('../../assets/teams/atlas.png'),
  PUE:  require('../../assets/teams/puebla.png'),
  JUA:  require('../../assets/teams/juarez.png'),
  QRO:  require('../../assets/teams/queretaro.png'),
  TIJ:  require('../../assets/teams/tijuana.png'),
  MAZ:  require('../../assets/teams/mazatlan.png'),
  ATSL: require('../../assets/teams/atleticosl.png'),
};
