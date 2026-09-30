// Renders caption pills from a JSON spec: { name: "<span>..</span>" | { html, cls } }
//   node pills.mjs spec.json outdir/
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
import { mkdirSync, readFileSync } from 'fs';

const [specPath, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const font = (f) => readFileSync(new URL(`./fonts/${f}`, import.meta.url)).toString('base64');
const FACES = `@font-face { font-family: 'Archivo Black'; src: url(data:font/woff2;base64,${font('archivo-black.woff2')}) format('woff2'); }
  @font-face { font-family: 'Inter'; font-weight: 600; src: url(data:font/woff2;base64,${font('inter-600.woff2')}) format('woff2'); }`;

const CSS = `
  ${FACES}
  html, body { margin: 0; padding: 0; background: transparent; }
  .wrap { display: inline-block; padding: 24px; }
  .pill {
    display: inline-flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 24px 44px; border-radius: 42px;
    background: rgba(11, 14, 26, 0.9);
    border: 4px solid rgba(123, 91, 255, 0.85);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45), 0 0 60px rgba(91, 123, 255, 0.35);
    color: #F2F5FF; font-family: 'Archivo Black', sans-serif;
    font-size: 56px; line-height: 1.06; letter-spacing: 0.5px; text-align: center; white-space: nowrap;
  }
  .pill.big { font-size: 68px; padding: 26px 46px; }
  .pill.huge { font-size: 118px; padding: 26px 64px; border-radius: 56px; }
  .pill.small { font-size: 50px; padding: 20px 36px; }
  .pill.gold { border-color: rgba(255, 209, 102, 0.95); box-shadow: 0 18px 50px rgba(0,0,0,0.45), 0 0 60px rgba(255, 209, 102, 0.35); }
  .pill.red { border-color: rgba(255, 94, 122, 0.95); box-shadow: 0 18px 50px rgba(0,0,0,0.45), 0 0 60px rgba(255, 94, 122, 0.35); }
  .sub { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.52em; color: #A9B1D6; letter-spacing: 0; }
  .g { color: #FFD166; }
  .r { color: #FF5E7A; }
  .b { color: #7B93FF; }
  .c { color: #45E0E5; }
  .o { color: #FF9F45; }
  .y { color: #FFD166; }
`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
for (const [name, v] of Object.entries(spec)) {
  const { html, cls = '' } = typeof v === 'string' ? { html: v } : v;
  await page.setContent(`<style>${CSS}</style><div class="wrap"><div class="pill ${cls}">${html}</div></div>`);
  await page.evaluate(() => document.fonts.ready);
  const box = await page.locator('.pill').boundingBox();
  if (box.width > 1040) console.warn(`WARN ${name} is ${Math.round(box.width)}px wide`);
  await page.locator('.wrap').screenshot({ path: `${outDir}/${name}.png`, omitBackground: true });
}
await browser.close();
console.log(`rendered ${Object.keys(spec).length} pills`);
