# KPI Dashboard

Human-readable snapshot. Update this after every `weekly-review.md` entry — pull the numbers from `data/*.csv`, don't recompute by hand each time if the CSVs already have it.

Last updated: DATA REQUIRED (no data cycle has run yet)

---

## ACQUISITION

| Metric | Value |
|---|---|
| Spend | DATA REQUIRED |
| Impressions | DATA REQUIRED |
| Clicks | DATA REQUIRED |
| CTR | DATA REQUIRED |
| Installs | DATA REQUIRED |
| CPI | DATA REQUIRED |

## ENGAGEMENT

| Metric | Value |
|---|---|
| DAU | DATA REQUIRED |
| Sessions | DATA REQUIRED |
| Session length (avg) | DATA REQUIRED |
| Levels completed (avg) | DATA REQUIRED |
| Playtime (total/avg) | DATA REQUIRED |

## RETENTION

| Metric | Value |
|---|---|
| D1 | DATA REQUIRED |
| D3 | DATA REQUIRED |
| D7 | DATA REQUIRED |
| D14 | DATA REQUIRED |
| D30 | DATA REQUIRED |

## MONETIZATION

| Metric | Value |
|---|---|
| Ad impressions | DATA REQUIRED (AdMob dashboard has shown non-zero activity — see `MONETIZATION.md` real-data log for dated pulls) |
| eCPM | DATA REQUIRED — see caveat in `MONETIZATION.md` (last observed $3.47 on n=4, not usable as a trend yet) |
| Revenue | DATA REQUIRED |
| ARPDAU | DATA REQUIRED |
| Estimated LTV | DATA REQUIRED |

## GROWTH

| Metric | Value |
|---|---|
| Organic installs | DATA REQUIRED |
| Paid installs | DATA REQUIRED |
| Total installs | DATA REQUIRED |
| Active players | DATA REQUIRED |

---

## How to read this dashboard once populated

- **Acquisition** answers "is paid spend working and at what cost." Cross-reference CPI against Retention and Monetization before drawing conclusions — see the hard rule in `FACEBOOK_ADS.md` against optimizing CPI in isolation.
- **Engagement + Retention** together answer "do people actually like this game." These matter independent of acquisition channel.
- **Monetization** answers "is the business model working," and depends on Engagement being healthy first — a highly monetized but low-retention game is a warning sign, not a win.
- **Growth** is the composite view — organic vs. paid mix tells you how dependent the game currently is on ad spend to sustain its active player base.
