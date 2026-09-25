# Creative Generation Prompts

Ready-to-use prompts/instructions for producing every asset type. All of these use **actual One More Level gameplay** — none invent a feature, UI element, or mechanic that doesn't exist in `src/`. Where a prompt is meant for an AI image/video tool, it's written to only use captured footage/screenshots as source material, not to generate synthetic gameplay.

## Capturing real gameplay (the source for everything below)

Run the game locally (`npm run dev`, or open the published playable build) and screen-record in portrait, sound on:

```
1. Open the game at the intended capture resolution (portrait, ~9:16).
2. Play naturally through several runs — do not force outcomes, especially for
   Concept B (Curiosity) and C (Rage), which depend on genuine surprise/near-miss
   moments.
3. Capture at minimum: one clean full clear (mid-difficulty), one genuine fail,
   one close-miss fail, and short clips spanning easy/normal/hard/expert bands.
4. Export at native resolution/framerate, uncompressed if possible, for editing headroom.
```

Full checklist: `creatives/scripts/shot-lists.md`.

## Facebook video ads

> "Using [captured clip: clean level clear, mid-difficulty], cut to a 15-second vertical video ad. Open on a freeze-frame of the timer at 3 seconds with bold on-screen text '[hook from CREATIVE_LIBRARY.md]'. Cut to real-time uncut gameplay of the clear. Close on the in-game 'COMPLETE' result card with score/coins visible, then a 2-second end card: app icon, headline '[headline]', button '[CTA]'. Use brand colors #5B7BFF (primary blue), #B06BFF (violet), #FFD166 (gold accent), #0B0E1A (background), #F2F5FF (text) for all overlay graphics. No stock footage, no synthetic gameplay — source footage only."

## Instagram Reels

> "Re-cut [captured clip] for Instagram Reels: same core edit as the Facebook version but trim the opening hook to under 1 second (Reels' scroll-past window is faster than Facebook's), and end on a Reels-native caption card rather than a hard CTA button — Reels performs better with a soft caption prompt ('comment your guess') than a direct 'Play Now' button in the video itself; put the CTA in the caption text and profile link instead."

## TikTok videos

> "Re-cut [captured clip] for TikTok: strip any Facebook/Instagram watermark, keep the first frame as real gameplay (no logo intro — TikTok's algorithm and viewers both penalize non-content opening frames), add on-screen text using TikTok's native caption style (not a custom overlay graphic) so it reads as organic rather than an ad. Use a trending audio track only if its rhythm genuinely matches the gameplay's pacing (e.g. beat drops aligned to successful taps) — do not force a mismatched trend."

## YouTube Shorts

> "Re-cut [captured clip] for YouTube Shorts at 30 seconds (Shorts rewards slightly longer, more complete narratives than TikTok/Reels): use the full concept script from CREATIVE_LIBRARY.md's 30s cut, with a clear title-card-style opening (YouTube's audience expects more explicit framing than TikTok's) and an explicit end-card CTA pointing to the Play Store listing."

## Static Facebook ads

> "Using [screenshot: in-game 'COMPLETE' or 'GAME OVER' result card, captured directly from the app, unedited], compose a static Facebook ad: crop to the result card, add a headline overlay '[headline from CREATIVE_LIBRARY.md]' in the brand type treatment (bold, high-contrast, #F2F5FF text on #0B0E1A or gradient background), and a CTA button graphic '[CTA]'. Keep the actual in-game screenshot untouched and legible — do not overlay text on top of the score/coins numbers themselves."

## Game screenshots (for ad creative and store assets)

> "Capture a screenshot directly from a live playthrough at the moment of [level clear / new best score / game over], at native device resolution, no filters or edits beyond cropping. This must be an actual screenshot of the running app, not a mockup or composited image — Play Store and ad platform policies both require creative to represent the actual product."

(This matches the exact method already used to produce the existing Play Store screenshot set — see `docs/` history / the Play Console "Common visual assets" upload for reference on the established approach: Playwright-driven capture of the real running game at multiple device sizes.)

## Promotional graphics

> "Using the existing brand system (primary blue #5B7BFF, violet #B06BFF gradient, gold accent #FFD166/#FFB020, deep navy background #0B0E1A, ink white #F2F5FF text — the same palette as the app icon and feature graphic), compose a promotional graphic for [specific use: social post header, community group cover image, etc.] that pairs a real captured gameplay screenshot with the wordmark treatment 'ONE MORE LEVEL' (LEVEL in gold accent). Do not invent new brand colors or a new logo mark — reuse the existing one from the app icon."

## App-store screenshots

Already produced and delivered earlier in this project (icon, feature graphic, 5 phone screenshots, 4× 7" tablet, 4× 10" tablet — all captured from the live game via Playwright automation). If additional screenshots are needed (e.g. after a content update), repeat the same method:

> "Serve the built web app locally, drive it with a headless browser at [target device viewport], play to the desired game state (specific level, result card, etc.), and screenshot the exact rendered state — no synthetic mockups, no design-tool compositing of fake UI."
