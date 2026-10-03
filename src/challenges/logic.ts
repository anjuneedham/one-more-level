import { text } from '../core/draw';
import { THEME, NAMED_COLORS } from '../core/theme';
import { scale, scaleInt, scaleTime } from '../game/difficulty';
import type { Challenge, ChallengeDef, ChallengeParams } from '../game/types';
import { drawSymbol, drawTile, gridLayout, hitBox, safeArea, SYMBOL_KINDS, type Box } from './common';

/** A tile that pops when tapped; shared by the answer-picking challenges. */
interface Choice {
  box: Box;
  pop: number;
}

function decay(choices: Choice[], dt: number): void {
  for (const c of choices) c.pop = Math.max(0, c.pop - dt * 6);
}

/** 31. ODD ONE OUT - every tile matches but one. */
export const oddOneOut: ChallengeDef = {
  id: 'odd_one',
  title: 'ODD ONE OUT',
  instruction: 'Find the one that is different',
  tags: ['puzzle'],
  minLevel: 2,
  create(params, host) {
    const rounds = scaleInt(params, 1, 3);
    const count = Math.min(25, scaleInt(params, 9, 25));
    const cols = Math.round(Math.sqrt(count));
    const area = safeArea(host.width, host.height, 22);
    const boxes = gridLayout(area, cols * Math.ceil(count / cols), 10, cols).boxes;
    let round = 0;
    let odd = 0;
    let base = { kind: SYMBOL_KINDS[0], color: THEME.primary as string, size: 1 };
    let other = { ...base };

    const deal = (): void => {
      odd = params.rng.int(0, boxes.length - 1);
      const kinds = params.rng.shuffle(SYMBOL_KINDS);
      const colors = params.rng.shuffle(NAMED_COLORS);
      base = { kind: kinds[0], color: colors[0].hex, size: 1 };
      // Easy rounds differ by shape, then by colour, then only by size.
      if (params.difficulty < 0.35) other = { ...base, kind: kinds[1] };
      else if (params.difficulty < 0.75) other = { ...base, color: colors[1].hex };
      else other = { ...base, size: scale(params, 0.74, 0.82) };
      host.setProgress(round / rounds);
    };
    deal();

    return {
      timeLimit: scaleTime(params, 5, 3.6, 3) * rounds,
      update() {},
      render(g) {
        boxes.forEach((b, i) => {
          const s = i === odd ? other : base;
          const size = Math.min(b.w, b.h) * 0.62 * s.size;
          drawSymbol(g, s.kind, b.x + b.w / 2, b.y + b.h / 2, size, s.color);
        });
      },
      onDown(p) {
        const i = boxes.findIndex((b) => hitBox(p, b, 0));
        if (i < 0) return;
        if (i !== odd) {
          host.fail('Not that one');
          return;
        }
        round += 1;
        host.sound('tick');
        host.haptic('light');
        host.particles.burst(p.x, p.y, THEME.success, 10);
        if (round >= rounds) host.win();
        else deal();
      },
    } satisfies Challenge;
  },
};

function expression(params: ChallengeParams): { label: string; value: number } {
  const rng = params.rng;
  if (params.difficulty < 0.4) {
    const v = rng.int(2, 99);
    return { label: String(v), value: v };
  }
  if (rng.bool()) {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    return { label: `${a} × ${b}`, value: a * b };
  }
  const a = rng.int(5, 60);
  const b = rng.int(5, 40);
  return { label: `${a} + ${b}`, value: a + b };
}

/** 32. BIGGER - two values; tap the larger, fast. */
export const bigger: ChallengeDef = {
  id: 'bigger',
  title: 'BIGGER',
  instruction: 'Tap the bigger number',
  tags: ['puzzle', 'reflex'],
  minLevel: 2,
  create(params, host) {
    const rounds = scaleInt(params, 3, 6);
    const area = safeArea(host.width, host.height, 24);
    const tileH = Math.min(area.h * 0.5, area.w * 0.6);
    const top = area.y + (area.h - tileH) / 2;
    const choices: Choice[] = [
      { box: { x: area.x, y: top, w: area.w / 2 - 8, h: tileH }, pop: 0 },
      { box: { x: area.x + area.w / 2 + 8, y: top, w: area.w / 2 - 8, h: tileH }, pop: 0 },
    ];
    let pair = [expression(params), expression(params)];
    let round = 0;

    const deal = (): void => {
      do {
        pair = [expression(params), expression(params)];
      } while (pair[0].value === pair[1].value);
      host.setProgress(round / rounds);
    };
    deal();

    return {
      timeLimit: scaleTime(params, 1.7, 1.15, 1) * rounds + 0.6,
      update(dt) {
        decay(choices, dt);
      },
      render(g) {
        choices.forEach((c, i) =>
          drawTile(g, c.box, i === 0 ? THEME.primary : THEME.violet, { label: pair[i].label, pop: c.pop, labelColor: THEME.bg }),
        );
      },
      onDown(p) {
        const i = choices.findIndex((c) => hitBox(p, c.box));
        if (i < 0) return;
        choices[i].pop = 1;
        if (pair[i].value < pair[1 - i].value) {
          host.fail(`${pair[1 - i].label} was bigger`);
          return;
        }
        round += 1;
        host.sound('tick');
        host.haptic('light');
        if (round >= rounds) host.win();
        else deal();
      },
    } satisfies Challenge;
  },
};

/** 33. TRUE OR FALSE - judge the sum before the clock does. */
export const trueOrFalse: ChallengeDef = {
  id: 'true_false',
  title: 'TRUE OR FALSE',
  instruction: 'Is it right?',
  tags: ['puzzle'],
  minLevel: 5,
  create(params, host) {
    const rounds = scaleInt(params, 3, 5);
    const area = safeArea(host.width, host.height, 24);
    const btnH = Math.min(110, area.h * 0.26);
    const choices: Choice[] = [
      { box: { x: area.x, y: area.y + area.h - btnH, w: area.w / 2 - 8, h: btnH }, pop: 0 },
      { box: { x: area.x + area.w / 2 + 8, y: area.y + area.h - btnH, w: area.w / 2 - 8, h: btnH }, pop: 0 },
    ];
    let statement = '';
    let truth = true;
    let round = 0;

    const deal = (): void => {
      const rng = params.rng;
      const op = params.difficulty < 0.4 ? '+' : rng.pick(['+', '−', '×']);
      let a = rng.int(2, op === '×' ? 9 : 30);
      let b = rng.int(2, op === '×' ? 9 : 30);
      if (op === '−' && b > a) [a, b] = [b, a];
      const answer = op === '+' ? a + b : op === '−' ? a - b : a * b;
      truth = rng.bool();
      const shown = truth ? answer : answer + rng.sign() * rng.int(1, op === '×' ? 4 : 2);
      statement = `${a} ${op} ${b} = ${shown}`;
      host.setProgress(round / rounds);
    };
    deal();

    return {
      timeLimit: scaleTime(params, 2.6, 1.7, 1.4) * rounds + 0.6,
      update(dt) {
        decay(choices, dt);
      },
      render(g) {
        const size = Math.min(54, (host.width * 1.6) / Math.max(6, statement.length));
        text(g, statement, host.width / 2, area.y + (area.h - btnH) / 2, size, THEME.ink, 'center', 900);
        drawTile(g, choices[0].box, THEME.success, { label: 'TRUE', pop: choices[0].pop });
        drawTile(g, choices[1].box, THEME.danger, { label: 'FALSE', pop: choices[1].pop });
      },
      onDown(p) {
        const i = choices.findIndex((c) => hitBox(p, c.box));
        if (i < 0) return;
        choices[i].pop = 1;
        if ((i === 0) !== truth) {
          host.fail(truth ? 'It was true' : 'It was false');
          return;
        }
        round += 1;
        host.sound('tick');
        host.haptic('light');
        if (round >= rounds) host.win();
        else deal();
      },
    } satisfies Challenge;
  },
};

/** 34. WHAT'S NEXT? - spot the rule and finish the sequence. */
export const whatsNext: ChallengeDef = {
  id: 'whats_next',
  title: "WHAT'S NEXT?",
  instruction: 'Finish the pattern',
  tags: ['puzzle'],
  minLevel: 12,
  create(params, host) {
    const rng = params.rng;
    const kind = params.difficulty < 0.6 ? rng.pick(['add', 'add', 'double']) : rng.pick(['add', 'double', 'alternate', 'square']);
    let terms: number[];
    if (kind === 'double') {
      const s = rng.int(1, 6);
      terms = [s, s * 2, s * 4, s * 8, s * 16];
    } else if (kind === 'square') {
      const s = rng.int(1, 5);
      terms = [0, 1, 2, 3, 4].map((k) => (s + k) * (s + k));
    } else if (kind === 'alternate') {
      const s = rng.int(1, 9);
      const a = rng.int(2, 6);
      const b = rng.int(1, 3);
      terms = [s, s + a, s + a - b, s + 2 * a - b, s + 2 * a - 2 * b];
    } else {
      const s = rng.int(1, 20);
      const step = rng.int(2, 9) * (params.difficulty > 0.8 && rng.bool(0.4) ? -1 : 1);
      terms = [0, 1, 2, 3, 4].map((k) => s + step * k);
    }
    const answer = terms[4];
    const options = new Set<number>([answer]);
    while (options.size < 4) options.add(answer + rng.sign() * rng.int(1, Math.max(3, Math.abs(terms[4] - terms[3]))));
    const values = rng.shuffle([...options]);
    const area = safeArea(host.width, host.height, 22);
    const gridTop = area.y + area.h * 0.42;
    const choices: Choice[] = gridLayout({ x: area.x, y: gridTop, w: area.w, h: area.y + area.h - gridTop }, 4, 12, 2).boxes.map(
      (box) => ({ box, pop: 0 }),
    );

    return {
      timeLimit: scaleTime(params, 7, 5, 4),
      enter() {
        host.setInstruction('What comes next?');
      },
      update(dt) {
        decay(choices, dt);
      },
      render(g) {
        const label = `${terms.slice(0, 4).join(',  ')},  ?`;
        const size = Math.min(40, (host.width * 1.7) / label.length);
        text(g, label, host.width / 2, area.y + area.h * 0.2, size, THEME.ink, 'center', 900);
        choices.forEach((c, i) => drawTile(g, c.box, THEME.surfaceHi, { label: String(values[i]), labelColor: THEME.ink, pop: c.pop }));
      },
      onDown(p) {
        const i = choices.findIndex((c) => hitBox(p, c.box));
        if (i < 0) return;
        choices[i].pop = 1;
        if (values[i] === answer) {
          host.particles.burst(p.x, p.y, THEME.success, 14);
          host.win();
        } else host.fail(`It was ${answer}`);
      },
    } satisfies Challenge;
  },
};

/** 35. MAKE 10 - pick two numbers that add up to the target. */
export const makeTen: ChallengeDef = {
  id: 'make_ten',
  title: 'MAKE 10',
  instruction: 'Tap two that add up to the target',
  tags: ['puzzle'],
  minLevel: 10,
  create(params, host) {
    const rng = params.rng;
    const target = params.difficulty < 0.6 ? 10 : rng.pick([12, 15, 20]);
    const count = params.difficulty < 0.6 ? 6 : 9;
    const a = rng.int(1, target - 1);
    const values = [a, target - a];
    while (values.length < count) {
      const v = rng.int(1, target - 1);
      // Exactly one valid pair keeps the answer unambiguous.
      if (!values.some((x) => x + v === target) && v * 2 !== target) values.push(v);
    }
    const shuffled = rng.shuffle(values);
    const area = safeArea(host.width, host.height, 22);
    const gridTop = area.y + 70;
    const choices: Choice[] = gridLayout({ x: area.x, y: gridTop, w: area.w, h: area.h - 70 }, count, 12, 3).boxes.map((box) => ({
      box,
      pop: 0,
    }));
    let picked = -1;

    return {
      timeLimit: scaleTime(params, 7, 5, 4),
      enter() {
        host.setInstruction(`Make ${target}`);
      },
      update(dt) {
        decay(choices, dt);
      },
      render(g) {
        text(g, `= ${target}`, host.width / 2, area.y + 30, 40, THEME.accent, 'center', 900);
        choices.forEach((c, i) =>
          drawTile(g, c.box, i === picked ? THEME.accent : THEME.surfaceHi, {
            label: String(shuffled[i]),
            labelColor: i === picked ? THEME.bg : THEME.ink,
            pop: c.pop,
          }),
        );
      },
      onDown(p) {
        const i = choices.findIndex((c) => hitBox(p, c.box));
        if (i < 0) return;
        choices[i].pop = 1;
        host.sound('click');
        if (picked < 0) {
          picked = i;
          return;
        }
        if (picked === i) {
          picked = -1;
          return;
        }
        const sum = shuffled[picked] + shuffled[i];
        if (sum === target) {
          host.particles.burst(p.x, p.y, THEME.success, 16);
          host.win();
        } else host.fail(`That makes ${sum}`);
      },
    } satisfies Challenge;
  },
};

export const LOGIC_CHALLENGES: ChallengeDef[] = [oddOneOut, bigger, trueOrFalse, whatsNext, makeTen];
