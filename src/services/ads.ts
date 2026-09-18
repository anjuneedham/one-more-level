import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { Analytics } from './analytics';
import { BALANCE, CONFIG } from './config';

export type RewardedStatus = 'rewarded' | 'dismissed' | 'unavailable';

export interface RewardedResult {
  status: RewardedStatus;
  /** Human-readable reason, shown as "Ad unavailable" style feedback. */
  message?: string;
}

export type AdPlacement = 'continue_run' | 'extra_life' | 'bonus_coins' | 'run_break';

/**
 * Everything the game knows about ads. Swapping providers (AdMob, a mediation
 * layer, a house-ads screen) means writing a new implementation of this
 * interface - no game logic changes.
 */
export interface AdService {
  readonly name: string;
  initialize(): Promise<void>;
  isRewardedReady(): boolean;
  showRewarded(placement: AdPlacement): Promise<RewardedResult>;
  showInterstitial(placement: AdPlacement): Promise<boolean>;
}

/** Local stand-in for a real ad: a 3 second overlay you can skip at the end. */
export class MockAdService implements AdService {
  readonly name = 'mock';
  /** Flipped by devtools/QA to exercise the "Ad unavailable" path. */
  simulateNoFill = false;

  async initialize(): Promise<void> {
    /* nothing to warm up */
  }

  isRewardedReady(): boolean {
    return !this.simulateNoFill;
  }

  async showRewarded(): Promise<RewardedResult> {
    if (this.simulateNoFill) {
      return { status: 'unavailable', message: 'Ad unavailable' };
    }
    const completed = await playMockAdOverlay(3);
    return completed
      ? { status: 'rewarded' }
      : { status: 'dismissed', message: 'Ad skipped - no reward' };
  }

  async showInterstitial(): Promise<boolean> {
    if (this.simulateNoFill) return false;
    await playMockAdOverlay(2);
    return true;
  }
}

/**
 * Adapter for the real @capacitor-community/admob plugin. Ad IDs come from
 * CONFIG, which reads them from build-time env vars, so no credentials are
 * hard-coded in source. On the web build this plugin's own web
 * implementation is an inert no-op, so it's safe to import unconditionally.
 */
export class AdMobAdService implements AdService {
  readonly name = 'admob';
  private initialized = false;
  private rewardedReady = false;

  async initialize(): Promise<void> {
    try {
      await AdMob.initialize({ initializeForTesting: CONFIG.ads.testMode });
      this.initialized = true;
      await this.preloadRewarded();
    } catch {
      this.initialized = false;
    }
  }

  private async preloadRewarded(): Promise<void> {
    if (!this.initialized) return;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: CONFIG.ads.rewardedUnitId,
        isTesting: CONFIG.ads.testMode,
      });
      this.rewardedReady = true;
    } catch {
      this.rewardedReady = false;
    }
  }

  isRewardedReady(): boolean {
    return this.rewardedReady;
  }

  async showRewarded(): Promise<RewardedResult> {
    if (!this.initialized) return { status: 'unavailable', message: 'Ad unavailable' };
    if (!this.rewardedReady) await this.preloadRewarded();
    if (!this.rewardedReady) return { status: 'unavailable', message: 'Ad unavailable' };

    // The plugin's own showRewardVideoAd() promise isn't a reliable signal
    // for "closed without reward" across platforms, so listen for the
    // actual events instead - first one to fire wins.
    return new Promise<RewardedResult>((resolve) => {
      let settled = false;
      const handles: PluginListenerHandle[] = [];
      const finish = (result: RewardedResult): void => {
        if (settled) return;
        settled = true;
        handles.forEach((h) => void h.remove());
        this.rewardedReady = false;
        void this.preloadRewarded(); // warm the next one up in the background
        resolve(result);
      };

      void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => finish({ status: 'rewarded' })).then(
        (h) => handles.push(h),
      );
      void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish({ status: 'dismissed' })).then(
        (h) => handles.push(h),
      );
      void AdMob.addListener(RewardAdPluginEvents.FailedToShow, () =>
        finish({ status: 'unavailable', message: 'Ad unavailable' }),
      ).then((h) => handles.push(h));

      AdMob.showRewardVideoAd().catch(() =>
        finish({ status: 'unavailable', message: 'Ad unavailable' }),
      );
    });
  }

  async showInterstitial(): Promise<boolean> {
    if (!this.initialized) return false;
    try {
      await AdMob.prepareInterstitial({
        adId: CONFIG.ads.interstitialUnitId,
        isTesting: CONFIG.ads.testMode,
      });
      await AdMob.showInterstitial();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Game-facing facade: owns the placement policy (when an interstitial is even
 * allowed) and the analytics around ad calls.
 */
class AdManager {
  private service: AdService =
    CONFIG.ads.provider === 'admob' ? new AdMobAdService() : new MockAdService();
  private runsSinceInterstitial = 0;
  private lastInterstitialAt = 0;

  get providerName(): string {
    return this.service.name;
  }

  setService(service: AdService): void {
    this.service = service;
  }

  async initialize(): Promise<void> {
    try {
      await this.service.initialize();
    } catch {
      // Offline or no fill: the game keeps working without ads.
    }
  }

  isRewardedReady(): boolean {
    try {
      return this.service.isRewardedReady();
    } catch {
      return false;
    }
  }

  async showRewarded(placement: AdPlacement): Promise<RewardedResult> {
    Analytics.track('rewarded_ad_requested', { placement });
    let result: RewardedResult;
    try {
      result = await this.service.showRewarded(placement);
    } catch {
      result = { status: 'unavailable', message: 'Ad unavailable' };
    }
    if (result.status === 'rewarded') Analytics.track('rewarded_ad_completed', { placement });
    else Analytics.track('rewarded_ad_failed', { placement, status: result.status });
    return result;
  }

  /** Called at run end only. Returns true when an ad was actually shown. */
  async maybeShowInterstitial(placement: AdPlacement = 'run_break'): Promise<boolean> {
    this.runsSinceInterstitial += 1;
    const now = Date.now() / 1000;
    const cooledDown = now - this.lastInterstitialAt >= BALANCE.interstitialCooldownSec;
    if (this.runsSinceInterstitial < BALANCE.interstitialEveryNRuns || !cooledDown) return false;

    let shown = false;
    try {
      shown = await this.service.showInterstitial(placement);
    } catch {
      shown = false;
    }
    if (shown) {
      this.runsSinceInterstitial = 0;
      this.lastInterstitialAt = now;
      Analytics.track('interstitial_shown', { placement });
    }
    return shown;
  }
}

export const Ads = new AdManager();

/** Renders the development-only fake ad. Resolves true if it ran to the end. */
function playMockAdOverlay(seconds: number): Promise<boolean> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'mock-ad';
    root.innerHTML = `
      <div class="mock-ad__card">
        <div class="mock-ad__tag">TEST AD</div>
        <div class="mock-ad__art"></div>
        <div class="mock-ad__title">Your ad could be here</div>
        <div class="mock-ad__timer">Reward in <span>${seconds}</span>s</div>
        <button class="mock-ad__close" type="button" aria-label="Close ad">Skip</button>
      </div>`;
    document.body.appendChild(root);

    const timerValue = root.querySelector<HTMLSpanElement>('.mock-ad__timer span')!;
    const closeBtn = root.querySelector<HTMLButtonElement>('.mock-ad__close')!;
    let remaining = seconds;
    let settled = false;

    const finish = (completed: boolean): void => {
      if (settled) return;
      settled = true;
      window.clearInterval(interval);
      root.classList.add('is-leaving');
      window.setTimeout(() => root.remove(), 180);
      resolve(completed);
    };

    const interval = window.setInterval(() => {
      remaining -= 1;
      timerValue.textContent = String(Math.max(0, remaining));
      if (remaining <= 0) finish(true);
    }, 1000);

    closeBtn.addEventListener('click', () => finish(false));
  });
}
