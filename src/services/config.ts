/**
 * Environment configuration.
 *
 * DEVELOPMENT uses Google's public sample ad units and a mock ad provider.
 * PRODUCTION values are injected at build time from environment variables
 * (see .env.example) so no real credentials ever live in source control.
 */

export type Environment = 'development' | 'production';

export interface AdConfig {
  /** 'mock' plays a fake ad locally; 'admob' uses the native AdMob bridge. */
  provider: 'mock' | 'admob';
  appId: string;
  rewardedUnitId: string;
  interstitialUnitId: string;
  /** Tells AdMob to serve test creatives. Must stay true outside production. */
  testMode: boolean;
}

export interface AppConfig {
  env: Environment;
  version: string;
  ads: AdConfig;
  analytics: {
    /** 'console' logs locally, 'firebase' uses the native Firebase bridge. */
    provider: 'console' | 'firebase' | 'none';
  };
  debug: boolean;
}

// Google's documented sample ad unit IDs - safe to ship in development builds.
const GOOGLE_TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_TEST_REWARDED = 'ca-app-pub-3940256099942544/5224354917';
const GOOGLE_TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

const env = import.meta.env.DEV ? 'development' : 'production';
const fromEnv = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.length > 0 ? value : undefined;
};

const isProduction = env === 'production';
// A production build only switches to real ads when every id was supplied.
const hasProductionAdIds =
  isProduction &&
  Boolean(fromEnv('VITE_ADMOB_APP_ID')) &&
  Boolean(fromEnv('VITE_ADMOB_REWARDED_ID')) &&
  Boolean(fromEnv('VITE_ADMOB_INTERSTITIAL_ID'));

export const CONFIG: AppConfig = {
  env,
  version: '0.1.0',
  ads: {
    provider: hasProductionAdIds ? 'admob' : 'mock',
    appId: fromEnv('VITE_ADMOB_APP_ID') ?? GOOGLE_TEST_APP_ID,
    rewardedUnitId: fromEnv('VITE_ADMOB_REWARDED_ID') ?? GOOGLE_TEST_REWARDED,
    interstitialUnitId: fromEnv('VITE_ADMOB_INTERSTITIAL_ID') ?? GOOGLE_TEST_INTERSTITIAL,
    testMode: !hasProductionAdIds,
  },
  analytics: {
    provider: isProduction ? 'firebase' : 'console',
  },
  debug: !isProduction,
};

/**
 * Public pages linked from the settings screen. They are served by GitHub
 * Pages from the repository's `docs/` folder; Google Play also needs the
 * privacy URL in App content -> Privacy policy.
 */
export const LINKS = {
  privacy: 'https://anjuneedham.github.io/one-more-level/privacy.html',
  terms: 'https://anjuneedham.github.io/one-more-level/terms.html',
} as const;

/** Tunables the designers are most likely to touch. */
export const BALANCE = {
  startingLives: 3,
  maxLives: 5,
  /** Coins awarded per completed challenge, by difficulty band. */
  coins: { easy: 10, normal: 20, hard: 30, expert: 40 },
  /** Base points per completed challenge; scaled by level and speed bonus. */
  scorePerLevel: 100,
  /** An interstitial may appear at most once per this many game overs... */
  interstitialEveryNRuns: 3,
  /** ...and never within this many seconds of the previous one. */
  interstitialCooldownSec: 120,
} as const;
