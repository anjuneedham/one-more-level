# Video Pipeline

Turns real One More Level gameplay into a finished 30-second vertical ad (1080×1920, 30 fps, H.264 + AAC at −14 LUFS). No screen recorder, no editor, no stock footage: an automated player plays the actual web build under a frame-locked clock, and the run is cut, captioned and scored in code.

First output: `A-CHALLENGE-30` (see [`../concepts/A_challenge.md`](../concepts/A_challenge.md)), built from seed 109.

## How it works

1. **`record.mjs`** drives the built game in headless Chromium with Playwright's fake clock paused, stepping exactly 1/30 s per frame. `Math.random`, `performance.now` and `Date.now` are pinned in the page so a seed replays the same run. A small bot reads the on-screen instruction and plays sensibly (idles on "Hands off!", taps on "GO!", finds the named colour on the canvas, taps the highlighted next number, chases the target). Every sound the game synthesises is logged instead of played.
   - `search` mode runs many seeds fast (no screenshots) and prints each run's level-by-level story.
   - `capture` mode replays one seed and saves every frame as a JPEG plus `meta.json` (per-frame game state and the sound log).
2. **`cards.mjs`** renders the caption pills and end-card layers as transparent PNGs in the brand type (Archivo Black / Inter, embedded from `fonts/`).
3. **`edit.py`** builds the cut automatically from `meta.json`: a cold open on the longest last-life moment, a rewind flash into level 1, the whole climb with card holds trimmed, captions timed to game events (level ≥ 5, one life left, game over), a held game-over screen, and the animated end card. Audio is the game's own sound effects re-synthesised from the log, plus an original music bed, loudness-normalised.

Nothing in `src/` is modified or needed beyond a normal `npm run build`.

## Requirements

- Node 20 with `playwright-core` and a Chromium build
- Python 3 with `numpy`, `pillow`, `imageio-ffmpeg` (bundles an ffmpeg with libx264)

```sh
python3 -m pip install numpy pillow imageio-ffmpeg
```

Environment variables (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `PLAYWRIGHT_CORE` | `playwright-core` | Module path to import Playwright from |
| `CHROMIUM_PATH` | Playwright's default | Chromium executable |
| `GAME_URL` | `http://localhost:4173/` | Where the built game is served |

## Make a new ad

```sh
# from the repo root
npm run build
npx vite preview --port 4173 --strictPort &

cd growth/creatives/video-pipeline

# 1. Find a good run. Look for a high maxLevel, few early fails, and variety.
node record.mjs search --seeds 1-160 --concurrency 8 --out search.json

# 2. Capture it frame by frame (a few minutes). Check the printed maxLevel/wins match the search.
node record.mjs capture --seed 109 --out frames109 --max 70

# 3. Render captions + end card, then cut the ad.
node cards.mjs
python3 edit.py frames109 one-more-level-30s.mp4
```

To change the copy, edit `CAPTIONS` / `endHtml` in `cards.mjs` and the schedule near the `add(...)` calls in `edit.py`. Keep captions truthful to what's on screen (see `../../CREATIVE_PROMPTS.md`).

## Notes

- Determinism is very high but not perfect: physics-drag levels can occasionally drift. If a capture doesn't match its search result, re-run the capture or pick another seed.
- Frames, cards and exported videos are build output and are git-ignored. Log each exported creative in `../../data/creative-data.csv` when it launches, not before.
- The end card says "Play free on Android". Update it if that stops being accurate (e.g. adding iOS, or before the Play listing is public).

## Shorts (15–20 s organic cuts)

`shorts.py` is a general editor for short-form cuts; `recipes.py` holds one recipe per video. A recipe is a list of `Clip` (source frames, optional speed), `Hold` (freeze-frame), and `Flash` items, each with optional `Cap` captions and game sound cues. The engine appends a 2.4 s end card, rebuilds audio from each run's logged sound effects plus a per-video music bed, and loudness-normalises to −14 LUFS.

Batch 1 (10 videos) uses six captured runs: seeds 10, 16, 20, 80, 109, 151. Captions live in `shorts_pills.json` (rendered by `pills.mjs`); platform copy for each video is in `shorts_captions.json` and [`../captions/shorts-batch-1.md`](../captions/shorts-batch-1.md).

```sh
for s in 10 16 20 80 109 151; do node record.mjs capture --seed $s --out frames$s --max 70; done
node cards.mjs                              # end-card layers
node pills.mjs shorts_pills.json pills/     # captions
python3 make_shorts.py                      # all recipes -> shorts_out/
python3 make_shorts.py 03-easy-math         # or just one
```

Recipes reference exact frame numbers in those captures. A re-capture normally reproduces the same run, but seed 80's capture didn't match its search result, so check the printed `maxLevel`/`wins` (seed 80: level 2, 1 win) and update frame numbers in `recipes.py` if a run changes.

Colour-match intro cards are cut on purpose: `color_match` re-deals its board when play starts (`enter: deal` in `src/challenges/tap.ts`), so the preview shown behind the intro card names a different colour than the real prompt.
