# ONE MORE LEVEL

A fast, replayable mobile game made of 25 short mini-challenges. Clear one,
level up, get another one instantly. Miss one, lose a life. Three lives per run.

**Play → Complete → Level up → New challenge → Fail → Try again.**

- **Platform:** Android first (Capacitor), and the exact same build runs in a
  browser — the game is a TypeScript + Canvas 2D app with no game engine.
- **Size:** ~24 KB gzipped, no runtime dependencies, no downloaded assets
  (every graphic is drawn and every sound is synthesised at runtime).
- **Offline:** everything except ads works with no network at all.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173  (the game)
                     # http://localhost:5173/lab.html  (challenge lab, dev only)
npm run build        # typecheck + production bundle in dist/
npm run preview      # serve the production bundle
```

Android:

```bash
npm run android:sync   # build web + copy into the native project
npm run android:open   # open in Android Studio
```

The native project lives in `android/` and is committed. See
[docs/ANDROID.md](docs/ANDROID.md) for release builds and Play Store prep, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code fits together.

## The loop

| Stage | What happens |
| --- | --- |
| Intro | Level number, challenge title and one-line instruction (~1s) |
| Play | 3–10s of one mechanic, with a timer, progress bar and lives |
| Result | ✓ COMPLETE + coins/points, or ✕ FAILED + life lost |
| Game over | Level reached, best level, score, coins, TRY AGAIN / WATCH AD |

Difficulty bands: levels 1–5 easy, 6–10 normal, 11–20 hard, 21+ expert. Past
level 24 an "overdrive" term keeps raising the ceiling. Difficulty is spent on
**more objects, smaller targets, longer patterns, tighter windows and extra
decisions** — not just on speed.

## The 25 challenges

| # | Challenge | Mechanic | Scales with |
| --- | --- | --- | --- |
| 1 | TAP FAST | Hammer a target | taps needed, target size, target jumps |
| 2 | DON'T TAP | Touch nothing | duration, number of tempting decoys |
| 3 | COLOR MATCH | Tap the named colour | options, rounds, Stroop mismatch |
| 4 | MEMORY | Repeat a flashing pattern | grid size, pattern length, flash speed |
| 5 | DODGE | Slide away from falling blocks | fall speed, spawn rate, drift |
| 6 | REACTION | Tap on GO | reaction window, fake-outs |
| 7 | FOLLOW | Keep a finger on a moving target | speed, target size, grace period |
| 8 | COUNT | How many shapes appeared | object count, preview time |
| 9 | CORRECT ORDER | Tap 1..N in order | count, size, drifting numbers |
| 10 | MOVING TARGET | Hit a bouncing target | hits needed, speed, size |
| 11 | SAFE TILE | Remember the safe tile | tiles, shuffle after preview |
| 12 | QUICK MATH | Pick the answer | number range, multiplication |
| 13 | DON'T TOUCH RED | Clear blue, never red | blue/red counts, movement |
| 14 | MATCH PAIRS | Memory pairs | pairs, preview length |
| 15 | HOLD | Release inside the green band | band width, fill rate |
| 16 | RELEASE | Stop the sweep in the zone | sweep speed, zone width, rounds |
| 17 | BALANCE | Counter an inverted pendulum | gravity, gusts, duration |
| 18 | SWIPE | Swipe the shown direction | sequence length, inverted mode |
| 19 | REMEMBER COLOR | Recall a colour (or two) | options, preview time, count |
| 20 | ESCAPE | Drag to the exit through moving gaps | bars, gap width, speed |
| 21 | SORT | Drag shapes into their bins | bins, items |
| 22 | TARGET SEQUENCE | Order flashes once, then vanishes | targets, preview time |
| 23 | ROTATE | Align the shape with the ghost | tolerance, sides |
| 24 | AVOID | Collect gold, touch nothing red | hazards, speed, pickups |
| 25 | FINAL CHALLENGE | Colour match + moving targets + avoid | rounds, orbs, speed (level 8+) |

Every challenge takes parameters (`difficulty`, `speed`, `targetSize`, `timer`,
`objectCount`, `precision`), so the 25 mechanics produce hundreds of variations.
The challenge manager never repeats a challenge back to back and biases away
from the tags used last round.

## Ads, analytics, saves

- `AdService` (`src/services/ads.ts`) abstracts rewarded and interstitial ads.
  Development uses `MockAdService`; `AdMobAdService` talks to a native AdMob
  plugin. Interstitials only appear between runs, never mid-challenge, and are
  rate-limited. If an ad cannot load the player just sees "Ad unavailable".
- `AnalyticsService` (`src/services/analytics.ts`) logs to the console in dev
  and to a native Firebase Analytics bridge in production. It never throws and
  never blocks the game.
- Progress (`bestLevel`, `bestScore`, `coins`, `soundEnabled`, `hapticEnabled`)
  is saved locally. No accounts, no sign-in.
- **No production ad IDs are committed.** See `.env.example`.

## Licensing

All art, sound and code here are original to this project. There are no
third-party images, fonts, music or characters in the build.
