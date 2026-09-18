import {
  circle,
  clamp,
  dist,
  fillRoundRect,
  glow,
  ring,
  strokeRoundRect,
  text,
  withAlpha,
  type Ctx,
} from '../core/draw';
import { easeOutBack, easeOutCubic } from '../core/easing';
import type { Pointer } from '../core/stage';

/** Shared geometry for a tappable disc target. */
export interface Disc {
  x: number;
  y: number;
  r: number;
}

export function hitDisc(p: Pointer, d: Disc, slack = 8): boolean {
  return dist(p.x, p.y, d.x, d.y) <= d.r + slack;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function hitBox(p: Pointer, b: Box, slack = 4): boolean {
  return (
    p.x >= b.x - slack &&
    p.x <= b.x + b.w + slack &&
    p.y >= b.y - slack &&
    p.y <= b.y + b.h + slack
  );
}

/**
 * A round target with a bloom and a pop animation. Used by most tap-based
 * challenges so hit feedback feels identical everywhere.
 */
export function drawTarget(
  g: Ctx,
  d: Disc,
  color: string,
  opts: { label?: string; pop?: number; appear?: number; dim?: boolean } = {},
): void {
  const appear = clamp(opts.appear ?? 1, 0, 1);
  const scale = easeOutBack(appear) * (1 + (opts.pop ?? 0) * 0.18);
  const r = Math.max(1, d.r * scale);
  const alpha = opts.dim ? 0.4 : 1;

  glow(g, d.x, d.y, r * 2, color, 0.3 * alpha);
  circle(g, d.x, d.y, r, withAlpha(color, alpha));
  ring(g, d.x, d.y, r * 0.99, withAlpha('#FFFFFF', 0.25 * alpha), Math.max(2, r * 0.07));
  circle(g, d.x - r * 0.25, d.y - r * 0.3, r * 0.18, withAlpha('#FFFFFF', 0.3 * alpha));
  if (opts.label) {
    text(g, opts.label, d.x, d.y, Math.max(14, r * 0.8), '#0B0E1A', 'center', 900);
  }
}

/** Rounded rectangle "card" used for buttons, tiles and answer chips. */
export function drawTile(
  g: Ctx,
  b: Box,
  color: string,
  opts: { label?: string; labelColor?: string; radius?: number; pop?: number; alpha?: number } = {},
): void {
  const pop = opts.pop ?? 0;
  const inset = -pop * 4;
  const x = b.x + inset;
  const y = b.y + inset;
  const w = b.w - inset * 2;
  const h = b.h - inset * 2;
  const radius = opts.radius ?? Math.min(22, Math.min(w, h) * 0.28);
  const alpha = opts.alpha ?? 1;

  g.save();
  g.globalAlpha = alpha;
  // Subtle depth: a darker plate behind the face.
  fillRoundRect(g, x, y + 4, w, h, radius, withAlpha('#000000', 0.35));
  fillRoundRect(g, x, y, w, h, radius, color);
  strokeRoundRect(g, x, y, w, h, radius, withAlpha('#FFFFFF', 0.14), 2);
  if (opts.label) {
    text(
      g,
      opts.label,
      x + w / 2,
      y + h / 2,
      Math.min(h * 0.44, (w * 1.5) / Math.max(2, opts.label.length)),
      opts.labelColor ?? '#0B0E1A',
      'center',
      900,
    );
  }
  g.restore();
}

/** Lays out `count` tiles in a responsive grid inside the given area. */
export function gridLayout(
  area: Box,
  count: number,
  gap = 14,
  preferredCols?: number,
): { boxes: Box[]; cols: number; rows: number } {
  const cols = preferredCols ?? Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const w = (area.w - gap * (cols - 1)) / cols;
  const h = (area.h - gap * (rows - 1)) / rows;
  const boxes: Box[] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    boxes.push({ x: area.x + c * (w + gap), y: area.y + r * (h + gap), w, h });
  }
  return { boxes, cols, rows };
}

/** Playfield inset used by most challenges so nothing hugs the screen edge. */
export function safeArea(width: number, height: number, pad = 20): Box {
  return { x: pad, y: pad, w: width - pad * 2, h: height - pad * 2 };
}

/** Simple 0..1 timeline helper for intro/preview phases. */
export class Phase {
  t = 0;
  constructor(public duration: number) {}
  update(dt: number): boolean {
    this.t = Math.min(this.duration, this.t + dt);
    return this.done;
  }
  get done(): boolean {
    return this.t >= this.duration;
  }
  get progress(): number {
    return this.duration <= 0 ? 1 : clamp(this.t / this.duration, 0, 1);
  }
  get eased(): number {
    return easeOutCubic(this.progress);
  }
  reset(duration = this.duration): void {
    this.duration = duration;
    this.t = 0;
  }
}

/** Swipe recogniser shared by swipe-style challenges. */
export type SwipeDir = 'up' | 'down' | 'left' | 'right';

export function swipeDirection(
  from: { x: number; y: number },
  to: { x: number; y: number },
  minDistance = 40,
): SwipeDir | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) < minDistance) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export const ARROWS: Record<SwipeDir, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

/** Original geometric glyph set - used for memory pairs, sorting, sequences. */
export type SymbolKind = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hex' | 'cross';

export const SYMBOL_KINDS: SymbolKind[] = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'star',
  'hex',
  'cross',
];

export function drawSymbol(
  g: Ctx,
  kind: SymbolKind,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const r = size / 2;
  g.save();
  g.fillStyle = color;
  g.strokeStyle = color;
  switch (kind) {
    case 'circle':
      circle(g, x, y, r, color);
      break;
    case 'square':
      fillRoundRect(g, x - r, y - r, size, size, size * 0.2, color);
      break;
    case 'triangle':
      g.beginPath();
      g.moveTo(x, y - r);
      g.lineTo(x + r, y + r * 0.8);
      g.lineTo(x - r, y + r * 0.8);
      g.closePath();
      g.fill();
      break;
    case 'diamond':
      g.beginPath();
      g.moveTo(x, y - r);
      g.lineTo(x + r, y);
      g.lineTo(x, y + r);
      g.lineTo(x - r, y);
      g.closePath();
      g.fill();
      break;
    case 'star':
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const px = x + Math.cos(a) * rad;
        const py = y + Math.sin(a) * rad;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
      break;
    case 'hex':
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fill();
      break;
    case 'cross':
      g.lineWidth = size * 0.24;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - r * 0.7, y - r * 0.7);
      g.lineTo(x + r * 0.7, y + r * 0.7);
      g.moveTo(x + r * 0.7, y - r * 0.7);
      g.lineTo(x - r * 0.7, y + r * 0.7);
      g.stroke();
      break;
  }
  g.restore();
}
