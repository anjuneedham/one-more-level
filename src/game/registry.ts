import { LOGIC_CHALLENGES } from '../challenges/logic';
import { MEMORY_CHALLENGES } from '../challenges/memory';
import { MOTION_CHALLENGES } from '../challenges/motion';
import { PERCEPTION_CHALLENGES } from '../challenges/perception';
import { PRECISION_CHALLENGES } from '../challenges/precision';
import { PUZZLE_CHALLENGES } from '../challenges/puzzle';
import { REFLEX_CHALLENGES } from '../challenges/reflex';
import { RHYTHM_CHALLENGES } from '../challenges/rhythm';
import { SPATIAL_CHALLENGES } from '../challenges/spatial';
import { TAP_CHALLENGES } from '../challenges/tap';
import type { ChallengeDef } from './types';

/** Every mini-challenge in the game. Adding one is a single push here. */
export const CHALLENGES: ChallengeDef[] = [
  ...TAP_CHALLENGES,
  ...MEMORY_CHALLENGES,
  ...MOTION_CHALLENGES,
  ...PRECISION_CHALLENGES,
  ...PUZZLE_CHALLENGES,
  ...REFLEX_CHALLENGES,
  ...LOGIC_CHALLENGES,
  ...SPATIAL_CHALLENGES,
  ...RHYTHM_CHALLENGES,
  ...PERCEPTION_CHALLENGES,
];

export const CHALLENGES_BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export interface Family {
  name: string;
  color: string;
}

const FAMILY_LIST: [Family, ChallengeDef[]][] = [
  [{ name: 'TAP', color: '#5B7BFF' }, TAP_CHALLENGES],
  [{ name: 'MEMORY', color: '#B06BFF' }, MEMORY_CHALLENGES],
  [{ name: 'MOTION', color: '#45E0E5' }, MOTION_CHALLENGES],
  [{ name: 'PRECISION', color: '#FF9F45' }, PRECISION_CHALLENGES],
  [{ name: 'PUZZLE', color: '#3DDC97' }, PUZZLE_CHALLENGES],
  [{ name: 'REFLEX', color: '#FF5E7A' }, REFLEX_CHALLENGES],
  [{ name: 'LOGIC', color: '#FFD166' }, LOGIC_CHALLENGES],
  [{ name: 'SPATIAL', color: '#4D8BFF' }, SPATIAL_CHALLENGES],
  [{ name: 'RHYTHM', color: '#FF7BD5' }, RHYTHM_CHALLENGES],
  [{ name: 'PERCEPTION', color: '#7BE0B0' }, PERCEPTION_CHALLENGES],
];

const FAMILY_BY_ID = new Map<string, Family>(
  FAMILY_LIST.flatMap(([family, defs]) => defs.map((d) => [d.id, family] as const)),
);

export function familyOf(id: string): Family {
  return FAMILY_BY_ID.get(id) ?? FAMILY_LIST[0][0];
}

/**
 * Challenges used for the very first level of a run: instantly readable, no
 * memorisation, no failure state that can surprise a new player.
 */
export const STARTER_IDS = ['tap_fast', 'color_match', 'moving_target', 'correct_order'];
