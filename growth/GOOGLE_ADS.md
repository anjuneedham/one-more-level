# Google Ads App Campaigns Plan

## How this differs from the Facebook plan (read this first)

`FACEBOOK_ADS.md` uses hand-produced, finished video creatives (5 concepts × 3 duration cuts, fully scripted in `CREATIVE_LIBRARY.md`) that you control and test directly against each other.

**Google Ads App Campaigns (formerly "Universal App Campaigns", still often called UAC) work differently: you supply raw assets, not finished ads.** Google's machine-learning system auto-assembles combinations of your text lines, images, and video clips, and tests/serves them itself across:

- Google Search results
- **The Play Store itself** — search results, "similar apps," browse/discovery surfaces (Facebook cannot place ads here at all — this is the one placement only Google Ads can reach)
- YouTube (in-stream and Shorts-style placements)
- Google Discover
- The AdMob publisher network (display/video across other apps)

You do not choose which combination shows to whom, and you do not get clean per-creative CTR/CPI the way Facebook Ads Manager provides. You get asset-level performance labels (`Low` / `Good` / `Best`) instead of full metrics per variant. This is a real tradeoff: less creative-testing control, in exchange for far less production work and a placement (in-Play-Store) that no other channel offers.

## What you need to produce (much less than the Facebook set)

Minimum asset requirements for an App Campaign:
- **Text assets:** up to 5 headlines (30 characters each) + up to 5 descriptions (90 characters each). Short lines, not scripts — reuse the hooks already written in `creatives/hooks/hook-library.md`, trimmed to fit.
- **Images:** at least 1, ideally 3–5 (mix of landscape and square/portrait). Reuse existing captured gameplay screenshots and the Play Store asset set already produced (`icon-512.png`, the phone screenshots) — no new production needed for a first launch.
- **Video (optional but recommended):** 1–2 short clips, 15–30s, YouTube-hosted (App Campaigns pull video from a YouTube link, not a direct upload). One of the Facebook 15s cuts (e.g. `A-CHALLENGE-15`) can be re-uploaded to YouTube (unlisted is fine) and reused here — no need to produce Google-specific video from scratch for a first test.

**So the actual net-new production for a first Google App Campaign, on top of what `CREATIVE_LIBRARY.md`/the store asset set already produced: a handful of short text lines.** Everything else is reused.

## Budget structure

Google App Campaigns need more daily signal than Facebook to optimize — Google's own guidance is a minimum of roughly **$10/day** in most markets for the algorithm to have enough conversion data to learn from within a campaign. This means the Facebook plan's "$5/day, 3 days" structure does not translate directly here.

**Recommended first Google test:** $10/day for 7 days (~$70 total) — run this *after*, not instead of, the Facebook $15 validation test in `FACEBOOK_ADS.md`, so the winning hook/text lines from that test can be reused as the Google campaign's text assets rather than guessing blind on both channels simultaneously.

| Phase | Daily budget | Duration | Trigger |
|---|---|---|---|
| G1 — Initial test | $10/day | 7 days (~$70) | After Facebook Phase 1 has identified at least one KEEP creative/hook |
| G2 | $10/day → $20/day | Ongoing | Campaign has exited Google's "learning phase" (Google Ads UI flags this) and CPI is stable |
| G3 | $20/day → $35/day | Ongoing | Retention/revenue data (once analytics is wired — see `ANALYTICS_SPEC.md`) supports it, same gating principle as `FACEBOOK_ADS.md` |

Same hard rule as the Facebook plan: **do not scale budget on install volume or CPI alone.** Google App Campaigns are optimized by default toward Google's own definition of "install" or, if configured, an in-app conversion event — which currently doesn't exist here since no analytics event is being collected (see `INITIAL_AUDIT.md`). Until that's wired, the campaign can only optimize toward raw installs, which carries the same "cheap install that immediately churns" risk flagged throughout this growth system.

## Tracking

Google App Campaigns don't give per-creative CTR/CPI/installs the way Facebook does. Log campaign-level results in the existing `data/campaign-data.csv` (it already has a `platform` column — use `platform = google_app_campaigns`, `campaign_id = G1-INITIAL` etc.). For asset-level notes (which text/image/video Google's UI labels `Best` vs `Low`), use a dated entry in this file's log below rather than trying to force Google's asset-group model into `creative-data.csv`'s Facebook-shaped schema.

### Asset performance log

DATA REQUIRED — no Google App Campaign has launched yet. Format for future entries:

```
### 2026-XX-XX — G1-INITIAL
Text assets and their label (Best/Good/Low):
Image assets and their label:
Video assets and their label:
Overall CPI:
Notes:
```

## Why this sequencing (Facebook first, then Google)

1. Facebook's controlled hook-testing (`CREATIVE_LIBRARY.md`, `CAMPAIGN_TRACKER.md`) is the cheapest way to learn *which message resonates* — $15 buys a directional read here because you control exactly what's being compared.
2. Google App Campaigns can't do that kind of controlled A/B on message the same way — Google's algorithm decides the mix. Feeding it a hook you already have some signal on (from Facebook) is a better use of the required ~$70 minimum than guessing blind on text assets.
3. Google's unique value — actual Play Store placement — matters most once you have *some* validated creative material to feed it, not before.

## Relationship to the rest of this growth system

- Uses the same brand palette and asset sourcing rules as `CREATIVE_PROMPTS.md` — no new prompt set needed, reuse it with "for Google App Campaigns" substituted for the platform name.
- Same launch-blocker logic as `LAUNCH_CHECKLIST.md`: don't scale past G1 without attribution/analytics wired.
- Add Google App Campaigns rows to `weekly-review.md` alongside Facebook once G1 launches — same weekly loop, one more data source to review.
