/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMOB_APP_ID?: string;
  readonly VITE_ADMOB_REWARDED_ID?: string;
  readonly VITE_ADMOB_INTERSTITIAL_ID?: string;
  readonly VITE_PLAY_GAMES_LEADERBOARD_LEVEL?: string;
  readonly VITE_PLAY_GAMES_LEADERBOARD_SCORE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
