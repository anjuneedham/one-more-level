# Growth Strategy — One More Level

## The situation, honestly

- The game is built, monetized (live AdMob, real ad units confirmed serving), and Play Store submission is in progress (closed testing).
- There is **no attribution, no captured analytics, and no prior campaign data.** Every strategy decision below is therefore designed to *generate the first real data*, not to optimize against data that doesn't exist yet.
- Budget for the initial paid test is **$15 total.** This is a validation test, not a scale test — it exists to learn whether Facebook/Instagram can deliver installs at a workable CPI for this game, and which creative hook resonates, not to move any meaningful volume.

## The sequence

1. **Paid validation ($15, 3 days, Facebook + Instagram, one campaign, five creatives).** See `FACEBOOK_ADS.md`. The goal is a directional read on CPI and CTR across 5 hook concepts, not a statistically airtight result — $15 cannot produce that, and this plan does not pretend otherwise.
2. **Organic content engine runs in parallel, not after.** TikTok/Reels/Shorts cost nothing but time, and gameplay clips double as raw material for the next round of paid creative. See `CONTENT_ENGINE.md`.
3. **Google Ads App Campaigns come next, not simultaneously with step 1.** See `GOOGLE_ADS.md`. This channel needs far fewer creative assets than Facebook (a few text lines and reused screenshots/clips) but needs more daily budget (~$10/day minimum) to generate signal, and it's the only paid channel that places ads directly inside the Play Store's own search/browse surfaces. Running it after Facebook means its minimal text assets can reuse whichever hook already showed signal, instead of guessing blind on two channels at once.
4. **Only scale paid spend on either channel when retention + revenue data supports it**, not on CPI alone. A campaign that produces $0.20 installs that all uninstall in one session is a worse outcome than $1.00 installs that stick. See `FACEBOOK_ADS.md` Phase 2–4 and `GOOGLE_ADS.md` G2–G3 gating criteria.
5. **Analytics comes before scale, not after.** The single highest-priority infrastructure gap (see `INITIAL_AUDIT.md`) is that no install- or session-level data is currently captured anywhere. Budget should not scale past Phase 1 (Facebook) or G1 (Google) until this is resolved — see `LAUNCH_CHECKLIST.md`.

## Why this order

A solo developer with a $15 test budget cannot afford to learn the wrong lesson from noisy data. The structure here is built to avoid three common failure modes:

- **Declaring a creative winner from 3 installs.** `CAMPAIGN_TRACKER.md` sets an explicit minimum-data bar before KEEP/PAUSE decisions are allowed.
- **Optimizing for CPI in isolation.** Cheap installs from players who churn immediately are worse than no installs — `FACEBOOK_ADS.md` makes retention and revenue-per-player co-equal gates for budget increases.
- **Treating organic and paid as separate tracks.** The same gameplay recording session feeds both — see the repurposing workflow already established for content (`CONTENT_ENGINE.md` links back to it).

## Roles this system assumes

Solo developer, small budget, no dedicated video editor, no paid analytics/attribution tooling yet. Every recommendation in this directory is scoped to be executable by one person with a phone, a screen recorder, and Ads Manager access.
