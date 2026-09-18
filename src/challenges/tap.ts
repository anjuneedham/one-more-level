import { clamp, meter, text, withAlpha } from '../core/draw';
import { THEME, NAMED_COLORS, type NamedColor } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import {
  drawTarget,
  drawTile,
  gridLayout,
  hitBox,
  hitDisc,
  safeArea,
  type Box,
  type Disc,
} from './common';

/** 1. TAP FAST - hammer the target before the clock runs out. */
export const tapFast: ChallengeDef = {
  id: 'tap_fast',
  title: 'TAP FAST',
  instruction: 'Tap the target!',
  tags: ['tap'],
  create(params, host) {
    const needed = scaleInt(params, 10, 22);
    const area = safeArea(host.width, host.height, 30);
    const radius = clamp(host.width * 0.22 * params.targetSize, 26, host.width * 0.3);
    // From level ~8 the target relocates after every hit.
    const jumps = params.difficulty > 0.28;
    const disc: Disc = { x: host.width / 2, y: host.height / 2, r: radius };
    let taps = 0;
    let pop = 0;
    const limit = scaleTime(params, 6, 4.2, 3.5);

    const relocate = (): void => {
      disc.x = params.rng.range(area.x + disc.r, area.x + area.w - disc.r);
      disc.y = params.rng.range(area.y + disc.r, area.y + area.h - disc.r);
    };

    return {
      timeLimit: limit,
      enter() {
        host.setInstruction(`Tap the target ${needed} times`);
        host.setProgress(0);
      },
      update(dt) {
        pop = Math.max(0, pop - dt * 6);
      },
      render(g) {
        drawTarget(g, disc, THEME.primary, { pop, label: String(needed - taps) });
      },
      onDown(p) {
        if (!hitDisc(p, disc)) return;
        taps += 1;
        pop = 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, THEME.primary, 6, { speed: 150, size: 4 });
        host.setProgress(taps / needed);
        if (taps >= needed) host.win();
        else if (jumps) relocate();
      },
    } satisfies Challenge;
  },
};

/** 2. DON'T TAP - the hardest thing in the world: nothing. */
export const dontTap: ChallengeDef = {
  id: 'dont_tap',
  title: "DON'T TAP",
  instruction: 'Do NOT touch the screen',
  tags: ['reflex'],
  create(params, host) {
    const duration = scaleTime(params, 3.5, 6, 3);
    // Decoys wander around looking very tappable. They are a trap.
    const decoyCount = scaleInt(params, 0, 4);
    const decoys = Array.from({ length: decoyCount }, () => ({
      x: params.rng.range(60, host.width - 60),
      y: params.rng.range(60, host.height - 60),
      vx: params.rng.range(-80, 80) * params.speed,
      vy: params.rng.range(-80, 80) * params.speed,
      r: params.rng.range(22, 40),
      hue: params.rng.pick([THEME.accent, THEME.violet, THEME.cyan]),
      phase: params.rng.range(0, Math.PI * 2),
    }));
    let elapsed = 0;

    return {
      timeLimit: duration,
      onTimeout: 'win',
      enter() {
        host.setInstruction('Hands off!');
        host.setProgress(0);
      },
      update(dt) {
        elapsed += dt;
        host.setProgress(clamp(elapsed / duration, 0, 1));
        for (const d of decoys) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.phase += dt * 4;
          if (d.x < d.r || d.x > host.width - d.r) d.vx *= -1;
          if (d.y < d.r || d.y > host.height - d.r) d.vy *= -1;
          d.x = clamp(d.x, d.r, host.width - d.r);
          d.y = clamp(d.y, d.r, host.height - d.r);
        }
      },
      render(g) {
        for (const d of decoys) {
          drawTarget(g, { x: d.x, y: d.y, r: d.r + Math.sin(d.phase) * 3 }, d.hue, { dim: true });
        }
        const remaining = Math.max(0, duration - elapsed);
        text(g, remaining.toFixed(1), host.width / 2, host.height / 2, 76, THEME.ink, 'center', 900);
        text(
          g,
          'SECONDS LEFT',
          host.width / 2,
          host.height / 2 + 54,
          16,
          THEME.inkDim,
          'center',
          700,
        );
      },
      onDown() {
        host.fail('You tapped!');
      },
    } satisfies Challenge;
  },
};

/** 3. COLOR MATCH - tap the named colour; the label lies about its own colour. */
export const colorMatch: ChallengeDef = {
  id: 'color_match',
  title: 'COLOR MATCH',
  instruction: 'Tap the right colour',
  tags: ['tap', 'puzzle'],
  create(params, host) {
    const rounds = scaleInt(params, 1, 3);
    const optionCount = scaleInt(params, 3, 6);
    // Stroop twist: from mid difficulty the prompt word is printed in a
    // different colour than it names.
    const stroop = params.difficulty > 0.45;
    const area = safeArea(host.width, host.height, 24);
    const promptH = 110;
    const gridArea: Box = {
      x: area.x,
      y: area.y + promptH,
      w: area.w,
      h: area.h - promptH,
    };
    let options: NamedColor[] = [];
    let wanted: NamedColor = NAMED_COLORS[0];
    let inkColor: string = THEME.ink;
    let boxes: Box[] = [];
    let round = 0;
    let popIndex = -1;
    let pop = 0;

    const deal = (): void => {
      options = params.rng.shuffle(NAMED_COLORS).slice(0, optionCount);
      wanted = params.rng.pick(options);
      inkColor = stroop ? params.rng.pick(options.filter((o) => o !== wanted)).hex : THEME.ink;
      boxes = gridLayout(gridArea, options.length, 14, options.length <= 4 ? 2 : 3).boxes;
      host.setInstruction(`Tap ${wanted.name}`);
      host.setProgress(round / rounds);
    };

    deal();

    return {
      timeLimit: scaleTime(params, 5, 3.4, 2.5) * rounds,
      enter: deal,
      update(dt) {
        pop = Math.max(0, pop - dt * 6);
      },
      render(g) {
        text(g, 'TAP', host.width / 2, gridArea.y - 78, 18, THEME.inkDim, 'center', 700);
        text(g, wanted.name, host.width / 2, gridArea.y - 40, 46, inkColor, 'center', 900);
        boxes.forEach((b, i) => {
          drawTile(g, b, options[i].hex, { pop: i === popIndex ? pop : 0 });
        });
      },
      onDown(p) {
        const index = boxes.findIndex((b) => hitBox(p, b));
        if (index < 0) return;
        popIndex = index;
        pop = 1;
        if (options[index] === wanted) {
          round += 1;
          host.sound('tick');
          host.haptic('light');
          host.particles.burst(p.x, p.y, options[index].hex, 10);
          if (round >= rounds) host.win();
          else deal();
        } else {
          host.fail('Wrong colour');
        }
      },
    } satisfies Challenge;
  },
};

/** 6. REACTION - wait for GO, then tap. Early taps lose. */
export const reaction: ChallengeDef = {
  id: 'reaction',
  title: 'REACTION',
  instruction: 'Tap when it says GO',
  tags: ['reflex', 'timing'],
  create(params, host) {
    const reactWindow = scale(params, 0.85, 0.42) * (params.precision + 0.35);
    const wait = params.rng.range(1.2, 2.6);
    // Higher levels flash a fake "GO-like" colour first.
    const fakeouts = params.difficulty > 0.4 ? scaleInt(params, 1, 2) : 0;
    const fakeTimes = Array.from({ length: fakeouts }, () => params.rng.range(0.4, wait - 0.3))
      .filter((t) => t > 0.2)
      .sort((a, b) => a - b);

    let elapsed = 0;
    let go = false;
    let goAt = 0;
    let fakeFlash = 0;

    return {
      timeLimit: wait + reactWindow + 1.2,
      hideTimer: true,
      enter() {
        host.setInstruction('Wait for it...');
      },
      update(dt) {
        elapsed += dt;
        fakeFlash = Math.max(0, fakeFlash - dt * 4);
        for (const t of fakeTimes) {
          if (elapsed >= t && elapsed - dt < t) {
            fakeFlash = 1;
            host.sound('tick');
          }
        }
        if (!go && elapsed >= wait) {
          go = true;
          goAt = elapsed;
          host.setInstruction('GO!');
          host.sound('start');
          host.haptic('medium');
        }
        if (go && elapsed - goAt > reactWindow) host.fail('Too slow');
      },
      render(g) {
        const bg = go
          ? THEME.success
          : fakeFlash > 0
            ? withAlpha(THEME.warn, 0.35 + fakeFlash * 0.4)
            : THEME.surface;
        g.fillStyle = bg;
        g.fillRect(0, 0, host.width, host.height);
        text(
          g,
          go ? 'GO!' : 'WAIT',
          host.width / 2,
          host.height / 2,
          go ? 96 : 52,
          go ? '#0B0E1A' : THEME.inkDim,
          'center',
          900,
        );
        if (go) {
          const left = clamp(1 - (elapsed - goAt) / reactWindow, 0, 1);
          meter(g, host.width * 0.2, host.height * 0.68, host.width * 0.6, 12, left, '#0B0E1A');
        }
      },
      onDown(p) {
        if (!go) {
          host.fail('Too early!');
          return;
        }
        host.particles.burst(p.x, p.y, THEME.success, 14);
        host.win();
      },
    } satisfies Challenge;
  },
};

/** 9. CORRECT ORDER - tap the numbers 1..N in sequence. */
export const correctOrder: ChallengeDef = {
  id: 'correct_order',
  title: 'CORRECT ORDER',
  instruction: 'Tap 1 to 5 in order',
  tags: ['puzzle', 'tap'],
  create(params, host) {
    const count = scaleInt(params, 5, 9);
    const area = safeArea(host.width, host.height, 28);
    const radius = clamp(Math.min(area.w, area.h) * 0.11 * params.targetSize, 24, 52);
    // Place non-overlapping discs with a simple rejection sampler.
    const discs: (Disc & { value: number; taken: boolean; pop: number })[] = [];
    for (let i = 0; i < count; i++) {
      let placed: Disc | null = null;
      for (let attempt = 0; attempt < 120 && !placed; attempt++) {
        const candidate: Disc = {
          x: params.rng.range(area.x + radius, area.x + area.w - radius),
          y: params.rng.range(area.y + radius, area.y + area.h - radius),
          r: radius,
        };
        const clash = discs.some(
          (d) => Math.hypot(d.x - candidate.x, d.y - candidate.y) < radius * 2.25,
        );
        if (!clash) placed = candidate;
      }
      const spot = placed ?? {
        x: params.rng.range(area.x + radius, area.x + area.w - radius),
        y: params.rng.range(area.y + radius, area.y + area.h - radius),
        r: radius,
      };
      discs.push({ ...spot, value: i + 1, taken: false, pop: 0 });
    }
    // At high difficulty the numbers drift, so the layout keeps changing.
    const drift = params.difficulty > 0.6 ? scale(params, 0, 34) : 0;
    const phases = discs.map(() => params.rng.range(0, Math.PI * 2));
    let next = 1;

    return {
      timeLimit: scaleTime(params, 7, 6, 4) + count * 0.35,
      enter() {
        host.setInstruction(`Tap 1 to ${count} in order`);
        host.setProgress(0);
      },
      update(dt) {
        for (let i = 0; i < discs.length; i++) {
          discs[i].pop = Math.max(0, discs[i].pop - dt * 6);
          if (drift > 0) {
            phases[i] += dt * (0.7 + i * 0.05) * params.speed;
            discs[i].x = clamp(
              discs[i].x + Math.cos(phases[i]) * drift * dt,
              area.x + radius,
              area.x + area.w - radius,
            );
            discs[i].y = clamp(
              discs[i].y + Math.sin(phases[i] * 1.3) * drift * dt,
              area.y + radius,
              area.y + area.h - radius,
            );
          }
        }
      },
      render(g) {
        for (const d of discs) {
          if (d.taken) continue;
          const color = d.value === next ? THEME.primary : THEME.surfaceHi;
          drawTarget(g, d, color, {
            label: String(d.value),
            pop: d.pop,
          });
        }
      },
      onDown(p) {
        const target = discs.find((d) => !d.taken && hitDisc(p, d));
        if (!target) return;
        if (target.value !== next) {
          host.fail('Wrong number');
          return;
        }
        target.taken = true;
        target.pop = 1;
        next += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(target.x, target.y, THEME.primary, 10);
        host.setProgress((next - 1) / count);
        if (next > count) host.win();
      },
    } satisfies Challenge;
  },
};

export const TAP_CHALLENGES: ChallengeDef[] = [
  tapFast,
  dontTap,
  colorMatch,
  reaction,
  correctOrder,
];
