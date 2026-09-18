import { circle, clamp, dist, fillRoundRect, glow, meter, ring, text, withAlpha } from '../core/draw';
import { THEME } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import { drawTarget, hitDisc, safeArea, type Disc } from './common';

/** 5. DODGE - slide left and right, let nothing hit you. */
export const dodge: ChallengeDef = {
  id: 'dodge',
  title: 'DODGE',
  instruction: 'Avoid the falling blocks',
  tags: ['drag', 'avoid'],
  create(params, host) {
    const duration = scaleTime(params, 6, 9, 5);
    const playerR = clamp(20 * params.targetSize, 13, 24);
    const player = { x: host.width / 2, y: host.height - 70 };
    const fallSpeed = scale(params, 230, 520);
    const spawnEvery = scale(params, 0.55, 0.22);
    const blockW = clamp(scale(params, 60, 34), 26, 70);
    const blocks: { x: number; y: number; w: number; h: number; vx: number }[] = [];
    // Deep levels add gentle sideways drift to the blocks.
    const drift = scale(params, 0, 90);
    let spawnTimer = 0;
    let elapsed = 0;
    let dragging = false;

    return {
      timeLimit: duration,
      onTimeout: 'win',
      enter() {
        host.setInstruction('Drag to dodge');
        host.setProgress(0);
      },
      update(dt) {
        elapsed += dt;
        host.setProgress(clamp(elapsed / duration, 0, 1));
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = spawnEvery * params.rng.range(0.75, 1.3);
          const w = blockW * params.rng.range(0.8, 1.4);
          blocks.push({
            x: params.rng.range(10, host.width - w - 10),
            y: -60,
            w,
            h: clamp(w * 0.55, 18, 44),
            vx: drift * params.rng.range(-1, 1),
          });
        }
        for (let i = blocks.length - 1; i >= 0; i--) {
          const b = blocks[i];
          b.y += fallSpeed * dt;
          b.x = clamp(b.x + b.vx * dt, 0, host.width - b.w);
          if (b.y > host.height + 60) {
            blocks.splice(i, 1);
            continue;
          }
          // Circle vs rect overlap.
          const nx = clamp(player.x, b.x, b.x + b.w);
          const ny = clamp(player.y, b.y, b.y + b.h);
          if (dist(player.x, player.y, nx, ny) < playerR * 0.85) {
            host.shake(14);
            host.particles.burst(player.x, player.y, THEME.danger, 16);
            host.fail('You got hit');
            return;
          }
        }
        if (dragging) host.particles.trail(player.x, player.y + playerR * 0.6, THEME.primary, 1);
      },
      render(g) {
        for (const b of blocks) {
          fillRoundRect(g, b.x, b.y, b.w, b.h, 8, THEME.danger);
          fillRoundRect(g, b.x + 4, b.y + 4, b.w - 8, b.h * 0.3, 5, withAlpha('#FFFFFF', 0.18));
        }
        glow(g, player.x, player.y, playerR * 3, THEME.primary, 0.3);
        circle(g, player.x, player.y, playerR, THEME.primary);
        ring(g, player.x, player.y, playerR + 4, withAlpha(THEME.primary, 0.4), 2);
        meter(g, 24, host.height - 22, host.width - 48, 8, 1 - elapsed / duration, THEME.success);
      },
      onDown(p) {
        dragging = true;
        player.x = clamp(p.x, playerR, host.width - playerR);
      },
      onMove(p) {
        if (!dragging) return;
        player.x = clamp(p.x, playerR, host.width - playerR);
      },
      onUp() {
        dragging = false;
      },
    } satisfies Challenge;
  },
};

/** 7. FOLLOW - keep your finger glued to the wandering target. */
export const follow: ChallengeDef = {
  id: 'follow',
  title: 'FOLLOW',
  instruction: 'Keep your finger on the target',
  tags: ['drag', 'timing'],
  create(params, host) {
    const duration = scaleTime(params, 4.5, 7.5, 4);
    const r = clamp(46 * params.targetSize, 22, 58);
    const speed = scale(params, 120, 340);
    const target: Disc = { x: host.width / 2, y: host.height / 2, r };
    let angle = params.rng.range(0, Math.PI * 2);
    let turnTimer = 0;
    let holding = false;
    let elapsed = 0;
    let grace = 0;
    let started = false;
    const graceMax = scale(params, 0.45, 0.16);
    // Time allowed to get a finger down before the hold has to be unbroken.
    const startGrace = 1.4;

    return {
      // The clock allows for the time spent getting a finger down; the win
      // comes from holding for `duration` of accumulated contact.
      timeLimit: duration + startGrace + 0.6,
      enter() {
        host.setInstruction('Hold the target');
        host.setProgress(0);
      },
      update(dt) {
        turnTimer -= dt;
        if (turnTimer <= 0) {
          turnTimer = params.rng.range(0.35, 1.1);
          angle += params.rng.range(-1.4, 1.4);
        }
        target.x += Math.cos(angle) * speed * dt;
        target.y += Math.sin(angle) * speed * dt;
        if (target.x < r || target.x > host.width - r) {
          angle = Math.PI - angle;
          target.x = clamp(target.x, r, host.width - r);
        }
        if (target.y < r || target.y > host.height - r) {
          angle = -angle;
          target.y = clamp(target.y, r, host.height - r);
        }

        if (holding) {
          elapsed += dt;
          grace = 0;
          host.setProgress(clamp(elapsed / duration, 0, 1));
          if (params.rng.bool(0.25)) host.particles.trail(target.x, target.y, THEME.accent, 1);
          if (elapsed >= duration) {
            host.particles.burst(target.x, target.y, THEME.success, 18);
            host.win();
            return;
          }
        } else {
          // A short grace period keeps it forgiving instead of twitchy; before
          // the first touch the player gets longer to find the target.
          grace += dt;
          if (grace > (started ? graceMax : startGrace)) host.fail('You let go');
        }
      },
      render(g) {
        drawTarget(g, target, holding ? THEME.success : THEME.accent, { pop: holding ? 0.15 : 0 });
        ring(g, target.x, target.y, target.r + 10, withAlpha(THEME.ink, holding ? 0.35 : 0.12), 2);
        meter(g, 24, host.height - 22, host.width - 48, 8, elapsed / duration, THEME.success);
      },
      onDown(p) {
        holding = hitDisc(p, target, 14);
        if (holding) {
          started = true;
          grace = 0;
        } else if (started) {
          host.fail('Missed the target');
        }
      },
      onMove(p) {
        if (!holding) return;
        holding = hitDisc(p, target, 18);
      },
      onUp() {
        holding = false;
      },
    } satisfies Challenge;
  },
};

/** 10. MOVING TARGET - hit the bouncing target before the clock dies. */
export const movingTarget: ChallengeDef = {
  id: 'moving_target',
  title: 'MOVING TARGET',
  instruction: 'Hit the moving target',
  tags: ['tap', 'reflex'],
  create(params, host) {
    const hitsNeeded = scaleInt(params, 2, 6);
    const r = clamp(52 * params.targetSize, 20, 62);
    const speed = scale(params, 200, 520);
    const area = safeArea(host.width, host.height, 10);
    const target: Disc = {
      x: params.rng.range(area.x + r, area.x + area.w - r),
      y: params.rng.range(area.y + r, area.y + area.h - r),
      r,
    };
    let vx = params.rng.sign() * speed;
    let vy = params.rng.sign() * speed * params.rng.range(0.5, 1);
    let hits = 0;
    let pop = 0;

    return {
      timeLimit: scaleTime(params, 6, 5, 3.5) + hitsNeeded * 0.5,
      enter() {
        host.setInstruction(hitsNeeded > 1 ? `Hit it ${hitsNeeded} times` : 'Hit the target');
        host.setProgress(0);
      },
      update(dt) {
        pop = Math.max(0, pop - dt * 6);
        target.x += vx * dt;
        target.y += vy * dt;
        if (target.x < area.x + r || target.x > area.x + area.w - r) {
          vx *= -1;
          target.x = clamp(target.x, area.x + r, area.x + area.w - r);
        }
        if (target.y < area.y + r || target.y > area.y + area.h - r) {
          vy *= -1;
          target.y = clamp(target.y, area.y + r, area.y + area.h - r);
        }
      },
      render(g) {
        drawTarget(g, target, THEME.accent, {
          pop,
          label: hitsNeeded > 1 ? String(hitsNeeded - hits) : undefined,
        });
      },
      onDown(p) {
        if (!hitDisc(p, target)) {
          // A miss costs time, not a life: the clock is the real opponent.
          host.shake(6);
          host.particles.burst(p.x, p.y, THEME.inkDim, 5, { speed: 90, size: 3 });
          return;
        }
        hits += 1;
        pop = 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(target.x, target.y, THEME.accent, 12);
        host.setProgress(hits / hitsNeeded);
        // Every hit speeds it up and sends it somewhere new.
        const a = params.rng.range(0, Math.PI * 2);
        const s = speed * (1 + hits * 0.12);
        vx = Math.cos(a) * s;
        vy = Math.sin(a) * s;
        if (hits >= hitsNeeded) host.win();
      },
    } satisfies Challenge;
  },
};

/** 20. ESCAPE - drag to the exit without touching the moving walls. */
export const escape: ChallengeDef = {
  id: 'escape',
  title: 'ESCAPE',
  instruction: 'Reach the exit',
  tags: ['drag', 'avoid'],
  create(params, host) {
    const playerR = clamp(18 * params.targetSize, 11, 20);
    const player = { x: host.width / 2, y: host.height - 60 };
    const exit = { x: host.width / 2, y: 60, r: clamp(40 * params.targetSize, 24, 44) };
    const barCount = scaleInt(params, 2, 5);
    const barH = clamp(scale(params, 20, 16), 12, 22);
    const bars = Array.from({ length: barCount }, (_, i) => {
      const gapW = clamp(scale(params, 150, 74), 60, 170);
      const y = host.height - 150 - i * ((host.height - 220) / Math.max(1, barCount));
      return {
        y,
        gapX: params.rng.range(gapW, host.width - gapW),
        gapW,
        vx: params.rng.sign() * scale(params, 55, 190),
      };
    });
    let dragging = false;

    return {
      timeLimit: scaleTime(params, 9, 7, 5),
      enter() {
        host.setInstruction('Drag to the exit');
      },
      update(dt) {
        for (const b of bars) {
          b.gapX += b.vx * dt;
          if (b.gapX < b.gapW / 2 + 10 || b.gapX > host.width - b.gapW / 2 - 10) {
            b.vx *= -1;
            b.gapX = clamp(b.gapX, b.gapW / 2 + 10, host.width - b.gapW / 2 - 10);
          }
          // Collide with the two solid segments either side of the gap.
          if (Math.abs(player.y - (b.y + barH / 2)) < playerR + barH / 2) {
            const insideGap =
              player.x > b.gapX - b.gapW / 2 + playerR * 0.4 &&
              player.x < b.gapX + b.gapW / 2 - playerR * 0.4;
            if (!insideGap) {
              host.shake(12);
              host.particles.burst(player.x, player.y, THEME.danger, 14);
              host.fail('You hit a wall');
              return;
            }
          }
        }
        if (dist(player.x, player.y, exit.x, exit.y) < exit.r) {
          host.particles.burst(exit.x, exit.y, THEME.success, 20);
          host.win();
        }
        if (dragging) host.particles.trail(player.x, player.y, THEME.primary, 1);
      },
      render(g) {
        glow(g, exit.x, exit.y, exit.r * 2, THEME.success, 0.32);
        ring(g, exit.x, exit.y, exit.r, THEME.success, 4);
        text(g, 'EXIT', exit.x, exit.y, 18, THEME.success, 'center', 900);
        for (const b of bars) {
          const leftW = b.gapX - b.gapW / 2;
          fillRoundRect(g, 0, b.y, Math.max(0, leftW), barH, 6, THEME.danger);
          const rightX = b.gapX + b.gapW / 2;
          fillRoundRect(g, rightX, b.y, Math.max(0, host.width - rightX), barH, 6, THEME.danger);
        }
        glow(g, player.x, player.y, playerR * 3, THEME.primary, 0.3);
        circle(g, player.x, player.y, playerR, THEME.primary);
      },
      onDown(p) {
        dragging = true;
        player.x = clamp(p.x, playerR, host.width - playerR);
        player.y = clamp(p.y, playerR, host.height - playerR);
      },
      onMove(p) {
        if (!dragging) return;
        player.x = clamp(p.x, playerR, host.width - playerR);
        player.y = clamp(p.y, playerR, host.height - playerR);
      },
      onUp() {
        dragging = false;
      },
    } satisfies Challenge;
  },
};

/** 24. AVOID - collect the gold orb, touch nothing else. */
export const avoid: ChallengeDef = {
  id: 'avoid',
  title: 'AVOID',
  instruction: 'Collect gold, avoid the rest',
  tags: ['drag', 'avoid'],
  create(params, host) {
    const playerR = clamp(17 * params.targetSize, 10, 19);
    const player = { x: host.width / 2, y: host.height - 80 };
    const hazardCount = scaleInt(params, 4, 12);
    const hazardR = clamp(scale(params, 24, 17), 12, 26);
    const hazards = Array.from({ length: hazardCount }, () => {
      const a = params.rng.range(0, Math.PI * 2);
      const s = scale(params, 90, 260) * params.rng.range(0.7, 1.3);
      // Keep the spawn clear of the player's starting spot: no instant losses.
      let x = 0;
      let y = 0;
      for (let attempt = 0; attempt < 20; attempt++) {
        x = params.rng.range(hazardR, host.width - hazardR);
        y = params.rng.range(hazardR, host.height * 0.75);
        if (dist(x, y, player.x, player.y) > 140) break;
      }
      return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s };
    });
    const collectNeeded = scaleInt(params, 1, 3);
    let collected = 0;
    const gold = {
      x: params.rng.range(60, host.width - 60),
      y: params.rng.range(60, host.height * 0.5),
      r: clamp(26 * params.targetSize, 16, 28),
    };

    return {
      timeLimit: scaleTime(params, 8, 7, 5) + collectNeeded,
      enter() {
        host.setInstruction(
          collectNeeded > 1 ? `Collect ${collectNeeded} gold orbs` : 'Collect the gold orb',
        );
        host.setProgress(0);
      },
      update(dt) {
        for (const h of hazards) {
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          if (h.x < hazardR || h.x > host.width - hazardR) {
            h.vx *= -1;
            h.x = clamp(h.x, hazardR, host.width - hazardR);
          }
          if (h.y < hazardR || h.y > host.height - hazardR) {
            h.vy *= -1;
            h.y = clamp(h.y, hazardR, host.height - hazardR);
          }
          if (dist(h.x, h.y, player.x, player.y) < hazardR + playerR - 2) {
            host.shake(14);
            host.particles.burst(player.x, player.y, THEME.danger, 16);
            host.fail('You touched a red orb');
            return;
          }
        }
        if (dist(gold.x, gold.y, player.x, player.y) < gold.r + playerR) {
          collected += 1;
          host.sound('coin');
          host.haptic('light');
          host.particles.burst(gold.x, gold.y, THEME.accent, 16);
          host.setProgress(collected / collectNeeded);
          if (collected >= collectNeeded) {
            host.win();
            return;
          }
          gold.x = params.rng.range(60, host.width - 60);
          gold.y = params.rng.range(60, host.height * 0.7);
        }
      },
      render(g) {
        glow(g, gold.x, gold.y, gold.r * 2.4, THEME.accent, 0.35);
        circle(g, gold.x, gold.y, gold.r, THEME.accent);
        for (const h of hazards) {
          circle(g, h.x, h.y, hazardR, THEME.danger);
          circle(g, h.x - hazardR * 0.3, h.y - hazardR * 0.3, hazardR * 0.22, withAlpha('#FFFFFF', 0.25));
        }
        circle(g, player.x, player.y, playerR, THEME.primary);
        ring(g, player.x, player.y, playerR + 5, withAlpha(THEME.primary, 0.35), 2);
      },
      onDown(p) {
        player.x = clamp(p.x, playerR, host.width - playerR);
        player.y = clamp(p.y, playerR, host.height - playerR);
      },
      onMove(p) {
        player.x = clamp(p.x, playerR, host.width - playerR);
        player.y = clamp(p.y, playerR, host.height - playerR);
      },
    } satisfies Challenge;
  },
};

export const MOTION_CHALLENGES: ChallengeDef[] = [dodge, follow, movingTarget, escape, avoid];
