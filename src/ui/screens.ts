import type { RunSummary } from '../game/session';
import { CHALLENGES } from '../game/registry';
import { Analytics } from '../services/analytics';
import { Ads } from '../services/ads';
import { Audio } from '../services/audio';
import { CONFIG, LINKS } from '../services/config';
import { Haptics } from '../services/haptics';
import { Leaderboard, type Account, type Board, type BoardRow } from '../services/leaderboard';
import { Save } from '../services/storage';
import { button, formatNumber, h, replayAnimation } from './dom';

/** Floating geometric shapes behind a screen's content. Purely decorative. */
function backdrop(): HTMLElement {
  return h('div', { class: 'backdrop', 'aria-hidden': 'true' }, [
    h('span', { class: 'shape shape--a' }),
    h('span', { class: 'shape shape--b' }),
    h('span', { class: 'shape shape--c' }),
    h('span', { class: 'shape shape--d' }),
  ]);
}

/** The player's identity: Play Games name, or Guest. */
function accountLabel(account: Account): { name: string; sub: string; initial: string } {
  if (account.signedIn && account.displayName) {
    return { name: account.displayName, sub: 'Google Play Games', initial: account.displayName.charAt(0).toUpperCase() };
  }
  return { name: 'Guest', sub: account.available ? 'Tap to sign in' : 'Playing on this device', initial: '?' };
}

/** Title screen: play, records, leaderboard, settings. */
export class HomeScreen {
  readonly root: HTMLElement;
  private bestLevelEl: HTMLElement;
  private bestScoreEl: HTMLElement;
  private coinsEl: HTMLElement;
  private discoveredEl: HTMLElement;
  private discoveredFill: HTMLElement;
  private profileName: HTMLElement;
  private profileSub: HTMLElement;
  private avatar: HTMLElement;

  constructor(onPlay: () => void, onSettings: () => void, onLeaderboard: () => void, onProfile: () => void) {
    this.bestLevelEl = h('span', { class: 'stat__value', text: '0' });
    this.bestScoreEl = h('span', { class: 'stat__value', text: '0' });
    this.coinsEl = h('span', { class: 'stat__value', text: '0' });
    this.discoveredEl = h('span', { class: 'discover__count', text: '0' });
    this.discoveredFill = h('span', { class: 'discover__fill' });
    this.avatar = h('span', { class: 'avatar', text: '?' });
    this.profileName = h('span', { class: 'profile__name', text: 'Guest' });
    this.profileSub = h('span', { class: 'profile__sub', text: '' });

    const profile = h('button', { class: 'profile', type: 'button', 'aria-label': 'Account' }, [
      this.avatar,
      h('span', { class: 'profile__text' }, [this.profileName, this.profileSub]),
    ]);
    profile.addEventListener('click', () => {
      Audio.play('click');
      Haptics.fire('light');
      onProfile();
    });

    this.root = h('section', { class: 'screen screen--home' }, [
      backdrop(),
      h('div', { class: 'home__top' }, [
        profile,
        button('⚙', onSettings, { variant: 'ghost', class: 'btn--icon', label: 'Settings' }),
      ]),
      h('div', { class: 'home__brand' }, [
        h('div', { class: 'brand__mark' }),
        h('h1', { class: 'brand__title' }, [
          h('span', { class: 'brand__line', text: 'ONE' }),
          h('span', { class: 'brand__line brand__line--accent', text: 'MORE' }),
          h('span', { class: 'brand__line', text: 'LEVEL' }),
        ]),
        h('p', { class: 'brand__tag', text: `${CHALLENGES.length} mini challenges. How far can you get?` }),
      ]),
      h('div', { class: 'home__actions' }, [
        button('PLAY', onPlay, { variant: 'primary', class: 'btn--play' }),
        button('LEADERBOARD', onLeaderboard, { variant: 'ghost', icon: '♛', class: 'btn--wide' }),
      ]),
      h('div', { class: 'stats' }, [
        this.stat('BEST LEVEL', this.bestLevelEl),
        this.stat('BEST SCORE', this.bestScoreEl),
        this.stat('COINS', this.coinsEl, 'stat--coin'),
      ]),
      h('div', { class: 'discover' }, [
        h('div', { class: 'discover__row' }, [
          h('span', { class: 'discover__label', text: 'CHALLENGES DISCOVERED' }),
          h('span', {}, [this.discoveredEl, h('span', { class: 'discover__total', text: ` / ${CHALLENGES.length}` })]),
        ]),
        h('div', { class: 'discover__bar' }, [this.discoveredFill]),
      ]),
    ]);
  }

  private stat(label: string, value: HTMLElement, extra = ''): HTMLElement {
    return h('div', { class: `stat ${extra}`.trim() }, [h('span', { class: 'stat__label', text: label }), value]);
  }

  setAccount(account: Account): void {
    const label = accountLabel(account);
    this.profileName.textContent = label.name;
    this.profileSub.textContent = label.sub;
    this.avatar.textContent = label.initial;
    this.avatar.classList.toggle('is-signed-in', account.signedIn);
  }

  refresh(): void {
    const save = Save.get();
    this.bestLevelEl.textContent = formatNumber(save.bestLevel);
    this.bestScoreEl.textContent = formatNumber(save.bestScore);
    this.coinsEl.textContent = formatNumber(save.coins);
    const found = save.discovered.filter((id) => CHALLENGES.some((c) => c.id === id)).length;
    this.discoveredEl.textContent = String(found);
    this.discoveredFill.style.transform = `scaleX(${found / CHALLENGES.length})`;
    replayAnimation(this.root, 'fade-in');
  }
}

/** Global Play Games rankings plus this device's best runs. */
export class LeaderboardScreen {
  readonly root: HTMLElement;
  private board: Board = 'level';
  private tabs: Record<Board, HTMLButtonElement>;
  private accountBox: HTMLElement;
  private globalList: HTMLElement;
  private globalSection: HTMLElement;
  private localList: HTMLElement;
  private nativeBtn: HTMLButtonElement;
  private loadToken = 0;

  constructor(onBack: () => void) {
    this.tabs = {
      level: this.tab('BEST LEVEL', 'level'),
      score: this.tab('HIGH SCORE', 'score'),
    };
    this.accountBox = h('div', { class: 'account' });
    this.globalList = h('ol', { class: 'ranks' });
    this.localList = h('ol', { class: 'ranks ranks--local' });
    this.nativeBtn = button('OPEN IN PLAY GAMES', () => void Leaderboard.openNative(this.board), {
      variant: 'ghost',
      class: 'btn--wide btn--small',
    });
    this.globalSection = h('section', { class: 'board' }, [
      h('h3', { class: 'board__title', text: 'GLOBAL' }),
      this.globalList,
      this.nativeBtn,
    ]);

    this.root = h('section', { class: 'screen screen--leaderboard' }, [
      backdrop(),
      h('header', { class: 'topbar' }, [
        button('‹', onBack, { variant: 'ghost', class: 'btn--icon', label: 'Back' }),
        h('h2', { class: 'topbar__title', text: 'LEADERBOARD' }),
        h('span', { class: 'topbar__spacer' }),
      ]),
      h('div', { class: 'tabs', role: 'tablist' }, [this.tabs.level, this.tabs.score]),
      h('div', { class: 'scroll' }, [
        this.accountBox,
        this.globalSection,
        h('section', { class: 'board' }, [h('h3', { class: 'board__title', text: 'YOUR BEST RUNS ON THIS DEVICE' }), this.localList]),
      ]),
    ]);
  }

  private tab(label: string, board: Board): HTMLButtonElement {
    const el = h('button', { class: 'tab', type: 'button', role: 'tab', text: label });
    el.addEventListener('click', () => {
      if (this.board === board) return;
      Audio.play('click');
      this.board = board;
      void this.render();
    });
    return el;
  }

  async open(): Promise<void> {
    replayAnimation(this.root, 'fade-in');
    await this.render();
  }

  async render(): Promise<void> {
    const token = ++this.loadToken;
    for (const [b, el] of Object.entries(this.tabs)) {
      el.classList.toggle('is-active', b === this.board);
      el.setAttribute('aria-selected', String(b === this.board));
    }
    this.renderAccount(Leaderboard.current);
    this.renderLocal();

    const account = Leaderboard.current;
    this.globalSection.hidden = !account.signedIn;
    if (!account.signedIn) return;
    this.globalList.replaceChildren(h('li', { class: 'ranks__empty', text: 'Loading rankings...' }));
    const data = await Leaderboard.top(this.board);
    if (token !== this.loadToken) return;
    if (!data) {
      this.globalList.replaceChildren(h('li', { class: 'ranks__empty', text: 'Rankings are unavailable right now. Check your connection.' }));
      return;
    }
    const rows = data.rows.map((r) => this.row(r, r.playerId !== undefined && r.playerId === account.playerId));
    if (data.me && !data.rows.some((r) => r.playerId === data.me?.playerId)) {
      rows.push(h('li', { class: 'ranks__gap', text: '•••' }), this.row(data.me, true));
    }
    this.globalList.replaceChildren(...(rows.length ? rows : [h('li', { class: 'ranks__empty', text: 'No scores yet. Be the first.' })]));
  }

  private row(r: BoardRow, me: boolean): HTMLElement {
    const medal = r.rank <= 3 ? ` ranks__row--top${r.rank}` : '';
    return h('li', { class: `ranks__row${medal}${me ? ' is-me' : ''}` }, [
      h('span', { class: 'ranks__rank', text: `#${formatNumber(r.rank)}` }),
      h('span', { class: 'ranks__name', text: me ? `${r.name} (you)` : r.name }),
      h('span', { class: 'ranks__score', text: this.board === 'level' ? `LV ${formatNumber(r.score)}` : formatNumber(r.score) }),
    ]);
  }

  private renderLocal(): void {
    const runs = Leaderboard.localRuns(this.board).slice(0, 10);
    if (!runs.length) {
      this.localList.replaceChildren(h('li', { class: 'ranks__empty', text: 'Finish a run to see it here.' }));
      return;
    }
    this.localList.replaceChildren(
      ...runs.map((run, i) =>
        h('li', { class: `ranks__row${i < 3 ? ` ranks__row--top${i + 1}` : ''}` }, [
          h('span', { class: 'ranks__rank', text: `#${i + 1}` }),
          h('span', { class: 'ranks__name', text: new Date(run.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }),
          h('span', {
            class: 'ranks__score',
            text: this.board === 'level' ? `LV ${run.level}` : formatNumber(run.score),
          }),
        ]),
      ),
    );
  }

  private renderAccount(account: Account): void {
    if (account.signedIn) {
      const label = accountLabel(account);
      this.accountBox.replaceChildren(
        h('span', { class: 'avatar is-signed-in', text: label.initial }),
        h('div', { class: 'account__text' }, [
          h('strong', { text: label.name }),
          h('span', { text: 'Your Play Games name is your unique username on the boards.' }),
        ]),
      );
      return;
    }
    if (account.available) {
      this.accountBox.replaceChildren(
        h('div', { class: 'account__text' }, [
          h('strong', { text: 'Get on the global board' }),
          h('span', {
            text: 'Sign in with Google Play Games. Your Play Games name becomes your unique username, and it follows your Google account to any phone.',
          }),
        ]),
        button('SIGN IN', () => void this.signIn(), { variant: 'primary', class: 'btn--small' }),
      );
      return;
    }
    this.accountBox.replaceChildren(
      h('div', { class: 'account__text' }, [
        h('strong', { text: 'Global rankings' }),
        h('span', {
          text: Leaderboard.configured
            ? 'Global rankings need Google Play Games on an Android phone. Your best runs on this device are below.'
            : 'Global rankings arrive with the Google Play version of the game. Your best runs on this device are below.',
        }),
      ]),
    );
  }

  private async signIn(): Promise<void> {
    const account = await Leaderboard.signIn();
    Analytics.track('settings_changed', { setting: 'play_games_sign_in', value: account.signedIn });
    await this.render();
  }
}

/** Sound, haptics, account and the hosted legal pages. */
export class SettingsScreen {
  readonly root: HTMLElement;
  private accountRow: HTMLElement;

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
    this.accountRow = h('div', { class: 'row' });

    this.root = h('section', { class: 'screen screen--settings' }, [
      h('header', { class: 'topbar' }, [
        button('‹', onBack, { variant: 'ghost', class: 'btn--icon', label: 'Back' }),
        h('h2', { class: 'topbar__title', text: 'SETTINGS' }),
        h('span', { class: 'topbar__spacer' }),
      ]),
      h('div', { class: 'scroll' }, [
        h('h3', { class: 'section-label', text: 'ACCOUNT' }),
        h('div', { class: 'panel' }, [this.accountRow]),
        h('p', {
          class: 'panel-note',
          text: 'Your Google Play Games name is your unique username on the leaderboards. Change it any time in the Google Play Games app.',
        }),
        h('h3', { class: 'section-label', text: 'GAME' }),
        h('div', { class: 'panel' }, [soundToggle, hapticToggle]),
        h('h3', { class: 'section-label', text: 'ABOUT' }),
        h('div', { class: 'panel' }, [this.link('Privacy Policy', 'privacy'), this.link('Terms of Service', 'terms')]),
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
          text: 'Plays offline. Progress is saved on this device; signed-in runs also go to the global leaderboards.',
        }),
      ]),
    ]);
  }

  setAccount(account: Account): void {
    const label = accountLabel(account);
    const children: (Node | string)[] = [
      h('span', { class: 'row__label row__label--stack' }, [
        h('span', { text: 'Google Play Games' }),
        h('span', { class: 'row__sub', text: account.signedIn ? `Signed in as ${label.name}` : account.available ? 'Not signed in' : 'Not available on this device' }),
      ]),
    ];
    if (account.available && !account.signedIn) {
      children.push(button('SIGN IN', () => void Leaderboard.signIn(), { variant: 'primary', class: 'btn--small' }));
    } else if (account.signedIn) {
      children.push(h('span', { class: 'avatar is-signed-in', text: label.initial }));
    }
    this.accountRow.replaceChildren(...children);
  }

  private toggle(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLElement {
    let value = initial;
    const knob = h('span', { class: 'switch__knob' });
    const sw = h(
      'button',
      {
        class: `switch ${value ? 'is-on' : ''}`.trim(),
        type: 'button',
        role: 'switch',
        'aria-checked': String(value),
        'aria-label': label,
      },
      [knob],
    );
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
      // Opens the hosted page in the system browser (Capacitor) or a new tab.
      const opened = window.open(LINKS[kind], '_blank', 'noopener');
      // Pop-up blocked, or offline with no browser to hand: say so, never
      // leave the row looking broken.
      if (!opened) window.alert(`${label}\n\n${LINKS[kind]}`);
    });
    return el;
  }
}

export type GameOverAction = 'retry' | 'home' | 'continue' | 'leaderboard';

/** End-of-run screen with the rewarded-ad continue. */
export class GameOverScreen {
  readonly root: HTMLElement;
  private levelEl: HTMLElement;
  private bestLevelEl: HTMLElement;
  private scoreEl: HTMLElement;
  private coinsEl: HTMLElement;
  private badgeEl: HTMLElement;
  private noticeEl: HTMLElement;
  private rankEl: HTMLElement;
  private continueBtn: HTMLButtonElement;

  constructor(private readonly onAction: (action: GameOverAction) => void) {
    this.levelEl = h('span', { class: 'hero__value', text: '1' });
    this.bestLevelEl = h('span', { class: 'result__value', text: '0' });
    this.scoreEl = h('span', { class: 'result__value', text: '0' });
    this.coinsEl = h('span', { class: 'result__value result__value--coin', text: '0' });
    this.badgeEl = h('div', { class: 'badge', text: '' });
    this.noticeEl = h('div', { class: 'notice', text: '' });
    this.rankEl = h('button', { class: 'rankline', type: 'button' });
    this.rankEl.addEventListener('click', () => {
      Audio.play('click');
      this.onAction('leaderboard');
    });
    this.continueBtn = button('WATCH AD TO CONTINUE', () => this.onAction('continue'), {
      variant: 'accent',
      icon: '▶',
    });

    this.root = h('section', { class: 'screen screen--gameover' }, [
      backdrop(),
      h('div', { class: 'gameover__head' }, [h('h2', { class: 'gameover__title', text: 'GAME OVER' }), this.badgeEl]),
      h('div', { class: 'hero' }, [h('span', { class: 'hero__label', text: 'LEVEL REACHED' }), this.levelEl]),
      h('div', { class: 'results' }, [
        this.resultRow('SCORE', this.scoreEl),
        this.resultRow('BEST LEVEL', this.bestLevelEl),
        this.resultRow('COINS', this.coinsEl),
      ]),
      this.rankEl,
      this.noticeEl,
      h('div', { class: 'gameover__actions' }, [
        this.continueBtn,
        button('TRY AGAIN', () => this.onAction('retry'), { variant: 'primary' }),
        h('div', { class: 'gameover__row' }, [
          button('HOME', () => this.onAction('home'), { variant: 'ghost' }),
          button('RANKS', () => this.onAction('leaderboard'), { variant: 'ghost', icon: '♛' }),
        ]),
      ]),
    ]);
  }

  private resultRow(label: string, valueEl: HTMLElement): HTMLElement {
    return h('div', { class: 'result' }, [h('span', { class: 'result__label', text: label }), valueEl]);
  }

  show(summary: RunSummary, canContinue: boolean): void {
    const save = Save.get();
    this.levelEl.textContent = formatNumber(summary.level);
    this.bestLevelEl.textContent = formatNumber(save.bestLevel);
    this.scoreEl.textContent = formatNumber(summary.score);
    this.coinsEl.textContent = `+${formatNumber(summary.coins)}`;
    this.badgeEl.textContent = summary.newBestLevel ? 'NEW BEST LEVEL!' : summary.newBestScore ? 'NEW BEST SCORE!' : '';
    this.badgeEl.classList.toggle('is-visible', Boolean(this.badgeEl.textContent));
    this.noticeEl.textContent = '';
    this.noticeEl.classList.remove('is-visible');
    this.rankEl.textContent = '';
    this.rankEl.hidden = true;
    // One continue per run keeps the offer meaningful.
    this.continueBtn.hidden = !canContinue;
    replayAnimation(this.root, 'fade-in');
  }

  /** Called once the run has been recorded. */
  showRank(summary: RunSummary, account: Account): void {
    const runs = Leaderboard.localRuns('level');
    const place = runs.findIndex((r) => r.level === summary.level && r.score === summary.score) + 1;
    let text = '';
    if (account.signedIn) text = `Posted to the global board as ${account.displayName ?? 'you'}  ›`;
    else if (account.available) text = 'Sign in with Play Games to rank globally  ›';
    else if (place > 0 && runs.length > 1) text = `#${place} of your best runs on this device  ›`;
    this.rankEl.textContent = text;
    this.rankEl.hidden = !text;
  }

  setNotice(message: string): void {
    this.noticeEl.textContent = message;
    this.noticeEl.classList.toggle('is-visible', Boolean(message));
  }

  setContinueEnabled(enabled: boolean): void {
    this.continueBtn.disabled = !enabled;
  }
}
