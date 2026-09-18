/**
 * Local save data. Synchronous and dependency-free (localStorage is persisted
 * by the Android WebView), so the game works fully offline and never blocks
 * on I/O during a run.
 */

export interface SaveData {
  bestLevel: number;
  bestScore: number;
  coins: number;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  runs: number;
  lastPlayed: number;
}

const KEY = 'oml.save.v1';

const DEFAULTS: SaveData = {
  bestLevel: 0,
  bestScore: 0,
  coins: 0,
  soundEnabled: true,
  hapticEnabled: true,
  runs: 0,
  lastPlayed: 0,
};

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...DEFAULTS,
      ...parsed,
      // Guard against hand-edited or corrupted saves.
      bestLevel: Math.max(0, Number(parsed.bestLevel) || 0),
      bestScore: Math.max(0, Number(parsed.bestScore) || 0),
      coins: Math.max(0, Number(parsed.coins) || 0),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

class SaveStore {
  private data: SaveData = read();

  get(): Readonly<SaveData> {
    return this.data;
  }

  update(patch: Partial<SaveData>): Readonly<SaveData> {
    this.data = { ...this.data, ...patch };
    this.flush();
    return this.data;
  }

  addCoins(amount: number): number {
    return this.update({ coins: this.data.coins + Math.max(0, Math.round(amount)) }).coins;
  }

  /**
   * Records a finished run; returns which records were beaten. `countRun` is
   * false when the same run is being saved again after a rewarded continue.
   */
  recordRun(
    level: number,
    score: number,
    countRun = true,
  ): { newBestLevel: boolean; newBestScore: boolean } {
    const newBestLevel = level > this.data.bestLevel;
    const newBestScore = score > this.data.bestScore;
    this.update({
      bestLevel: Math.max(level, this.data.bestLevel),
      bestScore: Math.max(score, this.data.bestScore),
      runs: this.data.runs + (countRun ? 1 : 0),
      lastPlayed: Date.now(),
    });
    return { newBestLevel, newBestScore };
  }

  reset(): void {
    this.data = { ...DEFAULTS };
    this.flush();
  }

  private flush(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Private mode or a full quota: keep playing with in-memory state only.
    }
  }
}

export const Save = new SaveStore();
