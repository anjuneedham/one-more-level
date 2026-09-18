import type { Rng } from '../core/rng';
import { CHALLENGES, CHALLENGES_BY_ID, STARTER_IDS } from './registry';
import type { ChallengeDef, ChallengeTag } from './types';

/**
 * Picks what the player plays next.
 *
 * Rules, in order of importance:
 *  - never repeat the challenge that just played (or the few before it),
 *  - respect a challenge's `minLevel` so combo challenges arrive later,
 *  - bias away from the tags used last round so consecutive challenges feel
 *    different (a tap game, then a drag game, then a memory game),
 *  - otherwise weighted-random, so the run stays unpredictable.
 */
export class ChallengeManager {
  private recent: string[] = [];
  private lastTags: ChallengeTag[] = [];

  constructor(private readonly pool: ChallengeDef[] = CHALLENGES) {}

  reset(): void {
    this.recent = [];
    this.lastTags = [];
  }

  next(level: number, rng: Rng): ChallengeDef {
    if (level <= 1) {
      const starters = STARTER_IDS.map((id) => CHALLENGES_BY_ID.get(id)).filter(
        (c): c is ChallengeDef => Boolean(c),
      );
      const pick = rng.pick(starters.length ? starters : this.pool);
      this.remember(pick);
      return pick;
    }

    const eligible = this.pool.filter((c) => level >= (c.minLevel ?? 1));
    // Keep a short memory, but never shrink the candidate set to nothing.
    const memory = Math.min(3, Math.max(1, Math.floor(eligible.length / 3)));
    const recent = this.recent.slice(-memory);
    const fresh = eligible.filter((c) => !recent.includes(c.id));
    const candidates = fresh.length > 0 ? fresh : eligible;

    const weights = candidates.map((c) => {
      const base = c.weight ?? 1;
      const overlap = c.tags.filter((t) => this.lastTags.includes(t)).length;
      // Same-feel challenges are not banned, just less likely.
      return base * (overlap > 0 ? 0.35 : 1);
    });

    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = rng.next() * total;
    let chosen = candidates[candidates.length - 1];
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        chosen = candidates[i];
        break;
      }
    }

    this.remember(chosen);
    return chosen;
  }

  private remember(def: ChallengeDef): void {
    this.recent.push(def.id);
    if (this.recent.length > 8) this.recent.shift();
    this.lastTags = def.tags;
  }
}
