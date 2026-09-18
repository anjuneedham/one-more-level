import { circle, clamp, dist, fillRoundRect, glow, ring, text, withAlpha } from '../core/draw';
import { NAMED_COLORS, THEME, type NamedColor } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import {
  drawSymbol,
  drawTarget,
  drawTile,
  gridLayout,
  hitBox,
  hitDisc,
  Phase,
  safeArea,
  SYMBOL_KINDS,
  type Box,
  type Disc,
  type SymbolKind,
} from './common';

/** 12. QUICK MATH - solve it before the clock does. */
export const quickMath: ChallengeDef = {
  id: 'quick_math',
  title: 'QUICK MATH',
  instruction: 'Solve it',
  tags: ['puzzle'],
  create(params, host) {
    const hardOps = params.difficulty > 0.55;
    const bigNumbers = params.difficulty > 0.3;
    const max = bigNumbers ? scaleInt(params, 12, 30) : 9;
    const a = params.rng.int(2, max);
    const b = params.rng.int(2, Math.max(2, Math.floor(max * 0.6)));
    const op = hardOps ? params.rng.pick(['+', '-', '×'] as const) : params.rng.pick(['+', '-'] as const);
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
    const prompt = `${a} ${op} ${b}`;

    // Wrong answers stay plausible: small offsets around the true value.
    const decoys = new Set<number>();
    while (decoys.size < 3) {
      const delta = params.rng.int(1, Math.max(3, Math.round(Math.abs(answer) * 0.25) + 3));
      const candidate = answer + delta * params.rng.sign();
      if (candidate !== answer) decoys.add(candidate);
    }
    const options = params.rng.shuffle([answer, ...decoys]);
    const area = safeArea(host.width, host.height, 26);
    const boxes = gridLayout(
      { x: area.x, y: host.height * 0.45, w: area.w, h: host.height * 0.42 },
      options.length,
      14,
      2,
    ).boxes;

    return {
      timeLimit: scaleTime(params, 7, 4.5, 3),
      enter() {
        host.setInstruction('Pick the answer');
      },
      update() {
        /* static puzzle */
      },
      render(g) {
        text(g, prompt, host.width / 2, host.height * 0.27, 64, THEME.ink, 'center', 900);
        text(g, '= ?', host.width / 2, host.height * 0.36, 30, THEME.inkDim, 'center', 800);
        boxes.forEach((b, i) =>
          drawTile(g, b, THEME.surfaceHi, { label: String(options[i]), labelColor: THEME.ink }),
        );
      },
      onDown(p) {
        const index = boxes.findIndex((b) => hitBox(p, b));
        if (index < 0) return;
        if (options[index] === answer) {
          host.particles.burst(p.x, p.y, THEME.success, 14);
          host.win();
        } else {
          host.fail(`It was ${answer}`);
        }
      },
    } satisfies Challenge;
  },
};

/** 13. DON'T TOUCH RED - clear every blue orb, never a red one. */
export const dontTouchRed: ChallengeDef = {
  id: 'dont_touch_red',
  title: "DON'T TOUCH RED",
  instruction: 'Tap the blue ones only',
  tags: ['tap', 'avoid'],
  create(params, host) {
    const blues = scaleInt(params, 3, 7);
    const reds = scaleInt(params, 2, 9);
    const r = clamp(34 * params.targetSize, 16, 38);
    const speed = scale(params, 0, 190);
    const area = safeArea(host.width, host.height, 20);

    interface Orb extends Disc {
      red: boolean;
      vx: number;
      vy: number;
      taken: boolean;
      pop: number;
    }
    const orbs: Orb[] = [];
    const place = (red: boolean): void => {
      let x = 0;
      let y = 0;
      for (let attempt = 0; attempt < 60; attempt++) {
        x = params.rng.range(area.x + r, area.x + area.w - r);
        y = params.rng.range(area.y + r, area.y + area.h - r);
        if (!orbs.some((o) => dist(o.x, o.y, x, y) < r * 2.1)) break;
      }
      const a = params.rng.range(0, Math.PI * 2);
      orbs.push({
        x,
        y,
        r,
        red,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        taken: false,
        pop: 0,
      });
    };
    for (let i = 0; i < blues; i++) place(false);
    for (let i = 0; i < reds; i++) place(true);

    let cleared = 0;

    return {
      timeLimit: scaleTime(params, 7, 6, 4) + blues * 0.45,
      enter() {
        host.setInstruction(`Tap all ${blues} blue orbs`);
        host.setProgress(0);
      },
      update(dt) {
        for (const o of orbs) {
          o.pop = Math.max(0, o.pop - dt * 6);
          if (speed === 0 || o.taken) continue;
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          if (o.x < area.x + o.r || o.x > area.x + area.w - o.r) {
            o.vx *= -1;
            o.x = clamp(o.x, area.x + o.r, area.x + area.w - o.r);
          }
          if (o.y < area.y + o.r || o.y > area.y + area.h - o.r) {
            o.vy *= -1;
            o.y = clamp(o.y, area.y + o.r, area.y + area.h - o.r);
          }
        }
      },
      render(g) {
        for (const o of orbs) {
          if (o.taken) continue;
          drawTarget(g, o, o.red ? THEME.danger : THEME.primary, { pop: o.pop });
        }
      },
      onDown(p) {
        const orb = orbs.find((o) => !o.taken && hitDisc(p, o));
        if (!orb) return;
        if (orb.red) {
          host.shake(12);
          host.particles.burst(orb.x, orb.y, THEME.danger, 16);
          host.fail('That was red!');
          return;
        }
        orb.taken = true;
        cleared += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(orb.x, orb.y, THEME.primary, 10);
        host.setProgress(cleared / blues);
        if (cleared >= blues) host.win();
      },
    } satisfies Challenge;
  },
};

/** 21. SORT - drag each shape into the bin it belongs to. */
export const sort: ChallengeDef = {
  id: 'sort',
  title: 'SORT',
  instruction: 'Drag each item to its bin',
  tags: ['drag', 'puzzle'],
  create(params, host) {
    const binCount = params.difficulty > 0.5 ? 3 : 2;
    const itemCount = scaleInt(params, 3, 7);
    const palette: NamedColor[] = params.rng.shuffle(NAMED_COLORS).slice(0, binCount);
    const kinds: SymbolKind[] = params.rng.shuffle(SYMBOL_KINDS).slice(0, binCount);
    const area = safeArea(host.width, host.height, 22);
    const binH = clamp(area.h * 0.22, 90, 150);
    const bins: Box[] = gridLayout(
      { x: area.x, y: area.y, w: area.w, h: binH },
      binCount,
      12,
      binCount,
    ).boxes;
    const queue = Array.from({ length: itemCount }, () => params.rng.int(0, binCount - 1));
    const itemR = clamp(34 * params.targetSize, 20, 36);
    const home = { x: host.width / 2, y: host.height - 90 };
    const item = { x: home.x, y: home.y };
    let index = 0;
    let dragging = false;

    return {
      timeLimit: scaleTime(params, 9, 7, 5) + itemCount * 0.8,
      enter() {
        host.setInstruction(`Sort ${itemCount} items`);
        host.setProgress(0);
      },
      update() {
        if (!dragging) {
          // Ease back to the staging spot when released mid-air.
          item.x += (home.x - item.x) * 0.25;
          item.y += (home.y - item.y) * 0.25;
        }
      },
      render(g) {
        bins.forEach((b, i) => {
          fillRoundRect(g, b.x, b.y, b.w, b.h, 20, withAlpha(palette[i].hex, 0.18));
          ring(g, b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.32, palette[i].hex, 3);
          drawSymbol(
            g,
            kinds[i],
            b.x + b.w / 2,
            b.y + b.h / 2,
            Math.min(b.w, b.h) * 0.36,
            palette[i].hex,
          );
        });
        text(
          g,
          `${index} / ${itemCount}`,
          host.width / 2,
          bins[0].y + binH + 30,
          20,
          THEME.inkDim,
          'center',
          800,
        );
        const kind = kinds[queue[index]];
        const color = palette[queue[index]].hex;
        glow(g, item.x, item.y, itemR * 2.4, color, 0.3);
        circle(g, item.x, item.y, itemR, withAlpha(color, 0.22));
        drawSymbol(g, kind, item.x, item.y, itemR * 1.5, color);
        // Preview of what is coming next.
        if (index + 1 < itemCount) {
          const nextColor = palette[queue[index + 1]].hex;
          drawSymbol(g, kinds[queue[index + 1]], host.width / 2, host.height - 30, 22, withAlpha(nextColor, 0.5));
        }
      },
      onDown(p) {
        if (dist(p.x, p.y, item.x, item.y) <= itemR + 22) dragging = true;
      },
      onMove(p) {
        if (!dragging) return;
        item.x = p.x;
        item.y = p.y;
      },
      onUp(p) {
        if (!dragging) return;
        dragging = false;
        const binIndex = bins.findIndex((b) => hitBox(p, b, 10));
        if (binIndex < 0) return;
        if (binIndex !== queue[index]) {
          host.shake(10);
          host.fail('Wrong bin');
          return;
        }
        host.sound('coin');
        host.haptic('light');
        host.particles.burst(p.x, p.y, palette[binIndex].hex, 12);
        index += 1;
        item.x = home.x;
        item.y = home.y;
        host.setProgress(index / itemCount);
        if (index >= itemCount) host.win();
      },
    } satisfies Challenge;
  },
};

/** 22. TARGET SEQUENCE - the order flashes once, then the numbers vanish. */
export const targetSequence: ChallengeDef = {
  id: 'target_sequence',
  title: 'TARGET SEQUENCE',
  instruction: 'Hit the targets in order',
  tags: ['memory', 'tap'],
  create(params, host) {
    const count = scaleInt(params, 3, 7);
    const area = safeArea(host.width, host.height, 30);
    const r = clamp(Math.min(area.w, area.h) * 0.1 * params.targetSize, 24, 48);
    const discs: (Disc & { order: number; taken: boolean; pop: number })[] = [];
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      for (let attempt = 0; attempt < 80; attempt++) {
        x = params.rng.range(area.x + r, area.x + area.w - r);
        y = params.rng.range(area.y + r, area.y + area.h - r);
        if (!discs.some((d) => dist(d.x, d.y, x, y) < r * 2.4)) break;
      }
      discs.push({ x, y, r, order: i + 1, taken: false, pop: 0 });
    }
    const preview = new Phase(scale(params, 2.2, 1.1));
    let showing = true;
    let next = 1;

    return {
      timeLimit: scale(params, 2.2, 1.1) + scaleTime(params, 6, 5, 3.5) + count * 0.4,
      enter() {
        host.setInstruction('Memorise the order');
        host.setProgress(0);
      },
      update(dt) {
        for (const d of discs) d.pop = Math.max(0, d.pop - dt * 6);
        if (showing && preview.update(dt)) {
          showing = false;
          host.setInstruction('Now hit them in order');
          host.sound('whoosh');
        }
      },
      render(g) {
        for (const d of discs) {
          if (d.taken) continue;
          drawTarget(g, d, showing ? THEME.violet : THEME.surfaceHi, {
            label: showing ? String(d.order) : undefined,
            pop: d.pop,
          });
        }
        if (showing) {
          text(
            g,
            'REMEMBER',
            host.width / 2,
            area.y - 4,
            20,
            THEME.violet,
            'center',
            800,
          );
        }
      },
      onDown(p) {
        if (showing) return;
        const target = discs.find((d) => !d.taken && hitDisc(p, d));
        if (!target) return;
        if (target.order !== next) {
          host.fail(`That was #${target.order}`);
          return;
        }
        target.taken = true;
        target.pop = 1;
        next += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(target.x, target.y, THEME.violet, 12);
        host.setProgress((next - 1) / count);
        if (next > count) host.win();
      },
    } satisfies Challenge;
  },
};

/**
 * 25. FINAL CHALLENGE - the graduation test: moving targets (MOVING TARGET)
 * in several colours (COLOR MATCH) where the wrong tap ends the run (AVOID).
 * Only unlocked once the player has seen the pieces separately.
 */
export const finalChallenge: ChallengeDef = {
  id: 'final_challenge',
  title: 'FINAL CHALLENGE',
  instruction: 'Only tap the colour asked for',
  tags: ['tap', 'reflex', 'avoid', 'puzzle'],
  minLevel: 8,
  weight: 0.7,
  create(params, host) {
    const rounds = scaleInt(params, 3, 6);
    const orbCount = clamp(scaleInt(params, 4, 7), 4, NAMED_COLORS.length);
    const r = clamp(40 * params.targetSize, 20, 44);
    const speed = scale(params, 150, 380);
    const area = safeArea(host.width, host.height, 16);
    const colors = params.rng.shuffle(NAMED_COLORS).slice(0, orbCount);
    const orbs = colors.map((color) => {
      const a = params.rng.range(0, Math.PI * 2);
      return {
        color,
        x: params.rng.range(area.x + r, area.x + area.w - r),
        y: params.rng.range(area.y + r, area.y + area.h - r),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        pop: 0,
      };
    });
    let wanted = params.rng.pick(colors);
    let done = 0;
    let flash = 0;

    const nextRound = (): void => {
      wanted = params.rng.pick(colors);
      host.setInstruction(`Tap ${wanted.name}`);
      flash = 1;
    };

    return {
      timeLimit: scaleTime(params, 7, 6, 4) + rounds * 1.3,
      enter() {
        host.setInstruction(`Tap ${wanted.name}`);
        host.setProgress(0);
      },
      update(dt) {
        flash = Math.max(0, flash - dt * 3);
        for (const o of orbs) {
          o.pop = Math.max(0, o.pop - dt * 6);
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          if (o.x < area.x + r || o.x > area.x + area.w - r) {
            o.vx *= -1;
            o.x = clamp(o.x, area.x + r, area.x + area.w - r);
          }
          if (o.y < area.y + r || o.y > area.y + area.h - r) {
            o.vy *= -1;
            o.y = clamp(o.y, area.y + r, area.y + area.h - r);
          }
        }
      },
      render(g) {
        for (const o of orbs) {
          drawTarget(g, { x: o.x, y: o.y, r }, o.color.hex, { pop: o.pop });
        }
        const bannerY = 30;
        text(
          g,
          wanted.name,
          host.width / 2,
          bannerY,
          34 + flash * 6,
          wanted.hex,
          'center',
          900,
        );
        text(
          g,
          `${done} / ${rounds}`,
          host.width / 2,
          host.height - 26,
          20,
          THEME.inkDim,
          'center',
          800,
        );
      },
      onDown(p) {
        const orb = orbs.find((o) => dist(p.x, p.y, o.x, o.y) <= r + 8);
        if (!orb) return;
        if (orb.color !== wanted) {
          host.shake(14);
          host.particles.burst(orb.x, orb.y, THEME.danger, 16);
          host.fail(`That was ${orb.color.name}`);
          return;
        }
        orb.pop = 1;
        done += 1;
        host.sound('coin');
        host.haptic('medium');
        host.particles.burst(orb.x, orb.y, orb.color.hex, 14);
        host.setProgress(done / rounds);
        if (done >= rounds) host.win();
        else nextRound();
      },
    } satisfies Challenge;
  },
};

export const PUZZLE_CHALLENGES: ChallengeDef[] = [
  quickMath,
  dontTouchRed,
  sort,
  targetSequence,
  finalChallenge,
];
