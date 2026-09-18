import type { Ctx } from '../core/draw';
import type { Particles } from '../core/particles';
import type { Rng } from '../core/rng';
import type { Pointer } from '../core/stage';
import type { HapticKind } from '../services/haptics';
import type { SoundName } from '../services/audio';

export type DifficultyBand = 'easy' | 'normal' | 'hard' | 'expert';

export type ChallengeTag =
  | 'tap'
  | 'hold'
  | 'swipe'
  | 'drag'
  | 'memory'
  | 'reflex'
  | 'avoid'
  | 'puzzle'
  | 'timing';

/**
 * Parameters handed to every challenge. Tuning these turns 25 mechanics into
 * hundreds of distinct playable variations.
 */
export interface ChallengeParams {
  level: number;
  band: DifficultyBand;
  /** 0 (easiest) .. ~1.35 (deep runs). */
  difficulty: number;
  /** Movement multiplier, ~0.85 .. ~2.0. */
  speed: number;
  /** Target radius multiplier, ~1.15 .. ~0.55. */
  targetSize: number;
  /** Suggested seconds on the clock; challenges may override. */
  timer: number;
  /** Suggested number of on-screen objects. */
  objectCount: number;
  /** Tolerance multiplier for timing/precision windows, ~1.0 .. ~0.45. */
  precision: number;
  rng: Rng;
}

/** Services a running challenge is allowed to touch. */
export interface ChallengeHost {
  /** Playfield size in CSS pixels; origin is the playfield's top-left. */
  readonly width: number;
  readonly height: number;
  readonly particles: Particles;
  /** Report success. Ignored after the challenge has already resolved. */
  win(): void;
  /** Report failure. Ignored after the challenge has already resolved. */
  fail(reason?: string): void;
  sound(name: SoundName): void;
  haptic(kind: HapticKind): void;
  shake(amount: number): void;
  /** Update the instruction line mid-challenge (e.g. "TAP BLUE"). */
  setInstruction(text: string): void;
  /** 0..1 sub-progress shown under the instruction (taps done, etc.). */
  setProgress(value: number): void;
}

export interface Challenge {
  /** Seconds on the clock. Falls back to params.timer. */
  readonly timeLimit?: number;
  /** What a expired timer means for this challenge. Default: 'fail'. */
  readonly onTimeout?: 'fail' | 'win' | 'ignore';
  /** Hide the countdown when showing it would spoil the challenge. */
  readonly hideTimer?: boolean;
  /** Called once the countdown starts. */
  enter?(): void;
  update(dt: number): void;
  render(g: Ctx): void;
  onDown?(p: Pointer): void;
  onMove?(p: Pointer): void;
  onUp?(p: Pointer): void;
  exit?(): void;
}

export interface ChallengeDef {
  id: string;
  /** Shown big on the intro card, e.g. "TAP FAST". */
  title: string;
  /** Shown under the title and during play. */
  instruction: string;
  tags: ChallengeTag[];
  /** Relative selection weight (default 1). */
  weight?: number;
  /** Earliest level this challenge may appear at. */
  minLevel?: number;
  create(params: ChallengeParams, host: ChallengeHost): Challenge;
}
