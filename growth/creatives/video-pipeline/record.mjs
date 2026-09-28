// Records real One More Level gameplay with a frame-locked fake clock.
//   node record.mjs search --seeds 1-24 --concurrency 4
//   node record.mjs capture --seed 7 --out frames/
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
import { mkdirSync, writeFileSync } from 'fs';

const FPS = 30;
const STEP = 1000 / FPS;
const CSS_W = 405;
const CSS_H = 720;
const DPR = 1080 / CSS_W;
const URL = process.env.GAME_URL ?? 'http://localhost:4173/';

const NAMED = {
  BLUE: '#4D8BFF', RED: '#FF5E7A', GREEN: '#3DDC97', YELLOW: '#FFD166',
  PURPLE: '#B06BFF', ORANGE: '#FF9F45', CYAN: '#45E0E5', PINK: '#FF7BD5',
};
const PRIMARY = '#5B7BFF';

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

function initScript({ seed }) {
  // The fake clock's performance baseline carries a few ms of run-specific offset;
  // zero it at document start so every time source is identical across runs.
  const perf0 = performance.now();
  const origPerf = performance.now.bind(performance);
  performance.now = () => origPerf() - perf0;
  const origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => origRaf((ts) => cb(ts - perf0));
  // Run seeds come from Date.now(); the fake clock jitters by ~1ms between runs.
  const origDateNow = Date.now.bind(Date);
  Date.now = () => Math.floor(origDateNow() / 1000) * 1000;
  let s = seed >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Record every synthesised sound so the soundtrack can be rebuilt offline.
  window.__sfx = [];
  class Param {
    constructor() { this.value = 0; this.ev = []; }
    setValueAtTime(v, t) { this.value = v; this.ev.push(['set', v, t]); return this; }
    exponentialRampToValueAtTime(v, t) { this.ev.push(['exp', v, t]); return this; }
    linearRampToValueAtTime(v, t) { this.ev.push(['lin', v, t]); return this; }
  }
  class Node { connect(n) { return n; } disconnect() {} }
  class Osc extends Node {
    constructor() { super(); this.type = 'sine'; this.frequency = new Param(); }
    connect(n) { this.gainNode = n; return n; }
    start(t) { this.t0 = t; }
    stop(t) {
      window.__sfx.push({
        type: this.type, freq: this.frequency.value, start: this.t0, stop: t,
        gain: this.gainNode ? this.gainNode.gain.ev : [],
      });
    }
  }
  class Gain extends Node { constructor() { super(); this.gain = new Param(); } }
  class Ctx {
    constructor() { this.state = 'running'; this.destination = new Node(); }
    get currentTime() { return performance.now() / 1000; }
    createOscillator() { return new Osc(); }
    createGain() { return new Gain(); }
    resume() { return Promise.resolve(); }
  }
  window.AudioContext = Ctx;
  window.webkitAudioContext = Ctx;
}

// Runs in the page: reads game state and decides what the bot should do.
function probe({ named, primary }) {
  const q = (s) => document.querySelector(s);
  const active = q('.screen.is-active');
  const screen = active
    ? ['home', 'game', 'gameover', 'settings'].find((n) => active.classList.contains(`screen--${n}`)) ?? 'other'
    : 'none';
  const levelText = q('.screen--game .hud__value')?.textContent ?? '';
  const lives = document.querySelectorAll('.screen--game .life.is-on').length;
  const card = q('.screen--game .overlay .card');
  const cardKind = card ? (card.className.match(/card--(\w+)/)?.[1] ?? 'card') : '';
  const instruction = q('.instruction__text')?.textContent ?? '';
  const canvas = q('canvas.stage');
  const rect = canvas?.getBoundingClientRect();
  const state = {
    t: performance.now(), now: Date.now(), screen, level: Number(levelText) || 0, lives, cardKind, instruction,
    rect: rect ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height } : null,
  };
  if (screen !== 'game' || cardKind || !canvas) return { state, action: null };

  const hex = (hx) => [1, 3, 5].map((i) => parseInt(hx.slice(i, i + 2), 16));
  const find = (hx, tol = 42) => {
    const [r0, g0, b0] = hex(hx);
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    const cells = new Map();
    const stride = 5;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const k = (y * w + x) * 4;
        const d = Math.abs(data[k] - r0) + Math.abs(data[k + 1] - g0) + Math.abs(data[k + 2] - b0);
        if (d < tol) {
          const cx = x * rect.width / w;
          const cy = y * rect.height / h;
          const key = `${Math.floor(cx / 36)},${Math.floor(cy / 36)}`;
          const c = cells.get(key) ?? { n: 0, sx: 0, sy: 0 };
          c.n++; c.sx += cx; c.sy += cy;
          cells.set(key, c);
        }
      }
    }
    const list = [...cells.values()].filter((c) => c.n >= 4).sort((a, b) => b.n - a.n);
    return list.map((c) => ({ x: rect.left + c.sx / c.n, y: rect.top + c.sy / c.n, n: c.n }));
  };

  const ins = instruction.toUpperCase();
  let action = { kind: 'random' };
  if (/HANDS OFF|DO NOT|WAIT FOR IT/.test(ins)) action = { kind: 'idle' };
  else if (/^GO!/.test(ins)) action = { kind: 'tap', x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  else {
    const color = Object.keys(named).find((n) => ins.includes(`TAP ${n}`));
    let hits = [];
    if (color) hits = find(named[color]);
    else if (/BLUE ORBS/.test(ins)) hits = find(named.BLUE, 60);
    else if (/HIT IT|HIT THE TARGET/.test(ins)) hits = find('#FFD166', 50);
    else if (/TAP 1 TO/.test(ins)) hits = find(primary, 30);
    else if (/TARGET|KEEP YOUR FINGER/.test(ins)) hits = find(primary, 60);
    if (hits.length) {
      const pick = /BLUE ORBS|TAP /.test(ins) && !/TARGET/.test(ins)
        ? hits[Math.floor(Math.random() * Math.min(hits.length, 3))]
        : hits[0];
      action = { kind: /KEEP YOUR FINGER/.test(ins) ? 'hold' : 'tap', x: pick.x, y: pick.y };
    }
  }
  return { state, action };
}

async function runSession(browser, seed, { capture = false, outDir = null, maxSec = 75, tailSec = 3.2 } = {}) {
  const context = await browser.newContext({
    viewport: { width: CSS_W, height: CSS_H },
    deviceScaleFactor: DPR,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const t0 = Date.UTC(2026, 0, 1) + seed * 7919;
  await page.clock.install({ time: new Date(t0) });
  // The installed clock otherwise keeps ticking in real time; freeze it so only runFor moves it.
  await page.clock.pauseAt(new Date(t0 + 1000));
  await page.addInitScript(initScript, { seed });
  await page.goto(URL, { waitUntil: 'load' });

  const frames = [];
  let botRand = seed * 2654435761 >>> 0;
  const rnd = () => { botRand = (botRand * 1664525 + 1013904223) >>> 0; return botRand / 4294967296; };
  const queue = [];
  let holding = false;
  let failSince = -1;
  let overSince = -1;
  let maxLevel = 0;
  let wins = 0;
  let prevLevel = 0;

  const HOME_FRAMES = Math.round(1.2 * FPS);
  for (let i = 0; i < maxSec * FPS; i++) {
    const { state, action } = await page.evaluate(probe, { named: NAMED, primary: PRIMARY });
    state.i = i;
    frames.push(state);
    if (state.screen === 'game') {
      if (state.level > prevLevel && prevLevel > 0) wins++;
      prevLevel = Math.max(prevLevel, state.level);
      maxLevel = Math.max(maxLevel, state.level);
    }

    if (i === HOME_FRAMES) {
      await page.getByRole('button', { name: 'PLAY' }).click();
    } else if (state.cardKind === 'fail') {
      if (holding) { await page.mouse.up(); holding = false; }
      queue.length = 0;
      if (failSince < 0) failSince = i;
      if (i - failSince > 0.9 * FPS) {
        await page.locator('.card--fail .btn').click().catch(() => {});
        failSince = -1;
      }
    } else if (state.screen === 'gameover') {
      if (overSince < 0) overSince = i;
      if (i - overSince > tailSec * FPS) break;
    } else if (state.screen === 'game') {
      failSince = -1;
      if (queue.length) {
        const op = queue.shift();
        if (op[0] === 'down') await page.mouse.down();
        else if (op[0] === 'up') await page.mouse.up();
        else await page.mouse.move(op[1], op[2]);
      } else if (action && i % 3 === 0) {
        if (action.kind === 'tap') {
          queue.push(['move', action.x, action.y], ['down'], ['up']);
        } else if (action.kind === 'hold') {
          if (!holding) { queue.push(['move', action.x, action.y], ['down']); holding = true; }
          else queue.push(['move', action.x, action.y]);
        } else if (action.kind === 'random' && state.rect) {
          const r = state.rect;
          const x = r.x + 20 + rnd() * (r.w - 40);
          const y = r.y + 20 + rnd() * (r.h - 40);
          if (rnd() < 0.6) queue.push(['move', x, y], ['down'], ['up']);
          else {
            const x2 = Math.min(r.x + r.w - 10, Math.max(r.x + 10, x + (rnd() - 0.5) * 220));
            const y2 = Math.min(r.y + r.h - 10, Math.max(r.y + 10, y + (rnd() - 0.5) * 220));
            queue.push(['move', x, y], ['down']);
            for (let k = 1; k <= 5; k++) queue.push(['move', x + ((x2 - x) * k) / 5, y + ((y2 - y) * k) / 5]);
            queue.push(['up']);
          }
        }
      }
      if (holding && (!action || action.kind !== 'hold') && !queue.length) { await page.mouse.up(); holding = false; }
    }

    if (capture) {
      await page.screenshot({ path: `${outDir}/f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    }
    await page.clock.runFor(STEP);
  }
  const sfx = await page.evaluate(() => window.__sfx);
  await context.close();
  return { seed, maxLevel, wins, frames, sfx, seconds: frames.length / FPS };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});

if (mode === 'search') {
  const [a, b] = opt('seeds', '1-12').split('-').map(Number);
  const conc = Number(opt('concurrency', 4));
  const seeds = [];
  for (let s = a; s <= b; s++) seeds.push(s);
  const results = [];
  while (seeds.length) {
    const batch = seeds.splice(0, conc);
    const out = await Promise.all(batch.map((s) => runSession(browser, s)));
    for (const r of out) {
      const ev = [];
      let lastIns = '', prevCard = '';
      for (const f of r.frames) {
        if (f.screen === 'game' && !f.cardKind && f.instruction) lastIns = f.instruction;
        if (f.cardKind !== prevCard && (f.cardKind === 'success' || f.cardKind === 'fail')) ev.push(`L${f.level}:${f.cardKind === 'success' ? 'WIN' : 'FAIL'}[${lastIns}]`);
        prevCard = f.cardKind;
      }
      console.log(`seed ${r.seed}: maxLevel ${r.maxLevel}, wins ${r.wins}, ${r.seconds.toFixed(1)}s  ${ev.join(' ')}`);
      results.push({ seed: r.seed, maxLevel: r.maxLevel, wins: r.wins, seconds: r.seconds });
    }
  }
  writeFileSync(opt('out', 'search.json'), JSON.stringify(results, null, 2));
} else if (mode === 'capture') {
  const seed = Number(opt('seed', 1));
  const outDir = opt('out', 'frames');
  mkdirSync(outDir, { recursive: true });
  const r = await runSession(browser, seed, { capture: true, outDir, maxSec: Number(opt('max', 75)) });
  writeFileSync(`${outDir}/meta.json`, JSON.stringify({ seed, fps: FPS, frames: r.frames, sfx: r.sfx }, null, 1));
  console.log(`captured seed ${seed}: ${r.frames.length} frames, maxLevel ${r.maxLevel}, wins ${r.wins}, sfx ${r.sfx.length}`);
}
await browser.close();
