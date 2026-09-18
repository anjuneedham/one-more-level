import { CONFIG } from './config';

export type AnalyticsEvent =
  | 'session_started'
  | 'game_started'
  | 'challenge_started'
  | 'challenge_completed'
  | 'challenge_failed'
  | 'level_reached'
  | 'game_over'
  | 'rewarded_ad_requested'
  | 'rewarded_ad_completed'
  | 'rewarded_ad_failed'
  | 'interstitial_shown'
  | 'play_again'
  | 'settings_changed';

export type AnalyticsParams = Record<string, string | number | boolean>;

export interface AnalyticsService {
  readonly name: string;
  track(event: AnalyticsEvent, params?: AnalyticsParams): void;
}

class ConsoleAnalytics implements AnalyticsService {
  readonly name = 'console';
  track(event: AnalyticsEvent, params: AnalyticsParams = {}): void {
    if (CONFIG.debug) console.info(`[analytics] ${event}`, params);
  }
}

class NoopAnalytics implements AnalyticsService {
  readonly name = 'none';
  track(): void {
    /* analytics disabled */
  }
}

interface FirebaseAnalyticsPlugin {
  logEvent(options: { name: string; params?: AnalyticsParams }): Promise<void>;
}

/**
 * Thin adapter over a native Firebase Analytics bridge. It is resolved at
 * runtime so the web build carries no Firebase code, and every call is
 * best-effort: analytics must never break or block the game.
 */
class FirebaseAnalytics implements AnalyticsService {
  readonly name = 'firebase';
  private plugin: FirebaseAnalyticsPlugin | null = null;
  private resolved = false;

  private resolve(): FirebaseAnalyticsPlugin | null {
    if (this.resolved) return this.plugin;
    this.resolved = true;
    const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
      .Capacitor;
    this.plugin = (cap?.Plugins?.['FirebaseAnalytics'] as FirebaseAnalyticsPlugin | undefined) ?? null;
    return this.plugin;
  }

  track(event: AnalyticsEvent, params: AnalyticsParams = {}): void {
    const plugin = this.resolve();
    if (!plugin) return;
    try {
      void plugin.logEvent({ name: event, params }).catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
}

function createAnalytics(): AnalyticsService {
  switch (CONFIG.analytics.provider) {
    case 'firebase':
      return new FirebaseAnalytics();
    case 'console':
      return new ConsoleAnalytics();
    default:
      return new NoopAnalytics();
  }
}

export const Analytics: AnalyticsService = createAnalytics();
