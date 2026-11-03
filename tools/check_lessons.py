#!/usr/bin/env python3
"""tools/check_lessons.py — Tier 1 Fast Quality Gate

Validates HTML lessons against structural, component, quiz fairness,
privacy, link, and graph requirements in <1 second using Python stdlib only.

Design invariants:
- Zero external dependencies (runs with python3 -I)
- Preserves privacy: does NOT inline private audit terms.
  Loads privacy terms dynamically from uncommitted .scratch/privacy-terms.txt
  or .scratch/scripts/validate_lesson.py if present, gracefully skipping if absent.
- Spec-compliant link handling: flags missing targets, but treats spec-mandated
  forward links (e.g. ../reference/*.html and unwritten curriculum lessons) as
  advisory warnings so authoring and pre-commit workflow never deadlocks.
- Read-only on all input files: NEVER modifies lesson files.
"""

from __future__ import annotations
import sys
import os
import re
import math
import html
import json
import glob
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Standard WHATWG tags & semantics
VOID_ELEMENTS = {
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
}

RAW_TEXT_ELEMENTS = {'script', 'style', 'textarea', 'title'}
SVG_ELEMENTS = {'svg', 'path', 'rect', 'circle', 'line', 'polygon', 'polyline', 'text', 'defs', 'marker', 'g', 'desc'}

ALLOWED_COMPONENTS = {
    'lesson-head', 'kicker', 'lede', 'meta', 'crumbs', 'sidenote',
    'callout', 'vignette', 'recall', 'quiz', 'prompt', 'transcript',
    'compare', 'doit', 'order', 'agent-tabs', 'source-box', 'ask',
    'lesson-foot', 'term', 'table', 'opt', 'btn', 'reveal', 'answer',
    'cite', 'why', 'label', 'ref'
}

# ---------------------------------------------------------------------------
# Privacy / Anonymization Loader (Uncommitted / Graceful No-op)
# ---------------------------------------------------------------------------

def load_private_terms() -> list[str]:
    """Loads private terms from uncommitted scratch files if available.
    Returns an empty list if running in a clean public clone.
    """
    terms: list[str] = []
    txt_path = os.path.join(ROOT, '.scratch', 'privacy-terms.txt')
    py_path = os.path.join(ROOT, '.scratch', 'scripts', 'validate_lesson.py')
    
    if os.path.isfile(txt_path):
        try:
            with open(txt_path, 'r', encoding='utf-8') as f:
                terms = [line.strip().lower() for line in f if line.strip() and not line.startswith('#')]
        except Exception:
            pass

    if not terms and os.path.isfile(py_path):
        try:
            with open(py_path, 'r', encoding='utf-8') as f:
                m = re.search(r'FORBID\s*=\s*\[(.*?)\]', f.read(), re.S)
                if m:
                    raw_items = [x.strip().strip('\'\"').lower() for x in m.group(1).split(',')]
                    terms = [x for x in raw_items if x]
        except Exception:
            pass

    return terms

# ---------------------------------------------------------------------------
# Curriculum & Evidence Loaders
# ---------------------------------------------------------------------------

def load_curriculum() -> dict[str, dict]:
    """Loads curriculum manifest, preferring authoritative uncommitted .scratch copy if present."""
    for loc in ['.scratch/curriculum.json', 'curriculum.json']:
        p = os.path.join(ROOT, loc)
        if os.path.isfile(p):
            try:
                data = json.load(open(p, encoding='utf-8'))
                return {l['file']: l for l in data.get('lessons', [])}
            except Exception:
                pass
    return {}

def load_evidence() -> str:
    """Loads text from local saved sources if available."""
    text_parts = []
    globs = [
        os.path.join(ROOT, '.scratch', 'sources', '*.md'),
        os.path.join(ROOT, '.scratch', 'tmp', '**', '*.txt'),
        os.path.join(ROOT, '.scratch', 'tmp', '**', '*.md'),
        os.path.join(ROOT, 'RESOURCES.md'),
    ]
    for pattern in globs:
        for p in glob.glob(pattern, recursive=True):
            try:
                text_parts.append(open(p, 'r', encoding='utf-8', errors='ignore').read().lower())
            except Exception:
                pass
    return '\n'.join(text_parts)

# ---------------------------------------------------------------------------
# Shannon Entropy Calculation
# ---------------------------------------------------------------------------

def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    freq: dict[str, int] = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    ent = 0.0
    length = len(s)
    for count in freq.values():
        p = count / length
        ent -= p * math.log2(p)
    return ent

# ---------------------------------------------------------------------------
# HTML Parser & AST Checker
# ---------------------------------------------------------------------------

class LessonParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack: list[str] = []
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.ids: set[str] = set()
        self.classes: set[str] = set()
        self.has_html_lang = False
        self.has_lesson_head = False
        self.has_lesson_foot = False
        self.has_source_box = False
        self.has_ask = False
        self.has_meta = False
        self.h1_count = 0
        self.buttons_without_type = 0
        self.links: list[str] = []
        self.images_without_alt = 0
        self.open_tags_count = 0

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]):
        attrs = dict(attrs_list)
        self.open_tags_count += 1
        
        if tag == 'html' and 'lang' in attrs:
            self.has_html_lang = True
        if tag == 'h1':
            self.h1_count += 1
        if tag == 'button' and 'type' not in attrs:
            self.buttons_without_type += 1
        if tag == 'img' and 'alt' not in attrs:
            self.images_without_alt += 1
            
        if 'id' in attrs and attrs['id']:
            elem_id = attrs['id']
            if elem_id in self.ids:
                self.errors.append(f'Duplicate id="{elem_id}"')
            self.ids.add(elem_id)
            
        if 'class' in attrs and attrs['class']:
            for cls in attrs['class'].split():
                self.classes.add(cls)
                if cls == 'lesson-head': self.has_lesson_head = True
                elif cls == 'lesson-foot': self.has_lesson_foot = True
                elif cls == 'source-box': self.has_source_box = True
                elif cls == 'ask': self.has_ask = True
                elif cls == 'meta': self.has_meta = True

        if 'href' in attrs and attrs['href']:
            self.links.append(attrs['href'])

        # Stack management
        if tag not in VOID_ELEMENTS and tag not in SVG_ELEMENTS:
            self.stack.append(tag)

    def handle_endtag(self, tag: str):
        if tag in VOID_ELEMENTS or tag in SVG_ELEMENTS:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            idx = len(self.stack) - 1 - self.stack[::-1].index(tag)
            unclosed = self.stack[idx+1:]
            self.errors.append(f'Mismatched </{tag}> (left unclosed: {unclosed})')
            self.stack = self.stack[:idx]
        else:
            self.errors.append(f'Stray </{tag}> without opener')

# ---------------------------------------------------------------------------
# Full Lesson Check
# ---------------------------------------------------------------------------

def check_lesson_file(
    path: str,
    curriculum: dict[str, dict],
    private_terms: list[str],
    evidence_text: str,
    strict_links: bool = False
) -> tuple[list[str], list[str]]:
    """Checks one HTML lesson. Returns (errors, warnings)."""
    errors: list[str] = []
    warnings: list[str] = []
    filename = os.path.basename(path)

    try:
        content = open(path, 'r', encoding='utf-8').read()
    except Exception as e:
        return [f'Could not read file: {e}'], []

    # 1. Syntax & DOM Parser Check
    parser = LessonParser()
    parser.feed(content)
    errors.extend(parser.errors)
    warnings.extend(parser.warnings)
    if parser.stack:
        errors.append(f'Unclosed tags at EOF: {parser.stack[-5:]}')

    # 2. Structural Requirements
    if not re.search(r'<title>[^<]{3,80}</title>', content):
        errors.append('Missing or invalid <title> (must be 3-80 chars)')
    if not parser.has_html_lang:
        errors.append('Missing <html lang="..."> attribute')
    if parser.h1_count != 1:
        errors.append(f'Page must have exactly one <h1>, found {parser.h1_count}')
    if parser.buttons_without_type > 0:
        warnings.append(f'Found {parser.buttons_without_type} <button> tags without explicit type=""')

    # Core required components
    if not parser.has_lesson_head: errors.append('Missing <header class="lesson-head">')
    if not parser.has_lesson_foot: errors.append('Missing <footer class="lesson-foot">')
    if not parser.has_source_box: errors.append('Missing <div class="source-box">')
    if not parser.has_ask: errors.append('Missing <div class="ask">')
    if not parser.has_meta: errors.append('Missing <div class="meta">')

    # 3. Assets links
    if 'assets/lesson.css' not in content:
        errors.append('Missing link to assets/lesson.css')
    if 'assets/lesson.js' not in content:
        errors.append('Missing script tag for assets/lesson.js')

    # 4. Interactive Components
    has_interactive = bool(re.search(r'class="(quiz|doit|order|recall)', content))
    if not has_interactive:
        errors.append('No interactive component found (.quiz, .doit, .order, or .recall)')

    # 5. Quiz Fairness Checks
    quiz_starts = [m.start() for m in re.finditer(r'<div\s+class="quiz"[^>]*data-correct="(\d+)"', content)]
    quizzes = []
    for i, start_pos in enumerate(quiz_starts):
        end_pos = quiz_starts[i+1] if i + 1 < len(quiz_starts) else len(content)
        quizzes.append(content[start_pos:end_pos])

    quiz_correct_indices = []
    for q_idx, q_body in enumerate(quizzes):
        corr_m = re.search(r'data-correct="(\d+)"', q_body)
        if not corr_m:
            errors.append(f'Quiz #{q_idx+1} missing data-correct attribute')
            continue
        corr_idx = int(corr_m.group(1))
        quiz_correct_indices.append(corr_idx)

        # Options
        raw_opts = re.findall(r'<button class="opt"[^>]*>(.*?)</button>', q_body, re.S)
        if len(raw_opts) < 3:
            errors.append(f'Quiz #{q_idx+1} has fewer than 3 options ({len(raw_opts)})')
            continue
        
        opt_texts = [re.sub(r'<[^>]+>', '', opt).strip() for opt in raw_opts]
        opt_words = [len(opt.split()) for opt in opt_texts]
        opt_chars = [len(opt) for opt in opt_texts]

        # Word count parity
        if len(set(opt_words)) > 1:
            warnings.append(f'Quiz #{q_idx+1} option word counts vary: {opt_words}')
        
        # Char spread
        char_spread = max(opt_chars) - min(opt_chars)
        if char_spread > 10:
            warnings.append(f'Quiz #{q_idx+1} option char spread {char_spread} > 10')

        # Uniquely longest check
        if corr_idx < len(opt_chars):
            corr_len = opt_chars[corr_idx]
            other_lens = [opt_chars[i] for i in range(len(opt_chars)) if i != corr_idx]
            if other_lens and corr_len > max(other_lens) + 8:
                warnings.append(f'Quiz #{q_idx+1} correct option is uniquely longest ({corr_len} vs {max(other_lens)})')

        if 'class="why"' not in q_body and '<why' not in q_body:
            errors.append(f'Quiz #{q_idx+1} missing .why explanation block')

    # 6. Privacy & High Entropy Leak Checks
    text_content = re.sub(r'<[^>]+>', ' ', content)
    lower_content = content.lower()

    # Banned terms from private audit inventory
    for term in private_terms:
        if term and term in lower_content:
            errors.append(f'Privacy leak detected: forbidden term "{term}" found in text')

    # Absolute workstation paths
    for m in re.finditer(r'(/Users/[A-Za-z0-9._-]+|[A-Z]:\\Users\\[A-Za-z0-9._-]+)', text_content):
        errors.append(f'Absolute system path leak: {m.group(1)}')

    # High entropy strings (ignoring standard URLs and long SVG path data)
    non_url_text = re.sub(r'https?://\S+', ' ', text_content)
    for m in re.finditer(r'[A-Za-z0-9+/=_\-]{22,}', non_url_text):
        token = m.group(0)
        # Exclude common base64 or long standard CSS/SVG attributes
        if shannon_entropy(token) >= 4.4 and not token.startswith('M0') and not token.startswith('calc'):
            warnings.append(f'High-entropy string detected (possible secret): {token[:20]}...')

    # 7. Link & Graph Validation
    for href in parser.links:
        if re.match(r'^(https?:|mailto:|tel:)', href):
            continue
        target, _, frag = href.partition('#')
        
        # Reference docs that are spec-mandated to be linked but uncreated yet
        if target.startswith('../reference/') or target.startswith('reference/'):
            # Warn only, never block
            warnings.append(f'Forward link to planned reference doc: {href}')
            continue

        # Normal relative targets
        if target:
            target_path = os.path.normpath(os.path.join(os.path.dirname(path), target))
            if not os.path.exists(target_path):
                # If target is in curriculum, it is an unauthored forward lesson
                target_base = os.path.basename(target_path)
                if target_base in curriculum:
                    warnings.append(f'Forward link to unauthored curriculum lesson: {href}')
                else:
                    msg = f'Broken relative link: {href}'
                    if strict_links: errors.append(msg)
                    else: warnings.append(msg)
            elif frag and target_path.endswith('.html'):
                # Check target anchor
                try:
                    tsrc = open(target_path, encoding='utf-8').read()
                    anchors = set(re.findall(r'\bid="([^"]+)"', tsrc)) | set(re.findall(r'\bname="([^"]+)"', tsrc))
                    if frag not in anchors:
                        warnings.append(f'Anchor #{frag} not found in {os.path.basename(target_path)}')
                except Exception:
                    pass
        elif frag:
            # Anchor in same page
            if frag not in parser.ids:
                warnings.append(f'Internal anchor #{frag} not found on this page')

    # 8. Curriculum Registration
    if curriculum and filename not in curriculum and filename != 'index.html':
        warnings.append(f'Filename "{filename}" is not registered in curriculum.json')

    return errors, warnings

# ---------------------------------------------------------------------------
# CLI Entrypoint
# ---------------------------------------------------------------------------

def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    strict_links = '--strict-links' in sys.argv
    warn_as_error = '--strict' in sys.argv

    curriculum = load_curriculum()
    private_terms = load_private_terms()
    evidence_text = load_evidence()

    if not args:
        files = sorted(glob.glob(os.path.join(ROOT, 'lessons', '*.html')))
    else:
        files = []
        for a in args:
            p = a if os.path.isabs(a) else os.path.join(os.getcwd(), a)
            if os.path.isfile(p):
                files.append(p)
            elif os.path.isdir(p):
                files.extend(sorted(glob.glob(os.path.join(p, '*.html'))))

    if not files:
        print('No files to check.')
        return 0

    print(f'Checking {len(files)} file(s) with Tier 1 Fast Quality Gate...')
    if private_terms:
        print(f'Privacy check active: {len(private_terms)} terms loaded from uncommitted workspace.')
    else:
        print('Privacy check: No uncommitted terms file found (running in clean public mode).')

    total_errors = 0
    total_warnings = 0
    failed_files = 0

    for f in files:
        errs, warns = check_lesson_file(
            f,
            curriculum,
            private_terms,
            evidence_text,
            strict_links=strict_links
        )
        base = os.path.basename(f)
        
        has_fatal = bool(errs) or (warn_as_error and bool(warns))
        if has_fatal:
            failed_files += 1
            print(f'FAIL {base}')
            for e in errs:
                print(f'  [ERROR] {e}')
                total_errors += 1
            for w in warns:
                print(f'  [WARN]  {w}')
                total_warnings += 1
        elif warns:
            print(f'OK   {base} ({len(warns)} warnings)')
            total_warnings += 1
        else:
            print(f'OK   {base}')

    print('\n' + '=' * 60)
    print(f'Summary: {len(files) - failed_files}/{len(files)} files passed.')
    if total_errors > 0 or total_warnings > 0:
        print(f'Total Errors: {total_errors}, Total Warnings: {total_warnings}')

    return 1 if failed_files > 0 else 0

if __name__ == '__main__':
    sys.exit(main())
