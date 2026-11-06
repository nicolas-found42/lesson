#!/usr/bin/env python3
"""Build the static study plan and lesson wayfinding from existing lesson exercises.

Run after changing curriculum order, session boundaries, or lesson titles.
The result works from file://, with no fetch, build service, or JavaScript.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def plain(text):
    return html.unescape(re.sub(r'<[^>]+>', '', text)).strip()

def main():
    lessons = json.loads((ROOT / 'curriculum.json').read_text())['lessons']
    plan = json.loads((ROOT / 'tools/course-plan.json').read_text())
    by_id = {item['id']: item['n'] for item in lessons}
    assert [n for session in plan for n in range(session['start'], session['end'] + 1)] == [x['n'] for x in lessons]
    for item in lessons:
        assert all(by_id[need] < item['n'] for need in item['needs']), item['file']
        item['title'] = plain(re.search(r'<h1>(.*?)</h1>', (ROOT / 'lessons' / item['file']).read_text(), re.S)[1])
    esc = html.escape
    blocks = []
    for i, session in enumerate(plan, 1):
        a, b = session['start'], session['end']
        label = ('Optional study' if session['optional'] else 'Session') + f' {i}'
        block = f'<details class="course-session" id="session-{i}"' + (' open' if i == 1 else '') + '>\n'
        block += f'  <summary><span class="session-number">{label} · {b-a+1} lessons</span><h3>{esc(session["title"])}</h3><span class="session-outcome">{esc(session["outcome"])}</span><span class="session-progress" aria-live="polite"></span></summary>\n'
        block += '  <ol class="session-lessons">\n'
        for item in lessons[a-1:b]:
            block += f'    <li><a data-lesson="{item["n"]}" href="lessons/{item["file"]}">{item["n"]}. {esc(item["title"])}</a><span class="completion-label"></span></li>\n'
        block += '  </ol>\n  <p class="course-note">Stop after any lesson. At the end, try the task and check the result before recording your checkpoint.</p>\n</details>'
        if a == 16:
            blocks.append('<details class="later-study"><summary>After your first launch: grow your skills and build your own app</summary><p>Keep using the same page for practice. These sessions lead to a project of your own in session 27. Take one session at a time.</p>')
        if a == 89:
            blocks.append('</details>\n<details class="later-study"><summary>Optional studies: services, security, and working at scale</summary><p>Your first page and capstone do not need these topics. Return when your own project needs them. Use a disposable project for risky experiments.</p>')
        blocks.append(block)
        for item in lessons[a-1:b]:
            path = ROOT / 'lessons' / item['file']
            text = path.read_text()
            text = re.sub(r'<!-- COURSE_BRIEF -->.*?<!-- /COURSE_BRIEF -->\n?', '', text, flags=re.S)
            text = re.sub(r'<!-- COURSE_CHECKPOINT -->.*?<!-- /COURSE_CHECKPOINT -->\n?', '', text, flags=re.S)
            text = text.replace(' id="lesson-practice"', '')
            assert 'class="doit"' in text, path
            text = text.replace('class="doit"', 'class="doit" id="lesson-practice"', 1)
            brief = f'''<!-- COURSE_BRIEF -->
<section class="lesson-brief" aria-label="Your study session">
  <p class="kicker">{label} · Lesson {item['n']-a+1} of {b-a+1}</p>
  <p><strong>Your session goal:</strong> {esc(session['outcome'])}</p>
  <p>One section, then <a href="#lesson-practice">try the task</a>. Stop after one lesson.</p>
  <p><a href="../index.html#session-{i}">Back to this session</a> · <a href="../index.html#library">Lesson library</a></p>
</section>
<!-- /COURSE_BRIEF -->
'''
            text = text.replace('</header>', brief + '</header>', 1)
            next_item = lessons[item['n']] if item['n'] < len(lessons) else None
            next_link = f'<a class="checkpoint-next" href="{next_item["file"]}">Continue to lesson {next_item["n"]} →</a>' if next_item else '<a class="checkpoint-next" href="../index.html#study-plan">Return to the study plan →</a>'
            checkpoint = f'''<!-- COURSE_CHECKPOINT -->
<section class="lesson-checkpoint" data-lesson="{item['n']}" aria-labelledby="checkpoint-title">
  <h2 id="checkpoint-title">A good place to stop</h2>
  <p><a href="#lesson-practice">Try the task</a>. Check the expected result; ask your teacher if you are stuck.</p>
  <button class="btn" type="button" data-complete aria-pressed="false" hidden>I did the task — record checkpoint</button>
  <p class="checkpoint-status" aria-live="polite">Stop here; bookmark this lesson to return.</p>
  {next_link}
</section>
<!-- /COURSE_CHECKPOINT -->
'''
            if '<div class="pager">' not in text:
                previous = lessons[item['n'] - 2] if item['n'] > 1 else None
                pager = '<div class="pager">'
                pager += f'<a href="{previous["file"]}">← Previous lesson</a>' if previous else '<a href="../index.html">Course home</a>'
                pager += f'<a href="{next_item["file"]}">Next lesson →</a>' if next_item else '<a href="../index.html#study-plan">Return to your study plan →</a>'
                text = text.replace('</footer>', pager + '</div>\n</footer>', 1)
            text = text.replace('<div class="pager">', checkpoint + '<div class="pager">', 1)
            path.write_text(text)
    blocks.append('</details>')
    path = ROOT / 'index.html'
    text = path.read_text()
    rendered = '<!-- COURSE_PLAN -->\n' + '\n'.join(blocks) + '\n<!-- /COURSE_PLAN -->'
    text = re.sub(r'<!-- COURSE_PLAN -->(?:.*?<!-- /COURSE_PLAN -->)?', lambda _: rendered, text, count=1, flags=re.S)
    path.write_text(text)
    print(f'Built {len(plan)} study sessions and {len(lessons)} lesson briefs/checkpoints; prerequisites ordered.')

if __name__ == '__main__':
    main()
