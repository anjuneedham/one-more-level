import type { Ctx } from './draw';

export interface Pointer {
  id: number;
  x: number;
  y: number;
}

export interface PointerHandlers {
  onDown?(p: Pointer): void;
  onMove?(p: Pointer): void;
  onUp?(p: Pointer): void;
}

/**
 * Owns the canvas, the device-pixel-ratio sizing, the render loop and the
 * pointer plumbing. Everything above it works in CSS pixels.
 */
export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly g: Ctx;
  width = 0;
  height = 0;
  dpr = 1;

  private handlers: PointerHandlers | null = null;
  private frame: ((dt: number, time: number) => void) | null = null;
  private rafId = 0;
  private last = 0;
  private time = 0;
  private shakeAmount = 0;
  private running = false;
  private activePointers = new Set<number>();

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'stage';
    const g = this.canvas.getContext('2d', { alpha: false });
    if (!g) throw new Error('Canvas 2D is not available');
    this.g = g;
    parent.appendChild(this.canvas);

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);

    this.canvas.addEventListener('pointerdown', this.handleDown);
    this.canvas.addEventListener('pointermove', this.handleMove);
    window.addEventListener('pointerup', this.handleUp);
    window.addEventListener('pointercancel', this.handleUp);
    // Stops iOS/Android from turning taps into scroll, zoom or text selection.
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setHandlers(handlers: PointerHandlers | null): void {
    this.handlers = handlers;
    this.activePointers.clear();
  }

  /** Number of fingers currently down on the stage. */
  get pointerCount(): number {
    return this.activePointers.size;
  }

  private toLocal(e: PointerEvent): Pointer {
    const rect = this.canvas.getBoundingClientRect();
    return { id: e.pointerId, x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private handleDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.activePointers.add(e.pointerId);
    this.handlers?.onDown?.(this.toLocal(e));
  };

  private handleMove = (e: PointerEvent): void => {
    if (!this.handlers?.onMove) return;
    e.preventDefault();
    this.handlers.onMove(this.toLocal(e));
  };

  private handleUp = (e: PointerEvent): void => {
    if (!this.activePointers.delete(e.pointerId)) return;
    this.handlers?.onUp?.(this.toLocal(e));
  };

  private resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    // Cap DPR: 3x on a budget phone costs a lot of fill rate for no visible gain.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  };

  /** Re-measure after the canvas becomes visible or its container changes. */
  invalidateSize(): void {
    this.resize();
  }

  start(frame: (dt: number, time: number) => void): void {
    this.frame = frame;
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    this.frame = null;
    cancelAnimationFrame(this.rafId);
  }

  shake(amount: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);
    // Clamp dt so a backgrounded tab or a GC hitch cannot teleport objects.
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;

    const g = this.g;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.shakeAmount > 0.1) {
      const a = this.shakeAmount;
      g.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
      this.shakeAmount *= Math.pow(0.001, dt); // fast exponential decay
    } else {
      this.shakeAmount = 0;
    }

    this.frame?.(dt, this.time);
  };

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('orientationchange', this.resize);
    window.removeEventListener('pointerup', this.handleUp);
    window.removeEventListener('pointercancel', this.handleUp);
    this.canvas.remove();
  }
}
