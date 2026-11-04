#!/usr/bin/env node
/** Full presentation regression coverage after shared CSS/JS changes.
 * npm run test:ui:audit
 * Optional LESSON_SITE_URL=https://host/lesson/ for a published artifact.
 * Every lesson/reference is audited in both themes. Axe checks visible content;
 * interaction probes additionally exercise tabs, quizzes, recall and ordering.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import axe from 'axe-core';

const root = new URL('../../', import.meta.url);
const site = process.env.LESSON_SITE_URL || root.href;
const targets = ['lessons', 'reference'].flatMap(dir =>
  fs.readdirSync(new URL(`${dir}/`, root)).filter(name => name.endsWith('.html')).sort().map(name => `${dir}/${name}`));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let checks = 0;
const failures = [];
function check(name, condition) {
  checks++;
  if (!condition) failures.push(name);
}
async function audit(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }));
  });
  check(`${label}: axe WCAG violations ${JSON.stringify(result)}`, result.length === 0);
}
try {
  const cases = ['ask', 'build', 'check', 'joined', 'search', 'expanded'];
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ colorScheme: scheme, reducedMotion: 'reduce' });
    for (const state of cases) {
      await page.goto(new URL('index.html', site).href);
      if (state === 'build') await page.locator('[data-lab-step="1"]').click();
      if (state === 'check' || state === 'joined') await page.locator('[data-lab-step="2"]').click();
      if (state === 'joined') await page.locator('.preview-join').click();
      if (state === 'search') await page.locator('#lesson-search').fill('git');
      if (state === 'expanded') await page.locator('#expand-toggle').click();
      await audit(page, `home/${scheme}/${state}`);
      console.log(`AUDITED home/${scheme}/${state}`);
    }
    await page.close();
  }

  // Four browser workers keep the corpus audit bounded without new agents.
  const jobs = ['light', 'dark'].flatMap(scheme => targets.map(target => ({ scheme, target })));
  await Promise.all(Array.from({ length: 4 }, async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    while (jobs.length) {
      const { scheme, target } = jobs.shift();
      const label = `${scheme}/${target}`;
      await page.emulateMedia({ colorScheme: scheme });
      errors.length = 0;
      const response = await page.goto(new URL(target, site).href);
      check(`${label}: document loaded`, !response || response.status() === 200);
      await audit(page, label);
      const controls = await page.evaluate(() => [...document.querySelectorAll('.quiz button.opt, .agent-tabs [role="tab"], .recall button, .order button.item, .prompt .copy')]
        .filter(el => el.getClientRects().length)
        .every(el => el.getBoundingClientRect().height >= 44));
      check(`${label}: visible controls are 44px high`, controls);

      const tabs = page.locator('.agent-tabs').first();
      if (await tabs.count()) {
        const second = tabs.locator('[role="tab"]').nth(1);
        await tabs.locator('[role="tab"]').first().focus();
        await page.keyboard.press('ArrowRight');
        check(`${label}: keyboard changes agent tab`, await second.getAttribute('aria-selected') === 'true');
        check(`${label}: tab keeps one visible panel`, await tabs.locator('[role="tabpanel"]:visible').count() === 1);
      }
      const quiz = page.locator('.quiz:visible').first();
      if (await quiz.count()) {
        await quiz.locator('button.opt').first().click();
        check(`${label}: quiz answers once and marks the correct choice`, await quiz.getAttribute('data-done') === '1' && await quiz.locator('button.opt.correct').count() === 1 && await quiz.locator('button.opt:enabled').count() === 0);
      }
      const recall = page.locator('.recall:has(.reveal):visible').first();
      if (await recall.count()) {
        await recall.locator('.reveal').click();
        check(`${label}: recall reveals its answer`, await recall.locator('.answer.show').isVisible());
      }
      const order = page.locator('.order:visible').first();
      if (await order.count()) {
        await order.locator('[data-pos="1"]').click();
        check(`${label}: ordering exercise accepts its first step`, await order.locator('[data-pos="1"]').getAttribute('class').then(value => value.includes('placed')));
      }
      // The shared palette also colors answers and feedback that start hidden.
      await audit(page, `${label}/after-interactions`);
      const scrollable = page.locator('pre[tabindex="0"]:visible');
      for (const block of await scrollable.all()) {
        await block.focus();
        // Enter with the keyboard: programmatic focus after a mouse click
        // correctly does not trigger the browser's :focus-visible heuristic.
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        check(`${label}: code example receives keyboard focus`, await block.evaluate(el => document.activeElement === el && getComputedStyle(el).outlineStyle === 'solid'));
        if (await block.evaluate(el => el.scrollWidth > el.clientWidth)) {
          await block.press('ArrowRight');
          check(`${label}: keyboard scrolls overflowing code right`, await block.evaluate(el => el.scrollLeft > 0));
          const right = await block.evaluate(el => el.scrollLeft);
          await block.press('ArrowLeft');
          check(`${label}: keyboard scrolls overflowing code left`, await block.evaluate(el => el.scrollLeft) < right);
        }
      }
      check(`${label}: no runtime errors ${errors.join(' | ')}`, errors.length === 0);
      console.log(`AUDITED ${label}`);
    }
    await page.close();
  }));
  console.log(`Reading pages: ${targets.length}, themes: 2, home states: ${cases.length * 2}`);
  console.log(`PASS ${checks - failures.length}\nFAIL ${failures.length}`);
  for (const failure of failures) console.log(`FAILURE ${failure}`);
  assert.equal(failures.length, 0, 'UI audit found regressions');
} finally {
  await browser.close();
}
