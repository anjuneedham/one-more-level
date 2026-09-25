# Experiment Backlog

Every experiment: Hypothesis → Change → Metric → Expected result → Actual result → Decision. Log actual results only when real; leave `DATA REQUIRED` otherwise. Decisions use the same KEEP / ITERATE / PAUSE / RETEST framework as `CAMPAIGN_TRACKER.md`, applied to the experiment as a whole rather than a single creative.

## Creative / hook experiments

### E01 — Challenge hook
**Hypothesis:** A direct dare ("can you beat this?") produces higher CTR than a descriptive headline.
**Change:** Launch Concept A against the other 4 in Phase 1.
**Metric:** CTR, CPI.
**Expected result:** Competitive or best CTR among the 5.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E02 — Rage hook
**Hypothesis:** Rage/fail framing drives strong organic engagement (shares/comments) but may underperform on install CTR vs. more direct concepts.
**Change:** Launch Concept C against the other 4 in Phase 1; track organic performance of the same footage separately on TikTok/Reels.
**Metric:** CTR + CPI (paid), shares/comments (organic).
**Expected result:** Lower CTR than Challenge/Curiosity but higher organic share rate.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E03 — Curiosity hook
**Hypothesis:** An open curiosity loop ("this looks easy...") outperforms a direct dare on watch-through rate.
**Change:** Compare Concept B's video completion rate against Concept A's.
**Metric:** Video completion rate (Ads Manager reports this per creative).
**Expected result:** Higher completion rate for B.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E04 — Developer POV content
**Hypothesis:** Dev-process content (`CONTENT_ENGINE.md` #26–28) builds a more durable following than pure gameplay clips, even with lower individual view counts.
**Change:** Post 2–3 dev-POV pieces alongside gameplay content for 2 weeks; compare follower retention/growth rate between the two content types.
**Metric:** Follower growth rate, saves.
**Expected result:** Lower views, higher save/follow rate per view than gameplay clips.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E05 — Progression montage
**Hypothesis:** Showing the full level 1→25 arc in one video increases perceived game depth and improves CPI vs. single-level clips.
**Change:** Launch Concept D against the other 4 in Phase 1.
**Metric:** CPI, CTR.
**Expected result:** Competitive CPI, possibly lower CTR (montage format is less "scroll-stopping" than a single dramatic moment).
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

## Editing / format experiments

### E06 — Faster editing
**Hypothesis:** Faster cut pacing (1s per clip) increases hook retention (first 3-second watch-through) on TikTok specifically.
**Change:** Produce a fast-cut variant of Concept D (15s spec) vs. the standard-pace 20s spec.
**Metric:** 3-second watch-through rate, completion rate.
**Expected result:** Higher early retention, possibly lower completion.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E07 — Slower gameplay
**Hypothesis:** Slightly slowed-down key moments (e.g. a fail or clutch clear) improve comprehension and shareability vs. real-time-only cuts.
**Change:** A/B a slow-mo insert on the Concept C (Rage) fail moment vs. a real-time-only cut.
**Metric:** Shares, comments, watch-through rate.
**Expected result:** Slow-mo version performs better on shares specifically.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E08 — Different opening frame
**Hypothesis:** Opening on a freeze-frame + text (current spec) beats opening directly on moving gameplay for cold-audience CTR.
**Change:** Produce an alternate cut of Concept A with no freeze-frame/text — straight into gameplay.
**Metric:** CTR.
**Expected result:** Freeze-frame version wins on CTR (context before action helps cold viewers).
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E09 — Different CTA
**Hypothesis:** "Try It" outperforms "Play Now" for the Curiosity concept specifically (lower-commitment framing matches the hook's tone).
**Change:** A/B the two CTA texts on Concept B.
**Metric:** CTR, CPI.
**Expected result:** "Try It" wins for Concept B; "Play Now" wins for Concept A (direct dare matches direct CTA).
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E10 — Different thumbnail/opening card
**Hypothesis:** A result-card-first thumbnail (showing "COMPLETE" + score) outperforms a mid-gameplay thumbnail for static ads.
**Change:** A/B two static ad variants with different lead images.
**Metric:** CTR.
**Expected result:** Result-card version wins (shows the payoff up front).
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

## Monetization experiments

### E11 — Different reward (rewarded ad)
**Hypothesis:** Offering +2 lives instead of +1 for a rewarded continue increases rewarded-ad opt-in rate without proportionally hurting session count (players who'd have quit now finish stronger runs).
**Change:** Test `GameSession.revive(2)` vs. current `revive(1)` default for the continue placement.
**Metric:** Rewarded ad opt-in rate, session length, D1 retention.
**Expected result:** Higher opt-in rate; retention impact uncertain — this is exactly why it's an experiment, not a shipped change.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E12 — Different interstitial frequency
**Hypothesis:** Loosening `interstitialEveryNRuns` from 3 to 2 increases revenue without a detectable retention drop.
**Change:** A/B `interstitialEveryNRuns: 2` vs. current `3` (requires analytics wired first — do not ship blind).
**Metric:** Ad revenue/player, D1/D3 retention.
**Expected result:** Revenue up; retention risk is the real question.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — blocked on `ANALYTICS_SPEC.md` provider approval.

### E13 — Ad placement timing
**Hypothesis:** Showing the rewarded-continue offer immediately on death (current behavior) outperforms a 1–2 second delay that lets the fail moment register first.
**Change:** A/B immediate vs. delayed rewarded-ad prompt.
**Metric:** Rewarded ad opt-in rate.
**Expected result:** Delayed prompt performs better (avoids feeling like an interruption).
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E14 — Reward size for coins
**Hypothesis:** A rewarded-ad option for a coin bonus (separate from the life-continue) increases overall ad engagement among players who reach 0 lives and decline the continue.
**Change:** Add a secondary rewarded placement offering a coin bonus post-game-over (new feature — requires actual implementation, not just config).
**Metric:** Additional rewarded impressions/player.
**Expected result:** Modest incremental revenue from players who decline the continue offer.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — requires a shipped feature; do not build without confirming this is worth prioritizing over other backlog items.

### E15 — Interstitial cooldown length
**Hypothesis:** The current 120s cooldown is conservative enough that shortening it to 90s has negligible retention impact.
**Change:** A/B `interstitialCooldownSec: 90` vs. `120`.
**Metric:** Ad revenue/player, D1 retention.
**Expected result:** Small revenue gain, retention impact likely negligible but unproven.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

## Game/product experiments (flagged — require actual dev work, not just growth-doc changes)

### E16 — Level difficulty changes
**Hypothesis:** The jump in difficulty between bands (`easy`→`normal`→`hard`→`expert` in `difficulty.ts`) is steeper at one particular boundary than players tolerate well, based on where fail-rate spikes.
**Change:** Once analytics exist, plot fail rate by level; if one boundary spikes disproportionately, test a smoothing adjustment there.
**Metric:** Fail rate by level, D1 retention.
**Expected result:** DATA REQUIRED to even identify the boundary in question.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — blocked on analytics.

### E17 — Daily challenge
**Hypothesis:** A daily challenge (fixed seed, same level for everyone, once/day) would improve D1→D7 retention by giving players a reason to return the next day — directly addresses the "no daily-return hook" gap flagged in `INITIAL_AUDIT.md`.
**Change:** Requires new feature work (not in scope of this growth-docs task) — flag for developer prioritization.
**Metric:** D1, D3, D7 retention, before/after.
**Expected result:** Meaningful D3/D7 lift if the hypothesis about the current gap is correct.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — recommend prioritizing after Phase 1 paid data comes in, since it's the single most retention-relevant gap identified in the audit.

### E18 — Score system changes
**Hypothesis:** Making the speed-bonus scoring (`ChallengeReward.speedBonus`) more visible mid-run (not just on the result card) increases session length by reinforcing the reward loop in real time.
**Change:** Requires UI work — flag for developer.
**Metric:** Avg session length, sessions/player.
**Expected result:** DATA REQUIRED
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E19 — Leaderboard
**Hypothesis:** A local or friend-based leaderboard would increase sessions/player among players who already have a high best-score, by giving them a reason to keep improving beyond their own record.
**Change:** Requires new feature work — no leaderboard currently exists.
**Metric:** Sessions/player among returning players.
**Expected result:** DATA REQUIRED
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — lower priority than E17 (daily challenge) absent evidence competitive players are a large cohort.

### E20 — Streak mechanic
**Hypothesis:** A visible day-streak counter (currently `Save.runs`/`lastPlayed` exist but no streak logic) would improve D7/D14/D30 retention.
**Change:** Requires new feature work.
**Metric:** D7, D14, D30 retention.
**Expected result:** DATA REQUIRED
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED

### E21 — More levels
**Hypothesis:** Extending past the current 25-level content ceiling (currently handled by the "overdrive" difficulty extension, not new content) would improve long-run retention for high-skill players who exhaust the curve.
**Change:** Requires content work — new challenge definitions in `src/challenges/`.
**Metric:** D7/D14 retention specifically among players who reach level 25+.
**Expected result:** DATA REQUIRED — needs a way to segment this cohort first.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — low priority until data shows a meaningful cohort actually reaches level 25 regularly.

### E22 — New UI
**Hypothesis:** DATA REQUIRED — no specific UI complaint has been observed yet; this experiment exists as a placeholder pending user feedback or session-recording data.
**Change:** DATA REQUIRED
**Metric:** DATA REQUIRED
**Expected result:** DATA REQUIRED
**Actual result:** DATA REQUIRED
**Decision:** RETEST — insufficient basis to define this experiment concretely yet.

### E23 — Social sharing
**Hypothesis:** A native "share my score" button (currently does not exist — see `INITIAL_AUDIT.md` weaknesses) would meaningfully increase organic installs, since screenshots of the result card are already share-worthy content that currently requires manual screenshot + manual posting.
**Change:** Add a share button to the game-over/result screen that generates a shareable image (reusing the existing result-card UI).
**Metric:** Organic install volume, share button tap rate.
**Expected result:** Measurable organic lift, magnitude unknown until tested.
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — recommended as a near-term build given it directly addresses a real, identified gap and is cheap relative to other product experiments here.

### E24 — Player challenge system
**Hypothesis:** An in-app "challenge a friend to beat this level" flow (share a specific level + score to beat) would compound with the organic content strategy's player-challenge content category (`CONTENT_ENGINE.md` #23–24).
**Change:** Requires new feature work — depends on E23 (share button) as a foundation.
**Metric:** Viral coefficient (installs per active player attributable to shares), sessions/player.
**Expected result:** DATA REQUIRED
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — sequence after E23.

### E25 — Attribution/UTM wiring
**Hypothesis:** Without any install attribution, Phase 2+ budget decisions (`FACEBOOK_ADS.md`) cannot actually be tied to retention/revenue outcomes per creative, undermining the entire phase-gating model.
**Change:** Adopt an attribution method (Meta's own app events SDK at minimum, or a dedicated MMP) — requires developer approval per `ANALYTICS_SPEC.md`.
**Metric:** N/A — this is infrastructure, not a growth metric itself.
**Expected result:** Unblocks every experiment above that depends on "retention by creative source."
**Actual result:** DATA REQUIRED
**Decision:** DATA REQUIRED — flagged as a launch blocker in `LAUNCH_CHECKLIST.md`, highest-priority item in this entire backlog.
