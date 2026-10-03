import { circle, clamp, dist, fillRoundRect, glow, text } from '../core/draw';
import { easeInOutQuad } from '../core/easing';
import { NAMED_COLORS, THEME, type NamedColor } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import { drawTarget, drawTile, gridLayout, hitBox, safeArea, type Box } from './common';

/** 46. WHICH IS MOST? - a scatter of dots; name the colour with the most. */
export const mostColour: ChallengeDef = {
  id: 'most_colour',
  title: 'WHICH IS MOST?',
  instruction: 'Tap the colour you see the most',
  tags: ['puzzle'],
  minLevel: 5,
  create(params, host) {
    const rng = params.rng;
    const kinds = rng.shuffle(NAMED_COLORS).slice(0, scaleInt(params, 2, 4));
    const winner = kinds[0];
    const margin = params.difficulty < 0.5 ? 3 : 1;
    const top = scaleInt(params, 6, 10);
    const counts = kinds.map((_, i) => (i === 0 ? top : rng.int(Math.max(2, top - 6), top - margin)));
    const btnH = 64;
    const field: Box = { x: 20, y: 20, w: host.width - 40, h: host.height - btnH - 54 };
    const dotR = clamp(scale(params, 13, 9), 8, 14);
    const dots: { x: number; y: number; color: string }[] = [];
    kinds.forEach((k, i) => {
      for (let n = 0; n < counts[i]; n++) {
        let x = 0;
        let y = 0;
        for (let tries = 0; tries < 40; tries++) {
          x = rng.range(field.x + dotR, field.x + field.w - dotR);
          y = rng.range(field.y + dotR, field.y + field.h - dotR);
          if (dots.every((d) => dist(d.x, d.y, x, y) > dotR * 2.4)) break;
        }
        dots.push({ x, y, color: k.hex });
      }
    });
    const order = rng.shuffle(kinds);
    const buttons = gridLayout({ x: 20, y: host.height - btnH - 20, w: host.width - 40, h: btnH }, order.length, 10, order.length).boxes;

    return {
      timeLimit: scaleTime(params, 5, 3.4, 2.8),
      update() {},
      render(g) {
        for (const d of dots) circle(g, d.x, d.y, dotR, d.color);
        buttons.forEach((b, i) => drawTile(g, b, order[i].hex));
      },
      onDown(p) {
        const i = buttons.findIndex((b) => hitBox(p, b));
        if (i < 0) return;
        if (order[i] === winner) {
          host.particles.burst(p.x, p.y, winner.hex, 16);
          host.win();
        } else host.fail(`It was ${winner.name.toLowerCase()}`);
      },
    } satisfies Challenge;
  },
};

/** 47. SPOT THE CHANGE - the grid blinks and one tile comes back different. */
export const spotChange: ChallengeDef = {
  id: 'spot_change',
  title: 'SPOT THE CHANGE',
  instruction: 'One tile changes. Tap it',
  tags: ['memory', 'puzzle'],
  minLevel: 10,
  create(params, host) {
    const rng = params.rng;
    const count = scaleInt(params, 9, 20);
    const cols = count <= 9 ? 3 : 4;
    const area = safeArea(host.width, host.height, 22);
    const boxes = gridLayout(area, count, 10, cols).boxes;
    const palette = NAMED_COLORS.slice(0, scaleInt(params, 4, 8));
    const before: NamedColor[] = boxes.map(() => rng.pick(palette));
    const changed = rng.int(0, count - 1);
    const after = before.slice();
    after[changed] = rng.pick(palette.filter((c) => c !== before[changed]));
    const show = scale(params, 1.6, 1.1);
    const blank = scale(params, 0.25, 0.45);
    let t = 0;

    return {
      timeLimit: show + blank + scaleTime(params, 4, 3, 2.5),
      enter() {
        host.setInstruction('Remember the grid');
      },
      update(dt) {
        const was = t;
        t += dt;
        if (was < show + blank && t >= show + blank) host.setInstruction('Which one changed?');
      },
      render(g) {
        const phase = t < show ? 'before' : t < show + blank ? 'blank' : 'after';
        boxes.forEach((b, i) => {
          if (phase === 'blank') drawTile(g, b, THEME.surface);
          else drawTile(g, b, (phase === 'before' ? before : after)[i].hex);
        });
      },
      onDown(p) {
        if (t < show + blank) return;
        const i = boxes.findIndex((b) => hitBox(p, b, 0));
        if (i < 0) return;
        if (i === changed) {
          host.particles.burst(p.x, p.y, THEME.success, 16);
          host.win();
        } else host.fail('Not that one');
      },
    } satisfies Challenge;
  },
};

/** 48. SHELL GAME - the ball goes under a cup; the cups shuffle; find it. */
export const shellGame: ChallengeDef = {
  id: 'shell_game',
  title: 'SHELL GAME',
  instruction: 'Follow the ball',
  tags: ['memory', 'reflex'],
  minLevel: 7,
  create(params, host) {
    const rng = params.rng;
    const cups = params.difficulty > 0.7 ? 4 : 3;
    const swaps = scaleInt(params, 3, 9);
    const swapTime = scale(params, 0.5, 0.24);
    const reveal = 0.9;
    const slotX = (i: number): number => (host.width / (cups + 1)) * (i + 1);
    const cy = host.height * 0.55;
    const cupW = Math.min(host.width / (cups + 1) - 10, 84);
    const cupH = cupW * 1.05;
    // slot[i] = which cup sits in slot i; the ball lives in a cup.
    const slot = Array.from({ length: cups }, (_, i) => i);
    const ballCup = rng.int(0, cups - 1);
    const plan = Array.from({ length: swaps }, () => {
      const a = rng.int(0, cups - 1);
      let b = rng.int(0, cups - 2);
      if (b >= a) b += 1;
      return [a, b] as const;
    });
    let t = 0;
    let done = 0;
    let picked = -1;

    const cupPos = (cup: number): { x: number; y: number } => {
      const here = slot.indexOf(cup);
      const shuffleT = t - reveal;
      if (shuffleT > 0 && done < swaps) {
        const k = easeInOutQuad(clamp((shuffleT - done * swapTime) / swapTime, 0, 1));
        const [a, b] = plan[done];
        if (here === a || here === b) {
          const from = slotX(here);
          const to = slotX(here === a ? b : a);
          const arc = Math.sin(k * Math.PI) * cupH * 0.35 * (here === a ? -1 : 1);
          return { x: from + (to - from) * k, y: cy + arc };
        }
      }
      return { x: slotX(here), y: cy };
    };

    return {
      timeLimit: reveal + swaps * swapTime + scaleTime(params, 4, 3, 2.5),
      enter() {
        host.setInstruction('Watch the ball');
      },
      update(dt) {
        t += dt;
        const shuffleT = t - reveal;
        while (shuffleT > 0 && done < swaps && shuffleT >= (done + 1) * swapTime) {
          const [a, b] = plan[done];
          [slot[a], slot[b]] = [slot[b], slot[a]];
          done += 1;
          if (done >= swaps) host.setInstruction('Where is it?');
        }
      },
      render(g) {
        const lifted = t < reveal * 0.75 || picked >= 0;
        for (let cup = 0; cup < cups; cup++) {
          const pos = cupPos(cup);
          if (cup === ballCup && lifted) {
            glow(g, pos.x, pos.y + cupH * 0.3, 30, THEME.accent, 0.4);
            circle(g, pos.x, pos.y + cupH * 0.32, Math.min(16, cupW * 0.2), THEME.accent);
          }
          const lift = lifted && (picked < 0 || cup === picked) ? cupH * 0.55 : 0;
          fillRoundRect(g, pos.x - cupW / 2, pos.y - cupH / 2 - lift, cupW, cupH, cupW * 0.28, THEME.violet);
          fillRoundRect(g, pos.x - cupW * 0.58, pos.y + cupH / 2 - 10 - lift, cupW * 1.16, 14, 7, THEME.primaryDeep);
        }
      },
      onDown(p) {
        if (done < swaps || picked >= 0) return;
        for (let cup = 0; cup < cups; cup++) {
          const pos = cupPos(cup);
          if (Math.abs(p.x - pos.x) > cupW / 2 + 8 || Math.abs(p.y - pos.y) > cupH) continue;
          picked = cup;
          if (cup === ballCup) {
            host.particles.burst(pos.x, pos.y, THEME.accent, 18);
            host.win();
          } else host.fail('It was under another cup');
          return;
        }
      },
    } satisfies Challenge;
  },
};

/** 49. FIND IT - a scatter of numbers; find the one asked for. */
export const findIt: ChallengeDef = {
  id: 'find_it',
  title: 'FIND IT',
  instruction: 'Find the number',
  tags: ['puzzle', 'reflex'],
  minLevel: 3,
  create(params, host) {
    const rng = params.rng;
    const rounds = scaleInt(params, 1, 3);
    const count = scaleInt(params, 12, 28);
    const area = safeArea(host.width, host.height, 26);
    const items: { n: number; x: number; y: number; size: number; color: string }[] = [];
    const colors = [THEME.ink, THEME.accent, THEME.cyan, THEME.violet, THEME.success];
    const minGap = clamp(Math.sqrt((area.w * area.h) / count) * 0.75, 34, 80);
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 60; tries++) {
        x = rng.range(area.x + 10, area.x + area.w - 10);
        y = rng.range(area.y + 10, area.y + area.h - 10);
        if (items.every((it) => dist(it.x, it.y, x, y) > minGap)) break;
      }
      items.push({ n: i + 1, x, y, size: rng.range(22, 36), color: rng.pick(colors) });
    }
    let target = rng.pick(items);
    let round = 0;
    let found = -1;

    return {
      timeLimit: scaleTime(params, 5.5, 4, 3) * rounds,
      enter() {
        host.setInstruction(`Find ${target.n}`);
        host.setProgress(0);
      },
      update() {},
      render(g) {
        for (const it of items) {
          if (it.n === found) glow(g, it.x, it.y, 36, THEME.success, 0.5);
          text(g, String(it.n), it.x, it.y, it.size, it.color, 'center', 900);
        }
      },
      onDown(p) {
        const hit = items.reduce<{ it: (typeof items)[number] | null; d: number }>(
          (best, it) => {
            const d = dist(p.x, p.y, it.x, it.y);
            return d < best.d ? { it, d } : best;
          },
          { it: null, d: 40 },
        ).it;
        if (!hit) return;
        if (hit !== target) {
          host.fail(`That was ${hit.n}`);
          return;
        }
        round += 1;
        found = hit.n;
        host.sound('tick');
        host.haptic('light');
        host.setProgress(round / rounds);
        if (round >= rounds) {
          host.win();
          return;
        }
        target = rng.pick(items.filter((it) => it !== hit));
        host.setInstruction(`Find ${target.n}`);
      },
    } satisfies Challenge;
  },
};

/** 50. BIGGEST - tap the largest circle; the gaps keep shrinking. */
export const biggest: ChallengeDef = {
  id: 'biggest',
  title: 'BIGGEST',
  instruction: 'Tap the biggest one',
  tags: ['tap', 'puzzle'],
  minLevel: 2,
  create(params, host) {
    const rng = params.rng;
    const rounds = scaleInt(params, 2, 4);
    const count = scaleInt(params, 4, 9);
    const lead = scale(params, 1.4, 1.1);
    const area = safeArea(host.width, host.height, 20);
    const colors = [THEME.primary, THEME.violet, THEME.cyan, THEME.success, THEME.warn, THEME.accent];
    let discs: { x: number; y: number; r: number; color: string }[] = [];
    let best = 0;
    let round = 0;

    const deal = (): void => {
      const maxR = Math.min(area.w, area.h) / (count > 6 ? 6.5 : 5);
      const small = Array.from({ length: count - 1 }, () => rng.range(maxR * 0.4, maxR / lead));
      const radii = rng.shuffle([...small, maxR]);
      discs = [];
      for (const r of radii) {
        let x = 0;
        let y = 0;
        for (let tries = 0; tries < 80; tries++) {
          x = rng.range(area.x + r, area.x + area.w - r);
          y = rng.range(area.y + r, area.y + area.h - r);
          if (discs.every((d) => dist(d.x, d.y, x, y) > d.r + r + 8)) break;
        }
        discs.push({ x, y, r, color: rng.pick(colors) });
      }
      best = radii.indexOf(maxR);
      host.setProgress(round / rounds);
    };
    deal();

    return {
      timeLimit: scaleTime(params, 2.4, 1.6, 1.3) * rounds + 0.6,
      update() {},
      render(g) {
        for (const d of discs) drawTarget(g, { x: d.x, y: d.y, r: d.r }, d.color);
      },
      onDown(p) {
        const i = discs.findIndex((d) => dist(p.x, p.y, d.x, d.y) <= d.r + 6);
        if (i < 0) return;
        if (i !== best) {
          host.fail('There was a bigger one');
          return;
        }
        round += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, discs[i].color, 12);
        if (round >= rounds) host.win();
        else deal();
      },
    } satisfies Challenge;
  },
};

export const PERCEPTION_CHALLENGES: ChallengeDef[] = [mostColour, spotChange, shellGame, findIt, biggest];
