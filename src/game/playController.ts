import { clamp, withAlpha } from '../core/draw';
import { Particles } from '../core/particles';
import { Rng } from '../core/rng';
import type { Stage } from '../core/stage';
import { THEME } from '../core/theme';
import { Analytics } from '../services/analytics';
import { Audio } from '../services/audio';
import { BALANCE } from '../services/config';
import { Haptics } from '../services/haptics';
import type { GameView } from '../ui/gameView';
import { ChallengeManager } from './challengeManager';
import { paramsForLevel } from './difficulty';
import { GameSession, type RunSummary } from './session';
import type { Challenge, ChallengeDef, ChallengeHost, ChallengeParams } from './types';

type Resolution = 'win' | 'fail' | 'abort';

interface ActiveRound {
  def: ChallengeDef;
  params: ChallengeParams;
  challenge: Challenge;
  limit: number;
  remaining: number;
  hideTimer: boolean;
  onTimeout: 'fail' | 'win' | 'ignore';
}

export interface PlayCallbacks {
  onGameOver(summary: RunSummary, session: GameSession): void;
}

/**
 * Runs a single play session: picks challenges, drives the intro -> play ->
 * result rhythm, keeps the HUD in sync and reports the run's end.
 */
export class PlayController {
  private session = new GameSession();
  private manager = new ChallengeManager();
  private particles = new Particles(180);
  private rng = new Rng();
  private round: ActiveRound | null = null;
  private phase: 'idle' | 'intro' | 'playing' | 'result' = 'idle';
  private resolve: ((r: Resolution) => void) | null = null;
  private failReason = '';
  private aborted = false;
  private lastTickSecond = -1;
  /** Resolves when the player leaves the game screen mid-round. */
  private abortSignal: Promise<'abort'> = new Promise<'abort'>(() => undefined);
  private abortResolve: (() => void) | null = null;

  constructor(
    private readonly view: GameView,
    private readonly stage: Stage,
    private readonly callbacks: PlayCallbacks,
  ) {}

  get currentSession(): GameSession {
    return this.session;
  }

  /** Starts a brand new run from level 1. */
  start(): void {
    this.session = new GameSession();
    this.manager.reset();
    this.rng = new Rng();
    this.aborted = false;
    this.armAbort();
    this.particles.clear();
    Analytics.track('game_started', { lives: this.session.lives });
    this.syncHud();
    this.stage.invalidateSize();
    this.stage.start(this.frame);
    void this.loop();
  }

  /** Resumes the current run after a rewarded continue. */
  resumeAfterRevive(): void {
    this.aborted = false;
    this.armAbort();
    this.syncHud();
    this.stage.invalidateSize();
    this.stage.start(this.frame);
    void this.loop();
  }

  /** Leaves the game screen; any in-flight round is abandoned. */
  stop(): void {
    this.aborted = true;
    this.abortResolve?.();
    this.finishRound('abort');
    this.stage.stop();
    this.stage.setHandlers(null);
    this.view.clearOverlay();
    this.round = null;
    this.phase = 'idle';
  }

  /** Stops rendering while the app is backgrounded (saves battery). */
  pause(): void {
    if (this.phase === 'idle') return;
    this.stage.stop();
  }

  resume(): void {
    if (this.phase === 'idle') return;
    this.stage.invalidateSize();
    this.stage.start(this.frame);
  }

  private armAbort(): void {
    this.abortSignal = new Promise<'abort'>((resolve) => {
      this.abortResolve = () => resolve('abort');
    });
  }

  /** Awaits a UI promise but gives up immediately if the player quits. */
  private async race<T>(promise: Promise<T>): Promise<T | 'abort'> {
    return Promise.race<T | 'abort'>([promise, this.abortSignal]);
  }

  private async loop(): Promise<void> {
    while (!this.aborted && this.session.isAlive) {
      const outcome = await this.playRound();
      if (outcome === 'abort') return;
    }
    if (this.aborted) return;

    const summary = this.session.finish();
    Analytics.track('game_over', {
      level: summary.level,
      score: summary.score,
      coins: summary.coins,
      duration: summary.durationSec,
    });
    this.stage.stop();
    this.stage.setHandlers(null);
    this.callbacks.onGameOver(summary, this.session);
  }

  private async playRound(): Promise<Resolution> {
    const level = this.session.level;
    const def = this.manager.next(level, this.rng);
    const params = paramsForLevel(level, this.rng);
    const host = this.createHost();
    const challenge = def.create(params, host);
    const limit = Math.max(1.5, challenge.timeLimit ?? params.timer);

    this.round = {
      def,
      params,
      challenge,
      limit,
      remaining: limit,
      hideTimer: challenge.hideTimer ?? false,
      onTimeout: challenge.onTimeout ?? 'fail',
    };
    this.failReason = '';
    this.lastTickSecond = -1;

    this.view.setLevel(level);
    this.view.setInstruction(def.instruction);
    this.view.setProgress(0);
    this.view.setTimer(1, !this.round.hideTimer);
    this.syncHud();

    // Intro card: the challenge is already on screen behind it, frozen.
    this.phase = 'intro';
    this.stage.setHandlers(null);
    const introResult = await this.race(this.view.showIntro(level, def.title, def.instruction));
    if (introResult === 'abort' || this.aborted) return 'abort';

    Analytics.track('challenge_started', { challenge: def.id, level, band: params.band });
    Audio.play('start');
    Haptics.fire('light');
    this.phase = 'playing';
    challenge.enter?.();
    this.stage.setHandlers({
      onDown: (p) => this.phase === 'playing' && challenge.onDown?.(p),
      onMove: (p) => this.phase === 'playing' && challenge.onMove?.(p),
      onUp: (p) => this.phase === 'playing' && challenge.onUp?.(p),
    });

    const outcome = await new Promise<Resolution>((resolve) => {
      this.resolve = resolve;
    });
    this.phase = 'result';
    this.stage.setHandlers(null);
    challenge.exit?.();
    if (outcome === 'abort') return 'abort';

    if (outcome === 'win') await this.handleWin(def, level);
    else await this.handleFail(def, level);
    return this.aborted ? 'abort' : outcome;
  }

  private async handleWin(def: ChallengeDef, level: number): Promise<void> {
    const timeLeftRatio = this.round ? this.round.remaining / this.round.limit : 0;
    const reward = this.session.complete(timeLeftRatio);
    Analytics.track('challenge_completed', {
      challenge: def.id,
      level,
      coins: reward.coins,
      points: reward.points,
    });
    Analytics.track('level_reached', { level: this.session.level });

    Audio.play('success');
    Haptics.fire('success');
    this.view.flash('success');
    this.view.setTimer(0, false);
    this.syncHud();
    await this.race(this.view.showSuccess(reward.coins, reward.points));
    if (this.session.level % 5 === 1 && this.session.level > 1) Audio.play('levelup');
  }

  private async handleFail(def: ChallengeDef, level: number): Promise<void> {
    const alive = this.session.loseLife();
    Analytics.track('challenge_failed', { challenge: def.id, level, reason: this.failReason });
    Audio.play('fail');
    Haptics.fire('error');
    this.view.flash('fail');
    this.stage.shake(16);
    this.view.setTimer(0, false);
    this.syncHud();
    if (!alive) return; // the loop ends the run and shows Game Over
    await this.race(
      this.view.showFailure(this.failReason || 'Challenge failed', this.session.lives),
    );
  }

  private createHost(): ChallengeHost {
    const controller = this;
    return {
      get width() {
        return controller.stage.width;
      },
      get height() {
        return controller.stage.height;
      },
      particles: this.particles,
      win: () => this.finishRound('win'),
      fail: (reason?: string) => {
        this.failReason = reason ?? '';
        this.finishRound('fail');
      },
      sound: (name) => Audio.play(name),
      haptic: (kind) => Haptics.fire(kind),
      shake: (amount) => this.stage.shake(amount),
      setInstruction: (value) => this.view.setInstruction(value),
      setProgress: (value) => this.view.setProgress(value),
    };
  }

  private finishRound(result: Resolution): void {
    if (!this.resolve) return;
    const resolve = this.resolve;
    this.resolve = null;
    this.phase = 'result';
    resolve(result);
  }

  private syncHud(): void {
    this.view.setLives(this.session.lives, BALANCE.startingLives);
    this.view.setScore(this.session.score);
    this.view.setCoins(this.session.coinsEarned);
    this.view.setLevel(this.session.level);
  }

  /** Single render/update frame. Kept allocation-free for steady frame times. */
  private frame = (dt: number): void => {
    const g = this.stage.g;
    const w = this.stage.width;
    const h = this.stage.height;

    g.fillStyle = THEME.bg;
    g.fillRect(-20, -20, w + 40, h + 40);
    this.drawBackdrop(g, w, h);

    const round = this.round;
    if (round) {
      if (this.phase === 'playing') {
        round.challenge.update(dt);
        if (round.onTimeout !== 'ignore') {
          round.remaining = Math.max(0, round.remaining - dt);
          const ratio = round.remaining / round.limit;
          this.view.setTimer(ratio, !round.hideTimer);
          // Audible countdown for the final three seconds.
          const second = Math.ceil(round.remaining);
          if (!round.hideTimer && second <= 3 && second !== this.lastTickSecond) {
            this.lastTickSecond = second;
            if (second > 0) Audio.play('tick');
          }
          if (round.remaining <= 0) {
            if (round.onTimeout === 'win') this.finishRound('win');
            else {
              this.failReason = "Time's up";
              this.finishRound('fail');
            }
          }
        }
      }
      round.challenge.render(g);
    }

    this.particles.update(dt);
    this.particles.render(g);
  };

  /** Static geometric backdrop: a soft vignette plus a faint grid. */
  private drawBackdrop(g: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, THEME.bgSoft);
    grad.addColorStop(1, THEME.bg);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    g.strokeStyle = withAlpha(THEME.primary, 0.05);
    g.lineWidth = 1;
    const step = 48;
    g.beginPath();
    for (let x = step; x < w; x += step) {
      g.moveTo(x, 0);
      g.lineTo(x, h);
    }
    for (let y = step; y < h; y += step) {
      g.moveTo(0, y);
      g.lineTo(w, y);
    }
    g.stroke();

    // Difficulty tint: the deeper you go, the warmer the room gets.
    const heat = clamp((this.session.level - 10) / 30, 0, 0.16);
    if (heat > 0) {
      g.fillStyle = withAlpha(THEME.danger, heat);
      g.fillRect(0, 0, w, h);
    }
  }
}
