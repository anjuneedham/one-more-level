import type { RunSummary } from '../game/session';
import { Analytics } from '../services/analytics';
import { Ads } from '../services/ads';
import { Audio } from '../services/audio';
import { CONFIG } from '../services/config';
import { Haptics } from '../services/haptics';
import { Save } from '../services/storage';
import { button, formatNumber, h, replayAnimation } from './dom';

/** Title screen: play, records, settings. */
export class HomeScreen {
  readonly root: HTMLElement;
  private bestLevelEl: HTMLElement;
  private bestScoreEl: HTMLElement;
  private coinsEl: HTMLElement;

  constructor(onPlay: () => void, onSettings: () => void) {
    this.bestLevelEl = h('span', { class: 'stat__value', text: '0' });
    this.bestScoreEl = h('span', { class: 'stat__value', text: '0' });
    this.coinsEl = h('span', { class: 'stat__value', text: '0' });

    this.root = h('section', { class: 'screen screen--home' }, [
      h('div', { class: 'home__top' }, [
        button('⚙', onSettings, { variant: 'ghost', class: 'btn--icon' }),
      ]),
      h('div', { class: 'home__brand' }, [
        h('div', { class: 'brand__mark' }),
        h('h1', { class: 'brand__title' }, [
          h('span', { class: 'brand__line', text: 'ONE' }),
          h('span', { class: 'brand__line brand__line--accent', text: 'MORE' }),
          h('span', { class: 'brand__line', text: 'LEVEL' }),
        ]),
        h('p', { class: 'brand__tag', text: '25 mini challenges. How far can you get?' }),
      ]),
      h('div', { class: 'home__actions' }, [button('PLAY', onPlay, { variant: 'primary' })]),
      h('div', { class: 'stats' }, [
        h('div', { class: 'stat' }, [
          h('span', { class: 'stat__label', text: 'BEST LEVEL' }),
          this.bestLevelEl,
        ]),
        h('div', { class: 'stat' }, [
          h('span', { class: 'stat__label', text: 'BEST SCORE' }),
          this.bestScoreEl,
        ]),
        h('div', { class: 'stat' }, [
          h('span', { class: 'stat__label', text: 'COINS' }),
          this.coinsEl,
        ]),
      ]),
    ]);
  }

  refresh(): void {
    const save = Save.get();
    this.bestLevelEl.textContent = formatNumber(save.bestLevel);
    this.bestScoreEl.textContent = formatNumber(save.bestScore);
    this.coinsEl.textContent = formatNumber(save.coins);
    replayAnimation(this.root, 'fade-in');
  }
}

/** Sound, haptics and the legal placeholders. No accounts, no tracking wall. */
export class SettingsScreen {
  readonly root: HTMLElement;

  constructor(onBack: () => void) {
    const soundToggle = this.toggle('Sound', Audio.isEnabled(), (on) => {
      Audio.setEnabled(on);
      Analytics.track('settings_changed', { setting: 'sound', value: on });
      if (on) Audio.play('click');
    });
    const hapticToggle = this.toggle('Haptics', Haptics.isEnabled(), (on) => {
      Haptics.setEnabled(on);
      Analytics.track('settings_changed', { setting: 'haptics', value: on });
      if (on) Haptics.fire('medium');
    });

    this.root = h('section', { class: 'screen screen--settings' }, [
      h('header', { class: 'topbar' }, [
        button('‹', onBack, { variant: 'ghost', class: 'btn--icon' }),
        h('h2', { class: 'topbar__title', text: 'SETTINGS' }),
        h('span', { class: 'topbar__spacer' }),
      ]),
      h('div', { class: 'panel' }, [soundToggle, hapticToggle]),
      h('div', { class: 'panel' }, [
        this.link('Privacy Policy', 'privacy'),
        this.link('Terms of Service', 'terms'),
      ]),
      h('div', { class: 'panel panel--muted' }, [
        h('div', { class: 'row' }, [
          h('span', { class: 'row__label', text: 'Version' }),
          h('span', { class: 'row__value', text: `${CONFIG.version} (${CONFIG.env})` }),
        ]),
        h('div', { class: 'row' }, [
          h('span', { class: 'row__label', text: 'Ads' }),
          h('span', { class: 'row__value', text: Ads.providerName }),
        ]),
      ]),
      h('p', {
        class: 'fineprint',
        text: 'Plays offline. Progress is stored on this device only.',
      }),
    ]);
  }

  private toggle(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLElement {
    let value = initial;
    const knob = h('span', { class: 'switch__knob' });
    const sw = h('button', {
      class: `switch ${value ? 'is-on' : ''}`.trim(),
      type: 'button',
      role: 'switch',
      'aria-checked': String(value),
      'aria-label': label,
    }, [knob]);
    sw.addEventListener('click', () => {
      value = !value;
      sw.classList.toggle('is-on', value);
      sw.setAttribute('aria-checked', String(value));
      onChange(value);
    });
    return h('div', { class: 'row' }, [h('span', { class: 'row__label', text: label }), sw]);
  }

  private link(label: string, kind: 'privacy' | 'terms'): HTMLElement {
    const el = h('button', { class: 'row row--link', type: 'button' }, [
      h('span', { class: 'row__label', text: label }),
      h('span', { class: 'row__value', text: '›' }),
    ]);
    el.addEventListener('click', () => {
      Audio.play('click');
      // Placeholder copy until the hosted policy pages exist.
      window.alert(
        kind === 'privacy'
          ? 'Privacy Policy\n\nOne More Level stores your best level, best score, coins and settings on this device only. No account is required and no personal data leaves the device except anonymous analytics and ad requests when you are online.'
          : 'Terms of Service\n\nOne More Level is provided as-is for entertainment. Play fair, be kind, and remember: just one more level.',
      );
    });
    return el;
  }
}

export type GameOverAction = 'retry' | 'home' | 'continue';

/** End-of-run screen with the rewarded-ad continue. */
export class GameOverScreen {
  readonly root: HTMLElement;
  private levelEl: HTMLElement;
  private bestLevelEl: HTMLElement;
  private scoreEl: HTMLElement;
  private coinsEl: HTMLElement;
  private badgeEl: HTMLElement;
  private noticeEl: HTMLElement;
  private continueBtn: HTMLButtonElement;

  constructor(private readonly onAction: (action: GameOverAction) => void) {
    this.levelEl = h('span', { class: 'result__value', text: '1' });
    this.bestLevelEl = h('span', { class: 'result__value', text: '0' });
    this.scoreEl = h('span', { class: 'result__value', text: '0' });
    this.coinsEl = h('span', { class: 'result__value', text: '0' });
    this.badgeEl = h('div', { class: 'badge', text: '' });
    this.noticeEl = h('div', { class: 'notice', text: '' });
    this.continueBtn = button('WATCH AD TO CONTINUE', () => this.onAction('continue'), {
      variant: 'accent',
    });

    this.root = h('section', { class: 'screen screen--gameover' }, [
      h('div', { class: 'gameover__head' }, [
        h('h2', { class: 'gameover__title', text: 'GAME OVER' }),
        this.badgeEl,
      ]),
      h('div', { class: 'results' }, [
        this.resultRow('LEVEL REACHED', this.levelEl),
        this.resultRow('BEST LEVEL', this.bestLevelEl),
        this.resultRow('SCORE', this.scoreEl),
        this.resultRow('COINS EARNED', this.coinsEl),
      ]),
      this.noticeEl,
      h('div', { class: 'gameover__actions' }, [
        this.continueBtn,
        button('TRY AGAIN', () => this.onAction('retry'), { variant: 'primary' }),
        button('HOME', () => this.onAction('home'), { variant: 'ghost' }),
      ]),
    ]);
  }

  private resultRow(label: string, valueEl: HTMLElement): HTMLElement {
    return h('div', { class: 'result' }, [
      h('span', { class: 'result__label', text: label }),
      valueEl,
    ]);
  }

  show(summary: RunSummary, canContinue: boolean): void {
    const save = Save.get();
    this.levelEl.textContent = formatNumber(summary.level);
    this.bestLevelEl.textContent = formatNumber(save.bestLevel);
    this.scoreEl.textContent = formatNumber(summary.score);
    this.coinsEl.textContent = `+${formatNumber(summary.coins)}`;
    this.badgeEl.textContent = summary.newBestLevel
      ? 'NEW BEST LEVEL!'
      : summary.newBestScore
        ? 'NEW BEST SCORE!'
        : '';
    this.badgeEl.classList.toggle('is-visible', Boolean(this.badgeEl.textContent));
    this.noticeEl.textContent = '';
    this.noticeEl.classList.remove('is-visible');
    // One continue per run keeps the offer meaningful.
    this.continueBtn.hidden = !canContinue;
    replayAnimation(this.root, 'fade-in');
  }

  setNotice(message: string): void {
    this.noticeEl.textContent = message;
    this.noticeEl.classList.toggle('is-visible', Boolean(message));
  }

  setContinueEnabled(enabled: boolean): void {
    this.continueBtn.disabled = !enabled;
  }
}
