# Initial Audit — One More Level

Audit date: 2026-09-25. Based on a direct read of the repository source (`src/`), not assumptions.

## What the game currently is

**One More Level** is a fast, replayable mobile game built with TypeScript + Vite + Canvas 2D (no game engine), wrapped for Android with Capacitor 6. It is 25 short mini-challenges spanning five mechanic families:

- **Tap** (`src/challenges/tap.ts`)
- **Memory** (`src/challenges/memory.ts`)
- **Motion** (`src/challenges/motion.ts`) — dodge/drag-style
- **Precision** (`src/challenges/precision.ts`)
- **Puzzle** (`src/challenges/puzzle.ts`)

All challenges are registered in `src/game/registry.ts`. The opening level always draws from `STARTER_IDS` (`tap_fast`, `color_match`, `moving_target`, `correct_order`) — instantly readable, no memorization, no surprise failure state, so first-time players are never confused on level 1.

## Core gameplay loop

Source: `src/game/session.ts`, `src/game/difficulty.ts`, `src/services/config.ts` (`BALANCE`).

1. Player starts a run with **3 lives** (`BALANCE.startingLives`), max 5 (`BALANCE.maxLives`).
2. Each level presents one short challenge with a countdown timer (4–9s, shrinking with difficulty).
3. Clear it → coins + points awarded (coins scale by difficulty band: easy 10 / normal 20 / hard 30 / expert 40), level increments, next challenge loads.
4. Fail it → lose a life. At 0 lives, run ends; a rewarded ad can revive with +1 life (`GameSession.revive`).
5. Difficulty ramps continuously via `difficultyForLevel()` — a smooth curve over the first 24 levels, then a slow "overdrive" term past level 25 so long runs keep escalating (speed, object count, target size, timer) rather than becoming a pure reflex test.
6. Best level, best score, coins, and total runs persist locally (`src/services/storage.ts`, `localStorage`, key `oml.save.v1`) — fully offline, no account/login.

This loop is the game's biggest structural asset for marketing: every level is a self-contained 5–20 second clip with a built-in hook and a built-in payoff (clear or fail), and the difficulty curve guarantees a natural "one more try" reset on every death.

## Target player

Casual/arcade mobile gamer who plays in short bursts (commute, waiting, bathroom breaks) — the genre convention for 5–20s challenge loops with instant retry. Skews toward players who already engage with reflex/reaction-time content (the kind that performs on TikTok/Reels: "bet you can't," countdown challenges, rage-fail compilations).

## Strongest marketing hooks (grounded in what actually exists)

1. **The retry loop itself.** Losing a life and immediately retrying is the exact mechanic that makes rage/fail clips work — this is native to the game, not something that needs staging.
2. **Difficulty variety across 5 mechanic families.** "Which type are you worst at?" content works because tap/memory/motion/precision/puzzle are genuinely different skills, not reskins of the same mechanic.
3. **Visible, escalating difficulty.** The band system (easy → normal → hard → expert, plus the level-25+ overdrive) gives content a natural "how far did you get" narrative arc.
4. **Coins + score + best-level records** are already tracked and displayed on the results/game-over screen (see `RunSummary`, `SaveData`) — every session produces a screenshot-able stat card for free (new best, new best score badges).
5. **Clean, legible visual identity** — the icon/feature-graphic brand system (blue→violet gradient, gold accent, dark navy ground) already exists from the Play Store asset work and can extend directly into ad creative.

## Potential weaknesses (to test, not assume)

- **No native social share** exists yet in the app (no "share my score" button in `src/ui/screens.ts` at the time of this audit) — this is friction for organic virality; see Experiment Backlog.
- **No daily-return hook** (no daily challenge, streak, or push notification system) — nothing currently pulls a player back on day 2 beyond intrinsic motivation. This is a real retention risk worth testing early rather than assuming it'll be fine.
- **Interstitial cadence is fairly conservative** (`interstitialEveryNRuns: 3`, `interstitialCooldownSec: 120` in `BALANCE`) — good for retention, but means monetization is currently rewarded-ad-led; paid UA math needs to reflect that, not assume interstitial-heavy revenue.
- **25 levels is a hard ceiling** (then the overdrive curve repeats/extends difficulty rather than adding new content) — long-term retention for players who blow through content fast is unproven.

## Monetization structure (as implemented, not planned)

Source: `src/services/ads.ts`, `src/services/config.ts`.

- Provider: **AdMob** via `@capacitor-community/admob@6.2.0`, gated behind whether real AdMob env vars are present at build time (`hasProductionAdIds`); falls back to a local `mock` provider otherwise, and to Google's public test IDs in non-production builds.
- **Rewarded ad**: used for the mid-run "continue with +1 life" (`Save`/`GameSession.revive`), placement id passed through as `AdPlacement` (e.g. `'run_break'`).
- **Interstitial**: shown at most once per 3 game-overs, and never within 120 seconds of the previous one (`BALANCE.interstitialEveryNRuns`, `BALANCE.interstitialCooldownSec`) — a deliberately throttled policy already baked into the game-facing facade (`AdManager.maybeShowInterstitial`), not something growth work should override without a documented experiment.
- Real AdMob App ID and both real ad unit IDs are wired in (confirmed live in an earlier session against the actual AdMob console — non-zero requests/impressions observed).
- No IAP, no subscription, no other monetization surface currently exists.

## Existing analytics (this is the most important finding in this audit)

Source: `src/services/analytics.ts`, call sites across `src/app.ts`, `src/game/playController.ts`, `src/main.ts`, `src/services/ads.ts`, `src/ui/screens.ts`.

**An analytics abstraction already exists and is already called from every meaningful game event** — this is well-built infra, not a gap in instrumentation intent:

| Event (as implemented) | Fired from |
|---|---|
| `session_started` | `src/main.ts`, on app boot, with `platform` param |
| `game_started` | `playController.ts`, with `lives` |
| `challenge_started` | `playController.ts`, with `challenge`, `level`, `band` |
| `challenge_completed` | `playController.ts` |
| `challenge_failed` | `playController.ts`, with `reason` |
| `level_reached` | `playController.ts`, with `level` |
| `game_over` | `playController.ts` |
| `play_again` | `app.ts` |
| `rewarded_ad_requested` / `_completed` / `_failed` | `ads.ts`, with `placement` |
| `interstitial_shown` | `ads.ts`, with `placement` |
| `settings_changed` | `screens.ts` (sound/haptics toggles) |

**However — none of this data is actually being collected anywhere right now.** `CONFIG.analytics.provider` is `'firebase'` in production, and `FirebaseAnalytics` (the class in `analytics.ts`) is a thin adapter that looks for a native Capacitor plugin named `FirebaseAnalytics` at `window.Capacitor.Plugins.FirebaseAnalytics`. **That plugin is not installed** — `package.json` has no `@capacitor-community/firebase-analytics` (or any Firebase) dependency. So in the current production build, every `Analytics.track()` call silently resolves to a no-op (`this.plugin` is `null`, the call returns early). In development it just logs to the console.

**Net effect: the event taxonomy is well-designed, the call sites are already correct, but there is currently zero analytics data being captured anywhere outside AdMob's own dashboard (impressions/requests/eCPM) and the local per-device save file.** This is the single highest-leverage infrastructure gap for growth work — not because the code is wrong, but because there is no data pipeline behind it yet.

Per your explicit instruction, this audit does **not** recommend installing a third-party analytics SDK without your approval — see `ANALYTICS_SPEC.md` for the documented event spec this repo should eventually feed, using the *existing* event names/call sites as the foundation rather than inventing a parallel taxonomy.

## Assets available for marketing

- Full Play Store asset set already produced this session: `icon-512.png` (512×512), `feature-graphic.png` (1024×500), 5 phone screenshots, 4× 7" tablet screenshots, 4× 10" tablet screenshots — all captured from the real, running game via Playwright, not mockups.
- The game itself is playable in a browser (Vite build), which means **real gameplay footage can be captured on demand** via screen recording — no placeholder/stock footage is needed for any ad creative in this plan.
- Brand palette (confirmed from the icon/feature-graphic source): primary blue `#5B7BFF`, violet `#B06BFF`, accent gold `#FFB020`/`#FFD166`, deep navy ground `#0B0E1A`, ink white `#F2F5FF`.
- Privacy policy and terms pages are live (GitHub Pages, `docs/privacy.html`, `docs/terms.html`), referenced from `LINKS` in `config.ts` — required for both the Play Store listing and Facebook Ads Manager's business verification/URL requirements.

## Missing analytics

- No captured event data anywhere (see above) — `ANALYTICS_SPEC.md` documents what *should* eventually be captured once a provider is approved, mapped onto the event names that already exist in code.
- No revenue-per-user or session-length data — AdMob's dashboard reports aggregate ad performance (impressions, eCPM, estimated earnings) but not per-cohort or per-creative attribution.
- No install attribution (no Facebook SDK / AppsFlyer / Adjust — nothing that would tell you which ad creative or campaign a given install came from). This is required before spending real ad dollars with any confidence, and is flagged as a launch blocker in `LAUNCH_CHECKLIST.md`.

## Missing growth infrastructure

- No UTM/attribution wiring between Facebook Ads and Play Store installs.
- No creative testing history (this repo, as of this audit, had no `/growth` directory at all).
- No retention or LTV tracking of any kind.
- No content calendar or repeatable content production workflow (a content plan doc exists from an earlier session, referenced in `CONTENT_ENGINE.md`, but no execution tracking).
- No daily-return mechanic in the game itself (see Weaknesses above) — flagged as an experiment, not fixed unilaterally in this audit.

## Recommended experiments (summary — full list in EXPERIMENTS.md)

1. Test the 5 initial creative hook concepts (Challenge / Curiosity / Rage / Progression / Skill) against each other within the single $15 Facebook/Instagram test — see `FACEBOOK_ADS.md`.
2. Once any analytics provider is approved, prioritize wiring `game_over`, `level_reached`, and the three rewarded-ad events first — they're the highest-signal events already instrumented in code for retention and monetization analysis.
3. Test a lightweight "share your score" button before assuming organic/social growth needs paid support — cheap to build, directly addresses the one clear structural gap found in this audit.
4. Do not change `interstitialEveryNRuns` or `interstitialCooldownSec` without a documented experiment (`MONETIZATION.md`) — current values are a deliberate retention-protective choice already in the codebase.

## What this audit did *not* do

- No game code was changed.
- No dependencies were added.
- No analytics SDK was installed.
- No existing functionality (ads, save data, challenge logic, difficulty curve) was modified.
