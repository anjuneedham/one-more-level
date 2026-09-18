import { clamp } from '../core/draw';
import type { Rng } from '../core/rng';
import { BALANCE } from '../services/config';
import type { ChallengeParams, DifficultyBand } from './types';

export function bandForLevel(level: number): DifficultyBand {
  if (level <= 5) return 'easy';
  if (level <= 10) return 'normal';
  if (level <= 20) return 'hard';
  return 'expert';
}

export function coinsForBand(band: DifficultyBand): number {
  return BALANCE.coins[band];
}

/**
 * Difficulty curve. The main ramp is spread over the first ~24 levels; past
 * that a slow "overdrive" term keeps deep runs escalating without ever making
 * the game a pure speed test - challenges spend the budget on more objects,
 * smaller targets and longer patterns as well as on speed.
 */
export function difficultyForLevel(level: number): number {
  const ramp = clamp((level - 1) / 24, 0, 1);
  const overdrive = clamp((level - 25) / 60, 0, 0.35);
  return ramp + overdrive;
}

export function paramsForLevel(level: number, rng: Rng): ChallengeParams {
  const difficulty = difficultyForLevel(level);
  return {
    level,
    band: bandForLevel(level),
    difficulty,
    speed: 0.85 + difficulty * 1.1,
    targetSize: clamp(1.15 - difficulty * 0.55, 0.5, 1.2),
    timer: Math.max(4, 9 - difficulty * 3.5),
    objectCount: Math.round(3 + difficulty * 7),
    precision: clamp(1 - difficulty * 0.55, 0.4, 1),
    rng,
  };
}

/** Interpolates a per-challenge value across the difficulty curve. */
export function scale(params: ChallengeParams, easy: number, hard: number): number {
  return easy + (hard - easy) * Math.min(1, params.difficulty);
}

/** Same as `scale` but rounded to a whole number (counts, steps, objects). */
export function scaleInt(params: ChallengeParams, easy: number, hard: number): number {
  return Math.round(scale(params, easy, hard));
}

/** Seconds on the clock, never below `min`. */
export function scaleTime(params: ChallengeParams, easy: number, hard: number, min = 2.5): number {
  return Math.max(min, scale(params, easy, hard));
}
