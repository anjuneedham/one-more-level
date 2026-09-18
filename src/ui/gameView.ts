import { button, countUp, h, replayAnimation } from './dom';

export type ResultAction = 'next' | 'retry';

/**
 * The in-game screen: HUD, playfield host, instruction bar and the
 * intro / success / failure overlays. Pure DOM, so the canvas only ever draws
 * the challenge itself.
 */
export class GameView {
  readonly root: HTMLElement;
  readonly playfield: HTMLElement;

  private levelEl: HTMLElement;
  private scoreEl: HTMLElement;
  private coinsEl: HTMLElement;
  private livesEl: HTMLElement;
  private timerFill: HTMLElement;
  private timerWrap: HTMLElement;
  private instructionEl: HTMLElement;
  private progressFill: HTMLElement;
  private overlay: HTMLElement;

  constructor(onQuit: () => void) {
    this.levelEl = h('span', { class: 'hud__value', text: '1' });
    this.scoreEl = h('span', { class: 'hud__value', text: '0' });
    this.coinsEl = h('span', { class: 'hud__value', text: '0' });
    this.livesEl = h('div', { class: 'lives' });
    this.timerFill = h('div', { class: 'timer__fill' });
    this.timerWrap = h('div', { class: 'timer' }, [this.timerFill]);
    this.instructionEl = h('div', { class: 'instruction__text', text: '' });
    this.progressFill = h('div', { class: 'progress__fill' });
    this.overlay = h('div', { class: 'overlay' });
    this.playfield = h('div', { class: 'playfield' });

    const hud = h('header', { class: 'hud' }, [
      h('div', { class: 'hud__block' }, [
        h('span', { class: 'hud__label', text: 'LEVEL' }),
        this.levelEl,
      ]),
      h('div', { class: 'hud__block hud__block--center' }, [this.livesEl]),
      h('div', { class: 'hud__block hud__block--right' }, [
        h('span', { class: 'hud__label', text: 'SCORE' }),
        this.scoreEl,
      ]),
    ]);

    const subHud = h('div', { class: 'subhud' }, [
      h('div', { class: 'chip chip--coin' }, [
        h('span', { class: 'chip__icon', text: '◆' }),
        this.coinsEl,
      ]),
      this.timerWrap,
      button('✕', onQuit, { variant: 'ghost', class: 'btn--icon' }),
    ]);

    const instruction = h('div', { class: 'instruction' }, [
      this.instructionEl,
      h('div', { class: 'progress' }, [this.progressFill]),
    ]);

    this.root = h('section', { class: 'screen screen--game' }, [
      hud,
      subHud,
      this.playfield,
      instruction,
      this.overlay,
    ]);
  }

  setLevel(level: number): void {
    this.levelEl.textContent = String(level);
    replayAnimation(this.levelEl, 'pop');
  }

  setScore(score: number): void {
    countUp(this.scoreEl, score, 400);
  }

  setCoins(coins: number): void {
    countUp(this.coinsEl, coins, 400);
  }

  setLives(lives: number, max: number): void {
    this.livesEl.replaceChildren(
      ...Array.from({ length: Math.max(lives, max) }, (_, i) =>
        h('span', { class: `life ${i < lives ? 'is-on' : 'is-off'}` }),
      ),
    );
  }

  setInstruction(textValue: string): void {
    if (this.instructionEl.textContent === textValue) return;
    this.instructionEl.textContent = textValue;
    replayAnimation(this.instructionEl, 'fade-in');
  }

  setProgress(value: number): void {
    this.progressFill.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
  }

  setTimer(ratio: number, visible: boolean): void {
    this.timerWrap.style.visibility = visible ? 'visible' : 'hidden';
    const clamped = Math.max(0, Math.min(1, ratio));
    this.timerFill.style.transform = `scaleX(${clamped})`;
    this.timerWrap.classList.toggle('is-critical', visible && clamped < 0.25);
  }

  /** Big "LEVEL N / TITLE / instruction" card. Resolves when it is gone. */
  showIntro(level: number, title: string, instruction: string, duration = 950): Promise<void> {
    const card = h('div', { class: 'card card--intro' }, [
      h('div', { class: 'card__eyebrow', text: `LEVEL ${level}` }),
      h('div', { class: 'card__title', text: title }),
      h('div', { class: 'card__sub', text: instruction }),
    ]);
    this.overlay.replaceChildren(card);
    this.overlay.classList.add('is-visible');
    return new Promise((resolve) => {
      window.setTimeout(() => {
        card.classList.add('is-leaving');
        window.setTimeout(() => {
          this.clearOverlay();
          resolve();
        }, 160);
      }, duration);
    });
  }

  /** "COMPLETE" card. Auto-advances, or sooner if the player taps NEXT. */
  showSuccess(coins: number, points: number, autoMs = 900): Promise<ResultAction> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        this.clearOverlay();
        resolve('next');
      };
      const card = h('div', { class: 'card card--success' }, [
        h('div', { class: 'card__mark', text: '✓' }),
        h('div', { class: 'card__title', text: 'COMPLETE' }),
        h('div', { class: 'card__rewards' }, [
          h('span', { class: 'reward reward--coin', text: `+${coins} COINS` }),
          h('span', { class: 'reward reward--score', text: `+${points} PTS` }),
        ]),
        button('NEXT', finish, { variant: 'primary' }),
      ]);
      this.overlay.replaceChildren(card);
      this.overlay.classList.add('is-visible');
      const timer = window.setTimeout(finish, autoMs);
    });
  }

  /** "FAILED" card. Waits for the player - a beat to breathe, then go again. */
  showFailure(reason: string, livesLeft: number): Promise<ResultAction> {
    return new Promise((resolve) => {
      const card = h('div', { class: 'card card--fail' }, [
        h('div', { class: 'card__mark', text: '✕' }),
        h('div', { class: 'card__title', text: 'FAILED' }),
        h('div', { class: 'card__sub', text: reason }),
        h('div', { class: 'card__lives', text: `LIFE LOST • ${livesLeft} LEFT` }),
        button('TRY AGAIN', () => {
          this.clearOverlay();
          resolve('retry');
        }, { variant: 'danger' }),
      ]);
      this.overlay.replaceChildren(card);
      this.overlay.classList.add('is-visible');
    });
  }

  flash(kind: 'success' | 'fail'): void {
    const el = h('div', { class: `flash flash--${kind}` });
    this.root.append(el);
    window.setTimeout(() => el.remove(), 420);
  }

  clearOverlay(): void {
    this.overlay.replaceChildren();
    this.overlay.classList.remove('is-visible');
  }
}
