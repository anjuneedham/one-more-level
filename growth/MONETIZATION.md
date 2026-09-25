# Monetization Model

## Current live monetization (as implemented — see `INITIAL_AUDIT.md`)

- Provider: AdMob, real ad units confirmed live (via `@capacitor-community/admob`).
- **Rewarded ad**: opt-in "continue with +1 life" on death.
- **Interstitial**: throttled — at most once per 3 game-overs, never within 120s of the previous one (`BALANCE.interstitialEveryNRuns = 3`, `BALANCE.interstitialCooldownSec = 120`, in `src/services/config.ts`). This is a deliberate retention-protective policy already in the codebase; treat it as a baseline to test against, not a default to casually override.

## Revenue calculator

All figures below are **labeled planning assumptions**, not measured results, until `data/retention-data.csv` / a real analytics pipeline (`ANALYTICS_SPEC.md`) supplies actual numbers.

### Formula

```
daily_ad_impressions = DAU × avg_hours_played_per_day × ads_per_hour
daily_revenue         = (daily_ad_impressions / 1000) × eCPM
monthly_revenue        = daily_revenue × 30
ARPDAU                 = daily_revenue / DAU
```

### Baseline planning scenario (ASSUMPTION — as specified)

| Input | Value | Status |
|---|---|---|
| DAU | 30 | ASSUMPTION |
| Hours played/player/day | 3 | ASSUMPTION |
| Ads/hour | 5 | ASSUMPTION |
| eCPM | $6 | ASSUMPTION |

```
daily_ad_impressions = 30 × 3 × 5 = 450
daily_revenue         = (450 / 1000) × $6 = $2.70
monthly_revenue        = $2.70 × 30 ≈ $81
ARPDAU                 = $2.70 / 30 = $0.09
```

**This matches the specified planning figures exactly: ~450 impressions/day, ~$2.70/day, ~$81/month.** Flagged clearly as a *planning assumption*, not a guaranteed or observed result — no live data currently supports either the DAU, hours-played, ads/hour, or eCPM inputs above (real observed eCPM as of the last AdMob check was $3.47, but based on only 4 impressions — see the note in the dashboard screenshot review; not enough to use as a planning input yet either).

### Recalculating for other scenarios

Use the same formula with different labeled inputs. Example — the 1,000-DAU / 2.5hr scenario discussed earlier in this conversation, with its own caveats intact:

| Input | Value | Status |
|---|---|---|
| DAU | 1,000 | ASSUMPTION (hypothetical scale test) |
| Ad impressions/player/day | ~14 (derived from an event-driven model, not a flat ads/hour rate — see prior estimate) | ASSUMPTION |
| eCPM | $2–$5 range | ASSUMPTION (current $3.47 observed figure is statistically unreliable, n=4) |

Do not treat either scenario as a forecast — both exist to size the model's sensitivity to its inputs, which is the actual point of building a calculator instead of a single fixed number.

## What to track once real data exists

`DAU, sessions, hours played, ads/player, ad impressions, eCPM, ARPDAU, daily ad revenue, monthly ad revenue, estimated player LTV` — log these in a dated table below as real AdMob dashboard pulls and (once wired) analytics data become available.

### Real data log

DATA REQUIRED — no dated real-data entries yet. Format for future entries:

```
### 2026-XX-XX
DAU: 
Sessions: 
Hours played (total): 
Ads/player (avg): 
Ad impressions (total): 
eCPM: 
ARPDAU: 
Daily ad revenue: 
Monthly ad revenue (projected from this day): 
Estimated player LTV: 
Source: [AdMob dashboard screenshot / analytics export / etc.]
```

## Estimated LTV

Once revenue-per-player and retention curves both exist (`RETENTION.md`), estimate LTV as:

```
LTV ≈ ARPDAU × sum of (retention rate at day N) for N = 0 to 30
```

This is a standard retention-curve LTV approximation, not the only valid method — flag any LTV number quoted anywhere in this repo as an estimate derived this way, never as measured fact, until players are tracked for a full 30+ day window.

## Ad-placement / frequency experiments

See `MONETIZATION.md`-specific experiments in `EXPERIMENTS.md` (rewarded reward size, interstitial frequency, placement timing). Key principle carried from the audit: **do not make ads more aggressive than the current baseline without a documented experiment showing retention holds.** The current interstitial throttle (`interstitialEveryNRuns`, `interstitialCooldownSec`) exists in code for a reason — treat loosening it as a hypothesis to test, not a default lever to pull for more revenue.

Natural break points already present in the game loop where ads make sense (and where the current interstitial policy already places them): the **game-over screen** (after a full run ends, before the "Try Again" flow), and the **mid-run "continue" moment** (rewarded, opt-in, tied to a real reward — an extra life). Both are already the actual placements in `src/services/ads.ts`; any new placement idea should be tested against these existing ones, not assumed to be additive.
