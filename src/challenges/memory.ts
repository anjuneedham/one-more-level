import { clamp, meter, text, withAlpha } from '../core/draw';
import { NAMED_COLORS, THEME } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef } from '../game/types';
import {
  drawSymbol,
  drawTile,
  gridLayout,
  hitBox,
  safeArea,
  SYMBOL_KINDS,
  Phase,
  type SymbolKind,
} from './common';

/** 4. MEMORY - watch the pattern light up, then repeat it. */
export const memoryPattern: ChallengeDef = {
  id: 'memory',
  title: 'MEMORY',
  instruction: 'Repeat the pattern',
  tags: ['memory', 'puzzle'],
  create(params, host) {
    const cols = params.difficulty > 0.55 ? 3 : 2;
    const cells = cols * cols;
    const steps = scaleInt(params, 3, 7);
    const flashOn = scale(params, 0.46, 0.22);
    const flashOff = scale(params, 0.2, 0.09);
    const area = safeArea(host.width, host.height, 26);
    const size = Math.min(area.w, area.h * 0.9);
    const grid = gridLayout(
      { x: host.width / 2 - size / 2, y: host.height / 2 - size / 2, w: size, h: size },
      cells,
      14,
      cols,
    );
    const sequence = Array.from({ length: steps }, () => params.rng.int(0, cells - 1));

    let phase: 'show' | 'input' = 'show';
    let cursor = 0;
    let timer = 0;
    let lit = -1;
    let inputIndex = 0;
    let feedback = 0;
    let feedbackCell = -1;

    return {
      // The clock only starts mattering once the player may act; the preview
      // length is added on top so showing the pattern never eats their time.
      timeLimit: steps * (flashOn + flashOff) + scaleTime(params, 6, 4.5, 3) + steps * 0.4,
      enter() {
        host.setInstruction('Watch...');
        host.setProgress(0);
      },
      update(dt) {
        if (phase === 'show') {
          timer -= dt;
          if (timer <= 0) {
            if (lit >= 0) {
              lit = -1;
              timer = flashOff;
              if (cursor >= sequence.length) {
                phase = 'input';
                host.setInstruction(`Repeat ${steps} steps`);
              }
            } else if (cursor < sequence.length) {
              lit = sequence[cursor];
              cursor += 1;
              timer = flashOn;
              host.sound('tick');
            }
          }
        }
        feedback = Math.max(0, feedback - dt * 5);
      },
      render(g) {
        grid.boxes.forEach((b, i) => {
          const active = phase === 'show' && lit === i;
          const flash = feedbackCell === i ? feedback : 0;
          const color = active
            ? THEME.primary
            : flash > 0
              ? THEME.success
              : THEME.surfaceHi;
          drawTile(g, b, color, { pop: active ? 0.5 : flash * 0.4 });
        });
        if (phase === 'show') {
          text(g, 'WATCH', host.width / 2, grid.boxes[0].y - 34, 20, THEME.inkDim, 'center', 800);
        } else {
          text(
            g,
            `${inputIndex} / ${steps}`,
            host.width / 2,
            grid.boxes[0].y - 34,
            20,
            THEME.accent,
            'center',
            800,
          );
        }
      },
      onDown(p) {
        if (phase !== 'input') return;
        const index = grid.boxes.findIndex((b) => hitBox(p, b));
        if (index < 0) return;
        if (index !== sequence[inputIndex]) {
          host.fail('Wrong tile');
          return;
        }
        inputIndex += 1;
        feedback = 1;
        feedbackCell = index;
        host.sound('tick');
        host.haptic('light');
        host.setProgress(inputIndex / steps);
        host.particles.burst(p.x, p.y, THEME.success, 8, { speed: 130 });
        if (inputIndex >= sequence.length) host.win();
      },
    } satisfies Challenge;
  },
};

/** 8. COUNT - shapes flash up; how many were there? */
export const countObjects: ChallengeDef = {
  id: 'count',
  title: 'COUNT',
  instruction: 'How many appeared?',
  tags: ['memory', 'puzzle'],
  create(params, host) {
    const actual = scaleInt(params, 4, 13);
    const showTime = scale(params, 1.5, 0.7);
    const area = safeArea(host.width, host.height, 40);
    const radius = clamp(scale(params, 26, 15), 12, 30);
    // Distractor shapes of another colour only count if they match the prompt
    // colour at higher difficulty - added later so easy levels stay simple.
    const shapes = Array.from({ length: actual }, () => ({
      x: params.rng.range(area.x + radius, area.x + area.w - radius),
      y: params.rng.range(area.y + radius, area.y + area.h - radius),
      kind: params.rng.pick(SYMBOL_KINDS),
      rot: params.rng.range(0, Math.PI),
    }));
    const preview = new Phase(showTime);

    const optionCount = 4;
    const options = params.rng
      .shuffle([
        actual,
        ...Array.from({ length: optionCount - 1 }, (_, i) =>
          Math.max(1, actual + (params.rng.bool() ? 1 : -1) * (i + 1)),
        ),
      ])
      .filter((v, i, arr) => arr.indexOf(v) === i);
    while (options.length < optionCount) options.push(Math.max(1, actual + options.length));
    const boxes = gridLayout(
      { x: area.x, y: host.height * 0.55, w: area.w, h: host.height * 0.3 },
      options.length,
      14,
      2,
    ).boxes;

    let answering = false;

    return {
      timeLimit: showTime + scaleTime(params, 5, 3.5, 2.5),
      enter() {
        host.setInstruction('Count them!');
      },
      update(dt) {
        if (!answering && preview.update(dt)) {
          answering = true;
          host.setInstruction('How many?');
          host.sound('whoosh');
        }
      },
      render(g) {
        if (!answering) {
          for (const s of shapes) {
            drawSymbol(g, s.kind, s.x, s.y, radius * 2, THEME.cyan);
          }
          meter(
            g,
            host.width * 0.25,
            host.height - 40,
            host.width * 0.5,
            8,
            1 - preview.progress,
            THEME.cyan,
          );
        } else {
          text(g, 'HOW MANY?', host.width / 2, host.height * 0.4, 34, THEME.ink, 'center', 900);
          boxes.forEach((b, i) => drawTile(g, b, THEME.surfaceHi, {
            label: String(options[i]),
            labelColor: THEME.ink,
          }));
        }
      },
      onDown(p) {
        if (!answering) return;
        const index = boxes.findIndex((b) => hitBox(p, b));
        if (index < 0) return;
        if (options[index] === actual) {
          host.particles.burst(p.x, p.y, THEME.success, 12);
          host.win();
        } else {
          host.fail(`It was ${actual}`);
        }
      },
    } satisfies Challenge;
  },
};

/** 14. MATCH PAIRS - flip cards two at a time and clear the board. */
export const matchPairs: ChallengeDef = {
  id: 'match_pairs',
  title: 'MATCH PAIRS',
  instruction: 'Find the matching pairs',
  tags: ['memory', 'puzzle'],
  create(params, host) {
    const pairs = clamp(scaleInt(params, 2, 6), 2, SYMBOL_KINDS.length);
    const cards = pairs * 2;
    const cols = cards <= 6 ? 2 : cards <= 8 ? 2 : 3;
    const area = safeArea(host.width, host.height, 26);
    const boxes = gridLayout(area, cards, 12, cols).boxes;
    const kinds: SymbolKind[] = params.rng.shuffle(
      params.rng.shuffle(SYMBOL_KINDS).slice(0, pairs).flatMap((k) => [k, k]),
    );
    const colors = kinds.map((k) => NAMED_COLORS[SYMBOL_KINDS.indexOf(k) % NAMED_COLORS.length].hex);
    const revealed = kinds.map(() => false);
    const matched = kinds.map(() => false);
    // A short free preview of the whole board keeps it fair as it grows.
    const preview = new Phase(scale(params, 1.4, 0.6));
    let previewDone = false;
    let first = -1;
    let second = -1;
    let resolveTimer = 0;
    let found = 0;

    return {
      timeLimit: scaleTime(params, 10, 9, 6) + pairs * 1.6,
      enter() {
        host.setInstruction('Memorise...');
        host.setProgress(0);
      },
      update(dt) {
        if (!previewDone) {
          if (preview.update(dt)) {
            previewDone = true;
            host.setInstruction(`Find ${pairs} pairs`);
          }
          return;
        }
        if (resolveTimer > 0) {
          resolveTimer -= dt;
          if (resolveTimer <= 0) {
            if (first >= 0 && second >= 0 && kinds[first] === kinds[second]) {
              matched[first] = true;
              matched[second] = true;
              found += 1;
              host.setProgress(found / pairs);
              host.sound('coin');
              host.haptic('light');
              if (found >= pairs) host.win();
            } else {
              if (first >= 0) revealed[first] = false;
              if (second >= 0) revealed[second] = false;
              host.sound('whoosh');
            }
            first = -1;
            second = -1;
          }
        }
      },
      render(g) {
        boxes.forEach((b, i) => {
          const open = matched[i] || revealed[i] || !previewDone;
          drawTile(g, b, matched[i] ? withAlpha(THEME.success, 0.25) : THEME.surfaceHi, {
            alpha: matched[i] ? 0.55 : 1,
          });
          if (open) {
            drawSymbol(g, kinds[i], b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.5, colors[i]);
          } else {
            text(g, '?', b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.4, THEME.inkDim, 'center', 900);
          }
        });
      },
      onDown(p) {
        if (!previewDone || resolveTimer > 0) return;
        const index = boxes.findIndex((b) => hitBox(p, b));
        if (index < 0 || matched[index] || revealed[index]) return;
        revealed[index] = true;
        host.sound('tick');
        if (first < 0) {
          first = index;
        } else {
          second = index;
          resolveTimer = kinds[first] === kinds[second] ? 0.18 : 0.5;
        }
      },
    } satisfies Challenge;
  },
};

/** 19. REMEMBER COLOR - memorise a colour, then pick it out of a line-up. */
export const rememberColor: ChallengeDef = {
  id: 'remember_color',
  title: 'REMEMBER COLOR',
  instruction: 'Remember the colour',
  tags: ['memory'],
  create(params, host) {
    const optionCount = clamp(scaleInt(params, 3, 8), 3, NAMED_COLORS.length);
    const showTime = scale(params, 1.4, 0.65);
    // At higher levels you must remember two colours in order.
    const remembered = params.difficulty > 0.6 ? 2 : 1;
    const targets = params.rng.shuffle(NAMED_COLORS).slice(0, remembered);
    const others = NAMED_COLORS.filter((c) => !targets.includes(c));
    const options = params.rng.shuffle([
      ...targets,
      ...params.rng.shuffle(others).slice(0, Math.max(0, optionCount - remembered)),
    ]);
    const area = safeArea(host.width, host.height, 26);
    const boxes = gridLayout(
      { x: area.x, y: area.y + area.h * 0.28, w: area.w, h: area.h * 0.72 },
      options.length,
      12,
      options.length <= 4 ? 2 : 3,
    ).boxes;
    const preview = new Phase(showTime * remembered);
    let answering = false;
    let picked = 0;

    return {
      timeLimit: showTime * remembered + scaleTime(params, 5, 3.5, 2.5),
      enter() {
        host.setInstruction('Remember!');
      },
      update(dt) {
        if (!answering && preview.update(dt)) {
          answering = true;
          host.setInstruction(remembered > 1 ? 'Tap both, in order' : 'Which colour was it?');
          host.sound('whoosh');
        }
      },
      render(g) {
        if (!answering) {
          const index = Math.min(remembered - 1, Math.floor(preview.progress * remembered));
          const swatch = targets[index];
          const s = Math.min(host.width, host.height) * 0.42;
          drawTile(
            g,
            { x: host.width / 2 - s / 2, y: host.height / 2 - s / 2, w: s, h: s },
            swatch.hex,
            { radius: 32 },
          );
          if (remembered > 1) {
            text(
              g,
              `${index + 1} of ${remembered}`,
              host.width / 2,
              host.height / 2 + s * 0.72,
              18,
              THEME.inkDim,
              'center',
              700,
            );
          }
        } else {
          text(
            g,
            remembered > 1 ? `PICK #${picked + 1}` : 'WHICH ONE?',
            host.width / 2,
            area.y + 28,
            30,
            THEME.ink,
            'center',
            900,
          );
          boxes.forEach((b, i) => drawTile(g, b, options[i].hex));
        }
      },
      onDown(p) {
        if (!answering) return;
        const index = boxes.findIndex((b) => hitBox(p, b));
        if (index < 0) return;
        if (options[index] === targets[picked]) {
          picked += 1;
          host.sound('tick');
          host.haptic('light');
          host.particles.burst(p.x, p.y, options[index].hex, 10);
          host.setProgress(picked / remembered);
          if (picked >= remembered) host.win();
        } else {
          host.fail('Not that one');
        }
      },
    } satisfies Challenge;
  },
};

/** 11. SAFE TILE - one tile holds; the rest drop away. */
export const safeTile: ChallengeDef = {
  id: 'safe_tile',
  title: 'SAFE TILE',
  instruction: 'Pick the safe tile',
  tags: ['memory', 'puzzle'],
  create(params, host) {
    const count = clamp(scaleInt(params, 4, 9), 4, 9);
    const cols = count <= 4 ? 2 : 3;
    const area = safeArea(host.width, host.height, 26);
    const size = Math.min(area.w, area.h * 0.85);
    const grid = gridLayout(
      { x: host.width / 2 - size / 2, y: host.height / 2 - size / 2, w: size, h: size },
      count,
      12,
      cols,
    );
    const safeIndex = params.rng.int(0, count - 1);
    // The safe tile is shown, then hidden. Deeper levels shuffle the board
    // after the preview, so you have to track it as it moves.
    const order = grid.boxes.map((_, i) => i);
    const shuffleAfter = params.difficulty > 0.5;
    let displayOrder = order.slice();
    const preview = new Phase(scale(params, 1.2, 0.55));
    const shuffleAnim = new Phase(scale(params, 0.9, 0.45));
    let stage: 'preview' | 'shuffle' | 'pick' = 'preview';
    let pickedIndex = -1;
    let flash = 0;

    return {
      timeLimit: scaleTime(params, 7, 5.5, 4),
      enter() {
        host.setInstruction('Watch the safe tile');
      },
      update(dt) {
        flash = Math.max(0, flash - dt * 4);
        if (stage === 'preview' && preview.update(dt)) {
          if (shuffleAfter) {
            stage = 'shuffle';
            displayOrder = params.rng.shuffle(order);
            host.setInstruction('Follow it...');
            host.sound('whoosh');
          } else {
            stage = 'pick';
            host.setInstruction('Pick the safe tile');
          }
        } else if (stage === 'shuffle' && shuffleAnim.update(dt)) {
          stage = 'pick';
          host.setInstruction('Pick the safe tile');
        }
      },
      render(g) {
        grid.boxes.forEach((b, i) => {
          const logical = stage === 'preview' ? i : displayOrder[i];
          const isSafe = logical === safeIndex;
          const reveal = stage === 'preview' || (stage === 'shuffle' && shuffleAnim.progress < 0.4);
          const color =
            reveal && isSafe
              ? THEME.success
              : pickedIndex === i
                ? THEME.danger
                : THEME.surfaceHi;
          drawTile(g, b, color, { pop: reveal && isSafe ? 0.4 : flash * 0.2 });
          if (!reveal && stage !== 'preview') {
            text(g, '?', b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.35, THEME.inkDim, 'center', 900);
          }
        });
      },
      onDown(p) {
        if (stage !== 'pick') return;
        const index = grid.boxes.findIndex((b) => hitBox(p, b));
        if (index < 0) return;
        pickedIndex = index;
        flash = 1;
        if (displayOrder[index] === safeIndex) {
          host.particles.burst(p.x, p.y, THEME.success, 14);
          host.win();
        } else {
          host.fail('That one fell');
        }
      },
    } satisfies Challenge;
  },
};

export const MEMORY_CHALLENGES: ChallengeDef[] = [
  memoryPattern,
  countObjects,
  matchPairs,
  rememberColor,
  safeTile,
];
