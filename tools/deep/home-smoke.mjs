#!/usr/bin/env node
/**
 * tools/deep/home-smoke.mjs — home page behaviour pass
 *
 * Drives index.html in a real browser: initial state, search (word and
 * `unit N`), Escape, the star filter, expand/collapse, rail jumps, deep links,
 * keyboard focus, the no-JS path, the motion gate and a randomised consistency
 * walk that checks the live status against what is on screen.
 *
 * Not part of run_layers.py; Layer 2/3 already cover layout and conformance for
 * the corpus. Run it directly after touching index.html:
 *
 *   node tools/deep/home-smoke.mjs      # PASS n / FAIL 0, screenshots in $TMPDIR/shots
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const URL = 'file://' + ROOT + '/index.html';
const fails = [];
const ok = [];
function check(name, cond, detail = '') {
  if (cond) ok.push(name); else fails.push(name + (detail ? ' — ' + detail : ''));
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL);
await page.waitForTimeout(300);

const state = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('.lesson-card')];
  return {
    lessons: cards.filter((c) => !/^reference$/i.test(c.querySelector('.lesson-card-tag').textContent.trim())).length,
    visibleLessons: cards.filter((c) => !c.hidden && !/^reference$/i.test(c.querySelector('.lesson-card-tag').textContent.trim())).length,
    visibleRefs: cards.filter((c) => !c.hidden && /^reference$/i.test(c.querySelector('.lesson-card-tag').textContent.trim())).length,
    open: [...document.querySelectorAll('section.unit-section')].filter((s) => s.querySelector('details').open && !s.hidden).map((s) => s.id),
    hiddenSections: [...document.querySelectorAll('section.unit-section')].filter((s) => s.hidden).map((s) => s.id),
    status: document.getElementById('browse-count').textContent,
    noResultsHidden: document.getElementById('no-results').hidden,
    height: document.documentElement.scrollHeight,
    visibleTitlesAllContain: null,
  };
});

let s = await state();
check('116 lesson cards in DOM', s.lessons === 116, String(s.lessons));
check('initial open units are unit-0 and reference', JSON.stringify(s.open) === JSON.stringify(['unit-0', 'reference']), JSON.stringify(s.open));
check('initial state shows 8 reference cards', s.visibleRefs === 8, String(s.visibleRefs));
check('initial status names corpus', /116 lessons in 10 units, plus 8 reference cards/.test(s.status), s.status);
check('default status is the plain sentence', /116 lessons in 10 units, plus 8 reference cards\.$/.test(s.status), s.status);
check('no console errors on load', errors.length === 0, errors.join(' | '));
const initialHeight = s.height;

// viewport sweep + screenshots
const SHOTS = path.join(os.tmpdir(), 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
for (const [w, h] of [[320, 700], [390, 844], [768, 1024], [1100, 800], [1280, 900]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(120);
  const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight }));
  check(`no horizontal overflow at ${w}px`, dims.sw <= dims.cw, `${dims.sw} > ${dims.cw}`);
  await page.screenshot({ path: `${SHOTS}/home-${w}.png`, fullPage: w === 320 || w === 1280 });
  if (w === 320) check('320px page stays under 6000px with default disclosures', dims.sh < 6000, String(dims.sh));
}
await page.setViewportSize({ width: 1280, height: 900 });

// search
await page.fill('#lesson-search', 'git');
await page.waitForTimeout(150);
s = await state();
const gitAll = await page.evaluate(() => [...document.querySelectorAll('.lesson-card')].filter((c) => !c.hidden).every((c) => c.textContent.toLowerCase().includes('git')));
check('search "git" only shows matching cards', gitAll && s.visibleLessons > 0, JSON.stringify(s));
check('search opens units that contain matches', s.open.length > 0 && s.hiddenSections.length > 0, JSON.stringify({ open: s.open, hidden: s.hiddenSections }));
check('search status reports a match count', /of 124 items match “git”\./.test(s.status), s.status);
{
  const announced = Number(/^(\d+) of 124 items match/.exec(s.status)[1]);
  const onScreen = await page.evaluate(() => [...document.querySelectorAll('.lesson-card')]
    .filter((c) => !c.hidden && !(c.closest('.unit-section') && c.closest('.unit-section').hidden)).length);
  check('announced match count equals the cards on screen', announced === onScreen, announced + ' vs ' + onScreen);
}

// escape clears
await page.press('#lesson-search', 'Escape');
await page.waitForTimeout(150);
s = await state();
check('Escape clears search and restores default open state', s.visibleLessons === 116 && JSON.stringify(s.open) === JSON.stringify(['unit-0', 'reference']), JSON.stringify(s));

// unit-name search
await page.fill('#lesson-search', 'unit 4');
await page.waitForTimeout(150);
s = await state();
check('search "unit 4" opens that unit and shows its 13 cards', s.visibleLessons === 13 && s.open.includes('unit-4'), JSON.stringify(s));
await page.fill('#lesson-search', '');
await page.waitForTimeout(150);

// star only
await page.click('#star-toggle');
await page.waitForTimeout(150);
s = await state();
const allStarred = await page.evaluate(() => [...document.querySelectorAll('.lesson-card')].filter((c) => !c.hidden).every((c) => !!c.querySelector('.star-badge')));
check('star filter shows exactly the 41 ★ lessons', s.visibleLessons === 41 && allStarred, JSON.stringify(s));
check('star filter hides units with no ★ lesson (5,8,9,reference)', JSON.stringify(s.hiddenSections) === JSON.stringify(['unit-5', 'unit-8', 'unit-9', 'reference']), JSON.stringify(s.hiddenSections));
check('star button reports pressed state', (await page.getAttribute('#star-toggle', 'aria-pressed')) === 'true');
await page.click('#star-toggle');
await page.waitForTimeout(150);

// expand all / collapse all
await page.click('#expand-toggle');
await page.waitForTimeout(150);
s = await state();
check('expand all opens all 11 disclosures', s.open.length === 11, JSON.stringify(s.open));
check('expand-all button relabels itself', (await page.textContent('#expand-toggle')).trim() === 'Collapse all units');
const allOpenHeight = s.height;
await page.click('#expand-toggle');
await page.waitForTimeout(150);
s = await state();
check('collapse all closes every unit', s.open.length === 0, JSON.stringify(s.open));
check('collapsed state says all units are collapsed', /all units collapsed, expand to read them\.$/.test(s.status), s.status);
{
  // the chevron's own transitionend must not cut the height run short
  await page.goto(URL);
  await page.waitForTimeout(250);
  const run = await page.evaluate(async () => {
    const d = document.querySelector('#unit-3 details');
    const bs = () => getComputedStyle(d, '::details-content').blockSize;
    d.querySelector('summary').click();
    await new Promise((r) => setTimeout(r, 170));
    const mid = { cls: d.classList.contains('animatable'), size: parseFloat(bs()) };
    await new Promise((r) => setTimeout(r, 400));
    return { mid, end: parseFloat(bs()), clsEnd: d.classList.contains('animatable') };
  });
  check('chevron transitionend does not cut the disclosure run short', run.mid.cls && run.mid.size < run.end - 5 && !run.clsEnd, JSON.stringify(run));
}

// rail jump
await page.click('.unit-rail a[href="#unit-6"]');
await page.waitForTimeout(250);
s = await state();
check('rail chip opens the target unit', s.open.includes('unit-6'), JSON.stringify(s.open));
check('rail chip updates the hash', page.url().endsWith('#unit-6'), page.url());
const railTop = await page.evaluate(() => document.getElementById('unit-6').getBoundingClientRect().top);
check('rail jump scrolls the unit under the sticky bar', railTop >= 0 && railTop < 160, String(railTop));

// deep link on load
const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page2.goto(URL + '#unit-8');
await page2.waitForTimeout(300);
const deepOpen = await page2.evaluate(() => document.getElementById('unit-8').querySelector('details').open);
check('deep link #unit-8 opens that unit on load', deepOpen === true);
await page2.close();

// the filter drives open/close without any transition
await page.goto(URL);
await page.waitForTimeout(250);
await page.fill('#lesson-search', 'github');
const instant = await page.evaluate(async () => {
  const d = document.querySelector('#unit-6 details');
  const bs = () => getComputedStyle(d, '::details-content').blockSize;
  const seq = [bs()];
  let instantAnims = document.getAnimations().length;
  for (let i = 0; i < 4; i++) { await new Promise((r) => setTimeout(r, 20)); seq.push(bs()); if (i === 0) instantAnims = Math.max(instantAnims, document.getAnimations().length); }
  return { seq, open: d.open, bulk: document.body.classList.contains('is-bulk'), anims: instantAnims };
});
check('filter-driven open never shows an intermediate size', instant.open && new Set(instant.seq).size === 1, JSON.stringify(instant));
check('filtered units carry no motion class', instant.bulk === false, String(instant.bulk));
check('no animation runs during a filter-driven open', instant.anims === 0, String(instant.anims));
await page.fill('#lesson-search', '');
await page.waitForTimeout(150);
const durIdle = await page.evaluate(() => getComputedStyle(document.querySelector('#unit-6 details'), '::details-content').transitionDuration);
check('an untouched unit carries no transition', durIdle === '0s', durIdle);
const armed = await page.evaluate(async () => {
  const d = document.querySelector('#unit-6 details');
  d.querySelector('summary').click();
  const during = getComputedStyle(d, '::details-content').transitionDuration;
  const cls = d.classList.contains('animatable');
  await new Promise((r) => setTimeout(r, 500));
  return { during, cls, after: getComputedStyle(d, '::details-content').transitionDuration, clsAfter: d.classList.contains('animatable') };
});
check('a clicked unit gets the transition, then drops the class', armed.during !== '0s' && armed.cls && armed.after === '0s' && !armed.clsAfter, JSON.stringify(armed));
const repeat = await page.evaluate(async () => {
  const d = document.querySelector('#unit-8 details');
  const summary = d.querySelector('summary');
  for (let i = 0; i < 8; i += 1) summary.click();
  await new Promise((r) => setTimeout(r, 700));
  return { cls: d.classList.contains('animatable'), anims: document.getAnimations().length,
    dur: getComputedStyle(d, '::details-content').transitionDuration };
});
check('repeated toggles leave no motion class or running animation', !repeat.cls && repeat.anims === 0 && repeat.dur === '0s', JSON.stringify(repeat));
const retoggle = await page.evaluate(async () => {
  const d = document.querySelector('#unit-9 details');
  const size = () => parseFloat(getComputedStyle(d, '::details-content').blockSize);
  const summary = d.querySelector('summary');
  summary.click();
  await new Promise((r) => setTimeout(r, 300));
  summary.click();
  await new Promise((r) => setTimeout(r, 120));
  const mid = { cls: d.classList.contains('animatable'), size: size() };
  await new Promise((r) => setTimeout(r, 500));
  return { mid, end: { cls: d.classList.contains('animatable'), anims: document.getAnimations().length } };
});
check('re-toggling mid-run keeps the class past the first 400 ms deadline', retoggle.mid.cls && retoggle.mid.size > 1 && !retoggle.end.cls && retoggle.end.anims === 0, JSON.stringify(retoggle));

// after-collapse search honesty
await page.goto(URL);
await page.waitForTimeout(150);
await page.click('#expand-toggle');
await page.waitForTimeout(150);
await page.click('#expand-toggle');
await page.waitForTimeout(150);
await page.fill('#lesson-search', 'deploy');
await page.waitForTimeout(150);
s = await state();
check('collapsed list stays collapsed while a search is active', s.open.length === 0, JSON.stringify(s.open));
check('status says the matches are collapsed', /all units collapsed/.test(s.status), s.status);
await page.click('#expand-toggle');
await page.waitForTimeout(200);
s = await state();
check('expand toggle re-opens matched units', s.open.length > 0, JSON.stringify(s.open));

// rail chip clears the query it would otherwise be filtered by
await page.fill('#lesson-search', 'git');
await page.waitForTimeout(150);
await page.click('.unit-rail a[href="#unit-6"]');
await page.waitForTimeout(250);
s = await state();
check('rail chip clears the search query', (await page.inputValue('#lesson-search')) === '', await page.inputValue('#lesson-search'));
check('rail chip opens its unit after a filter', s.open.includes('unit-6'), JSON.stringify(s.open));

// a hand-toggled row is the new default: re-derived layouts must keep it
await page.goto(URL);
await page.waitForTimeout(200);
await page.click('#unit-0 summary');
await page.waitForTimeout(250);
await page.fill('#lesson-search', 'git');
await page.waitForTimeout(120);
await page.fill('#lesson-search', '');
await page.waitForTimeout(120);
s = await state();
check('manual collapse survives a query and clear', !s.open.includes('unit-0'), JSON.stringify(s.open));
await page.click('.unit-rail a[href="#unit-5"]');
await page.waitForTimeout(250);
s = await state();
check('manual collapse survives a rail jump', !s.open.includes('unit-0') && s.open.includes('unit-5'), JSON.stringify(s.open));
await page.evaluate(() => { location.hash = '#unit-1'; });
await page.waitForTimeout(250);
s = await state();
check('manual collapse survives a hash change', !s.open.includes('unit-0') && s.open.includes('unit-1'), JSON.stringify(s.open));

// expand toggle is an action, not a pressed state
check('expand toggle carries no aria-pressed', (await page.getAttribute('#expand-toggle', 'aria-pressed')) === null);

// motion: disclosure transition exists and is disabled under reduced motion
const motion = await page.evaluate(async () => {
  const d = document.querySelector('#unit-6 details');
  d.querySelector('summary').click();
  await new Promise((r) => setTimeout(r, 20));
  const s = getComputedStyle(d, '::details-content');
  const out = { duration: s.transitionDuration, prop: s.transitionProperty, supports: CSS.supports('interpolate-size', 'allow-keywords') };
  await new Promise((r) => setTimeout(r, 500));
  return out;
});
check('disclosure content animates its height', motion.supports && /block-size/.test(motion.prop) && motion.duration !== '0s', JSON.stringify(motion));
const reduced = await page.emulateMedia({ reducedMotion: 'reduce' });
const motionReduced = await page.evaluate(() => getComputedStyle(document.querySelector('#unit-6 details'), '::details-content').transitionDuration);
check('reduced motion removes the transition', motionReduced === '0s', motionReduced);
await page.emulateMedia({ reducedMotion: 'no-preference' });

// the transition actually runs: the disclosure is mid-height 60ms after opening
await page.goto(URL);
await page.waitForTimeout(200);
const grow = await page.evaluate(async () => {
  const details = document.querySelector('#unit-5 details');
  const h0 = details.getBoundingClientRect().height;
  details.querySelector('summary').click();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(70);
  const mid = details.getBoundingClientRect().height;
  await wait(400);
  const end = details.getBoundingClientRect().height;
  return { h0, mid, end, animates: mid > h0 && mid < end - 1 };
});
check('disclosure grows through intermediate heights', grow.animates, JSON.stringify(grow));

// focus ring on a card, reached by keyboard
let ring = 'none', ringFocusVisible = false;
for (let i = 0; i < 60; i++) {
  await page.keyboard.press('Tab');
  const r = await page.evaluate(() => ({ cls: document.activeElement.className || '', fv: document.activeElement.matches(':focus-visible'), o: getComputedStyle(document.activeElement).outlineStyle }));
  if (String(r.cls).includes('lesson-card')) { ring = r.o; ringFocusVisible = r.fv; break; }
}
check('keyboard-reached card draws an outline', ring === 'solid' && ringFocusVisible, ring + ' ' + ringFocusVisible);

// empty state
await page.goto(URL);
await page.fill('#lesson-search', 'zzzzqqq');
await page.waitForTimeout(150);
s = await state();
{
  await page.goto(URL);
  await page.waitForTimeout(250);
  await page.fill('#lesson-search', 'git');
  await page.waitForTimeout(200);
  await page.click('#unit-3 summary');           // close one matching unit by hand
  await page.waitForTimeout(250);
  const partial = await page.textContent('#browse-count');
  check('a partly collapsed filter result says some units are collapsed', /some units are collapsed, expand to read them\.$/.test(partial), partial);
}
check('no-match search shows the empty message', s.noResultsHidden === false && s.visibleLessons === 0, JSON.stringify(s));
check('no-match status names the query and drops the collapse hint', /No item matches .zzzzqqq/.test(s.status) && !/expand to read/.test(s.status), s.status);
check('no-match status is not a fake count', !/^0 of/.test(s.status), s.status);

// skip link moves focus into the content
await page.goto(URL);
await page.keyboard.press('Tab');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
const afterSkip = await page.evaluate(() => ({ id: document.activeElement.id, tag: document.activeElement.tagName }));
check('skip link focuses the main region', afterSkip.id === 'main', JSON.stringify(afterSkip));

// star marker has an accessible name
const star = await page.evaluate(() => {
  const el = document.querySelector('.lesson-card .star-badge');
  return el ? { role: el.getAttribute('role'), label: el.getAttribute('aria-label') } : null;
});
check('star marker exposes a name, not a raw glyph', star && star.role === 'img' && star.label === 'First-ship', JSON.stringify(star));

// reduced motion leaves no transition anywhere
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(URL);
await page.waitForTimeout(200);
const reducedAll = await page.evaluate(() => ({
  card: getComputedStyle(document.querySelector('.lesson-card')).transitionDuration,
  details: getComputedStyle(document.querySelector('#unit-6 details'), '::details-content').transitionDuration
}));
check('reduced motion removes every transition', reducedAll.card === '0s' && reducedAll.details === '0s', JSON.stringify(reducedAll));
await page.emulateMedia({ reducedMotion: 'no-preference' });

// keyboard: skip link first, then the search box, summary operable by keyboard
await page.goto(URL);
await page.keyboard.press('Tab');
const firstTab = await page.evaluate(() => document.activeElement.className);
check('first Tab reaches the skip link', firstTab === 'skip-link', firstTab);
const summaryFocusable = await page.evaluate(() => {
  const d = document.querySelector('#unit-1 details');
  const s = d.querySelector('summary');
  s.focus();
  return document.activeElement === s;
});
check('unit summary is focusable', summaryFocusable);
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('keyboard Enter toggles the unit', await page.evaluate(() => document.querySelector('#unit-1 details').open));

// page-level landmark and card-copy hygiene
const land = await page.evaluate(() => ({
  footerInMain: !!document.querySelector('main footer'),
  pageFooter: !!document.querySelector('body > footer.lesson-foot'),
}));
check('footer sits outside main as the page contentinfo', !land.footerInMain && land.pageFooter, JSON.stringify(land));
const copy = await page.evaluate(() =>
  [...document.querySelectorAll('.lesson-card, .unit-title, .unit-blurb')].map((el) => el.textContent));
check('no double-escaped entities in card copy', copy.every((t) => !/[&](amp|lt|gt|quot);/.test(t)),
  copy.filter((t) => /[&](amp|lt|gt|quot);/.test(t)).slice(0, 2).join(' | '));
check('no stray space before a sentence period in card copy', copy.every((t) => !/ \.(?=\s|$)/.test(t)),
  copy.filter((t) => / \.(?=\s|$)/.test(t)).slice(0, 2).join(' | '));

// randomised consistency walk: the announced count must always equal what is on screen
await page.goto(URL);
await page.waitForTimeout(200);
const acts = ['git', 'unit 4', 'verif', 'zzzzqqq', '', '', 'star', 'star', 'expand', 'expand', 'escape', 'escape'];
let mismatches = [], checkedStates = 0;
for (let i = 0; i < 60; i++) {
  const a = acts[Math.floor(Math.random() * acts.length)];
  if (a === 'star') await page.click('#star-toggle');
  else if (a === 'expand') {
    // the button is disabled when nothing matches, by design
    if (await page.evaluate(() => !document.getElementById('expand-toggle').disabled)) await page.click('#expand-toggle');
    else await page.fill('#lesson-search', '');
  }
  else if (a === 'escape') await page.press('#lesson-search', 'Escape');
  else await page.fill('#lesson-search', a);
  await page.waitForTimeout(60);
  const snap = await page.evaluate(() => {
    const vis = [...document.querySelectorAll('.lesson-card')].filter((c) => !c.hidden && !(c.closest('.unit-section') && c.closest('.unit-section').hidden)).length;
    const status = document.getElementById('browse-count').textContent;
    const m = /^(\d+) of 124 items match/.exec(status);
    return { vis, status, announced: m ? Number(m[1]) : null };
  });
  checkedStates += 1;
  if (snap.announced !== null && snap.announced !== snap.vis) mismatches.push({ i, a, ...snap });
  if (snap.announced === null && snap.vis !== 0 && !/lessons in 10 units/.test(snap.status)) mismatches.push({ i, a, ...snap });
}
check('60 random filter states keep the count truthful', mismatches.length === 0, JSON.stringify(mismatches.slice(0, 3)) + ' of ' + checkedStates);

console.log('PASS ' + ok.length + '\nFAIL ' + fails.length);
if (fails.length) console.log(fails.map((f) => '  ✗ ' + f).join('\n'));
console.log('heights: collapsed=' + initialHeight + ' allOpen=' + allOpenHeight);
await browser.close();
process.exitCode = fails.length ? 1 : 0;
