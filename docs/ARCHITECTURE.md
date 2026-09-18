# Architecture

No game engine, no framework: a TypeScript app built by Vite, rendering on one
Canvas 2D surface with the shell UI in plain DOM. That keeps the bundle tiny
(~24 KB gzipped), the frame times predictable on low-end Android, and the web
build free.

```
src/
  main.ts              entry: mounts App, unlocks audio, warms ads
  app.ts               screen navigation + run lifecycle glue
  core/                engine primitives (no game rules live here)
    stage.ts           canvas, DPR sizing, RAF loop, pointer input, screen shake
    draw.ts            drawing helpers (rounded rects, discs, meters, text)
    particles.ts       fixed-size pooled particle system (zero alloc per frame)
    rng.ts             seedable mulberry32 PRNG
    easing.ts theme.ts colours, fonts, easing curves
  game/                rules
    types.ts           Challenge / ChallengeDef / ChallengeHost contracts
    difficulty.ts      level -> parameters curve, difficulty bands, coin values
    registry.ts        the list of all 25 challenges
    challengeManager.ts what to play next (no repeats, tag variety, weights)
    session.ts         one run: level, lives, score, coins, records
    playController.ts  intro -> play -> result rhythm, timers, HUD sync
  challenges/          the 25 mini-games, grouped by feel
    common.ts          shared targets, tiles, grids, symbols, swipe detection
    tap.ts memory.ts motion.ts precision.ts puzzle.ts
  services/            platform edges, each one independently swappable
    config.ts          DEVELOPMENT/PRODUCTION config + balance constants
    storage.ts         local save data
    audio.ts           Web Audio synthesised SFX
    haptics.ts         Capacitor Haptics or navigator.vibrate
    ads.ts             AdService abstraction + mock + AdMob adapter
    analytics.ts       AnalyticsService abstraction + console/Firebase
  ui/                  DOM screens
    dom.ts             element/button helpers
    gameView.ts        HUD, instruction bar, intro/success/failure overlays
    screens.ts         home, settings, game over
  dev/lab.ts           challenge lab (dev only, not in the production bundle)
```

## Adding a mini-challenge

1. Write a `ChallengeDef` in one of `src/challenges/*.ts`:

```ts
export const myChallenge: ChallengeDef = {
  id: 'my_challenge',
  title: 'MY CHALLENGE',
  instruction: 'Do the thing',
  tags: ['tap'],
  create(params, host) {
    return {
      timeLimit: scaleTime(params, 6, 4),   // easy -> hard
      update(dt) { /* simulate */ },
      render(g) { /* draw */ },
      onDown(p) { if (good) host.win(); else host.fail('Nope'); },
    };
  },
};
```

2. Export it from that file's array; `registry.ts` picks it up automatically.
3. Test every difficulty band in the challenge lab: `npm run dev`, open
   `/lab.html`, pick the challenge and run it at level 1, 8, 15 and 30.

Rules of thumb:

- Read difficulty through `scale`/`scaleInt`/`scaleTime` — never hard-code a
  level number, and spend difficulty on more than speed.
- `host.win()` / `host.fail()` are idempotent; the first call wins.
- Never allocate per frame in `update`/`render` (use the particle pool).
- The playfield origin is the top-left of the canvas: `host.width` /
  `host.height` are its CSS-pixel size, and pointer coordinates match.

## Frame budget

The whole frame is: clear + backdrop (one gradient, one grid stroke pass), the
challenge's own draws, then the particle pool. `dt` is clamped to 50 ms so a
hitch can never teleport an object through a hazard, and the device pixel ratio
is capped at 2 so a 3x phone does not pay for pixels nobody sees.

## Screens and run lifecycle

`App` owns four DOM screens and one `Stage`. `PlayController` owns a run: it
asks `ChallengeManager` for the next challenge, builds it with parameters from
`difficulty.ts`, shows the intro card while the challenge is already rendered
behind it, then hands over pointer input and starts the clock. A challenge
resolves by calling `host.win()`/`host.fail()` or by the timer expiring
(`onTimeout: 'fail' | 'win' | 'ignore'`). Leaving the screen mid-round aborts
cleanly through an abort signal, so no loop is ever left running.
