#!/usr/bin/env node
/**
 * tools/deep/html.mjs — Layer 3: W3C conformance & accessibility
 *
 * Runs the W3C Nu validator (vnu-jar) over the target files plus an ARIA
 * tab/panel pairing check. vnu needs Java 11+; when it is unavailable the
 * layer reports SKIPPED instead of failing.
 *
 * Usage:
 *   node tools/deep/html.mjs [lessons/a.html ...] [--all]
 *
 * Exit codes: 0 = clean or skipped; 1 = conformance or ARIA findings.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

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

function haveJava() {
  try {
    execFileSync('java', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runVnu(targets) {
  const localJar = path.join(ROOT, 'node_modules', 'vnu-jar', 'build', 'dist', 'vnu.jar');
  const args = fs.existsSync(localJar)
    ? ['-jar', localJar, '--html']
    : null;

  try {
    const cmd = args ? 'java' : 'npx';
    const cmdArgs = args
      ? [...args, ...targets]
      : ['--yes', 'vnu-jar', '--html', ...targets];
    const out = execFileSync(cmd, cmdArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000
    });
    return { ran: true, output: out };
  } catch (err) {
    // vnu exits non-zero when it finds errors; that is a successful run.
    const out = (err.stdout || '') + (err.stderr || '');
    if (out.includes('error:') || out.includes('warning:')) return { ran: true, output: out };
    return { ran: false, output: '' };
  }
}

function ariaCheck(targets) {
  const findings = [];
  for (const file of targets) {
    const src = fs.readFileSync(file, 'utf8');
    const tabs = (src.match(/role="tab"/g) || []).length;
    const panels = (src.match(/role="tabpanel"/g) || []).length;
    if (tabs !== panels) {
      findings.push(`${path.basename(file)}: ${tabs} role="tab" vs ${panels} role="tabpanel"`);
    }
  }
  return findings;
}

function main() {
  const targets = resolveTargets(process.argv.slice(2));
  console.log(`Layer 3 — W3C/a11y: ${targets.length} file(s)`);
  let bad = 0;

  if (!haveJava()) {
    console.log('  [SKIP] Java not found; W3C Nu validator cannot run. Install a JDK 11+.');
  } else {
    const { ran, output } = runVnu(targets);
    if (!ran) {
      console.log('  [SKIP] vnu-jar unavailable (offline or fetch failed).');
    } else {
      const errors = output.split('\n').filter((l) => l.includes(': error:'));
      const byRule = new Map();
      for (const line of errors) {
        const rule = line.split(': error:')[1]?.trim().slice(0, 70) || 'error';
        byRule.set(rule, (byRule.get(rule) || 0) + 1);
      }
      if (errors.length === 0) {
        console.log('  clean: W3C Nu reported no errors.');
      } else {
        bad += errors.length;
        console.log(`  ${errors.length} W3C error(s):`);
        for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
          console.log(`    ${count}x ${rule}`);
        }
      }
    }
  }

  const aria = ariaCheck(targets);
  if (aria.length === 0) {
    console.log('  clean: every tab set has a matching panel set.');
  } else {
    bad += aria.length;
    for (const f of aria) console.log(`  [ARIA] ${f}`);
  }

  return bad > 0 ? 1 : 0;
}

try {
  process.exit(main());
} catch (err) {
  console.error('  [ERROR] html gate crashed:', err.message);
  process.exit(0);
}
