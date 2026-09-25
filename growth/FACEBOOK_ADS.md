# Facebook & Instagram Ads Plan

## Phase 1 — $15 validation (current phase)

- **Total budget:** $15
- **Daily budget:** $5/day
- **Duration:** 3 days
- **Platforms:** Facebook + Instagram (single placement group, automatic placements — do not split into separate FB-only / IG-only campaigns at this budget)
- **Objective:** App installs
- **Destination:** Google Play listing (One More Level)
- **Structure: ONE campaign, ONE ad set, FIVE creatives** (concepts A–E from `CREATIVE_LIBRARY.md`, one duration cut each — recommend the **15s cut** for all five in Phase 1, since it's cheapest to produce and short-form performs best for cold-audience installs ads). Do not split the $15 across multiple campaigns — Meta's delivery algorithm needs volume to leave the learning phase, and fragmenting $15 across several campaigns guarantees every one of them stays starved of data.
- **Targeting:** Broad (no narrow interest stacking) — let Meta's algorithm find the audience; at $5/day, an over-narrowed audience just slows delivery. Age 16+, no gender restriction, core geos where you're prepared to support the app (start with the market matching your Play Store closed-testing tester base's country).
- **What this phase is actually for:** a directional read on which of the 5 hook concepts gets cheaper clicks and installs — not a final answer (see minimum data bar in `CAMPAIGN_TRACKER.md`). $15 will likely produce a small number of total installs; that's expected and fine.

### What to log during Phase 1
Every day, pull Ads Manager's per-creative breakdown into `data/creative-data.csv` (spend, impressions, reach, CTR, CPC, installs, CPI per creative_id). Do not wait until day 3 — daily logging lets you catch a creative that's burning budget with zero results and matters even at this budget (Meta can spend $5 in hours if CPM is unlucky).

## Phase gating — read before increasing budget

**Do not move to the next phase on CPI alone.** Every phase increase below requires:
1. At least one creative reaching **KEEP** per the minimum data bar in `CAMPAIGN_TRACKER.md`, and
2. D1 retention data on installs from that creative that is not clearly worse than your organic/overall baseline (once available — see `RETENTION.md` and `ANALYTICS_SPEC.md`), and
3. No red flag in `MONETIZATION.md`'s revenue-per-player tracking suggesting installs are low-value.

If Phase 1 produces cheap installs but you have no way yet to check retention (likely, given the current analytics gap — see `INITIAL_AUDIT.md`), **the correct move is to fix that gap before scaling spend, not to scale on CPI alone.** See `LAUNCH_CHECKLIST.md`.

## Phase 2 — $5/day → $10/day

- Triggered only once Phase 1 gating criteria are met.
- Reallocate budget toward the 1–2 KEEP creatives from Phase 1; drop PAUSE creatives entirely; ITERATE creatives get one revised variant tested alongside the winners, not instead of them.
- Duration: run until each active creative individually clears the minimum data bar (30 clicks / 5 installs) — do not time-box this phase to a fixed number of days; let the data decide.

## Phase 3 — $10/day → $15/day

- Triggered only when Phase 2 shows retention (D1 at minimum, ideally D3) holding steady or improving on the winning creative(s) at the higher spend level, not just at the original small sample.
- Begin testing audience segmentation (broad vs. lookalike, if you have any install/purchase-event data to build a lookalike from) — not before, since a lookalike built on too few conversions is unreliable.

## Phase 4 — $15/day → $25/day

- Triggered only when Phase 3 shows a defensible estimated ROAS (see `MONETIZATION.md` for how estimated LTV is calculated) — i.e. estimated revenue per installed player, projected out, credibly exceeds CPI within a reasonable payback window.
- At this point, consider whether a dedicated attribution tool (AppsFlyer/Adjust, or Meta's own SDK-based app events) is worth adopting — flag this decision explicitly to the developer; do not adopt a new SDK unilaterally (see `INITIAL_AUDIT.md` / `ANALYTICS_SPEC.md`).

## What to track at every phase

`CPI, install volume, retention (D1/D3/D7), playtime, revenue per player, estimated LTV, ROAS` — all defined and calculated in `MONETIZATION.md` and `KPI_DASHBOARD.md`. Never optimize for CPI alone; a cheap install that uninstalls immediately is a worse outcome than a more expensive install that plays and monetizes. This is a hard rule, not a suggestion — Phase gating above enforces it structurally.

## Current status

DATA REQUIRED — Phase 1 has not yet been launched. Once it launches, log daily in `data/campaign-data.csv` (campaign_id: `P1-VALIDATION`) and `data/creative-data.csv`.
