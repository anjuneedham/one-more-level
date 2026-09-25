# Growth Operating System — One More Level

This directory is the operating system for user acquisition, creative testing, retention tracking, and monetization decisions for **One More Level**. It is meant to be *used*, not read once — update the CSVs and trackers as real data comes in, and follow the weekly loop.

Start here, in this order:

1. **[INITIAL_AUDIT.md](./INITIAL_AUDIT.md)** — what the game actually is, what's already built, what's missing. Read this first; everything else builds on it.
2. **[GROWTH_STRATEGY.md](./GROWTH_STRATEGY.md)** — the overall approach: paid test → organic content engine → phased scale, and why.
3. **[FACEBOOK_ADS.md](./FACEBOOK_ADS.md)** — the $15 validation test and the phased budget plan after it.
4. **[CREATIVE_LIBRARY.md](./CREATIVE_LIBRARY.md)** — the 5 initial ad concepts, fully scripted (15s/20s/30s cuts, copy, CTAs).
5. **[CAMPAIGN_TRACKER.md](./CAMPAIGN_TRACKER.md)** — how every creative gets tracked, and the KEEP / ITERATE / PAUSE / RETEST decision framework.
6. **[CONTENT_ENGINE.md](./CONTENT_ENGINE.md)** — 30+ organic short-form concepts for TikTok / Reels / Shorts.
7. **[ANALYTICS_SPEC.md](./ANALYTICS_SPEC.md)** — the event taxonomy the game should eventually report (no SDK installed without approval — see the doc).
8. **[RETENTION.md](./RETENTION.md)** — D0–D30 tracking and how to interpret it.
9. **[MONETIZATION.md](./MONETIZATION.md)** — the revenue calculator and ad-placement experiment backlog.
10. **[CREATIVE_PROMPTS.md](./CREATIVE_PROMPTS.md)** — ready-to-use prompts for producing every ad/creative asset type.
11. **[EXPERIMENTS.md](./EXPERIMENTS.md)** — the full experiment backlog (25+), each with a hypothesis and a decision log.
12. **[KPI_DASHBOARD.md](./KPI_DASHBOARD.md)** — the single human-readable snapshot of acquisition, engagement, retention, monetization, growth.
13. **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** — what must be true before spending real paid budget.
14. **[weekly-review.md](./weekly-review.md)** — the repeatable weekly workflow. Copy its template into a dated entry each week.

## Directory structure

```
growth/
  README.md                  <- you are here
  INITIAL_AUDIT.md
  GROWTH_STRATEGY.md
  EXPERIMENTS.md
  CREATIVE_LIBRARY.md
  CAMPAIGN_TRACKER.md
  KPI_DASHBOARD.md
  RETENTION.md
  MONETIZATION.md
  CONTENT_ENGINE.md
  FACEBOOK_ADS.md
  ANALYTICS_SPEC.md
  CREATIVE_PROMPTS.md
  LAUNCH_CHECKLIST.md
  weekly-review.md
  creatives/
    concepts/   <- one file per creative concept (A, B, C, D, E, ...)
    scripts/    <- shot-by-shot scripts per duration cut
    hooks/      <- hook copy library, reusable across concepts
    captions/   <- platform captions per creative
    winners/    <- creatives that hit KEEP after real data
    losers/     <- creatives that hit PAUSE, with the reason, so mistakes aren't repeated
  data/
    campaign-data.csv    <- one row per ad campaign/ad set
    creative-data.csv    <- one row per creative variant, matches CAMPAIGN_TRACKER.md fields
    retention-data.csv   <- one row per cohort date
```

## Ground rules (non-negotiable)

- **No fabricated data, anywhere in this directory.** Every metric field that has no real data behind it reads `DATA REQUIRED`, not a plausible-looking number.
- **Assumptions are always labeled as assumptions** — see `MONETIZATION.md` for the format.
- **No winner is declared from a tiny sample.** `CAMPAIGN_TRACKER.md` defines the minimum data bar before KEEP/PAUSE is even allowed as a decision.
- **This system does not touch game code** unless an experiment specifically requires a shippable change (e.g. adding a share button) — and even then, changes go through the normal repo workflow, not silently.
