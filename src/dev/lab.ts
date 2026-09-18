/**
 * Challenge Lab - development-only harness (`npm run dev` -> /lab.html).
 *
 * Runs any single mini-challenge at any level so designers and QA can tune a
 * mechanic without playing a whole run. It is not part of the production
 * bundle: only index.html is built.
 */
import { Particles } from '../core/particles';
import { Rng } from '../core/rng';
import { Stage } from '../core/stage';
import { THEME } from '../core/theme';
import { paramsForLevel } from '../game/difficulty';
import { CHALLENGES } from '../game/registry';
import type { Challenge, ChallengeDef, ChallengeHost } from '../game/types';
import '../styles.css';

const root = document.getElementById('lab');
if (!root) throw new Error('#lab is missing');

root.innerHTML = `
  <div class="lab">
    <div class="lab__bar">
      <select id="lab-challenge"></select>
      <label>Level <input id="lab-level" type="number" min="1" max="60" value="1" /></label>
      <button id="lab-run" type="button">Run</button>
      <span id="lab-status">ready</span>
    </div>
    <div class="lab__stage" id="lab-stage"></div>
    <div class="lab__info" id="lab-info"></div>
  </div>`;

const style = document.createElement('style');
style.textContent = `
  .lab { display: flex; flex-direction: column; height: 100dvh; padding: 10px; gap: 8px; }
  .lab__bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; color: #f2f5ff; font: 600 13px system-ui; }
  .lab__bar select, .lab__bar input, .lab__bar button { font: inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid #263056; background: #1b2240; color: #f2f5ff; }
  .lab__stage { position: relative; flex: 1; border-radius: 20px; overflow: hidden; background: #141a2e; }
  .lab__info { color: #8e97bd; font: 600 13px system-ui; min-height: 20px; }
`;
document.head.append(style);

const select = document.getElementById('lab-challenge') as HTMLSelectElement;
const levelInput = document.getElementById('lab-level') as HTMLInputElement;
const runBtn = document.getElementById('lab-run') as HTMLButtonElement;
const statusEl = document.getElementById('lab-status') as HTMLElement;
const infoEl = document.getElementById('lab-info') as HTMLElement;
const stageHost = document.getElementById('lab-stage') as HTMLElement;

for (const def of CHALLENGES) {
  const option = document.createElement('option');
  option.value = def.id;
  option.textContent = `${def.title} (${def.id})`;
  select.append(option);
}

const stage = new Stage(stageHost);
const particles = new Particles(160);
let challenge: Challenge | null = null;
let remaining = 0;
let limit = 0;
let finished = false;

function makeHost(): ChallengeHost {
  return {
    get width() {
      return stage.width;
    },
    get height() {
      return stage.height;
    },
    particles,
    win: () => end('WIN'),
    fail: (reason) => end(`FAIL${reason ? ` - ${reason}` : ''}`),
    sound: () => undefined,
    haptic: () => undefined,
    shake: (amount) => stage.shake(amount),
    setInstruction: (value) => {
      infoEl.textContent = value;
    },
    setProgress: () => undefined,
  };
}

function end(result: string): void {
  if (finished) return;
  finished = true;
  statusEl.textContent = result;
  stage.setHandlers(null);
}

function run(def: ChallengeDef, level: number): void {
  const params = paramsForLevel(level, new Rng());
  const host = makeHost();
  particles.clear();
  challenge = def.create(params, host);
  limit = Math.max(1.5, challenge.timeLimit ?? params.timer);
  remaining = limit;
  finished = false;
  statusEl.textContent = 'running';
  infoEl.textContent = def.instruction;
  challenge.enter?.();
  stage.setHandlers({
    onDown: (p) => challenge?.onDown?.(p),
    onMove: (p) => challenge?.onMove?.(p),
    onUp: (p) => challenge?.onUp?.(p),
  });
  stage.invalidateSize();
}

stage.start((dt) => {
  const g = stage.g;
  g.fillStyle = THEME.bgSoft;
  g.fillRect(0, 0, stage.width, stage.height);
  if (challenge) {
    if (!finished) {
      challenge.update(dt);
      const onTimeout = challenge.onTimeout ?? 'fail';
      if (onTimeout !== 'ignore') {
        remaining = Math.max(0, remaining - dt);
        if (remaining <= 0) end(onTimeout === 'win' ? 'WIN (timeout)' : 'FAIL (timeout)');
      }
    }
    challenge.render(g);
  }
  particles.update(dt);
  particles.render(g);
});

runBtn.addEventListener('click', () => {
  const def = CHALLENGES.find((c) => c.id === select.value);
  if (def) run(def, Number(levelInput.value) || 1);
});

// Exposed for automated smoke tests.
(window as unknown as Record<string, unknown>).__lab = {
  ids: CHALLENGES.map((c) => c.id),
  run: (id: string, level: number) => {
    const def = CHALLENGES.find((c) => c.id === id);
    if (!def) throw new Error(`unknown challenge ${id}`);
    select.value = id;
    levelInput.value = String(level);
    run(def, level);
  },
  status: () => statusEl.textContent,
  timeLeft: () => remaining,
};

run(CHALLENGES[0], 1);
