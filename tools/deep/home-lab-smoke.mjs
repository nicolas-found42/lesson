#!/usr/bin/env node
/** Build lab interaction, motion, and fallback regression coverage.
 * Run: node tools/deep/home-lab-smoke.mjs (system Chrome + Playwright).
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const url = process.env.LESSON_SITE_URL || new URL('../../index.html', import.meta.url).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let checks = 0;
const errors = [];
const check = (name, condition) => { assert.ok(condition, name); checks++; console.log(`PASS ${name}`); };
async function open(options = {}) {
  const page = await browser.newPage(options);
  page.on('pageerror', error => errors.push(String(error)));
  return page;
}
// Anime.js uses requestAnimationFrame rather than native Animation objects.
// Check its temporary presentation styles and particles as well as CSS motion.
const idle = async page => {
  await page.waitForTimeout(40);
  await page.waitForFunction(() => document.getAnimations().length === 0 &&
    document.querySelectorAll('.lab-confetti > *').length === 0 &&
    [...document.querySelectorAll('.hero-copy > *, .build-lab, .lab-message, .bot svg, .mini-preview, .lesson-card')]
      .every(el => !el.style.transform && !el.style.opacity));
};
try {
  const page = await open({ viewport: { width: 1280, height: 900 } });
  await page.goto(url);
  await idle(page);
  check('local Anime.js is loaded', await page.evaluate(() => typeof window.anime.animate === 'function'));
  check('motion toggle has a stable accessible name when on', await page.getByRole('button', { name: 'Motion', exact: true }).count() === 1);
  check('demo announces its simulation', /pretend project/.test(await page.locator('.lab-note').innerText()));
  const railShortcuts = await page.locator('.unit-rail a').evaluateAll(links => links.map(link => {
    const href = link.getAttribute('href');
    return [`.unit-rail a[href="${href}"]`, href.slice(1)];
  }));
  const shortcuts = [
    ['.lab-nav-actions a[href="#unit-0"]', 'unit-0'],
    ['.browse-heading a[href="#reference"]', 'reference'],
    ...railShortcuts
  ];
  check('all thirteen unit and reference shortcuts are inventoried', shortcuts.length === 13);
  for (const [selector, id] of shortcuts) {
    for (const filter of ['search', 'star']) {
      await page.goto(url);
      await page.locator(selector).click();
      if (filter === 'search') await page.fill('#lesson-search', 'zzzzqqq');
      else await page.locator('#star-toggle').click();
      await page.locator(selector).click();
      const jump = await page.evaluate(id => ({
        query: document.querySelector('#lesson-search').value,
        starred: document.querySelector('#star-toggle').getAttribute('aria-pressed'),
        hidden: document.getElementById(id).hidden,
        open: document.getElementById(id).querySelector('details').open,
        focused: document.activeElement === document.getElementById(id)
      }), id);
      check(`${id}/${filter}: repeated shortcut clears filters`, jump.query === '' && jump.starred === 'false');
      check(`${id}/${filter}: repeated shortcut reveals destination`, !jump.hidden && jump.open);
      check(`${id}/${filter}: shortcut moves keyboard focus`, jump.focused);
    }
  }
  await page.goto(url);
  await page.locator('.lab-nav-actions a[href="#unit-0"]').click();
  await idle(page);
  const interruptedJump = await page.evaluate(() => {
    document.querySelector('#unit-8 summary').click();
    const started = document.querySelectorAll('details.unit.animatable').length > 0;
    document.querySelector('.lab-nav-actions a[href="#unit-0"]').click();
    return {
      started,
      stopped: document.querySelectorAll('details.unit.animatable').length === 0 &&
        [...document.querySelectorAll('.lesson-card')].every(el => !el.style.transform)
    };
  });
  check('shortcut interruption probe started a reveal', interruptedJump.started);
  check('repeated shortcut stops active disclosure and card motion', interruptedJump.stopped);
  await page.goto(url);
  await idle(page);
  const expected = [
    { speaker: 'YOU → AGENT', message: 'Make a page for my space club', explanation: 'You describe what you want.' },
    { speaker: 'AGENT → FILES', message: 'I made the page', explanation: 'The agent changes files' },
    { speaker: 'YOU → THE PAGE', message: 'Does the Join button work?', explanation: 'You test what the agent made.' }
  ];
  for (const step of [1, 2, 0]) {
    await page.locator(`[data-lab-step="${step}"]`).click();
    check(`step ${step} is the only selected step`, await page.locator('.lab-steps [aria-pressed="true"]').count() === 1 && await page.locator(`#playground[data-step="${step}"]`).count() === 1);
    check(`step ${step} identifies the actor`, await page.locator('#lab-speaker').innerText() === expected[step].speaker);
    check(`step ${step} explains the visible action`, (await page.locator('#lab-message').innerText()).includes(expected[step].message) && (await page.locator('#lab-explanation').innerText()).includes(expected[step].explanation));
    check(`step ${step} has the correct preview`, await page.locator('.preview-page strong').isVisible() === (step !== 0));
    check(`step ${step} only enables checking at the check stage`, await page.locator('.preview-join').isEnabled() === (step === 2));
    await idle(page);
    check(`step ${step} leaves no particles`, await page.locator('.lab-confetti > *').count() === 0);
  }
  await page.locator('[data-lab-step="1"]').click();
  check('animated explanation stays fully opaque', await page.locator('.lab-message').evaluate(el => getComputedStyle(el).opacity === '1'));
  const movement = await page.evaluate(async () => {
    const bot = document.querySelector('.bot svg');
    const samples = [];
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      samples.push(getComputedStyle(bot).transform);
    }
    return samples;
  });
  check('sidekick animation visibly moves through intermediate positions', new Set(movement).size > 1 && movement.some(value => value !== 'none'));
  const cardReveal = await page.evaluate(async () => {
    document.querySelector('#unit-8 summary').click();
    const card = document.querySelector('#unit-8 .lesson-card');
    const opacity = getComputedStyle(card).opacity;
    const samples = [];
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      samples.push(getComputedStyle(card).transform);
    }
    return { opacity, samples, competingTransition: card.getAnimations().some(animation => animation.transitionProperty === 'transform') };
  });
  check('revealed card text stays fully opaque', cardReveal.opacity === '1');
  check('cards visibly move through their reveal', new Set(cardReveal.samples).size > 1);
  check('CSS hover does not interfere with the card reveal', !cardReveal.competingTransition);
  await idle(page);
  await page.locator('[data-lab-step="2"]').focus();
  await page.keyboard.press('Enter');
  check('keyboard activates the check step', await page.locator('#playground').getAttribute('data-step') === '2');
  await page.locator('.preview-join').focus();
  await page.keyboard.press('Enter');
  check('keyboard can test the demo button', (await page.locator('.preview-join').innerText()).includes('You’re in!') && (await page.locator('#lab-message').innerText()).includes('The demo button works!'));
  check('successful checking starts the celebration', await page.locator('.lab-confetti > *').count() === 14);
  const burst = await page.evaluate(async () => {
    const bit = document.querySelector('.lab-confetti i');
    const samples = [];
    for (let i = 0; i < 4; i++) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      samples.push(getComputedStyle(bit).transform);
    }
    return samples;
  });
  check('celebration particles actually move', new Set(burst).size > 1);
  check('checking the button explains real-world verification', (await page.locator('#lab-explanation').innerText()).includes('try every important action'));
  await idle(page);
  check('successful checking leaves no celebration particles', await page.locator('.lab-confetti > *').count() === 0);
  await page.locator('[data-lab-step="1"]').click();
  check('replaying a step resets the demo button', await page.locator('.preview-join').isDisabled() && (await page.locator('.preview-join').innerText()).includes('Join the adventure'));
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-lab-step]')];
    for (let i = 0; i < 75; i++) buttons[i % 3].click();
  });
  await idle(page);
  check('rapid clicks leave no particles or transforms', await page.evaluate(() => document.querySelectorAll('.lab-confetti > *').length === 0 && !document.querySelector('.bot svg').getAttribute('style')));
  await page.evaluate(async () => {
    const summary = document.querySelector('#unit-8 summary');
    for (let i = 0; i < 30; i++) {
      summary.click();
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  });
  await idle(page);
  check('rapid unit toggles restore every card transform', await page.evaluate(() => [...document.querySelectorAll('.lesson-card')].every(el => !el.style.transform)));
  if (await page.locator('#unit-8 details').getAttribute('open') !== null) {
    await page.locator('#unit-8 summary').click();
    await idle(page);
  }
  await page.locator('#unit-8 summary').click();
  await page.fill('#lesson-search', 'git');
  check('filter interrupts native disclosure motion', await page.locator('details.unit.animatable').count() === 0);
  check('filter interrupts JS card reveals', await page.evaluate(() => [...document.querySelectorAll('.lesson-card')].every(el => !el.style.transform)));
  await page.fill('#lesson-search', '');
  await page.locator('[data-lab-step="2"]').click();
  await page.locator('.preview-join').click();
  await page.locator('#motion-toggle').click();
  check('motion toggle keeps its accessible name when off', await page.getByRole('button', { name: 'Motion', exact: true }).count() === 1);
  check('motion off cancels all in-flight effects immediately', await page.evaluate(() => document.getAnimations().length === 0 && document.documentElement.dataset.motion === 'off' && document.querySelectorAll('.lab-confetti > *').length === 0 && [...document.querySelectorAll('.hero-copy > *, .build-lab, .lab-message, .bot svg, .mini-preview, .lesson-card')].every(el => !el.style.transform && !el.style.opacity)));
  await page.reload();
  check('motion choice survives reload', await page.locator('#motion-toggle').getAttribute('aria-pressed') === 'false');
  await page.goto(new URL('lessons/0001-what-a-coding-agent-is.html', url).href);
  check('motion choice carries into reading pages', await page.evaluate(() => document.documentElement.dataset.motion === 'off' && [...document.querySelectorAll('.quiz button.opt')].every(el => getComputedStyle(el).transitionDuration === '0s')));
  await page.locator('.quiz button.opt').first().click();
  check('lesson quiz still responds', await page.locator('.quiz').first().getAttribute('data-done') === '1');
  await page.goto(url);
  await page.locator('[data-lab-step="1"]').click();
  check('motion off still updates demo state', await page.locator('#playground').getAttribute('data-step') === '1');
  await page.locator('#unit-1 summary').click();
  check('motion off suppresses disclosure animation', await page.evaluate(() => document.getAnimations().length === 0));
  await page.locator('#motion-toggle').click();
  check('motion can be re-enabled', await page.locator('#motion-toggle').getAttribute('aria-pressed') === 'true');
  await page.locator('[data-lab-step="2"]').click();
  await page.locator('.preview-join').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.documentElement.dataset.motion === 'off');
  check('live device change cancels all motion', await page.evaluate(() => document.getAnimations().length === 0 && document.documentElement.dataset.motion === 'off' && document.querySelectorAll('.lab-confetti > *').length === 0 && [...document.querySelectorAll('.lab-message, .bot svg, .mini-preview')].every(el => !el.style.transform && !el.style.opacity)));
  check('device reduced motion takes precedence', await page.locator('#motion-toggle').isDisabled());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.documentElement.dataset.motion === 'on');
  check('motion preference restores after device change', await page.locator('#motion-toggle').getAttribute('aria-pressed') === 'true');
  await page.locator('[data-lab-step="1"]').click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  check('page exit clears temporary animation styles', await page.evaluate(() => [...document.querySelectorAll('.bot svg, .mini-preview, .lab-message')].every(el => !el.style.transform && !el.style.opacity)));

  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const width of [320, 390, 768, 1100, 1189, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await idle(page);
      for (const step of [0, 1, 2]) {
        await page.locator(`[data-lab-step="${step}"]`).click();
        await idle(page);
        check(`${scheme}/${width}/step${step}: no page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        check(`${scheme}/${width}/step${step}: touch targets are 44px`, await page.evaluate(() => [...document.querySelectorAll('.lab-steps button, .preview-join, #motion-toggle, .browse-btn, .cta, .unit-rail a')].every(el => el.getBoundingClientRect().height >= 44)));
        check(`${scheme}/${width}/step${step}: control labels are readable`, await page.evaluate(() => [...document.querySelectorAll('.lab-steps button, .preview-join, #motion-toggle, .browse-btn, .unit-rail a')].every(el => parseFloat(getComputedStyle(el).fontSize) >= 12)));
      }
    }
  }
  // Reader zoom: a desktop viewport at 200% has 640 CSS pixels of space.
  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto(url);
  await idle(page);
  check('200% equivalent layout fits', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.close();

  const reduced = await open({ reducedMotion: 'reduce' });
  await reduced.goto(url);
  for (const step of [1, 2, 0]) {
    await reduced.locator(`[data-lab-step="${step}"]`).click();
    check(`reduced-motion step ${step} has no animation`, await reduced.evaluate(() => document.getAnimations().length === 0));
  }
  await reduced.locator('[data-lab-step="2"]').click();
  await reduced.locator('.preview-join').click();
  check('reduced motion preserves the checking action without particles', await reduced.evaluate(() => document.querySelector('.preview-join').textContent.includes('You’re in!') && document.querySelectorAll('.lab-confetti > *').length === 0));
  await reduced.close();

  const fallback = await open();
  await fallback.route('**/anime-4.5.0.umd.min.js', route => route.abort());
  await fallback.goto(url);
  await fallback.locator('[data-lab-step="2"]').click();
  check('demo works when library is unavailable', await fallback.locator('#playground').getAttribute('data-step') === '2');
  await fallback.locator('.preview-join').click();
  check('checking works when library is unavailable', (await fallback.locator('#lab-message').innerText()).includes('The demo button works!'));
  await fallback.fill('#lesson-search', 'git');
  check('search works when library is unavailable', /items match/.test(await fallback.locator('#browse-count').innerText()));
  await fallback.close();

  const noStorage = await open();
  await noStorage.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } }));
  await noStorage.goto(url);
  await noStorage.locator('#motion-toggle').click();
  check('storage denial does not break controls', await noStorage.locator('#motion-toggle').getAttribute('aria-pressed') === 'false');
  await noStorage.close();

  const noJS = await open({ javaScriptEnabled: false });
  await noJS.goto(url);
  check('no-JS explanation is visible', await noJS.locator('.lab-fallback').isVisible());
  check('no-JS hides inactive controls', await noJS.locator('.lab-steps').isHidden() && await noJS.locator('#motion-toggle').isHidden());
  await noJS.locator('#unit-1 summary').click();
  check('no-JS course still opens', await noJS.locator('#unit-1 details').getAttribute('open') !== null);
  const firstLesson = await noJS.locator('.cta-primary').getAttribute('href');
  check('start link points to a real lesson', firstLesson === 'lessons/0001-what-a-coding-agent-is.html');
  await noJS.close();
  check('no runtime errors', errors.length === 0);
  console.log(`PASS ${checks}\nFAIL 0\nTested site: ${url.startsWith('file:') ? fileURLToPath(url) : url}`);
} finally {
  await browser.close();
}
