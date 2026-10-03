import { Stage } from './core/stage';
import { PlayController } from './game/playController';
import type { RunSummary } from './game/session';
import { Analytics } from './services/analytics';
import { Ads } from './services/ads';
import { Audio } from './services/audio';
import { Haptics } from './services/haptics';
import { Leaderboard } from './services/leaderboard';
import { GameView } from './ui/gameView';
import { GameOverScreen, HomeScreen, LeaderboardScreen, SettingsScreen, type GameOverAction } from './ui/screens';

type ScreenName = 'home' | 'game' | 'settings' | 'gameover' | 'leaderboard';

/** Top-level navigation and the glue between screens, stage and services. */
export class App {
  private readonly stage: Stage;
  private readonly gameView: GameView;
  private readonly home: HomeScreen;
  private readonly settings: SettingsScreen;
  private readonly leaderboard: LeaderboardScreen;
  private readonly gameOver: GameOverScreen;
  private readonly controller: PlayController;
  private readonly screens: Record<ScreenName, HTMLElement>;
  private current: ScreenName = 'home';
  /** Where the leaderboard's back button returns to. */
  private leaderboardReturn: ScreenName = 'home';
  private lastSummary: RunSummary | null = null;

  constructor(private readonly root: HTMLElement) {
    this.home = new HomeScreen(
      () => this.startRun(),
      () => this.show('settings'),
      () => this.openLeaderboard('home'),
      () => void this.handleProfile(),
    );
    this.settings = new SettingsScreen(() => this.show('home'));
    this.leaderboard = new LeaderboardScreen(() => this.show(this.leaderboardReturn));
    this.gameOver = new GameOverScreen((action) => void this.handleGameOverAction(action));
    this.gameView = new GameView(() => this.quitRun());

    this.root.append(this.home.root, this.gameView.root, this.settings.root, this.gameOver.root, this.leaderboard.root);
    this.stage = new Stage(this.gameView.playfield);
    this.controller = new PlayController(this.gameView, this.stage, {
      onGameOver: (summary) => void this.handleGameOver(summary),
    });

    this.screens = {
      home: this.home.root,
      game: this.gameView.root,
      settings: this.settings.root,
      gameover: this.gameOver.root,
      leaderboard: this.leaderboard.root,
    };

    Leaderboard.onChange((account) => {
      this.home.setAccount(account);
      this.settings.setAccount(account);
      if (this.current === 'leaderboard') void this.leaderboard.render();
    });
    this.home.setAccount(Leaderboard.current);
    this.settings.setAccount(Leaderboard.current);
    // Play Games signs returning players in silently; pick that up.
    void Leaderboard.refresh();

    this.home.refresh();
    this.show('home');

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.controller.pause();
      else {
        if (this.current === 'game') this.controller.resume();
        // The player may have signed in or out in the Play Games app.
        else void Leaderboard.refresh();
      }
    });
  }

  private show(name: ScreenName): void {
    this.current = name;
    for (const [key, el] of Object.entries(this.screens)) {
      el.classList.toggle('is-active', key === name);
    }
    if (name === 'home') this.home.refresh();
  }

  private openLeaderboard(from: ScreenName): void {
    this.leaderboardReturn = from;
    this.show('leaderboard');
    void this.leaderboard.open();
  }

  /** Profile chip: sign in when possible, otherwise show the boards. */
  private async handleProfile(): Promise<void> {
    const account = Leaderboard.current;
    if (account.available && !account.signedIn) {
      const result = await Leaderboard.signIn();
      Analytics.track('settings_changed', { setting: 'play_games_sign_in', value: result.signedIn });
      return;
    }
    this.openLeaderboard('home');
  }

  private startRun(): void {
    void Audio.resume(); // first user gesture unlocks Web Audio
    this.show('game');
    // Let layout settle before the stage measures itself.
    requestAnimationFrame(() => this.controller.start());
  }

  private quitRun(): void {
    this.controller.stop();
    // Quitting still counts: records and coins earned so far are kept.
    const summary = this.controller.currentSession.finish();
    void Leaderboard.submit(summary);
    this.show('home');
  }

  private async handleGameOver(summary: RunSummary): Promise<void> {
    this.lastSummary = summary;
    Haptics.fire('warning');
    // Interstitials only ever appear here: a natural break between runs.
    await Ads.maybeShowInterstitial('run_break');
    const canContinue = this.controller.currentSession.revives < 1;
    this.gameOver.show(summary, canContinue);
    this.gameOver.setContinueEnabled(true);
    this.show('gameover');
    await Leaderboard.submit(summary);
    this.gameOver.showRank(summary, Leaderboard.current);
  }

  private async handleGameOverAction(action: GameOverAction): Promise<void> {
    if (action === 'home') {
      this.show('home');
      return;
    }
    if (action === 'leaderboard') {
      this.openLeaderboard('gameover');
      return;
    }
    if (action === 'retry') {
      Analytics.track('play_again', { level: this.lastSummary?.level ?? 1 });
      this.startRun();
      return;
    }

    // Rewarded continue: one extra life, same run, same level.
    this.gameOver.setContinueEnabled(false);
    this.gameOver.setNotice('Loading ad...');
    const result = await Ads.showRewarded('continue_run');
    if (result.status === 'rewarded') {
      this.gameOver.setNotice('');
      this.controller.currentSession.revive(1);
      this.show('game');
      requestAnimationFrame(() => this.controller.resumeAfterRevive());
      return;
    }
    // Offline or no fill: never a dead end, just carry on.
    this.gameOver.setNotice(result.message ?? 'Ad unavailable');
    this.gameOver.setContinueEnabled(true);
  }
}
