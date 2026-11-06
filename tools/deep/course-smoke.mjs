#!/usr/bin/env node
// Course consumer checks: static paths, reading flow, self-checkpoints, storage
// failure, no-JS, citation jumps, and keyboard access on a real same-origin site.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'curriculum.json'))).lessons;
const plan = JSON.parse(fs.readFileSync(path.join(root, 'tools/course-plan.json')));
const output = process.env.COURSE_SHOTS || path.join(os.tmpdir(), 'lesson-student-review');
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(file)] || 'text/plain');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let passed = 0;
const failures = [], errors = [], requests = [];
function check(name, truth) { if (truth) passed++; else failures.push(name); }
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
page.on('request', r => requests.push(r.url()));
const visit = n => page.goto(base + 'lessons/' + curriculum[n - 1].file);
try {
  await page.goto(base);
  check('no demo, motion control, or animation library loaded', await page.locator('#playground, #motion-toggle').count() === 0 && requests.every(url => !/anime|home-lab|home-motion/.test(url)));
  check('library starts closed', !(await page.locator('#library').evaluate(el => el.open)));
  check('first launch is five sessions with fifteen lessons', await page.locator('#study-plan > .course-session').count() === 5 && await page.locator('#study-plan > .course-session [data-lesson]').count() === 15);
  check('every lesson appears once in the study plan', await page.locator('.session-lessons [data-lesson]').count() === 116);
  const order = plan.flatMap(s => Array.from({ length: s.end - s.start + 1 }, (_, i) => s.start + i));
  check('plan is complete and prerequisite ordered', curriculum.every(l => order.includes(l.n) && l.needs.every(id => order.indexOf(curriculum.find(x => x.id === id).n) < order.indexOf(l.n))));
  for (const width of [320, 390, 768, 1100, 1189, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    check(`home fits ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if ([390, 1280].includes(width)) await page.screenshot({ path: path.join(output, `after-home-${width}.png`), fullPage: true });
  }
  await page.getByRole('link', { name: 'Lesson library', exact: true }).click();
  check('library can be opened', await page.locator('#library').evaluate(el => el.open));
  await page.fill('#lesson-search', 'nonsensezzqq');
  check('empty search reports recovery', await page.locator('#no-results').isVisible());
  await page.press('#lesson-search', 'Escape');
  await page.fill('#lesson-search', 'git');
  check('search displays matches', await page.locator('.lesson-card:visible').count() > 0);
  await page.goto(base + '#session-31');
  check('deep session reveals all ancestors', await page.locator('#session-31 .session-lessons').isVisible());
  await page.goto(base + '#unit-8');
  check('deep catalog unit reveals library', await page.locator('#unit-8 .lesson-card').first().isVisible());
  for (const lesson of curriculum) {
    await visit(lesson.n);
    check(`lesson ${lesson.n}: one reading section and real task`, await page.locator('.reading-step:visible').count() === 1 && (await page.locator('#lesson-practice').innerText()).length > 100 && await page.locator('#lesson-practice .expect').count() > 0);
    check(`lesson ${lesson.n}: session brief and checkpoint`, await page.locator('.lesson-brief').count() === 1 && await page.locator('[data-complete]:visible').count() === 1);
    const href = await page.locator('.checkpoint-next').getAttribute('href');
    check(`lesson ${lesson.n}: next resolves in intended order`, href === (lesson.n < 116 ? curriculum[lesson.n].file : '../index.html#study-plan'));
    await page.getByRole('button', { name: 'Show full lesson', exact: true }).click();
    check(`lesson ${lesson.n}: full reading retains all sections`, await page.locator('.reading-step[hidden]').count() === 0);
  }
  await visit(1);
  await page.getByRole('button', { name: 'Next section', exact: true }).focus();
  await page.keyboard.press('Enter');
  check('keyboard changes reading step and moves focus', await page.locator('.reading-position').innerText().then(t => /Section 2 of/.test(t)) && await page.evaluate(() => document.activeElement.closest('.reading-step') !== null));
  await page.reload();
  check('reading position survives reload', /Section 2 of/.test(await page.locator('.reading-position').innerText()));
  await page.getByRole('link', { name: 'try the task', exact: true }).click();
  check('practice shortcut reveals its reading section', await page.locator('#lesson-practice').isVisible());
  await page.getByRole('button', { name: 'Show full lesson', exact: true }).click();
  const citation = page.locator('sup.cite a').first();
  const hash = await citation.getAttribute('href');
  await page.getByRole('button', { name: 'Read in steps', exact: true }).click();
  await page.getByRole('button', { name: 'Previous section', exact: true }).click();
  // Direct hash navigation exercises a citation target that is in a hidden step.
  await page.goto(base + 'lessons/' + curriculum[0].file + hash);
  check('citation target reveals hidden source section', await page.locator(hash).isVisible());
  await page.locator('[data-complete]').click();
  check('completion is explicit and self-reported', await page.locator('[data-complete]').getAttribute('aria-pressed') === 'true' && /self-check/.test(await page.locator('.checkpoint-status').innerText()));
  await page.goto(base);
  check('home resumes at first unfinished lesson', await page.locator('#course-resume').getAttribute('href') === 'lessons/' + curriculum[1].file);
  await visit(1); await page.locator('[data-complete]').click(); await page.reload();
  check('undo survives reload', await page.locator('[data-complete]').getAttribute('aria-pressed') === 'false');
  // A stale tab must not overwrite checkpoints from another tab.
  await page.evaluate(() => localStorage.removeItem('lesson.course.v1'));
  await page.goto(base);
  const peer = await page.context().newPage();
  await peer.goto(base + 'lessons/' + curriculum[0].file);
  await peer.locator('[data-complete]').click();
  await page.waitForFunction(file => document.querySelector('#course-resume').getAttribute('href') === 'lessons/' + file, curriculum[1].file);
  check('open home updates after another tab records a task', await page.locator('#course-resume').getAttribute('href') === 'lessons/' + curriculum[1].file);
  await page.goto(base + 'lessons/' + curriculum[1].file);
  await peer.getByRole('button', { name: 'Next section', exact: true }).click();
  await page.locator('[data-complete]').click();
  check('reading and completion in separate tabs preserve both tasks', await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('lesson.course.v1'));
    return state.completed.includes(1) && state.completed.includes(2) && state.steps[1] === 1;
  }));
  await peer.waitForFunction(() => JSON.parse(localStorage.getItem('lesson.course.v1')).completed.includes(2));
  await peer.locator('[data-complete]').click();
  check('undo in another tab retains newer unrelated checkpoint', await page.evaluate(() => JSON.parse(localStorage.getItem('lesson.course.v1')).completed.join(',') === '2'));
  await peer.close();
  // Bounded untrusted state: invalid IDs, duplicates, and an oversized reading index.
  await page.evaluate(() => localStorage.setItem('lesson.course.v1', JSON.stringify({ completed: [1, 1, 999, '2', -1], steps: { 1: 199, 2: 'bad' } })));
  await visit(1);
  check('out-of-range saved section is clamped', await page.locator('.reading-step:visible').count() === 1);
  await page.goto(base);
  check('invalid stored IDs do not skip lessons', await page.locator('#course-resume').getAttribute('href') === 'lessons/' + curriculum[1].file);
  await page.evaluate(() => localStorage.setItem('lesson.course.v1', '{broken'));
  await page.reload();
  check('malformed saved state has recovery feedback', /could not be read/.test(await page.locator('#storage-note').innerText()));
  const denied = await browser.newContext();
  await denied.addInitScript(() => { Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new DOMException('Blocked', 'QuotaExceededError'); } }); });
  const d = await denied.newPage(); await d.goto(base + 'lessons/' + curriculum[0].file); await d.locator('[data-complete]').click();
  check('write failure never promises durable progress', /only in memory/.test(await d.locator('.checkpoint-status').innerText()));
  await d.getByRole('button', { name: 'Next section', exact: true }).click();
  check('write-denied checkpoint remains in memory while reading', await d.locator('[data-complete]').getAttribute('aria-pressed') === 'true');
  await denied.close();
  const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const n = await nojs.newPage(); await n.goto(base); await n.locator('#session-1 .session-lessons a').first().click();
  check('no-JS has all reading and real navigation', await n.locator('main > h2:visible').count() > 2 && await n.locator('.pager a').last().getAttribute('href') === curriculum[1].file);
  check('no-JS exposes expected task result', await n.locator('#lesson-practice .expect').isVisible());
  await nojs.close();
  await page.evaluate(() => localStorage.removeItem('lesson.course.v1'));
  await visit(1);
  for (const width of [320, 390, 768, 1100, 1189, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    check(`reading controls fit ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.screenshot({ path: path.join(output, 'after-lesson-1280.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  check('print includes every reading step', await page.locator('.reading-step:visible').count() === await page.locator('.reading-step').count());
  check('no script or resource errors', errors.length === 0);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
console.log(`Course smoke: PASS ${passed} / FAIL ${failures.length}`);
for (const f of failures) console.log('FAIL ' + f);
for (const e of errors) console.log('ERROR ' + e);
console.log('Screenshots: ' + output);
process.exitCode = failures.length ? 1 : 0;
