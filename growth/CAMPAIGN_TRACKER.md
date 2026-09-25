# Campaign & Creative Tracker

This is the process doc; the actual data lives in `data/campaign-data.csv` (one row per campaign/ad set) and `data/creative-data.csv` (one row per creative variant). Update the CSVs directly — this file defines what each field means and how decisions get made.

## Creative tracking fields

Every creative variant (e.g. `A-CHALLENGE-15`) gets one row in `data/creative-data.csv` with these fields:

| Field | Meaning |
|---|---|
| `creative_id` | e.g. `A-CHALLENGE-15` — concept letter + name + duration |
| `campaign_id` | Links to `campaign-data.csv` |
| `hook` | The exact opening line used |
| `concept` | A/B/C/D/E |
| `format` | video / static |
| `duration_sec` | 15 / 20 / 30 |
| `date_launched` | |
| `spend` | Actual $ spent on this creative specifically (Ads Manager breaks this out per-ad) |
| `impressions` | |
| `reach` | |
| `ctr` | Click-through rate |
| `cpc` | Cost per click |
| `installs` | |
| `cpi` | Cost per install |
| `d1_retention` / `d3_retention` / `d7_retention` | % of installs from this creative still active at that day mark — requires attribution, see `ANALYTICS_SPEC.md` |
| `sessions_per_player` | |
| `avg_playtime_sec` | |
| `ad_impressions_per_player` | |
| `est_revenue_per_player` | |
| `notes` | Free text — anything that explains an outlier |
| `decision` | KEEP / ITERATE / PAUSE / RETEST — see below |

## Decision framework

**KEEP** — Performs meaningfully above the batch average on both CPI *and* D1 retention (or revenue/player once available). Produce more variants of this hook/format. Move its concept file into `creatives/winners/`.

**ITERATE** — Directionally promising (CTR or CPI competitive) but one clear weakness (e.g. good clicks, weak retention — suggests the hook over-promises what the game delivers). Change one variable (hook, opening frame, duration, or CTA) and retest as a new creative_id. Do not change more than one variable at a time, or the next result won't tell you what caused the change.

**PAUSE** — Clearly underperforms the batch on the metrics that matter most at the current phase (see `FACEBOOK_ADS.md` phase gating). Stop spend on it. Log it under `creatives/losers/` with the most likely reason.

**RETEST** — Result is ambiguous because of low sample size, not because the creative is bad or good. This is the default decision whenever the minimum data bar below isn't met — never KEEP or PAUSE on insufficient data.

## Minimum data bar (read this before making ANY decision)

Do **not** assign KEEP or PAUSE to a creative until it has accumulated:

- At least **30 clicks**, and
- At least **5 installs**

Below that, the only valid decisions are **RETEST** (give it more budget/time) or leaving it as **DATA REQUIRED**. This matters most for the initial $15 test: split five ways, each creative may see single-digit installs. That is expected and is explicitly *not* enough data to declare a winner — the $15 test's job is to surface which 1–2 concepts look directionally strongest so Phase 2 budget (`FACEBOOK_ADS.md`) can concentrate spend and actually reach the data bar.

## Campaign-level fields

`data/campaign-data.csv` tracks the campaign/ad set as a whole: `campaign_id, platform, objective, start_date, end_date, total_budget, daily_budget, spend, impressions, reach, clicks, ctr, cpc, installs, cpi, notes`. One row per phase (see `FACEBOOK_ADS.md`) — Phase 1's $15 test is `campaign_id = P1-VALIDATION`.
