import { circle, clamp, dist, fillRoundRect, glow, ring, withAlpha } from '../core/draw';
import { THEME } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import { drawSymbol, drawTarget, gridLayout, hitBox, hitDisc, safeArea } from './common';

/** Distance from point (px, py) to the segment a-b. */
function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return dist(px, py, ax + dx * t, ay + dy * t);
}

/** 26. WHACK IT - moles pop up; hit them, never the bombs. */
export const whack: ChallengeDef = {
  id: 'whack',
  title: 'WHACK IT',
  instruction: 'Hit the moles, not the bombs',
  tags: ['tap', 'reflex'],
  minLevel: 2,
  create(params, host) {
    const needed = scaleInt(params, 5, 10);
    const upTime = scale(params, 1.15, 0.55);
    const spawnEvery = scale(params, 0.65, 0.32);
    const bombChance = params.difficulty > 0.2 ? scale(params, 0.12, 0.32) : 0;
    const area = safeArea(host.width, host.height, 26);
    const cols = 3;
    const rows = params.difficulty > 0.6 ? 4 : 3;
    const holes = gridLayout(area, cols * rows, 18, cols).boxes.map((box) => ({
      box,
      kind: null as 'mole' | 'bomb' | null,
      left: 0,
      up: 0,
    }));
    let hits = 0;
    let spawnTimer = 0.2;

    const spawn = (): void => {
      const free = holes.filter((h) => h.kind === null);
      if (!free.length) return;
      const hole = params.rng.pick(free);
      hole.kind = params.rng.bool(bombChance) ? 'bomb' : 'mole';
      hole.left = upTime * params.rng.range(0.85, 1.15);
      hole.up = 0;
    };

    return {
      timeLimit: scaleTime(params, 7.5, 6, 5),
      enter() {
        host.setInstruction(`Whack ${needed} moles`);
        host.setProgress(0);
      },
      update(dt) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          spawnTimer = spawnEvery * params.rng.range(0.8, 1.2);
        }
        for (const h of holes) {
          if (!h.kind) continue;
          h.up = Math.min(1, h.up + dt * 7);
          h.left -= dt;
          if (h.left <= 0) h.kind = null;
        }
      },
      render(g) {
        for (const h of holes) {
          const cx = h.box.x + h.box.w / 2;
          const cy = h.box.y + h.box.h * 0.62;
          const r = Math.min(h.box.w, h.box.h) * 0.36;
          g.save();
          g.fillStyle = withAlpha('#000000', 0.45);
          g.beginPath();
          g.ellipse(cx, cy + r * 0.55, r * 1.05, r * 0.38, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
          if (!h.kind) continue;
          const rise = h.up * r * 0.55;
          if (h.kind === 'mole') {
            drawTarget(g, { x: cx, y: cy - rise, r }, THEME.violet, { appear: h.up });
            circle(g, cx - r * 0.3, cy - rise - r * 0.15, r * 0.1, THEME.bg);
            circle(g, cx + r * 0.3, cy - rise - r * 0.15, r * 0.1, THEME.bg);
          } else {
            drawTarget(g, { x: cx, y: cy - rise, r }, THEME.danger, { appear: h.up });
            drawSymbol(g, 'cross', cx, cy - rise, r * 0.9, THEME.bg);
          }
        }
      },
      onDown(p) {
        const hole = holes.find((h) => h.kind && hitBox(p, h.box));
        if (!hole) return;
        if (hole.kind === 'bomb') {
          host.shake(14);
          host.particles.burst(p.x, p.y, THEME.danger, 18);
          host.fail('You hit a bomb');
          return;
        }
        hole.kind = null;
        hits += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, THEME.violet, 10);
        host.setProgress(hits / needed);
        if (hits >= needed) host.win();
      },
    } satisfies Challenge;
  },
};

/** 27. CATCH - slide the paddle under the falling gold; dodge the red. */
export const catchDrops: ChallengeDef = {
  id: 'catch',
  title: 'CATCH',
  instruction: 'Catch the falling gold',
  tags: ['drag', 'reflex'],
  minLevel: 3,
  create(params, host) {
    const needed = scaleInt(params, 5, 9);
    const allowedMisses = params.difficulty > 0.5 ? 1 : 2;
    const fallSpeed = scale(params, 210, 470);
    const every = scale(params, 0.85, 0.42);
    const redChance = params.difficulty > 0.3 ? scale(params, 0.15, 0.35) : 0;
    const paddle = { x: host.width / 2, y: host.height - 46, w: clamp(scale(params, 120, 78), 64, 130), h: 16 };
    const dropR = clamp(15 * params.targetSize, 10, 17);
    const drops: { x: number; y: number; red: boolean }[] = [];
    let timer = 0.15;
    let caught = 0;
    let misses = 0;

    return {
      timeLimit: needed * every * 1.6 + 5,
      enter() {
        host.setInstruction(`Catch ${needed} gold drops`);
        host.setProgress(0);
      },
      update(dt) {
        timer -= dt;
        if (timer <= 0) {
          drops.push({ x: params.rng.range(dropR + 8, host.width - dropR - 8), y: -dropR, red: params.rng.bool(redChance) });
          timer = every * params.rng.range(0.8, 1.2);
        }
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.y += fallSpeed * dt;
          const onPaddle =
            d.y + dropR >= paddle.y && d.y - dropR <= paddle.y + paddle.h && Math.abs(d.x - paddle.x) <= paddle.w / 2 + dropR * 0.5;
          if (onPaddle) {
            drops.splice(i, 1);
            if (d.red) {
              host.shake(12);
              host.particles.burst(d.x, paddle.y, THEME.danger, 16);
              host.fail('You caught a red one');
              return;
            }
            caught += 1;
            host.sound('coin');
            host.haptic('light');
            host.particles.burst(d.x, paddle.y, THEME.accent, 10);
            host.setProgress(caught / needed);
            if (caught >= needed) {
              host.win();
              return;
            }
          } else if (d.y - dropR > host.height) {
            drops.splice(i, 1);
            if (!d.red) {
              misses += 1;
              host.shake(5);
              if (misses > allowedMisses) {
                host.fail('Dropped too many');
                return;
              }
            }
          }
        }
      },
      render(g) {
        for (const d of drops) {
          const color = d.red ? THEME.danger : THEME.accent;
          glow(g, d.x, d.y, dropR * 2.2, color, 0.3);
          circle(g, d.x, d.y, dropR, color);
        }
        fillRoundRect(g, paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, paddle.h / 2, THEME.primary);
        for (let k = 0; k < allowedMisses + 1 - misses; k++) {
          circle(g, 18 + k * 16, 18, 5, withAlpha(THEME.accent, 0.8));
        }
      },
      onDown(p) {
        paddle.x = clamp(p.x, paddle.w / 2, host.width - paddle.w / 2);
      },
      onMove(p) {
        paddle.x = clamp(p.x, paddle.w / 2, host.width - paddle.w / 2);
      },
    } satisfies Challenge;
  },
};

/** 28. BUBBLE POP - pop every bubble before one floats off the top. */
export const bubbles: ChallengeDef = {
  id: 'bubbles',
  title: 'BUBBLE POP',
  instruction: 'Pop every bubble',
  tags: ['tap', 'reflex'],
  minLevel: 4,
  create(params, host) {
    const total = scaleInt(params, 6, 14);
    const rise = scale(params, 75, 175);
    const r = clamp(scale(params, 34, 23) * params.targetSize, 16, 38);
    const gap = scale(params, 0.55, 0.28);
    const list = Array.from({ length: total }, (_, i) => ({
      x: params.rng.range(r + 10, host.width - r - 10),
      y: host.height + r + i * gap * rise,
      phase: params.rng.range(0, Math.PI * 2),
      sway: params.rng.range(10, 26),
      speed: rise * params.rng.range(0.85, 1.2),
      popped: false,
    }));
    let popped = 0;

    return {
      timeLimit: (total * gap * rise + host.height) / rise + 3,
      enter() {
        host.setInstruction(`Pop all ${total} bubbles`);
        host.setProgress(0);
      },
      update(dt) {
        for (const b of list) {
          if (b.popped) continue;
          b.y -= b.speed * dt;
          b.phase += dt * 2.4;
          if (b.y < -r) {
            host.fail('A bubble escaped');
            return;
          }
        }
      },
      render(g) {
        for (const b of list) {
          if (b.popped || b.y > host.height + r) continue;
          const x = b.x + Math.sin(b.phase) * b.sway;
          glow(g, x, b.y, r * 1.8, THEME.cyan, 0.18);
          circle(g, x, b.y, r, withAlpha(THEME.cyan, 0.22));
          ring(g, x, b.y, r, withAlpha(THEME.cyan, 0.9), 3);
          circle(g, x - r * 0.35, b.y - r * 0.35, r * 0.18, withAlpha('#FFFFFF', 0.7));
        }
      },
      onDown(p) {
        const hit = list.find((b) => !b.popped && b.y < host.height + r && dist(p.x, p.y, b.x + Math.sin(b.phase) * b.sway, b.y) <= r + 10);
        if (!hit) return;
        hit.popped = true;
        popped += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, THEME.cyan, 10, { speed: 160, size: 4 });
        host.setProgress(popped / total);
        if (popped >= total) host.win();
      },
    } satisfies Challenge;
  },
};

/** 29. SHRINK - each circle shrinks away; tap it before it's gone. */
export const shrink: ChallengeDef = {
  id: 'shrink',
  title: 'SHRINK',
  instruction: 'Tap each circle before it vanishes',
  tags: ['tap', 'reflex', 'timing'],
  minLevel: 6,
  create(params, host) {
    const needed = scaleInt(params, 5, 11);
    const life = scale(params, 1.45, 0.7);
    const every = scale(params, 0.75, 0.42);
    const startR = clamp(48 * params.targetSize, 30, 52);
    const area = safeArea(host.width, host.height, startR + 8);
    const live: { x: number; y: number; age: number }[] = [];
    let spawnTimer = 0;
    let spawned = 0;
    let hits = 0;

    return {
      timeLimit: needed * every + life + 3,
      enter() {
        host.setInstruction(`Catch ${needed} circles`);
        host.setProgress(0);
      },
      update(dt) {
        spawnTimer -= dt;
        if (spawnTimer <= 0 && spawned < needed) {
          live.push({ x: params.rng.range(area.x, area.x + area.w), y: params.rng.range(area.y, area.y + area.h), age: 0 });
          spawned += 1;
          spawnTimer = every;
        }
        for (const c of live) {
          c.age += dt;
          if (c.age >= life) {
            host.fail('Too slow');
            return;
          }
        }
      },
      render(g) {
        for (const c of live) {
          const k = 1 - c.age / life;
          ring(g, c.x, c.y, startR * 1.25, withAlpha(THEME.accent, 0.25 + 0.5 * (1 - k)), 2);
          drawTarget(g, { x: c.x, y: c.y, r: Math.max(4, startR * k) }, k > 0.35 ? THEME.accent : THEME.warn);
        }
      },
      onDown(p) {
        const idx = live.findIndex((c) => hitDisc(p, { x: c.x, y: c.y, r: startR * (1 - c.age / life) }, 12));
        if (idx < 0) return;
        const [c] = live.splice(idx, 1);
        hits += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(c.x, c.y, THEME.accent, 10);
        host.setProgress(hits / needed);
        if (hits >= needed) host.win();
      },
    } satisfies Challenge;
  },
};

/** 30. SLICE - swipe through the tossed orbs; never through a bomb. */
export const slice: ChallengeDef = {
  id: 'slice',
  title: 'SLICE',
  instruction: 'Swipe through the orbs, not the bombs',
  tags: ['swipe', 'reflex'],
  minLevel: 9,
  create(params, host) {
    const needed = scaleInt(params, 4, 9);
    const gravity = scale(params, 760, 1050);
    const every = scale(params, 0.7, 0.42);
    const bombChance = scale(params, 0.12, 0.3);
    const r = clamp(30 * params.targetSize, 20, 34);
    const colors = [THEME.success, THEME.cyan, THEME.accent, THEME.violet];
    const items: { x: number; y: number; vx: number; vy: number; bomb: boolean; color: string; cut: boolean }[] = [];
    const trail: { x: number; y: number; age: number }[] = [];
    let last: { x: number; y: number } | null = null;
    let timer = 0.1;
    let sliced = 0;

    const toss = (): void => {
      const x = params.rng.range(host.width * 0.2, host.width * 0.8);
      const peak = params.rng.range(host.height * 0.35, host.height * 0.75);
      items.push({
        x,
        y: host.height + r,
        vx: (host.width / 2 - x) * params.rng.range(0.3, 0.9),
        vy: -Math.sqrt(2 * gravity * peak),
        bomb: params.rng.bool(bombChance),
        color: params.rng.pick(colors),
        cut: false,
      });
    };

    const cutAlong = (ax: number, ay: number, bx: number, by: number): void => {
      for (const it of items) {
        if (it.cut || segmentDistance(it.x, it.y, ax, ay, bx, by) > r) continue;
        it.cut = true;
        if (it.bomb) {
          host.shake(16);
          host.particles.burst(it.x, it.y, THEME.danger, 22);
          host.fail('You sliced a bomb');
          return;
        }
        sliced += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(it.x, it.y, it.color, 14);
        host.setProgress(sliced / needed);
        if (sliced >= needed) {
          host.win();
          return;
        }
      }
    };

    return {
      timeLimit: scaleTime(params, 8, 7, 5),
      enter() {
        host.setInstruction(`Slice ${needed} orbs`);
        host.setProgress(0);
      },
      update(dt) {
        timer -= dt;
        if (timer <= 0) {
          toss();
          if (params.difficulty > 0.6 && params.rng.bool(0.35)) toss();
          timer = every * params.rng.range(0.8, 1.25);
        }
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.vy += gravity * dt;
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          if (it.y > host.height + r * 2 && it.vy > 0) items.splice(i, 1);
        }
        for (let i = trail.length - 1; i >= 0; i--) {
          trail[i].age += dt;
          if (trail[i].age > 0.18) trail.splice(i, 1);
        }
      },
      render(g) {
        for (const it of items) {
          if (it.cut) continue;
          if (it.bomb) {
            circle(g, it.x, it.y, r, THEME.surfaceHi);
            ring(g, it.x, it.y, r, THEME.danger, 4);
            drawSymbol(g, 'cross', it.x, it.y, r, THEME.danger);
          } else {
            drawTarget(g, { x: it.x, y: it.y, r }, it.color);
          }
        }
        if (trail.length > 1) {
          g.save();
          g.lineCap = 'round';
          for (let i = 1; i < trail.length; i++) {
            const a = trail[i - 1];
            const b = trail[i];
            g.strokeStyle = withAlpha('#FFFFFF', 0.8 * (1 - b.age / 0.18));
            g.lineWidth = 6 * (1 - b.age / 0.18) + 1;
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.stroke();
          }
          g.restore();
        }
      },
      onDown(p) {
        last = { x: p.x, y: p.y };
        trail.push({ x: p.x, y: p.y, age: 0 });
      },
      onMove(p) {
        if (!last) return;
        cutAlong(last.x, last.y, p.x, p.y);
        last = { x: p.x, y: p.y };
        trail.push({ x: p.x, y: p.y, age: 0 });
      },
      onUp() {
        last = null;
      },
    } satisfies Challenge;
  },
};

export const REFLEX_CHALLENGES: ChallengeDef[] = [whack, catchDrops, bubbles, shrink, slice];

