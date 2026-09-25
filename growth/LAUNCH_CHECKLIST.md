# Launch Checklist

What must be true before spending real paid budget, and before scaling past it. Grounded in the actual current state found in `INITIAL_AUDIT.md` — checked items are confirmed from the repository/prior session, unchecked items are real gaps.

## Before ANY paid spend (Phase 1 — $15 validation)

- [x] Game is functional and playable (confirmed — full challenge loop, difficulty curve, save system all implemented and working)
- [x] Monetization is live (confirmed — real AdMob App ID + ad units wired, non-zero requests/impressions observed on the AdMob dashboard)
- [x] Privacy policy and terms are live and linked (`docs/privacy.html`, `docs/terms.html`, referenced in `LINKS` in `config.ts`)
- [ ] Play Store listing is fully live and installable (in progress as of this audit — closed testing track set up, tester Google Group being configured; **paid ads cannot legally/sensibly point at a listing that isn't installable yet**)
- [x] Store graphic assets exist (icon, feature graphic, phone + tablet screenshots — all produced and delivered)
- [x] At least 5 ad creative concepts are scripted and ready to produce (`CREATIVE_LIBRARY.md`)
- [ ] All 5 Phase 1 creatives are actually filmed/edited/exported (DATA REQUIRED — scripts exist, footage capture has not been confirmed complete)

**Phase 1 ($15 test) can reasonably launch once the Play Store listing is actually live and the 5 creatives are produced — the ad spend itself doesn't need analytics wired yet, since its only job is a directional CPI/CTR read.**

## Before Phase 2+ (any budget increase past the initial $15)

- [ ] **Install attribution exists** (which creative/campaign produced which install) — currently **missing entirely**. This is the single highest-priority blocker; see `EXPERIMENTS.md` E25 and `ANALYTICS_SPEC.md`. Without this, `CAMPAIGN_TRACKER.md`'s per-creative retention/revenue fields cannot ever be filled in, and Phase 2+ gating in `FACEBOOK_ADS.md` cannot be honestly evaluated.
- [ ] **An analytics provider is approved and wired** (see `ANALYTICS_SPEC.md`) — the event taxonomy and call sites already exist in code (`src/services/analytics.ts`); this requires a developer decision on provider, not new instrumentation work.
- [ ] At least one Phase 1 creative has reached the minimum data bar (30 clicks / 5 installs — `CAMPAIGN_TRACKER.md`) with a KEEP decision.
- [ ] Retention data exists for at least one cohort (`RETENTION.md`) — even a rough D1 read is enough to avoid scaling spend on installs that don't stick.

## Ongoing (recheck every weekly review)

- [ ] No existing game functionality has been broken by any growth-driven change (ads config, difficulty tuning, etc.) — cross-check against `INITIAL_AUDIT.md`'s documented baseline behavior.
- [ ] No fabricated data exists anywhere in `/growth` — spot-check CSVs and docs periodically; anything without a real source should read `DATA REQUIRED`.
- [ ] Links between growth documents still resolve (see verification note below).

## Verification performed at the time this checklist was created

- All files listed in the growth OS spec exist under `/growth`.
- Internal links between growth docs use relative paths and were checked to point at files that actually exist in this same commit.
- No existing game code (`src/`) was modified as part of building this growth system.
- No dependencies were added to `package.json`.
- No fabricated metrics were written anywhere in `/growth` — every numeric claim is either sourced from a real prior observation (e.g. the AdMob dashboard read, clearly caveated for sample size) or explicitly labeled `ASSUMPTION` / `DATA REQUIRED`.
