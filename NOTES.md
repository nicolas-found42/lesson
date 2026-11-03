# Notes

## Who is who
- The user (nicolas) is the course **author** and an expert agent user. The **learner persona** is "any general user", a complete non-programmer. Write lessons for the persona; the author reviews each lesson and corrects it against what his transcripts show.

## Decisions (confirmed)
- One concept per lesson, ~15 min, one tangible win. Lesson count is set by the concept graph (draft: 115 lessons; ~40 on the ★ first-ship path), not capped.
- Do not remove content for a beginner's sake: break hard topics into granular sub-concepts instead.
- Teach all three agents (Claude Code, Codex, omp) via tabbed steps; setup on one reference page.
- Teach behaviours (interview, plan gate, stop condition) as plain copy-paste prompts, not the author's personal skills. A starter skill pack may come later as a reference page.
- Beginners keep approvals ON; "never ask"/bypass modes are a late, optional lesson with the risks.
- Delivery: local HTML first.
- Default stack: static web app, free hosting, no backend until after the capstone.

## Privacy
- Raw audit notes and the concept map live in `.scratch/` (private). Nothing there is published. Lessons carry only anonymized, rewritten vignettes.
- Never quote transcripts verbatim; no project names, paths, names or secrets in lessons or references.

## Style
- Tufte-like: serif text, generous margins, sidenotes, no clutter. Reuse `assets/lesson.css`.
- Quizzes: answers equal length, correct position varied, no formatting clues.
- Every lesson: link to primary source, link to related lessons/references, reminder to ask the teacher.
- Glossary entries only once the author confirms a term is understood; keep terminology consistent with `reference/glossary.html`.

## Audit lessons-learned (process)
- Heuristic "derailment" labels produced a false positive (#18); verify by reading before teaching from an example.
- Subagents launched in the same step as the file they read will miss it: write shared files first.
