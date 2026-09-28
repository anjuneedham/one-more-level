// Renders caption pills and end-card layers as transparent PNGs.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
import { mkdirSync, readFileSync } from 'fs';
const font = (f) => readFileSync(new URL(`./fonts/${f}`, import.meta.url)).toString('base64');
// Archivo Black and Inter, both SIL Open Font License (see fonts/README.md).
const FACES = `@font-face { font-family: 'Archivo Black'; src: url(data:font/woff2;base64,${font('archivo-black.woff2')}) format('woff2'); }
  @font-face { font-family: 'Inter'; font-weight: 600; src: url(data:font/woff2;base64,${font('inter-600.woff2')}) format('woff2'); }`;

const OUT = new URL('./cards/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const CAPTIONS = {
  hook: `<div class="pill big"><span>YOU HAVE</span><span class="gold">ONE MORE LEVEL.</span></div>`,
  hook2: `<div class="pill"><span>CAN YOU BEAT IT?</span></div>`,
  c_minis: `<div class="pill"><span><b class="gold">25</b> MINI-CHALLENGES</span></div>`,
  c_verbs: `<div class="pill"><span>TAP · DRAG ·</span><span>REMEMBER · REACT</span></div>`,
  c_harder: `<div class="pill"><span>IT GETS <b class="gold">HARDER.</b> FAST.</span></div>`,
  c_life: `<div class="pill"><span><b class="red">1 LIFE</b> LEFT...</span></div>`,
  c_close: `<div class="pill big"><span>SO CLOSE.</span></div>`,
  c_again: `<div class="pill big"><span>ONE MORE <b class="gold">TRY?</b></span></div>`,
};

const BASE_CSS = `
  ${FACES}
  html, body { margin: 0; padding: 0; background: transparent; }
  .wrap { display: inline-block; padding: 24px; }
  .pill {
    display: inline-flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 26px 46px; border-radius: 44px;
    background: rgba(11, 14, 26, 0.88);
    border: 4px solid rgba(123, 91, 255, 0.85);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45), 0 0 60px rgba(91, 123, 255, 0.35);
    color: #F2F5FF; font-family: 'Archivo Black', 'DejaVu Sans', sans-serif;
    font-size: 64px; line-height: 1.02; letter-spacing: 0.5px; text-align: center; white-space: nowrap;
  }
  .pill.big { font-size: 74px; padding: 28px 50px; }
  .gold { color: #FFD166; }
  .red { color: #FF5E7A; }
  b { font-weight: inherit; }
`;

const END_CSS = `
  ${FACES}
  html, body { margin: 0; padding: 0; background: transparent; }
  #stage { width: 1080px; height: 1920px; position: relative; overflow: hidden; }
  .bg { position: absolute; inset: 0; background: #0B0E1A; }
  .grid { position: absolute; inset: 0;
    background-image: linear-gradient(rgba(91,123,255,0.09) 2px, transparent 2px),
      linear-gradient(90deg, rgba(91,123,255,0.09) 2px, transparent 2px);
    background-size: 90px 90px; }
  .glow1 { position: absolute; left: -260px; top: 180px; width: 1000px; height: 1000px; border-radius: 50%;
    background: radial-gradient(circle, rgba(91,123,255,0.42), transparent 65%); }
  .glow2 { position: absolute; right: -300px; bottom: 60px; width: 1100px; height: 1100px; border-radius: 50%;
    background: radial-gradient(circle, rgba(176,107,255,0.34), transparent 65%); }
  .mark { position: absolute; left: 50%; top: 360px; width: 300px; height: 300px; margin-left: -150px;
    border-radius: 74px; background: linear-gradient(155deg,#5B7BFF 0%,#7B5BFF 55%,#B06BFF 100%);
    box-shadow: inset 0 -12px 30px rgba(0,0,0,0.18), inset 0 10px 24px rgba(255,255,255,0.14), 0 40px 110px rgba(91,123,255,0.5); }
  .mark .bar { position: absolute; left: 80px; width: 140px; height: 42px; border-radius: 21px; }
  .mark .b1 { top: 108px; background: #F2F5FF; }
  .mark .b2 { top: 162px; background: #FFD166; }
  .word { position: absolute; left: 0; right: 0; top: 740px; text-align: center; color: #F2F5FF;
    font-family: 'Archivo Black', 'DejaVu Sans', sans-serif; font-size: 190px; line-height: 0.95; letter-spacing: -2px; }
  .word .gold { color: #FFD166; }
  .tag { position: absolute; left: 0; right: 0; top: 1360px; text-align: center; color: #A9B1D6;
    font-family: 'Inter', 'DejaVu Sans', sans-serif; font-weight: 600; font-size: 54px; line-height: 1.3; }
  .cta { position: absolute; left: 50%; top: 1570px; transform: translateX(-50%);
    padding: 40px 84px; border-radius: 999px; background: #5B7BFF; color: #0B0E1A;
    box-shadow: 0 12px 0 #3A55D9, 0 30px 80px rgba(91,123,255,0.45);
    font-family: 'Archivo Black', 'DejaVu Sans', sans-serif; font-size: 54px; letter-spacing: 2px; white-space: nowrap; }
  .hide { visibility: hidden; }
`;

const END_LAYERS = {
  end_bg: ['bg', 'grid', 'glow1', 'glow2'],
  end_mark: ['mark'],
  end_word: ['word'],
  end_tag: ['tag'],
  end_cta: ['cta'],
};

function endHtml(show) {
  const cls = (n) => (show.includes(n) ? '' : ' hide');
  return `<style>${END_CSS}</style><div id="stage">
    <div class="bg${cls('bg')}"></div><div class="grid${cls('grid')}"></div>
    <div class="glow1${cls('glow1')}"></div><div class="glow2${cls('glow2')}"></div>
    <div class="mark${cls('mark')}"><div class="bar b1"></div><div class="bar b2"></div></div>
    <div class="word${cls('word')}">ONE<br><span class="gold">MORE</span><br>LEVEL</div>
    <div class="tag${cls('tag')}">25 mini-challenges.<br>How far can you get?</div>
    <div class="cta${cls('cta')}">PLAY FREE ON ANDROID</div>
  </div>`;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });

for (const [name, html] of Object.entries(CAPTIONS)) {
  await page.setContent(`<style>${BASE_CSS}</style><div class="wrap">${html}</div>`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.wrap').screenshot({ path: `${OUT}${name}.png`, omitBackground: true });
}
for (const [name, parts] of Object.entries(END_LAYERS)) {
  await page.setContent(endHtml(parts), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#stage').screenshot({ path: `${OUT}${name}.png`, omitBackground: true });
}
await page.setContent(endHtml(['bg', 'grid', 'glow1', 'glow2', 'mark', 'word', 'tag', 'cta']), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.locator('#stage').screenshot({ path: `${OUT}end_full.png` });
await browser.close();
console.log('cards rendered');
