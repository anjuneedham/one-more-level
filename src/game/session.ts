import { BALANCE } from '../services/config';
import { Save } from '../services/storage';
import { bandForLevel, coinsForBand } from './difficulty';
import type { DifficultyBand } from './types';

export interface ChallengeReward {
  coins: number;
  points: number;
  /** Bonus points for finishing well before the timer ran out. */
  speedBonus: number;
}

export interface RunSummary {
  level: number;
  score: number;
  coins: number;
  newBestLevel: boolean;
  newBestScore: boolean;
  durationSec: number;
}

/** State of a single run: level, lives, score and the coins earned so far. */
export class GameSession {
  level = 1;
  lives: number = BALANCE.startingLives;
  score = 0;
  coinsEarned = 0;
  completed = 0;
  revives = 0;
  private startedAt = Date.now();
  private recorded = false;

  get band(): DifficultyBand {
    return bandForLevel(this.level);
  }

  get isAlive(): boolean {
    return this.lives > 0;
  }

  /** Applies the reward for a cleared challenge and advances the level. */
  complete(timeLeftRatio: number): ChallengeReward {
    const coins = coinsForBand(this.band);
    const base = BALANCE.scorePerLevel + this.level * 10;
    const speedBonus = Math.round(Math.max(0, timeLeftRatio) * 60);
    this.score += base + speedBonus;
    this.coinsEarned += coins;
    this.completed += 1;
    this.level += 1;
    Save.addCoins(coins);
    return { coins, points: base + speedBonus, speedBonus };
  }

  /** Returns true when the run continues, false at 0 lives. */
  loseLife(): boolean {
    this.lives = Math.max(0, this.lives - 1);
    return this.lives > 0;
  }

  /** Used by the rewarded-ad continue. */
  revive(lives = 1): void {
    this.lives = Math.min(BALANCE.maxLives, this.lives + lives);
    this.revives += 1;
  }

  /** Writes records to local storage and returns the run summary. */
  finish(): RunSummary {
    // The level they died on is the level they reached.
    const reachedLevel = Math.max(1, this.level);
    const records = Save.recordRun(reachedLevel, this.score, !this.recorded);
    this.recorded = true;
    return {
      level: reachedLevel,
      score: this.score,
      coins: this.coinsEarned,
      newBestLevel: records.newBestLevel,
      newBestScore: records.newBestScore,
      durationSec: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }
}
