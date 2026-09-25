# Analytics Specification

**No analytics SDK has been installed as part of this growth system.** Per instruction, that requires either the repository already having the necessary configuration (it does not — see `INITIAL_AUDIT.md`) or explicit developer approval. This document specifies what *should* be captured once a provider is approved, and maps it onto the event taxonomy that **already exists in code** (`src/services/analytics.ts`) rather than inventing a competing one.

## Current state (as of this audit)

`src/services/analytics.ts` already defines an `AnalyticsEvent` union and an `Analytics.track()` call that fires from every meaningful game moment (see the table in `INITIAL_AUDIT.md`). The abstraction supports three providers (`console`, `firebase`, `none`), selected by `CONFIG.analytics.provider`. In production this currently resolves to `'firebase'`, but no Firebase plugin is installed, so every call is a silent no-op. **The fix is not more instrumentation — it's approving and wiring a real provider.**

## Recommended event taxonomy

This maps the requested event list onto what already exists, and flags genuinely new events not yet instrumented.

| Requested event | Status | Notes |
|---|---|---|
| `game_open` | **New** — maps to existing `session_started` (fired in `src/main.ts`) | Consider this the canonical "app opened" event; `session_started` already carries a `platform` param. |
| `tutorial_start` | **New** — not instrumented | No explicit tutorial currently exists as a distinct flow; the `STARTER_IDS` first level effectively serves this role. If a formal tutorial is ever added, instrument here. |
| `tutorial_complete` | **New** — not instrumented | Same caveat as above. |
| `level_start` | **Exists** as `challenge_started` (`playController.ts`) | Params already include `challenge`, `level`, `band`. |
| `level_complete` | **Exists** as `challenge_completed` (`playController.ts`) | |
| `level_failed` | **Exists** as `challenge_failed` (`playController.ts`) | Params already include `reason`. |
| `retry` | **Exists** as `play_again` (`src/app.ts`) | |
| `session_start` | **Exists** as `session_started` | See `game_open` note — these can be treated as the same event. |
| `session_end` | **New** — not instrumented | Requires a beforeunload/visibility-change hook; not present yet. Flag for developer approval before adding. |
| `rewarded_ad_available` | **New** — not instrumented | `src/services/ads.ts` tracks `rewarded_ad_requested`/`_completed`/`_failed` but not "became available" (i.e. `isRewardedReady()` transitioning true). Worth adding — cheap, high-signal for monetization tuning. |
| `rewarded_ad_started` | **Partially exists** as `rewarded_ad_requested` | Fires when the player taps to request the ad, not necessarily when playback starts — close enough for most purposes. |
| `rewarded_ad_completed` | **Exists** | |
| `interstitial_shown` | **Exists** | Already gated by the `interstitialEveryNRuns`/`interstitialCooldownSec` policy in `AdManager`. |
| `ad_revenue` | **New** — not instrumented at the event level | AdMob's own dashboard reports aggregate estimated earnings; a per-impression `ad_revenue` event (with the SDK's reported value, when available) would allow revenue-per-player and revenue-per-creative attribution, which the dashboard alone can't provide. High priority once a provider is approved. |
| `store_open` | **New** — not instrumented | No in-app store currently exists (no IAP surface) — flag as not applicable unless a store is added. |
| `game_over` | **Exists** | Fires with run summary data in `playController.ts`. |
| `player_returned` | **New** — not instrumented | Would need to compare current session timestamp against `Save`'s `lastPlayed` field (already persisted in `src/services/storage.ts`) — cheap to add once a provider exists, since the raw data (`lastPlayed`) is already being saved locally. |

## Parameters worth carrying on each event (not currently sent to any backend, but already computed in-game and available to attach)

- `level` / `band` / `difficulty` — already computed per-challenge in `difficulty.ts`.
- `bestLevel` / `bestScore` / `coins` / `runs` — already persisted in `SaveData` (`storage.ts`), trivially attachable to any event as user-level context.
- `placement` — already passed on every ad event (`ads.ts`).

## What this unlocks once wired

- **Retention** (`RETENTION.md`) — requires `session_start`/`game_open` tied to a stable per-install identifier, which requires a real provider (Firebase, or any alternative the developer approves).
- **Creative attribution** (`CAMPAIGN_TRACKER.md`) — requires linking an install to the ad click that produced it (a UTM/Meta-SDK-level concern, separate from in-game analytics — see `FACEBOOK_ADS.md` Phase 4 note on attribution tooling).
- **Revenue per player** (`MONETIZATION.md`) — requires the new `ad_revenue` event described above.

## Explicit next step (requires developer decision, not unilateral action)

Choose and approve one analytics provider before any of the above can move from "specified" to "collected." Candidates worth considering (not a recommendation to install any of them without approval):
- Firebase Analytics (the abstraction in `analytics.ts` is already shaped for this — lowest integration cost)
- A lighter-weight alternative if Firebase's footprint is unwanted

This decision is flagged in `LAUNCH_CHECKLIST.md` as a blocker before scaling paid spend past Phase 1.
