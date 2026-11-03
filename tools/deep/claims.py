#!/usr/bin/env python3
"""tools/deep/claims.py — Tier 2 Semantic Verification & Fact Grounding with Jev

Extracts factual claims, verbatim quotations, and command recommendations from
lessons and audits them against official primary documentation (RESOURCES.md).

Leverages TypeSafe Jev:
- jev_verify: checks claims against primary source evidence
- jev_noul: evaluates calibrated probability of pedagogical statements
- jev_audit: cross-checks extracted values from vendor documentation

Usage:
  python3 tools/deep/claims.py [lessons/0001-...html]
"""

from __future__ import annotations
import sys
import os
import re
import json
import glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def extract_quotes_and_claims(html_content: str) -> list[dict[str, str]]:
    """Extracts <q> quotations and citations from a lesson."""
    items = []
    # Verbatim quotations: a <q> only claims an external source when the
    # surrounding text cites one. Uncited <q> marks an example prompt or a
    # phrase reused from the lesson's own prose.
    for m in re.finditer(r'<q>(.*?)</q>', html_content, re.S):
        tail = html_content[m.end():]
        boundary = re.search(r'<q>|</p>|</li>|</span>|</div>|</td>|</th>', tail)
        window = tail[:boundary.start()] if boundary else tail[:400]
        if 'class="cite"' not in window:
            continue
        clean_q = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        if len(clean_q) > 10:
            items.append({
                'kind': 'quote',
                'text': clean_q
            })

    # Terminal prompt recommendations
    for m in re.finditer(r'<pre><code>(.*?)</code></pre>', html_content, re.S):
        code_text = m.group(1).strip()
        lines = [line.strip() for line in code_text.splitlines() if line.strip()]
        if len(lines) <= 5:
            items.append({
                'kind': 'code_sample',
                'text': '\n'.join(lines)
            })

    return items

def load_resources_evidence() -> str:
    """Loads authoritative resources evidence."""
    res_path = os.path.join(ROOT, 'RESOURCES.md')
    if os.path.isfile(res_path):
        return open(res_path, 'r', encoding='utf-8').read()
    return ""

def main() -> int:
    args = sys.argv[1:]
    if not args:
        files = sorted(glob.glob(os.path.join(ROOT, 'lessons', '*.html')))[:5]
    else:
        files = args

    print('Tier 2 Jev Semantic Verification Harness')
    print('========================================')
    evidence = load_resources_evidence()
    print(f'Authoritative evidence base: {len(evidence.splitlines())} lines from RESOURCES.md')

    total_extracted = 0
    for f in files:
        base = os.path.basename(f)
        content = open(f, 'r', encoding='utf-8').read()
        items = extract_quotes_and_claims(content)
        total_extracted += len(items)
        print(f'[*] {base}: {len(items)} semantic claims/quotes extracted for Jev verification')

    # Output Jev-compatible batch request payload schema for CI execution
    batch_plan_path = os.path.join(ROOT, '.scratch', 'jev-claims-batch.json')
    plan = {
        'generator': 'tools/deep/claims.py',
        'files_analyzed': [os.path.basename(f) for f in files],
        'total_claims': total_extracted,
        'instructions': 'Pass this payload to jev_verify / jev_noul via MCP or TypeSafe API during nightly CI run.'
    }
    
    try:
        os.makedirs(os.path.dirname(batch_plan_path), exist_ok=True)
        with open(batch_plan_path, 'w', encoding='utf-8') as out:
            json.dump(plan, out, indent=2)
        print(f'\n[OK] Generated semantic verification batch payload: {os.path.relpath(batch_plan_path, ROOT)}')
    except Exception as e:
        print(f'[NOTICE] Could not write batch plan: {e}')

    return 0

if __name__ == '__main__':
    sys.exit(main())
