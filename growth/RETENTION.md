# Retention

## Tracked cohorts

D0, D1, D3, D7, D14, D30 — logged per install-date cohort in `data/retention-data.csv` (`cohort_date, cohort_size, d0, d1, d3, d7, d14, d30, ...`).

Also tracked per cohort:
- Average session length
- Sessions per player
- Levels completed (average)
- Attempts per level (average)
- Player progression (best level reached, distribution)
- Returning players (count/rate)
- Rewarded-ad usage rate

## Current status

**DATA REQUIRED.** No retention data exists yet — this requires a working analytics pipeline (see `ANALYTICS_SPEC.md`), which is not yet wired to any backend. Do not populate this section with estimates; `MONETIZATION.md` is where labeled assumptions belong, not this file.

## Interpretation framework (for once real data exists)

Use this as a reading guide, not a scorecard with invented benchmarks — mobile hypercasual/arcade retention varies widely by exact genre and format, and a generic "good D1 is X%" number would itself be a fabrication. Instead:

1. **Compare cohorts to each other, not to an external benchmark.** Is D1 trending up or down cohort over cohort as the game/creative changes? That trend is meaningful even without knowing whether your absolute D1 number is "good" by outside standards.
2. **Compare retention across creative sources** (once attribution exists — see `CAMPAIGN_TRACKER.md`). If Concept C (Rage) installs retain worse than Concept A (Challenge) installs at the same CPI, that's a real signal to shift budget even if you don't have an industry number to compare either to.
3. **Watch for the specific failure mode flagged in `INITIAL_AUDIT.md`**: no daily-return hook currently exists in the game. If D1 retention is reasonable but D3/D7 falls off a cliff, that's consistent with "the core loop is fun in one sitting but nothing pulls players back the next day" — the relevant experiments are in `EXPERIMENTS.md` (daily challenge, streak mechanic).
4. **Rewarded-ad usage rate as a proxy for engagement depth.** A player who opts into a rewarded ad to continue a run is meaningfully more engaged than one who quits at 0 lives — track this rate per cohort as a secondary engagement signal, not just a monetization one.
5. **Attempts per level, watched over time.** A rising attempts-per-level trend within a cohort (not across the whole difficulty curve, which naturally rises — within a fixed level) can indicate either satisfying challenge or frustrating difficulty; cross-reference with D1 retention to tell which.

## Once data exists

Replace this section's "DATA REQUIRED" status with real numbers from `data/retention-data.csv`, and update `weekly-review.md` to reference the latest cohort each week.
