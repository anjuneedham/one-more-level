import { Audio } from '../services/audio';
import { Haptics } from '../services/haptics';

type Attrs = Record<string, string | number | boolean | undefined>;

/** Minimal element factory - keeps the UI declarative without a framework. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key === 'text') el.textContent = String(value);
    else el.setAttribute(key, String(value));
  }
  for (const child of children) {
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** A game button: click sound, haptic tap and a press animation for free. */
export function button(
  label: string,
  onClick: () => void,
  opts: { variant?: 'primary' | 'ghost' | 'accent' | 'danger'; icon?: string; class?: string } = {},
): HTMLButtonElement {
  const el = h('button', {
    class: `btn btn--${opts.variant ?? 'primary'} ${opts.class ?? ''}`.trim(),
    type: 'button',
  });
  if (opts.icon) el.append(h('span', { class: 'btn__icon', text: opts.icon }));
  el.append(h('span', { class: 'btn__label', text: label }));
  el.addEventListener('click', (e) => {
    e.preventDefault();
    Audio.play('click');
    Haptics.fire('light');
    onClick();
  });
  return el;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/** Counts a number element up to `to` over `duration` ms. */
export function countUp(el: HTMLElement, to: number, duration = 500): void {
  const from = Number(el.dataset.value ?? 0);
  el.dataset.value = String(to);
  if (from === to) {
    el.textContent = formatNumber(to);
    return;
  }
  const start = performance.now();
  const step = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = formatNumber(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Restarts a CSS animation on an element. */
export function replayAnimation(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  void el.offsetWidth; // force reflow so the animation can restart
  el.classList.add(className);
}
