# Vignettes and examples carry no private identifiers
source: AGENTS.md:48
severity: high
paths: lessons/*.html, index.html, reference/*.html
A lesson, index, or reference page must not contain a real person's name, a private repository or employer name, a local workstation path such as `/Users/` or `C:\Users\`, or a credential. Public product and vendor names used in teaching prose are allowed.

# The privacy term list never enters a tracked file
source: AGENTS.md:48
severity: high
when: turn
The privacy term list is loaded at runtime from the uncommitted `.scratch/` workspace. A change that adds that list, or any block of it, to a tracked file is a violation.

# Quizzes do not telegraph the correct option
source: AGENTS.md:33
paths: lessons/*.html
The correct quiz option must not be the uniquely longest option, must not repeat the question's answer phrase, and must not use giveaway wording. An option whose correctness is obvious without knowing the material is a violation.

# Pre-existing corpus findings are not silenced by unrelated rewrites
source: AGENTS.md:42
paths: lessons/*.html
Do not delete or restyle `.sidenote` blocks, or rewrite tab markup, only to silence the pre-existing 1100px overflow or tab/panel warnings. A cleanup-only rewrite of a lesson you did not otherwise change is a violation.

# Every lesson has an index card in the same change
source: AGENTS.md:47
when: turn
A new or renamed `lessons/*.html` file must come with a matching card in `index.html` whose link points at that file. A lesson added without its card, or a card pointing at a missing lesson, is a violation.

# The pre-commit hook keeps running the staged layers
source: AGENTS.md:12
severity: high
paths: .githooks/**
The pre-commit hook must run `python3 -I tools/run_layers.py --staged` and exit with that command's status. Removing the run, adding `|| true`, or exiting 0 unconditionally is a violation.

# npm layer scripts keep their exact commands
source: AGENTS.md:24
paths: package.json
`npm run layers` must run `python3 -I tools/run_layers.py`; `layers:staged` must add `--staged`. Changing either script to skip a layer or to run a different command is a violation.

# Strict mode stays opt-in
source: AGENTS.md:41
paths: tools/run_layers.py, tools/check_lessons.py
Findings print and the run exits 0 by default. Only `CHECK_LESSONS_STRICT=1` turns layer failures into a nonzero exit. Making advisory prose, readability, or warning findings block by default is a violation.

# L2 and L3 stay scoped to lesson targets
source: AGENTS.md:43
paths: tools/deep/*.mjs
The visual and HTML layers run against lesson targets, falling back to the corpus only when `index.html` alone changed. Widening them to scan `reference/` or `assets/` is a violation.

# The deploy gate keeps its structure checks
source: AGENTS.md:53
severity: high
paths: .github/workflows/**
The deploy gate must check that `index.html` exists, is valid HTML, and that each link resolves to a real file or a curriculum entry. Removing or weakening any of those checks is a violation.

# Deploys stay automatic and publish the static site only
source: AGENTS.md:53
paths: .github/workflows/**
The workflow triggers on `main` and publishes `index.html`, `lessons/`, `assets/`, `reference/`, and `curriculum.json`. Adding a manual deploy step, another trigger, or dropping a published path is a violation.
