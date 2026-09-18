import { font, THEME } from './theme';

export type Ctx = CanvasRenderingContext2D;

export function roundRect(g: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export function fillRoundRect(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  roundRect(g, x, y, w, h, r);
  g.fillStyle = color;
  g.fill();
}

export function strokeRoundRect(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  width = 2,
): void {
  roundRect(g, x, y, w, h, r);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}

export function circle(g: Ctx, x: number, y: number, r: number, color: string): void {
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
}

export function ring(g: Ctx, x: number, y: number, r: number, color: string, width = 3): void {
  g.beginPath();
  g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}

/** Soft glow behind a shape. Cheap: a single radial gradient, no shadow blur. */
export function glow(g: Ctx, x: number, y: number, r: number, color: string, alpha = 0.35): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, withAlpha(color, alpha));
  grad.addColorStop(1, withAlpha(color, 0));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

export function text(
  g: Ctx,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string = THEME.ink,
  align: CanvasTextAlign = 'center',
  weight: 600 | 700 | 800 | 900 = 800,
): void {
  g.font = font(size, weight);
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(value, x, y);
}

/** Regular polygon; used for original geometric obstacle/target art. */
export function polygon(
  g: Ctx,
  x: number,
  y: number,
  r: number,
  sides: number,
  rotation: number,
  color: string,
): void {
  g.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const gr = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${gr}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Progress/meter bar used by hold, balance and timer visuals. */
export function meter(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  color: string,
  track = THEME.surface,
): void {
  fillRoundRect(g, x, y, w, h, h / 2, track);
  const clamped = Math.max(0, Math.min(1, value));
  if (clamped > 0) fillRoundRect(g, x, y, Math.max(h, w * clamped), h, h / 2, color);
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
