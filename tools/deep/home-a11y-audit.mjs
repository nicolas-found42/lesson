#!/usr/bin/env node
/**
 * tools/deep/home-a11y-audit.mjs — measurement pass for index.html
 *
 * Two checks that the smoke pass only samples:
 *   1. reduced motion — every element and every generated ::before/::after box
 *      on the fully expanded page, with prefers-reduced-motion: reduce
 *   2. contrast — WCAG 2.1 relative luminance with alpha compositing over the
 *      resolved ancestor background, for every leaf text node, in light and
 *      dark across four states (default, unit query, star filter, expanded)
 *
 * Not wired into run_layers.py; run it directly after changing index.html:
 *
 *   node tools/deep/home-a11y-audit.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'file://' + ROOT + '/index.html';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = { reduced: {}, contrast: {} };

{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.evaluate(() => { document.querySelector('#library').open = true; document.querySelectorAll('details.unit').forEach((d) => { d.open = true; }); });
  await page.waitForTimeout(200);
  out.reduced = await page.evaluate(() => {
    let elements = 0, generated = 0;
    const bad = [];
    const anims = document.getAnimations().length;
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      elements += 1;
      if (cs.transitionDuration !== '0s') bad.push(el.tagName + ' ' + cs.transitionDuration);
      for (const pe of ['::before', '::after']) {
        const ps = getComputedStyle(el, pe);
        if (ps.content && ps.content !== 'none' && ps.content !== 'normal') {
          generated += 1;
          if (ps.transitionDuration !== '0s') bad.push(el.tagName + pe + ' ' + ps.transitionDuration);
        }
      }
    }
    return { elements, generated, boxes: elements + generated, bad, animations: anims, scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior };
  });
  await page.close();
}

for (const scheme of ['light', 'dark']) {
  for (const state of ['default', 'unit4', 'starred', 'expanded']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
    await page.goto(URL);
    await page.locator('#library > summary').click();
    if (state === 'unit4') await page.fill('#lesson-search', 'unit 4');
    if (state === 'starred') await page.click('#star-toggle');
    if (state === 'expanded') await page.click('#expand-toggle');
    await page.waitForTimeout(250);
    out.contrast[`${scheme}/${state}`] = await page.evaluate(() => {
      const parse = (c) => {
        const m = c && c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
      };
      const lum = ({ r, g, b }) => {
        const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
      const bgOf = (el) => {
        let n = el; const stack = [];
        while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; } n = n.parentElement; }
        const rootCss = getComputedStyle(document.documentElement).backgroundColor;
        let base = rootCss && rootCss !== 'rgba(0, 0, 0, 0)' ? parse(rootCss) : { r: 255, g: 255, b: 255, a: 1 };
        for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
        return base;
      };
      const fails = []; const seen = new Set();
      for (const el of document.querySelectorAll('main *, header *, nav *, footer *')) {
        const text = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
        if (!text) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden]')) continue;
        const fg0 = parse(cs.color); if (!fg0) continue;
        const bg = bgOf(el);
        const fg = over(fg0, bg);
        const L1 = lum(fg), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        seen.add(cs.color + '|' + JSON.stringify(bg) + '|' + size + '|' + bold);
        if (ratio + 0.001 < need) fails.push({ text: text.slice(0, 40), ratio: +ratio.toFixed(2), need });
      }
      return { pairs: seen.size, failCount: fails.length, fails: fails.slice(0, 5) };
    });
    await page.close();
  }
}

await browser.close();

const contrastFails = Object.values(out.contrast).reduce((n, s) => n + s.failCount, 0);
console.log(JSON.stringify(out, null, 1));
console.log('\nreduced: ' + out.reduced.boxes + ' boxes (' + out.reduced.elements + ' elements + ' + out.reduced.generated + ' generated), ' +
  out.reduced.bad.length + ' with a transition, ' + out.reduced.animations + ' animations');
console.log('contrast: ' + contrastFails + ' AA failures across ' + Object.keys(out.contrast).length + ' state x scheme combinations');
process.exitCode = contrastFails === 0 && out.reduced.bad.length === 0 && out.reduced.animations === 0 ? 0 : 1;
