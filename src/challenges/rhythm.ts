import { circle, clamp, fillRoundRect, glow, ring, text, withAlpha } from '../core/draw';
import { THEME } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';

/** 41. ON BEAT - a ring closes in; tap the moment it meets the circle. */
export const onBeat: ChallengeDef = {
  id: 'on_beat',
  title: 'ON BEAT',
  instruction: 'Tap when the ring hits the circle',
  tags: ['timing', 'tap'],
  minLevel: 6,
  create(params, host) {
    const beats = scaleInt(params, 3, 6);
    const period = scale(params, 1.15, 0.62);
    const window = clamp(0.17 * params.precision, 0.075, 0.17);
    const cx = host.width / 2;
    const cy = host.height / 2;
    const coreR = Math.min(host.width, host.height) * 0.16;
    const farR = Math.min(host.width, host.height) * 0.46;
    let t = 0;
    let hit = 0;
    let flash = 0;
    let label = '';

    return {
      timeLimit: beats * period + period + 2,
      enter() {
        host.setInstruction(`${beats} beats`);
        host.setProgress(0);
      },
      update(dt) {
        t += dt;
        flash = Math.max(0, flash - dt * 3);
        if (t > period + window) {
          host.shake(8);
          host.fail('Missed a beat');
        }
      },
      render(g) {
        const k = clamp(t / period, 0, 1.3);
        const r = farR - (farR - coreR) * k;
        glow(g, cx, cy, coreR * 2.4, THEME.violet, 0.25 + flash * 0.4);
        circle(g, cx, cy, coreR, THEME.violet);
        ring(g, cx, cy, Math.max(coreR * 0.6, r), withAlpha(THEME.ink, 0.85), 5);
        if (label) text(g, label, cx, cy + coreR + 46, 22, THEME.accent, 'center', 900);
      },
      onDown() {
        const off = Math.abs(t - period);
        if (off > window) {
          host.shake(8);
          host.fail(t < period ? 'Too early' : 'Too late');
          return;
        }
        hit += 1;
        flash = 1;
        label = off < window * 0.4 ? 'PERFECT' : 'GOOD';
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(cx, cy, THEME.violet, 12);
        host.setProgress(hit / beats);
        if (hit >= beats) host.win();
        t = 0;
      },
    } satisfies Challenge;
  },
};

/** 42. STOPWATCH - stop the clock as close to the target time as you can. */
export const stopwatch: ChallengeDef = {
  id: 'stopwatch',
  title: 'STOPWATCH',
  instruction: 'Stop the clock on the target',
  tags: ['timing'],
  minLevel: 4,
  create(params, host) {
    const goal = params.difficulty < 0.4 ? params.rng.pick([2, 2.5, 3]) : params.rng.pick([3, 3.5, 4, 5]);
    const tolerance = clamp(scale(params, 0.24, 0.08), 0.06, 0.25);
    // Deeper in, the digits go dark after the first second: count it in your head.
    const blindAt = params.difficulty > 0.35 ? 1 : Infinity;
    let t = 0;
    let stopped = false;

    return {
      timeLimit: goal + 4,
      hideTimer: true,
      enter() {
        host.setInstruction(`Stop at ${goal.toFixed(2)}`);
      },
      update(dt) {
        if (stopped) return;
        t += dt;
        if (t > goal + tolerance + 1.2) host.fail('Too late');
      },
      render(g) {
        const cx = host.width / 2;
        const cy = host.height / 2;
        text(g, 'TARGET', cx, cy - 110, 14, THEME.inkDim, 'center', 700);
        text(g, goal.toFixed(2), cx, cy - 80, 32, THEME.accent, 'center', 900);
        const hidden = !stopped && t > blindAt;
        text(g, hidden ? '?.??' : t.toFixed(2), cx, cy + 10, 84, hidden ? THEME.inkDim : THEME.ink, 'center', 900);
        text(g, 'TAP TO STOP', cx, cy + 90, 15, THEME.inkDim, 'center', 700);
      },
      onDown() {
        if (stopped) return;
        stopped = true;
        const off = Math.abs(t - goal);
        if (off <= tolerance) {
          host.particles.burst(host.width / 2, host.height / 2, THEME.success, 20);
          host.win();
        } else host.fail(`Stopped at ${t.toFixed(2)}`);
      },
    } satisfies Challenge;
  },
};

/** 43. LANES - tiles fall down four lanes; tap each before it passes. */
export const lanes: ChallengeDef = {
  id: 'lanes',
  title: 'LANES',
  instruction: 'Tap the tiles before they pass',
  tags: ['tap', 'reflex'],
  minLevel: 13,
  create(params, host) {
    const laneCount = 4;
    const needed = scaleInt(params, 8, 16);
    const speed = scale(params, 280, 560);
    const laneW = host.width / laneCount;
    const tileH = Math.max(70, host.height / 5.5);
    const gapRows = tileH * scale(params, 1.25, 1.05);
    const tiles: { lane: number; y: number }[] = [];
    let lastLane = -1;
    for (let i = 0; i < needed; i++) {
      let lane = params.rng.int(0, laneCount - 1);
      if (lane === lastLane) lane = (lane + 1) % laneCount;
      lastLane = lane;
      tiles.push({ lane, y: -tileH - i * gapRows });
    }
    let tapped = 0;

    return {
      timeLimit: (needed * gapRows + host.height + tileH) / speed + 1.5,
      enter() {
        host.setInstruction(`Tap ${needed} tiles`);
        host.setProgress(0);
      },
      update(dt) {
        for (const t of tiles) t.y += speed * dt;
        if (tiles.some((t) => t.y > host.height)) {
          host.shake(8);
          host.fail('Missed a tile');
        }
      },
      render(g) {
        for (let i = 1; i < laneCount; i++) {
          g.fillStyle = withAlpha(THEME.ink, 0.06);
          g.fillRect(i * laneW - 1, 0, 2, host.height);
        }
        for (const t of tiles) {
          if (t.y + tileH < 0) continue;
          fillRoundRect(g, t.lane * laneW + 5, t.y, laneW - 10, tileH - 6, 10, THEME.primary);
        }
      },
      onDown(p) {
        const lane = clamp(Math.floor(p.x / laneW), 0, laneCount - 1);
        // Only the lowest live tile in a lane counts; a tap on an empty lane is a miss.
        const hit = tiles
          .filter((t) => t.lane === lane && t.y + tileH > 0 && p.y >= t.y - 20 && p.y <= t.y + tileH + 20)
          .sort((a, b) => b.y - a.y)[0];
        if (!hit) {
          host.shake(8);
          host.fail('Wrong lane');
          return;
        }
        tiles.splice(tiles.indexOf(hit), 1);
        tapped += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, THEME.primary, 8, { speed: 140, size: 4 });
        host.setProgress(tapped / needed);
        if (tapped >= needed) host.win();
      },
    } satisfies Challenge;
  },
};

/** 44. CROSSING - hop forward one lane per tap; time it between the traffic. */
export const crossing: ChallengeDef = {
  id: 'crossing',
  title: 'CROSSING',
  instruction: 'Tap to hop. Dodge the traffic',
  tags: ['timing', 'avoid'],
  minLevel: 9,
  create(params, host) {
    const laneCount = scaleInt(params, 3, 6);
    const rows = laneCount + 2;
    const rowH = host.height / rows;
    const playerR = Math.min(rowH * 0.3, 20);
    const carW = clamp(scale(params, 70, 110), 60, 120);
    const lanesList = Array.from({ length: laneCount }, () => {
      const dir = params.rng.sign();
      const speed = scale(params, 90, 230) * params.rng.range(0.8, 1.3) * dir;
      const count = params.rng.int(1, params.difficulty > 0.5 ? 3 : 2);
      const spacing = (host.width + carW * 2) / count;
      const offset = params.rng.range(0, spacing);
      return { speed, cars: Array.from({ length: count }, (_, i) => offset + i * spacing - carW) };
    });
    let row = 0; // 0 = bottom kerb, rows - 1 = far side
    let hop = 0;
    const px = host.width / 2;
    const rowY = (r: number): number => host.height - rowH * (r + 0.5);

    const hits = (): boolean => {
      if (row < 1 || row > laneCount) return false;
      const lane = lanesList[row - 1];
      return lane.cars.some((x) => px + playerR * 0.7 > x && px - playerR * 0.7 < x + carW);
    };

    return {
      timeLimit: scaleTime(params, 9, 7, 5),
      enter() {
        host.setInstruction('Tap to hop forward');
        host.setProgress(0);
      },
      update(dt) {
        hop = Math.max(0, hop - dt * 8);
        const span = host.width + carW * 2;
        for (const lane of lanesList) {
          for (let i = 0; i < lane.cars.length; i++) {
            lane.cars[i] += lane.speed * dt;
            if (lane.cars[i] > host.width + carW) lane.cars[i] -= span;
            if (lane.cars[i] < -carW * 2) lane.cars[i] += span;
          }
        }
        if (hits()) {
          host.shake(14);
          host.particles.burst(px, rowY(row), THEME.danger, 18);
          host.fail('Hit by traffic');
        }
      },
      render(g) {
        fillRoundRect(g, 0, rowY(0) - rowH / 2, host.width, rowH, 0, withAlpha(THEME.success, 0.12));
        fillRoundRect(g, 0, rowY(rows - 1) - rowH / 2, host.width, rowH, 0, withAlpha(THEME.accent, 0.14));
        text(g, 'SAFE', host.width / 2, rowY(rows - 1), 16, THEME.accent, 'center', 900);
        lanesList.forEach((lane, i) => {
          const y = rowY(i + 1);
          g.fillStyle = withAlpha(THEME.ink, 0.05);
          g.fillRect(0, y + rowH / 2 - 1, host.width, 2);
          for (const x of lane.cars) {
            fillRoundRect(g, x, y - rowH * 0.3, carW, rowH * 0.6, 10, lane.speed > 0 ? THEME.danger : THEME.warn);
          }
        });
        const y = rowY(row) - hop * rowH * 0.25;
        glow(g, px, y, playerR * 2.6, THEME.primary, 0.3);
        circle(g, px, y, playerR, THEME.primary);
      },
      onDown() {
        row += 1;
        hop = 1;
        host.sound('click');
        host.haptic('light');
        host.setProgress(row / (rows - 1));
        if (row >= rows - 1) {
          host.particles.burst(px, rowY(row), THEME.accent, 18);
          host.win();
        }
      },
    } satisfies Challenge;
  },
};

/** 45. COPY THE BEAT - watch a rhythm, then tap it back. */
export const copyBeat: ChallengeDef = {
  id: 'copy_rhythm',
  title: 'COPY THE BEAT',
  instruction: 'Watch the rhythm, then tap it back',
  tags: ['memory', 'timing'],
  minLevel: 16,
  create(params, host) {
    const notes = scaleInt(params, 3, 5);
    const gaps = Array.from({ length: notes - 1 }, () => params.rng.pick([0.3, 0.6, 0.6, 0.9]));
    const onsets = gaps.reduce<number[]>((acc, g) => [...acc, acc[acc.length - 1] + g], [0]);
    const tolerance = scale(params, 0.16, 0.09);
    const lead = 0.6;
    const watchEnd = lead + onsets[onsets.length - 1] + 0.7;
    let t = 0;
    let lit = 0;
    let taps: number[] = [];
    let idle = 0;
    const cx = host.width / 2;
    const cy = host.height / 2;
    const padR = Math.min(host.width, host.height) * 0.24;
    let played = 0;

    return {
      timeLimit: watchEnd + onsets[onsets.length - 1] + 4,
      hideTimer: true,
      enter() {
        host.setInstruction('Watch...');
        host.setProgress(0);
      },
      update(dt) {
        t += dt;
        lit = Math.max(0, lit - dt * 5);
        if (t < watchEnd) {
          while (played < notes && t >= lead + onsets[played]) {
            played += 1;
            lit = 1;
            host.sound('tick');
          }
          if (t + dt >= watchEnd) host.setInstruction('Your turn: tap it back');
          return;
        }
        idle += dt;
        if (idle > 2.5) host.fail('Too slow');
      },
      render(g) {
        const yours = t >= watchEnd;
        const color = yours ? THEME.success : THEME.violet;
        glow(g, cx, cy, padR * 2, color, 0.2 + lit * 0.5);
        circle(g, cx, cy, padR * (1 + lit * 0.06), withAlpha(color, 0.35 + lit * 0.65));
        ring(g, cx, cy, padR, color, 4);
        text(g, yours ? 'TAP' : 'WATCH', cx, cy, 30, THEME.ink, 'center', 900);
        for (let i = 0; i < notes; i++) {
          const done = yours ? i < taps.length : i < played;
          circle(g, cx + (i - (notes - 1) / 2) * 26, cy + padR + 40, 7, done ? color : withAlpha(THEME.ink, 0.15));
        }
      },
      onDown() {
        if (t < watchEnd) return;
        idle = 0;
        lit = 1;
        host.sound('tick');
        host.haptic('light');
        taps.push(t);
        const k = taps.length - 1;
        if (k > 0) {
          const gap = taps[k] - taps[k - 1];
          if (Math.abs(gap - gaps[k - 1]) > tolerance + gaps[k - 1] * 0.12) {
            host.fail(gap < gaps[k - 1] ? 'Too fast' : 'Too slow');
            taps = [];
            return;
          }
        }
        host.setProgress(taps.length / notes);
        if (taps.length >= notes) host.win();
      },
    } satisfies Challenge;
  },
};

export const RHYTHM_CHALLENGES: ChallengeDef[] = [onBeat, stopwatch, lanes, crossing, copyBeat];
