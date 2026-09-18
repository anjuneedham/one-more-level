import {
  circle,
  clamp,
  fillRoundRect,
  glow,
  meter,
  polygon,
  ring,
  strokeRoundRect,
  text,
  withAlpha,
} from '../core/draw';
import { THEME } from '../core/theme';
import type { Pointer } from '../core/stage';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import { ARROWS, swipeDirection, type SwipeDir } from './common';

/** 15. HOLD - fill the meter into the green band, then let go. */
export const hold: ChallengeDef = {
  id: 'hold',
  title: 'HOLD',
  instruction: 'Hold until the meter hits the zone',
  tags: ['hold', 'timing'],
  create(params, host) {
    const zoneWidth = clamp(scale(params, 0.2, 0.075) * params.precision * 1.4, 0.05, 0.24);
    const zoneStart = params.rng.range(0.45, 0.88 - zoneWidth);
    const fillRate = scale(params, 0.42, 0.85);
    const barW = host.width * 0.18;
    const barH = host.height * 0.52;
    const barX = host.width / 2 - barW / 2;
    const barY = host.height * 0.16;
    let value = 0;
    let holding = false;
    let resolved = false;

    return {
      timeLimit: scaleTime(params, 7, 5, 4),
      enter() {
        host.setInstruction('Hold, then release in the green');
      },
      update(dt) {
        if (resolved) return;
        if (holding) {
          value += fillRate * dt;
          if (value >= 1) {
            host.shake(10);
            host.fail('Overfilled!');
            resolved = true;
          }
        }
        host.setProgress(clamp(value, 0, 1));
      },
      render(g) {
        // Vertical meter, filling from the bottom.
        fillRoundRect(g, barX, barY, barW, barH, barW / 2, THEME.surface);
        const zoneY = barY + barH * (1 - zoneStart - zoneWidth);
        const zoneH = barH * zoneWidth;
        fillRoundRect(g, barX, zoneY, barW, zoneH, 6, withAlpha(THEME.success, 0.45));
        const fillH = barH * clamp(value, 0, 1);
        fillRoundRect(
          g,
          barX,
          barY + barH - fillH,
          barW,
          fillH,
          barW / 2,
          value > zoneStart && value < zoneStart + zoneWidth ? THEME.success : THEME.primary,
        );
        strokeRoundRect(g, barX, barY, barW, barH, barW / 2, withAlpha(THEME.ink, 0.15), 2);
        text(
          g,
          holding ? 'RELEASE IN GREEN' : 'PRESS AND HOLD',
          host.width / 2,
          barY + barH + 42,
          20,
          holding ? THEME.success : THEME.inkDim,
          'center',
          800,
        );
      },
      onDown() {
        if (resolved) return;
        holding = true;
        host.sound('tick');
      },
      onUp() {
        if (resolved || !holding) return;
        holding = false;
        resolved = true;
        if (value >= zoneStart && value <= zoneStart + zoneWidth) {
          host.particles.burst(host.width / 2, host.height / 2, THEME.success, 18);
          host.win();
        } else {
          host.fail(value < zoneStart ? 'Too early' : 'Too late');
        }
      },
    } satisfies Challenge;
  },
};

/** 16. RELEASE - stop the sweeping marker inside the target band. */
export const release: ChallengeDef = {
  id: 'release',
  title: 'RELEASE',
  instruction: 'Tap at the perfect moment',
  tags: ['timing', 'reflex'],
  create(params, host) {
    const zoneWidth = clamp(0.18 * params.precision, 0.05, 0.2);
    const zoneStart = params.rng.range(0.15, 0.85 - zoneWidth);
    const speed = scale(params, 0.55, 1.35);
    const rounds = scaleInt(params, 1, 3);
    const barX = host.width * 0.1;
    const barW = host.width * 0.8;
    const barY = host.height / 2 - 26;
    const barH = 52;
    let pos = 0;
    let dir = 1;
    let done = 0;
    let zone = zoneStart;
    let flash = 0;

    return {
      timeLimit: scaleTime(params, 6, 4.5, 3) * rounds,
      enter() {
        host.setInstruction(rounds > 1 ? `Nail it ${rounds} times` : 'Tap in the green zone');
        host.setProgress(0);
      },
      update(dt) {
        flash = Math.max(0, flash - dt * 4);
        pos += dir * speed * dt;
        if (pos > 1) {
          pos = 1;
          dir = -1;
        } else if (pos < 0) {
          pos = 0;
          dir = 1;
        }
      },
      render(g) {
        fillRoundRect(g, barX, barY, barW, barH, 16, THEME.surface);
        fillRoundRect(
          g,
          barX + barW * zone,
          barY,
          barW * zoneWidth,
          barH,
          10,
          withAlpha(THEME.success, 0.55 + flash * 0.4),
        );
        const markerX = barX + barW * pos;
        fillRoundRect(g, markerX - 4, barY - 12, 8, barH + 24, 4, THEME.accent);
        glow(g, markerX, barY + barH / 2, 60, THEME.accent, 0.3);
        text(
          g,
          `${done} / ${rounds}`,
          host.width / 2,
          barY - 54,
          22,
          THEME.inkDim,
          'center',
          800,
        );
        text(g, 'TAP ANYWHERE', host.width / 2, barY + barH + 54, 18, THEME.inkDim, 'center', 700);
      },
      onDown() {
        if (pos >= zone && pos <= zone + zoneWidth) {
          done += 1;
          flash = 1;
          host.sound('coin');
          host.haptic('light');
          host.particles.burst(barX + barW * pos, barY + barH / 2, THEME.success, 14);
          host.setProgress(done / rounds);
          if (done >= rounds) {
            host.win();
            return;
          }
          // New band and a fresh sweep for the next round.
          zone = params.rng.range(0.12, 0.86 - zoneWidth);
        } else {
          host.fail('Missed the zone');
        }
      },
    } satisfies Challenge;
  },
};

/** 17. BALANCE - keep the beam level by nudging it left and right. */
export const balance: ChallengeDef = {
  id: 'balance',
  title: 'BALANCE',
  instruction: 'Keep it balanced',
  tags: ['hold', 'timing'],
  create(params, host) {
    const duration = scaleTime(params, 5, 8, 4);
    const tipAngle = 0.62; // radians at which the ball falls off
    const gravity = scale(params, 1.5, 3.4);
    const control = 2.6;
    const gustEvery = params.difficulty > 0.4 ? scale(params, 2.4, 0.9) : 0;
    let angle = params.rng.range(-0.08, 0.08);
    let vel = 0;
    let elapsed = 0;
    let input = 0;
    let gustTimer = gustEvery;
    let gustFlash = 0;

    return {
      timeLimit: duration + 0.4,
      onTimeout: 'win',
      enter() {
        host.setInstruction('Hold left or right to counter');
        host.setProgress(0);
      },
      update(dt) {
        elapsed += dt;
        host.setProgress(clamp(elapsed / duration, 0, 1));
        gustFlash = Math.max(0, gustFlash - dt * 3);
        if (gustEvery > 0) {
          gustTimer -= dt;
          if (gustTimer <= 0) {
            gustTimer = gustEvery * params.rng.range(0.7, 1.3);
            vel += params.rng.sign() * scale(params, 0.5, 1.2);
            gustFlash = 1;
            host.sound('whoosh');
          }
        }
        // Inverted-pendulum feel: gravity pushes away from centre.
        vel += Math.sin(angle) * gravity * dt;
        vel += input * control * dt;
        vel *= 0.985;
        angle += vel * dt;
        if (Math.abs(angle) > tipAngle) {
          host.shake(12);
          host.fail('It tipped over');
        }
      },
      render(g) {
        const cx = host.width / 2;
        const cy = host.height * 0.56;
        const beam = host.width * 0.62;
        g.save();
        g.translate(cx, cy);
        g.rotate(angle);
        fillRoundRect(g, -beam / 2, -8, beam, 16, 8, THEME.surfaceHi);
        circle(g, 0, -30, 22, gustFlash > 0.2 ? THEME.warn : THEME.primary);
        g.restore();
        // Pivot
        polygon(g, cx, cy + 36, 28, 3, -Math.PI / 2, THEME.surface);
        const tilt = clamp(Math.abs(angle) / tipAngle, 0, 1);
        meter(g, host.width * 0.2, host.height * 0.16, host.width * 0.6, 10, 1 - tilt, tilt > 0.7 ? THEME.danger : THEME.success);
        text(g, 'HOLD  ◀   ▶', cx, host.height - 48, 20, THEME.inkDim, 'center', 800);
      },
      onDown(p) {
        input = p.x < host.width / 2 ? -1 : 1;
      },
      onMove(p) {
        if (input !== 0) input = p.x < host.width / 2 ? -1 : 1;
      },
      onUp() {
        input = 0;
      },
    } satisfies Challenge;
  },
};

/** 18. SWIPE - swipe the arrows, in order, before the clock runs out. */
export const swipe: ChallengeDef = {
  id: 'swipe',
  title: 'SWIPE',
  instruction: 'Swipe the way the arrow points',
  tags: ['swipe'],
  create(params, host) {
    const steps = scaleInt(params, 1, 5);
    const dirs: SwipeDir[] = ['up', 'down', 'left', 'right'];
    const sequence = Array.from({ length: steps }, () => params.rng.pick(dirs));
    // Cruel twist for deep levels: swipe the OPPOSITE way.
    const inverted = params.difficulty > 0.7;
    let index = 0;
    let start: Pointer | null = null;
    let pop = 0;

    return {
      timeLimit: scaleTime(params, 4.5, 3.5, 2.5) + steps * 0.9,
      enter() {
        host.setInstruction(inverted ? 'Swipe the OPPOSITE way!' : 'Swipe that way');
        host.setProgress(0);
      },
      update(dt) {
        pop = Math.max(0, pop - dt * 5);
      },
      render(g) {
        const cx = host.width / 2;
        const cy = host.height / 2;
        glow(g, cx, cy, host.width * 0.4, inverted ? THEME.violet : THEME.primary, 0.25);
        text(
          g,
          ARROWS[sequence[index]],
          cx,
          cy,
          160 * (1 + pop * 0.12),
          inverted ? THEME.violet : THEME.ink,
          'center',
          900,
        );
        if (steps > 1) {
          const dotY = host.height - 70;
          for (let i = 0; i < steps; i++) {
            const dx = cx + (i - (steps - 1) / 2) * 26;
            circle(g, dx, dotY, 7, i < index ? THEME.success : THEME.surfaceHi);
          }
        }
      },
      onDown(p) {
        start = p;
      },
      onUp(p) {
        if (!start) return;
        const dir = swipeDirection(start, p, 44);
        start = null;
        if (!dir) return;
        const opposite: Record<SwipeDir, SwipeDir> = {
          up: 'down',
          down: 'up',
          left: 'right',
          right: 'left',
        };
        const wanted = inverted ? opposite[sequence[index]] : sequence[index];
        if (dir !== wanted) {
          host.fail('Wrong direction');
          return;
        }
        index += 1;
        pop = 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, THEME.primary, 10);
        host.setProgress(index / steps);
        if (index >= steps) host.win();
      },
    } satisfies Challenge;
  },
};

/** 23. ROTATE - twist the shape until its notch lines up with the slot. */
export const rotate: ChallengeDef = {
  id: 'rotate',
  title: 'ROTATE',
  instruction: 'Rotate into position',
  tags: ['drag', 'puzzle'],
  create(params, host) {
    const tolerance = clamp(0.32 * params.precision, 0.09, 0.34);
    const targetAngle = params.rng.range(0, Math.PI * 2);
    const sides = scaleInt(params, 3, 6);
    const drag = scale(params, 0.9, 1.6); // radians per screen width dragged
    let angle = targetAngle + params.rng.range(1.2, Math.PI * 1.6) * params.rng.sign();
    let lastX: number | null = null;
    let alignedFor = 0;
    const needHold = 0.25;

    const diff = (): number => {
      let d = (angle - targetAngle) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      return Math.abs(d);
    };

    return {
      timeLimit: scaleTime(params, 8, 6, 4),
      enter() {
        host.setInstruction('Drag left/right to rotate');
        host.setProgress(0);
      },
      update(dt) {
        const aligned = diff() <= tolerance;
        alignedFor = aligned ? alignedFor + dt : 0;
        host.setProgress(clamp(1 - diff() / Math.PI, 0, 1));
        if (alignedFor >= needHold) {
          host.particles.burst(host.width / 2, host.height / 2, THEME.success, 20);
          host.win();
        }
      },
      render(g) {
        const cx = host.width / 2;
        const cy = host.height / 2;
        const r = Math.min(host.width, host.height) * 0.26;
        const aligned = diff() <= tolerance;

        // Ghost outline of the required orientation.
        g.save();
        g.globalAlpha = 0.35;
        g.translate(cx, cy);
        g.rotate(targetAngle);
        polygon(g, 0, 0, r, sides, -Math.PI / 2, withAlpha(THEME.success, 0.3));
        circle(g, 0, -r * 0.78, r * 0.13, THEME.success);
        g.restore();

        g.save();
        g.translate(cx, cy);
        g.rotate(angle);
        polygon(g, 0, 0, r * 0.88, sides, -Math.PI / 2, aligned ? THEME.success : THEME.primary);
        circle(g, 0, -r * 0.68, r * 0.12, THEME.ink);
        g.restore();

        ring(g, cx, cy, r * 1.25, withAlpha(THEME.ink, 0.12), 2);
        text(
          g,
          aligned ? 'HOLD IT' : 'DRAG TO ROTATE',
          cx,
          host.height - 60,
          20,
          aligned ? THEME.success : THEME.inkDim,
          'center',
          800,
        );
      },
      onDown(p) {
        lastX = p.x;
      },
      onMove(p) {
        if (lastX === null) return;
        angle += ((p.x - lastX) / host.width) * Math.PI * 2 * drag;
        lastX = p.x;
      },
      onUp() {
        lastX = null;
      },
    } satisfies Challenge;
  },
};

export const PRECISION_CHALLENGES: ChallengeDef[] = [hold, release, balance, swipe, rotate];
