import type { Ctx } from './draw';
import { withAlpha } from './draw';

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  spin: number;
  angle: number;
  square: boolean;
}

/**
 * Fixed-size pooled particle system: no allocation during play, which keeps
 * frame times stable on low-end Android devices.
 */
export class Particles {
  private pool: Particle[] = [];
  private cursor = 0;

  constructor(capacity = 160) {
    for (let i = 0; i < capacity; i++) {
      this.pool.push({
        alive: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#fff',
        gravity: 0,
        spin: 0,
        angle: 0,
        square: false,
      });
    }
  }

  private spawn(): Particle {
    // Round-robin over the pool: oldest particle is recycled when full.
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    return p;
  }

  burst(
    x: number,
    y: number,
    color: string,
    count = 12,
    opts: { speed?: number; size?: number; gravity?: number; life?: number; square?: boolean } = {},
  ): void {
    const speed = opts.speed ?? 220;
    const size = opts.size ?? 5;
    for (let i = 0; i < count; i++) {
      const p = this.spawn();
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.6;
      const s = speed * (0.45 + Math.random() * 0.75);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.maxLife = opts.life ?? 0.45 + Math.random() * 0.3;
      p.life = p.maxLife;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color;
      p.gravity = opts.gravity ?? 420;
      p.angle = Math.random() * Math.PI;
      p.spin = (Math.random() - 0.5) * 12;
      p.square = opts.square ?? true;
    }
  }

  /** Small directional puff, e.g. under a dragged player object. */
  trail(x: number, y: number, color: string, count = 2): void {
    for (let i = 0; i < count; i++) {
      const p = this.spawn();
      p.alive = true;
      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = (Math.random() - 0.5) * 40;
      p.vy = (Math.random() - 0.5) * 40;
      p.maxLife = 0.3;
      p.life = p.maxLife;
      p.size = 3 + Math.random() * 3;
      p.color = color;
      p.gravity = 0;
      p.angle = 0;
      p.spin = 0;
      p.square = false;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
  }

  render(g: Ctx): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      const t = p.life / p.maxLife;
      const color = withAlpha(p.color, Math.min(1, t * 1.4));
      if (p.square) {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.angle);
        g.fillStyle = color;
        const s = p.size * (0.4 + t * 0.6);
        g.fillRect(-s / 2, -s / 2, s, s);
        g.restore();
      } else {
        g.beginPath();
        g.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
        g.fillStyle = color;
        g.fill();
      }
    }
  }

  clear(): void {
    for (const p of this.pool) p.alive = false;
  }
}
