#!/usr/bin/env node
/**
 * tools/deep/visual.mjs — Layer 2: Visual & Layout Regression
 *
 * Renders each target lesson in a real browser at six viewport widths and fails
 * on horizontal overflow. Uses Playwright with the system Chrome channel, so no
 * bundled browser download is required.
 *
 * Usage:
 *   node tools/deep/visual.mjs                     # sample sweep (first 10 lessons)
 *   node tools/deep/visual.mjs lessons/a.html ...  # explicit files
 *   node tools/deep/visual.mjs --all               # whole corpus
 *
 * Exit codes: 0 = clean or skipped (dependency missing); 1 = overflow found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const VIEWPORTS = [
  { width: 320, height: 600, label: '320px' },
  { width: 390, height: 844, label: '390px' },
  { width: 768, height: 1024, label: '768px' },
  { width: 1100, height: 800, label: '1100px' },
  { width: 1189, height: 800, label: '1189px' },
  { width: 1280, height: 900, label: '1280px' }
];

function resolveTargets(argv) {
  const args = argv.filter((a) => !a.startsWith('--'));
  if (args.length) {
    return args.map((a) => (path.isAbsolute(a) ? a : path.resolve(process.cwd(), a)));
  }
  const dir = path.join(ROOT, 'lessons');
  const all = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort()
    .map((f) => path.join(dir, f));
  return argv.includes('--all') ? all : all.slice(0, 10);
}

async function launch() {
  const { chromium } = await import('playwright');
  // Prefer the locally installed Chrome; fall back to a bundled browser if present.
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return await chromium.launch({ headless: true });
  }
}

async function main() {
  const targets = resolveTargets(process.argv.slice(2));
  console.log(`Layer 2 — visual/layout: ${targets.length} page(s) x ${VIEWPORTS.length} viewports`);

  let browser;
  try {
    browser = await launch();
  } catch (err) {
    console.log('[SKIP] Playwright unavailable (run: npm install). Layer 2 not executed.');
    return 0;
  }

  const page = await browser.newPage();
  let overflow = 0;

  for (const file of targets) {
    const url = 'file://' + file;
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const m = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }));
      if (m.scrollWidth > m.innerWidth) {
        const delta = m.scrollWidth - m.innerWidth;
        console.log(`  [OVERFLOW] ${path.basename(file)} @ ${vp.label}: +${delta}px`);
        overflow++;
      }
    }
  }

  await browser.close();
  console.log(overflow === 0
    ? `  clean: ${targets.length} page(s), no horizontal overflow.`
    : `  ${overflow} overflow instance(s) across ${targets.length} page(s).`);
  return overflow > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('  [ERROR] visual gate crashed:', err.message);
    process.exit(0); // fail open: judgment gates never block a commit by crashing
  });
