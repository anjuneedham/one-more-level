import { MEMORY_CHALLENGES } from '../challenges/memory';
import { MOTION_CHALLENGES } from '../challenges/motion';
import { PRECISION_CHALLENGES } from '../challenges/precision';
import { PUZZLE_CHALLENGES } from '../challenges/puzzle';
import { TAP_CHALLENGES } from '../challenges/tap';
import type { ChallengeDef } from './types';

/** Every mini-challenge in the game. Adding one is a single push here. */
export const CHALLENGES: ChallengeDef[] = [
  ...TAP_CHALLENGES,
  ...MEMORY_CHALLENGES,
  ...MOTION_CHALLENGES,
  ...PRECISION_CHALLENGES,
  ...PUZZLE_CHALLENGES,
];

export const CHALLENGES_BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

/**
 * Challenges used for the very first level of a run: instantly readable, no
 * memorisation, no failure state that can surprise a new player.
 */
export const STARTER_IDS = ['tap_fast', 'color_match', 'moving_target', 'correct_order'];
