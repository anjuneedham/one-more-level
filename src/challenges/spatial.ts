import { circle, clamp, dist, fillRoundRect, glow, ring, text, withAlpha } from '../core/draw';
import { THEME } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import { drawTarget, hitDisc, safeArea } from './common';

/** Distance from a point to a polyline, plus how far along it the nearest point is (0..1). */
function nearestOnPath(px: number, py: number, pts: { x: number; y: number }[]): { d: number; t: number } {
  let best = { d: Infinity, t: 0 };
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const l = dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    lens.push(l);
    total += l;
  }
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const u = len2 === 0 ? 0 : clamp(((px - a.x) * dx + (py - a.y) * dy) / len2, 0, 1);
    const d = dist(px, py, a.x + dx * u, a.y + dy * u);
    if (d < best.d) best = { d, t: (walked + lens[i - 1] * u) / total };
    walked += lens[i - 1];
  }
  return best;
}

/** 36. CONNECT - drag through the numbered dots in order. */
export const connect: ChallengeDef = {
  id: 'connect',
  title: 'CONNECT',
  instruction: 'Drag through the dots in order',
  tags: ['drag'],
  minLevel: 3,
  create(params, host) {
    const count = scaleInt(params, 4, 8);
    const r = clamp(26 * params.targetSize, 18, 28);
    const area = safeArea(host.width, host.height, r + 14);
    const dots: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 60; tries++) {
        x = params.rng.range(area.x, area.x + area.w);
        y = params.rng.range(area.y, area.y + area.h);
        if (dots.every((d) => dist(d.x, d.y, x, y) > r * 3.2)) break;
      }
      dots.push({ x, y });
    }
    let next = 0;
    let finger: { x: number; y: number } | null = null;

    const touch = (p: { x: number; y: number }): void => {
      for (let i = 0; i < count; i++) {
        if (i < next || dist(p.x, p.y, dots[i].x, dots[i].y) > r) continue;
        if (i !== next) {
          host.fail(`That was ${i + 1}, not ${next + 1}`);
          return;
        }
        next += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(dots[i].x, dots[i].y, THEME.primary, 8);
        host.setProgress(next / count);
        if (next >= count) host.win();
        return;
      }
    };

    return {
      timeLimit: scaleTime(params, 8, 6, 4.5),
      update() {},
      render(g) {
        g.save();
        g.strokeStyle = THEME.primary;
        g.lineWidth = 8;
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.beginPath();
        for (let i = 0; i < next; i++) (i === 0 ? g.moveTo : g.lineTo).call(g, dots[i].x, dots[i].y);
        if (finger && next > 0) g.lineTo(finger.x, finger.y);
        g.stroke();
        g.restore();
        dots.forEach((d, i) =>
          drawTarget(g, { x: d.x, y: d.y, r }, i < next ? THEME.success : i === next ? THEME.primary : THEME.inkDim, {
            label: String(i + 1),
          }),
        );
      },
      onDown(p) {
        finger = { x: p.x, y: p.y };
        touch(p);
      },
      onMove(p) {
        if (!finger) return;
        finger = { x: p.x, y: p.y };
        touch(p);
      },
      onUp() {
        finger = null;
      },
    } satisfies Challenge;
  },
};

/** 37. STACK - drop each sliding block onto the tower; overhang gets trimmed. */
export const stack: ChallengeDef = {
  id: 'stack',
  title: 'STACK',
  instruction: 'Tap to drop each block on the tower',
  tags: ['timing', 'tap'],
  minLevel: 7,
  create(params, host) {
    const needed = scaleInt(params, 4, 7);
    const blockH = 30;
    const speed = scale(params, 170, 420);
    const baseW = Math.min(host.width * 0.6, 220);
    const tower: { x: number; w: number }[] = [{ x: (host.width - baseW) / 2, w: baseW }];
    let moving = { x: 0, w: baseW, dir: 1 };
    let dropped = 0;

    const yOf = (level: number): number => {
      const top = host.height - 40 - blockH * (level + 1);
      // Keep the top of the tower in view as it grows.
      const shift = Math.max(0, host.height * 0.45 - (host.height - 40 - blockH * (tower.length + 1)));
      return top + shift;
    };

    return {
      timeLimit: scaleTime(params, 10, 8, 6),
      enter() {
        host.setInstruction(`Stack ${needed} blocks`);
        host.setProgress(0);
      },
      update(dt) {
        moving.x += moving.dir * speed * dt;
        if (moving.x < 0) {
          moving.x = 0;
          moving.dir = 1;
        } else if (moving.x + moving.w > host.width) {
          moving.x = host.width - moving.w;
          moving.dir = -1;
        }
      },
      render(g) {
        const colors = [THEME.primary, THEME.violet, THEME.cyan, THEME.success, THEME.accent, THEME.warn];
        tower.forEach((b, i) => fillRoundRect(g, b.x, yOf(i), b.w, blockH - 3, 6, colors[i % colors.length]));
        fillRoundRect(g, moving.x, yOf(tower.length), moving.w, blockH - 3, 6, colors[tower.length % colors.length]);
      },
      onDown() {
        const top = tower[tower.length - 1];
        const left = Math.max(top.x, moving.x);
        const right = Math.min(top.x + top.w, moving.x + moving.w);
        const overlap = right - left;
        if (overlap < Math.max(12, top.w * 0.2)) {
          host.shake(12);
          host.fail('It fell off');
          return;
        }
        tower.push({ x: left, w: overlap });
        dropped += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(left + overlap / 2, yOf(tower.length - 1), THEME.accent, 8, { speed: 120, size: 4 });
        host.setProgress(dropped / needed);
        if (dropped >= needed) {
          host.win();
          return;
        }
        moving = { x: moving.dir > 0 ? 0 : host.width - overlap, w: overlap, dir: moving.dir };
      },
    } satisfies Challenge;
  },
};

/** 38. TRACE - drag along the path from start to finish without leaving it. */
export const trace: ChallengeDef = {
  id: 'trace',
  title: 'TRACE',
  instruction: 'Stay on the path',
  tags: ['drag', 'timing'],
  minLevel: 11,
  create(params, host) {
    const turns = scaleInt(params, 3, 6);
    const half = clamp(scale(params, 36, 24) * params.targetSize, 20, 38);
    const area = safeArea(host.width, host.height, half + 16);
    const pts = Array.from({ length: turns + 1 }, (_, i) => ({
      x: i === 0 || i === turns ? area.x + area.w / 2 + params.rng.range(-area.w * 0.25, area.w * 0.25) : params.rng.range(area.x, area.x + area.w),
      y: area.y + area.h - (area.h * i) / turns,
    }));
    const start = pts[0];
    const end = pts[pts.length - 1];
    let tracing = false;
    let best = 0;
    let pen: { x: number; y: number } | null = null;

    return {
      timeLimit: scaleTime(params, 8, 6, 4.5),
      enter() {
        host.setInstruction('Start on the green dot');
      },
      update() {},
      render(g) {
        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.strokeStyle = withAlpha(THEME.primary, 0.22);
        g.lineWidth = half * 2;
        g.beginPath();
        pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
        g.stroke();
        g.strokeStyle = withAlpha(THEME.primary, 0.55);
        g.lineWidth = 2;
        g.setLineDash([8, 10]);
        g.stroke();
        g.restore();
        glow(g, start.x, start.y, half * 2.4, THEME.success, 0.35);
        circle(g, start.x, start.y, half * 0.9, THEME.success);
        ring(g, end.x, end.y, half, THEME.accent, 4);
        text(g, 'END', end.x, end.y, 13, THEME.accent, 'center', 900);
        if (pen) {
          glow(g, pen.x, pen.y, 30, THEME.ink, 0.35);
          circle(g, pen.x, pen.y, 9, THEME.ink);
        }
      },
      onDown(p) {
        if (tracing) return;
        if (dist(p.x, p.y, start.x, start.y) > half + 10) return;
        tracing = true;
        pen = { x: p.x, y: p.y };
        host.setInstruction('Follow it to the end');
      },
      onMove(p) {
        if (!tracing) return;
        pen = { x: p.x, y: p.y };
        const near = nearestOnPath(p.x, p.y, pts);
        if (near.d > half) {
          host.shake(10);
          host.particles.burst(p.x, p.y, THEME.danger, 12);
          host.fail('Off the path');
          return;
        }
        best = Math.max(best, near.t);
        host.setProgress(best);
        if (best > 0.97 || dist(p.x, p.y, end.x, end.y) < half * 0.8) host.win();
      },
      onUp() {
        if (tracing) host.fail('You let go');
      },
    } satisfies Challenge;
  },
};

/** 39. AIM - the launcher sweeps; tap when it lines up with the target. */
export const aim: ChallengeDef = {
  id: 'aim',
  title: 'AIM',
  instruction: 'Tap when the arrow points at the target',
  tags: ['timing'],
  minLevel: 14,
  create(params, host) {
    const shots = scaleInt(params, 1, 3);
    const sweep = scale(params, 1.1, 1.8);
    const base = { x: host.width / 2, y: host.height - 46 };
    const targetR = clamp(34 * params.precision, 20, 34);
    const moves = params.difficulty > 0.8;
    const target = { x: 0, y: 0, vx: 0 };
    const place = (): void => {
      target.x = params.rng.range(60, host.width - 60);
      target.y = params.rng.range(70, host.height * 0.45);
      target.vx = moves ? params.rng.sign() * scale(params, 40, 110) : 0;
    };
    place();
    let phase = params.rng.range(0, Math.PI * 2);
    let angle = 0;
    let ball: { x: number; y: number; vx: number; vy: number; t: number } | null = null;
    let hits = 0;

    return {
      timeLimit: shots * scaleTime(params, 5, 3.6, 3),
      enter() {
        host.setInstruction(shots > 1 ? `Hit the target ${shots} times` : 'Hit the target');
        host.setProgress(0);
      },
      update(dt) {
        if (!ball) {
          phase += dt * sweep;
          angle = Math.sin(phase) * 1.15;
        }
        if (target.vx) {
          target.x += target.vx * dt;
          if (target.x < 40 || target.x > host.width - 40) target.vx *= -1;
        }
        if (!ball) return;
        ball.t += dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (dist(ball.x, ball.y, target.x, target.y) < targetR + 12) {
          hits += 1;
          host.sound('success');
          host.particles.burst(target.x, target.y, THEME.accent, 18);
          host.setProgress(hits / shots);
          ball = null;
          if (hits >= shots) host.win();
          else place();
        } else if (ball.y < -20 || ball.x < -20 || ball.x > host.width + 20) {
          ball = null;
          host.fail('Missed');
        }
      },
      render(g) {
        drawTarget(g, { x: target.x, y: target.y, r: targetR }, THEME.accent);
        ring(g, target.x, target.y, targetR * 0.5, withAlpha(THEME.bg, 0.6), 3);
        g.save();
        g.translate(base.x, base.y);
        g.rotate(angle);
        g.setLineDash([6, 10]);
        g.strokeStyle = withAlpha(THEME.ink, 0.3);
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -host.height);
        g.stroke();
        g.setLineDash([]);
        fillRoundRect(g, -9, -58, 18, 58, 9, THEME.primary);
        g.restore();
        circle(g, base.x, base.y, 22, THEME.primaryDeep);
        if (ball) circle(g, ball.x, ball.y, 9, THEME.ink);
      },
      onDown() {
        if (ball) return;
        const speed = 1300;
        ball = {
          x: base.x + Math.sin(angle) * 58,
          y: base.y - Math.cos(angle) * 58,
          vx: Math.sin(angle) * speed,
          vy: -Math.cos(angle) * speed,
          t: 0,
        };
        host.sound('whoosh');
        host.haptic('light');
      },
    } satisfies Challenge;
  },
};

/** 40. KEEP IT UP - tap the ball to bounce it; don't let it hit the floor. */
export const keepUp: ChallengeDef = {
  id: 'keep_up',
  title: 'KEEP IT UP',
  instruction: "Tap the ball, don't let it drop",
  tags: ['tap', 'timing'],
  minLevel: 8,
  create(params, host) {
    const duration = scaleTime(params, 5, 8, 4);
    const gravity = scale(params, 820, 1400);
    const r = clamp(scale(params, 46, 30) * params.targetSize, 24, 50);
    const ball = { x: host.width / 2, y: host.height * 0.25, vx: params.rng.range(-60, 60), vy: 0, pop: 0 };
    let elapsed = 0;
    let bounces = 0;

    return {
      timeLimit: duration,
      onTimeout: 'win',
      enter() {
        host.setInstruction('Keep it in the air');
        host.setProgress(0);
      },
      update(dt) {
        elapsed += dt;
        host.setProgress(clamp(elapsed / duration, 0, 1));
        ball.pop = Math.max(0, ball.pop - dt * 6);
        ball.vy += gravity * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x < r || ball.x > host.width - r) {
          ball.vx *= -0.9;
          ball.x = clamp(ball.x, r, host.width - r);
        }
        if (ball.y < r && ball.vy < 0) {
          ball.vy *= -0.4;
          ball.y = r;
        }
        if (ball.y - r > host.height) host.fail('It dropped');
      },
      render(g) {
        g.save();
        g.globalAlpha = clamp(1 - (host.height - ball.y) / host.height, 0.15, 0.6);
        g.fillStyle = '#000000';
        g.beginPath();
        g.ellipse(ball.x, host.height - 10, r * 0.9, r * 0.22, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
        drawTarget(g, { x: ball.x, y: ball.y, r }, THEME.success, { pop: ball.pop, label: bounces ? String(bounces) : undefined });
      },
      onDown(p) {
        if (!hitDisc(p, { x: ball.x, y: ball.y, r }, 22)) return;
        bounces += 1;
        ball.pop = 1;
        ball.vy = -Math.sqrt(2 * gravity * host.height * 0.55);
        ball.vx = clamp((ball.x - p.x) * 7 + params.rng.range(-50, 50), -320, 320);
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, THEME.success, 6, { speed: 120, size: 4 });
      },
    } satisfies Challenge;
  },
};

export const SPATIAL_CHALLENGES: ChallengeDef[] = [connect, stack, trace, aim, keepUp];
