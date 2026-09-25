# Creative Library — Initial 5 Concepts

Five hook concepts, each with three duration cuts (15s / 20s / 30s), full ad copy, and explicit gameplay-capture requirements. All footage requirements point to real, existing mechanics (`src/challenges/*.ts`) — nothing here requires a feature that doesn't exist.

Each concept also has its own file under `creatives/concepts/` for standalone reference during production; this document is the master copy.

---

## A. CHALLENGE

**Hook:** "You have ONE MORE LEVEL. Can you beat it?"

- **Primary text:** Most people don't make it past level 8. 25 mini-challenges, one shot, no do-overs (unless you earn one). Think you're faster than that?
- **Headline:** Can you beat one more level?
- **CTA:** Play Now
- **Opening frame:** Countdown timer at 3, thumb hovering over a `tap_fast`-style challenge, on-screen text "YOU HAVE ONE MORE LEVEL."
- **Closing frame:** Freeze on a clean clear at a visibly hard level (band `hard`/`expert`), "COMPLETE" badge visible, app icon + "Play Now" CTA card.
- **Gameplay requirements:** One clean full clear of a mid-to-hard difficulty level (level 12–18 range, where `difficultyForLevel` is past the main ramp), timer visibly ticking down, no fail included in this cut.

### 15s
1. (0–2s) Hook text + timer starting.
2. (2–10s) Real-time challenge clip, uncut, timer visible.
3. (10–13s) "COMPLETE" result card, score/coins visible.
4. (13–15s) Logo + CTA card.

### 20s
Same structure as 15s, but opens on 2s of app icon reveal before the hook text, and closes with a 2s "25 levels. How far can YOU get?" card before the CTA.

### 30s
Adds a second, harder challenge (band `expert`, level 20+) after the first clear, so the viewer sees difficulty escalate within one ad — directly demonstrates the difficulty curve rather than describing it.

---

## B. CURIOSITY

**Hook:** "This level looks easy..."

- **Primary text:** It's not. Watch what happens at 0:07. (Then try it yourself.)
- **Headline:** This level looks easy. It isn't.
- **CTA:** Try It
- **Opening frame:** A deceptively simple-looking challenge (e.g. a `color_match` or `correct_order` puzzle frame, paused/static for a beat) with on-screen text "This looks easy..."
- **Closing frame:** The same challenge failing unexpectedly (misread, timer runs out, or a late twist in a `puzzle` challenge), "GAME OVER" card, then CTA.
- **Gameplay requirements:** A genuine near-miss or misread on a puzzle/memory challenge — real failure, not staged. Capture several attempts and pick the most surprising authentic fail.

### 15s
1. (0–3s) Static/slow-mo opening frame, hook text.
2. (3–8s) Real-time attempt, building tension.
3. (8–12s) The fail moment, on-screen text "...yeah, it's not."
4. (12–15s) CTA card.

### 20s
Adds a 3s replay of the exact fail moment in slow motion before the CTA — the "wait, what happened" beat that curiosity hooks depend on.

### 30s
Adds a second attempt where the player (visibly) adjusts strategy and clears it — turns pure curiosity into a mini redemption arc, closes on the win instead of the fail.

---

## C. RAGE / FAILURE

**Hook:** "I was ONE jump away..."

- **Primary text:** 3 lives. 1 level away from my best run ever. You already know how this ends.
- **Headline:** So close. So, so close.
- **CTA:** Beat My Score
- **Opening frame:** Mid-challenge, clearly close to success (a `motion`/dodge challenge, near the target), on-screen text "1 jump away..."
- **Closing frame:** The fail moment (last life lost), "GAME OVER" screen with visible best-level/best-score comparison, CTA card.
- **Gameplay requirements:** A real last-life death on a motion or precision challenge, ideally one that's visibly close (missed by a small margin, not a blowout fail) — this needs several takes to capture authentically; do not stage a fake-close fail, it reads as fake on camera.

### 15s
1. (0–2s) Hook text over freeze-frame of the near-miss.
2. (2–9s) Real-time buildup to the fail.
3. (9–12s) Game over card, lives counter at 0 visible.
4. (12–15s) CTA card, "Bet you can do better."

### 20s
Adds 2–3s of genuine reaction footage (if available) or an on-screen rage-appropriate text overlay ("...and that's the game.") before the CTA — leans into the format that performs on TikTok/Reels rage-clip feeds.

### 30s
Chains two near-miss fails back to back (different challenge types) before the CTA — reinforces "this happens to everyone," lowers the bar to try for viewers who fear looking bad.

---

## D. PROGRESSION

**Hook:** "Level 1 → Level 25"

- **Primary text:** Watch the difficulty climb. 25 mini-challenges, 5 mechanic types, one continuous run.
- **Headline:** From level 1 to level 25.
- **CTA:** Start Your Run
- **Opening frame:** Level 1 (a `STARTER_IDS` challenge — instantly readable), on-screen text "LEVEL 1."
- **Closing frame:** A late-game challenge (level 20+, `expert` band, visibly faster/harder), on-screen text "LEVEL 25," then CTA.
- **Gameplay requirements:** This is the one concept that needs a montage — short clips (1–2s each) from multiple levels across the full range, not one continuous take. Capture at minimum: one `easy` band clip, one `normal`, one `hard`, one `expert`. Speed-ramped editing (each clip slightly faster than the last) reinforces the escalation.

### 15s
1. (0–1s) "LEVEL 1" card.
2. (1–12s) Fast-cut montage, level counter visibly incrementing each cut (use the in-game level counter, don't fake it with text).
3. (12–15s) "LEVEL 25" card + CTA.

### 20s
Same montage, slightly slower cut pace (1.5–2s per clip instead of 1s) so more of each mechanic type is actually visible/readable — the 15s version prioritizes energy, the 20s version balances energy with "I can see what this game actually is."

### 30s
Adds one 3–4s uncut clip of the level-25+ overdrive difficulty (fast, dense, genuinely hard) as the closing beat before the CTA — the "this is what mastery looks like" payoff.

---

## E. SKILL

**Hook:** "How many attempts would this take you?"

- **Primary text:** Be honest. First try, or are we doing this 10 times?
- **Headline:** How many tries would YOU need?
- **CTA:** Find Out
- **Opening frame:** A precision challenge (small target, tight timer — `precision.ts` mechanics) shown paused/highlighted, on-screen text "How many attempts?"
- **Closing frame:** An attempt counter overlay (e.g. "Attempt #4") over the successful clear, then CTA.
- **Gameplay requirements:** Genuine multiple attempts at one precision challenge, cut together with an on-screen attempt counter (added in editing, not in-game) — shows real difficulty without needing a rage/fail framing.

### 15s
1. (0–2s) Hook text, challenge preview.
2. (2–11s) 3 quick attempt clips (2–3s each), "Attempt #1 / #2 / #3" overlay, last one succeeds.
3. (11–13s) Result card.
4. (13–15s) CTA card, "How many would YOU need?"

### 20s
Adds one more attempt clip (4 total) for a slightly longer build, plus a 2s comment-bait card: "Comment your guess before you try it."

### 30s
Splits into two challenges of different types (e.g. one precision, one memory) to show the "how many tries" premise applies across mechanics, not just one — doubles as a soft tease of game variety without becoming a Progression-style montage.

---

## Shared production notes

- All five concepts pull from **real captured gameplay only** — no mockups, no stock footage, no invented UI. See `CREATIVE_PROMPTS.md` for exact capture instructions.
- Brand palette for any text overlays/cards: primary blue `#5B7BFF`, violet `#B06BFF`, gold accent `#FFD166`/`#FFB020`, navy ground `#0B0E1A`, ink white `#F2F5FF` — matches the existing Play Store asset set, keeps ad creative visually consistent with the store listing (reduces post-click drop-off from a mismatched first impression).
- Every cut ends on the same CTA card treatment (app icon + headline + button) so viewers who skip to the end still get the ask.
