import { registerPlugin } from '@capacitor/core';
import type { RunSummary } from '../game/session';
import { CONFIG } from './config';

export type Board = 'level' | 'score';

export interface Account {
  /** Play Games is installed, configured and reachable on this device. */
  available: boolean;
  signedIn: boolean;
  /** The player's Play Games name: unique, chosen by them, tied to their Google account. */
  displayName?: string;
  playerId?: string;
}

export interface BoardRow {
  rank: number;
  name: string;
  score: number;
  playerId?: string;
}

export interface LocalRun {
  level: number;
  score: number;
  at: number;
}

interface PlayGamesPlugin {
  status(): Promise<Account>;
  signIn(): Promise<Account>;
  submitScore(options: { leaderboardId: string; score: number }): Promise<void>;
  loadTopScores(options: { leaderboardId: string; max?: number }): Promise<{ rows: BoardRow[]; me?: BoardRow }>;
  showLeaderboard(options: { leaderboardId?: string }): Promise<void>;
}

// Implemented natively in android/app/.../PlayGamesPlugin.java. On the web
// every call rejects, which this service treats as "not available".
const PlayGames = registerPlugin<PlayGamesPlugin>('PlayGames');

const RUNS_KEY = 'oml.runs.v1';
const MAX_LOCAL = 10;

function readRuns(): LocalRun[] {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const parsed = raw ? (JSON.parse(raw) as LocalRun[]) : [];
    return Array.isArray(parsed) ? parsed.filter((r) => Number.isFinite(r.level) && Number.isFinite(r.score)) : [];
  } catch {
    return [];
  }
}

function writeRuns(runs: LocalRun[]): void {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  } catch {
    // Storage full or blocked: the global board still works.
  }
}

class LeaderboardService {
  private account: Account = { available: false, signedIn: false };
  private listeners = new Set<(account: Account) => void>();

  get current(): Readonly<Account> {
    return this.account;
  }

  /** True once both leaderboard IDs are configured for this build. */
  get configured(): boolean {
    return Boolean(CONFIG.leaderboards.level && CONFIG.leaderboards.score);
  }

  onChange(fn: (account: Account) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(account: Account): void {
    this.account = { ...account, available: account.available && this.configured };
    this.listeners.forEach((fn) => fn(this.account));
  }

  async refresh(): Promise<Account> {
    try {
      this.set(await PlayGames.status());
    } catch {
      this.set({ available: false, signedIn: false });
    }
    return this.account;
  }

  async signIn(): Promise<Account> {
    try {
      this.set(await PlayGames.signIn());
    } catch {
      this.set({ available: false, signedIn: false });
    }
    return this.account;
  }

  /** Records the run on this device and, when signed in, on the global boards. */
  async submit(summary: RunSummary): Promise<void> {
    if (summary.score <= 0) return; // quit before clearing anything
    this.recordLocal(summary);
    if (!this.account.signedIn || !this.configured) return;
    const { level, score } = CONFIG.leaderboards;
    try {
      await PlayGames.submitScore({ leaderboardId: level, score: summary.level });
      await PlayGames.submitScore({ leaderboardId: score, score: summary.score });
    } catch {
      // Play Games queues and retries submissions itself; nothing to do here.
    }
  }

  async top(board: Board, max = 25): Promise<{ rows: BoardRow[]; me?: BoardRow } | null> {
    if (!this.account.signedIn || !this.configured) return null;
    try {
      return await PlayGames.loadTopScores({ leaderboardId: CONFIG.leaderboards[board], max });
    } catch {
      return null;
    }
  }

  async openNative(board?: Board): Promise<boolean> {
    if (!this.account.signedIn || !this.configured) return false;
    try {
      await PlayGames.showLeaderboard({ leaderboardId: board ? CONFIG.leaderboards[board] : undefined });
      return true;
    } catch {
      return false;
    }
  }

  localRuns(board: Board): LocalRun[] {
    const runs = readRuns();
    return board === 'level'
      ? runs.sort((a, b) => b.level - a.level || b.score - a.score)
      : runs.sort((a, b) => b.score - a.score || b.level - a.level);
  }

  private recordLocal(summary: RunSummary): void {
    // A continued run ends twice; the later, better result replaces the first.
    const runs = readRuns().filter((r) => r.at !== summary.startedAt);
    runs.push({ level: summary.level, score: summary.score, at: summary.startedAt });
    // Keep the best runs by either measure so both tabs stay meaningful.
    const byLevel = [...runs].sort((a, b) => b.level - a.level || b.score - a.score).slice(0, MAX_LOCAL);
    const byScore = [...runs].sort((a, b) => b.score - a.score || b.level - a.level).slice(0, MAX_LOCAL);
    writeRuns([...new Set([...byLevel, ...byScore])]);
  }
}

export const Leaderboard = new LeaderboardService();
