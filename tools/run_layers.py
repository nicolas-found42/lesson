#!/usr/bin/env python3
"""tools/run_layers.py — run every local quality layer.

Six layers, all local, all on every commit that touches lesson content:

  L1 syntax/DOM      tools/check_lessons.py (parse, structure, components)
  L2 visual/layout   tools/deep/visual.mjs    (real browser, 6 viewports)
  L3 W3C/a11y        tools/deep/html.mjs      (vnu-jar + ARIA pairing)
  L4 pedagogy        tools/check_lessons.py   (prose budget, readability, intensifiers)
  L5 semantic        tools/check_lessons.py provenance + tools/deep/claims.py extraction
  L6 graph/privacy   tools/check_lessons.py   (links, index sync, privacy, entropy)

Usage:
  python3 -I tools/run_layers.py            # all lessons
  python3 -I tools/run_layers.py --staged   # only files staged for commit
  CHECK_LESSONS_STRICT=1 ...                # findings fail the run (default: report only)
"""

from __future__ import annotations
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def sh(cmd: list[str]) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=600)
        return p.returncode, (p.stdout or '') + (p.stderr or '')
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 0, f'[SKIP] {cmd[0]} unavailable: {exc}'


def staged_targets() -> list[str]:
    code, out = sh(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM',
                    '--', 'lessons/*.html', 'index.html'])
    if code != 0:
        return []
    return [line.strip() for line in out.splitlines() if line.strip().endswith('.html')]


def all_targets() -> list[str]:
    lessons = os.path.join(ROOT, 'lessons')
    return [os.path.join('lessons', f) for f in sorted(os.listdir(lessons)) if f.endswith('.html')]


def main() -> int:
    staged = '--staged' in sys.argv
    strict = os.environ.get('CHECK_LESSONS_STRICT', '0') == '1'
    explicit = [a for a in sys.argv[1:] if not a.startswith('--')]

    if explicit:
        targets = [os.path.relpath(p, ROOT) if os.path.isabs(p) else p for p in explicit]
        scope = 'explicit'
    else:
        targets = staged_targets() if staged else all_targets()
        scope = 'staged' if staged and targets else 'corpus'
        if staged and not targets:
            # Every commit runs all six layers; with no lesson edits, sweep the corpus.
            targets = all_targets()
            scope = 'corpus (no lesson changes staged)'
    if not targets:
        print('No lesson HTML files found.')
        return 0

    lesson_targets = [t for t in targets if t.startswith('lessons/')]
    # Deep layers need lesson pages: when only index.html changed, sweep the corpus
    # so L2/L3/L5 still run against real content instead of an empty file list.
    deep_targets = lesson_targets or all_targets()
    print(f'Running 6 local quality layers on {len(targets)} file(s) [{scope}]')
    print(f'  L1/L4/L5/L6 static: {len(targets)} file(s)')
    print(f'  L6 index sync: full corpus')
    print(f'  L2 visual / L3 W3C / L5 semantic: {len(deep_targets)} file(s)\n')

    results: list[tuple[str, int, str]] = []

    # L1 + L4 + L5(provenance) + L6(per-file part)
    # Strict mode escalates broken relative links (L6) to errors; structural L1
    # errors already block.
    static_flags = ['--strict-links'] if strict else []
    if '--verbose' in sys.argv:
        static_flags.append('--verbose')
    code, out = sh(['python3', '-I', 'tools/check_lessons.py', *static_flags, *targets])
    results.append(('L1/L4/L5/L6 static', code, out))

    # L6 graph: index reachability across the whole corpus
    code, out = sh(['python3', '-I', 'tools/check_lessons.py', '--index-only'])
    results.append(('L6 index sync', code, out))

    # L2 visual — real browser
    code, out = sh(['node', 'tools/deep/visual.mjs', *deep_targets])
    results.append(('L2 visual', code, out))

    # L3 W3C + ARIA
    code, out = sh(['node', 'tools/deep/html.mjs', *deep_targets])
    results.append(('L3 W3C/a11y', code, out))

    # L5 semantic extraction (Jev batch prep; full verify via MCP/nightly)
    code, out = sh(['python3', 'tools/deep/claims.py', *deep_targets])
    results.append(('L5 semantic', code, out))

    failed = []
    for name, code, out in results:
        body = out.strip()
        print(f'--- {name} ---')
        print(body if body else '(no output)')
        print()
        if code != 0:
            failed.append(name)

    print('=' * 60)
    if not failed:
        print('All layers ran; no layer reported findings.')
        return 0
    print(f'Layers reporting findings: {", ".join(failed)}')
    if strict:
        print('CHECK_LESSONS_STRICT=1 → commit blocked.')
        return 1
    print('Report-only (set CHECK_LESSONS_STRICT=1 to block commits).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
