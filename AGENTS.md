# AGENTS.md

This repo publishes a beginner curriculum as static HTML. `lessons/*.html`, `index.html`, and `assets/` are the product; `tools/` is the local quality flow that keeps them shippable.

## Run the six layers before every commit

```bash
git config core.hooksPath .githooks    # once per clone; prints nothing when set
python3 -I tools/run_layers.py --staged # or let the pre-commit hook run it
```

The hook runs on every commit. Without the config line, commits silently skip it — verify with `git config core.hooksPath`, which prints `.githooks`.

**Done when** the run prints all six layer sections and reports zero L1/L6 errors for the files you changed. Findings elsewhere are the corpus's, not yours.

Run modes, by what you touched:

| Change | Command |
| :--- | :--- |
| Lesson HTML or `index.html` | `python3 -I tools/run_layers.py --staged` (hook does this) |
| `tools/`, workflow, or `.githooks/` | `python3 -I tools/run_layers.py` — full corpus, because layer behavior changed |
| One file, while iterating | `python3 -I tools/run_layers.py lessons/0001-what-a-coding-agent-is.html` |

`npm run layers` and `npm run layers:staged` are the same two commands. Runs over more than five files show warning counts per file; add `--verbose` for the warning text.

### Layers

| Layer | Checks | Needs |
| :--- | :--- | :--- |
| L1 | Tag balance, one `<h1>`, component contracts | — |
| L2 | Horizontal overflow at 320/390/768/1100/1189/1280px | `npm install` (Playwright + system Chrome) |
| L3 | W3C Nu conformance, ARIA tab/panel pairing | Java 11+ |
| L4 | Prose budget, readability, giveaway quiz wording | — |
| L5 | Quote/claim provenance and Jev batch in `.scratch/jev-claims-batch.json` | — |
| L6 | Relative links, index sync, privacy terms, entropy | — |

`[SKIP]` or an install hint means the layer did not run. Install the dependency, then rerun to get its coverage.

### Reading findings

- **Report-only is the default**: findings print, exit code stays 0, commits land. Set `CHECK_LESSONS_STRICT=1` to block on findings.
- Fix findings in files you changed. Pre-existing corpus findings — `.sidenote` overflow at 1100px, tab/panel mismatch, lessons not yet linked from `index.html` — belong to the authoring pass in progress.
- L2/L3 run against lesson targets only; a run over the corpus takes ~16s, a staged subset ~3s.

## Authoring rules

- **Index sync**: a new lesson lands with its card in `index.html` in the same change; L6 names every unlinked lesson.
- **Anonymize**: vignettes come from the author's sessions, rewritten without names, paths, repository names, or secrets. The privacy gate loads its term list from uncommitted `.scratch/` at runtime, so committed files never carry the list.
- **Reference pages**: linking `reference/*.html` before the page exists is a warning, so authoring can proceed; CI blocks only genuinely broken links — a relative path to a file that neither exists nor appears in `curriculum.json`. Check the real set with `python3 -I tools/check_lessons.py index.html --strict-links`.

## Deploy contract

`main` deploys by itself: `.github/workflows/deploy.yml` runs a structure gate on `index.html` (files present, valid HTML, links resolve to a real file or a curriculum entry), then publishes `index.html`, `lessons/`, `assets/`, `reference/`, and `curriculum.json`. Deep layers stay local, so a push is the only step after your commit — no manual deploy command.
