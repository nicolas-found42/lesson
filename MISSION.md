# Mission: Building apps with a coding agent

## Why
A complete non-programmer with an idea for a small app should be able to turn it into a working, public web app by directing a coding agent, without knowing how to code and without getting lost when the agent goes wrong. Today beginners either stall at setup or let the agent run unsupervised and burn hours on work nobody asked for.

## Success looks like
- Ships a small static web app of their own idea to a public URL (GitHub Pages or similar), mostly unaided.
- Can start, steer, interrupt and resume a session in Claude Code, Codex or omp, and knows which behaviours transfer between them.
- Scopes every task with a goal, an audience, a definition of done, a stop condition and a budget.
- Checks the agent's work by running the real app, not by trusting "done".
- Keeps a safety net: commits often, uses branches and pull requests, and can recover from a bad run.
- Recognises the common derailments (scope creep, vague prompts, unbounded loops, wrong-place edits, leaked secrets) before they cost hours.

## Constraints
- Learner is a complete non-programmer; no concept is skipped, every hard topic is split into sub-concepts, one per lesson (~15 min).
- Concepts are taught once, with tabbed Claude Code / Codex / omp steps; setup lives on one reference page.
- Beginners keep approval prompts on throughout the core path.
- First-ship path (★ lessons) comes first, with a "hello world" deploy right after Unit 0; deepening units follow.
- Lessons use anonymized examples derived from the author's real sessions: no verbatim quotes, names, paths or secrets. Private audit material stays in `.scratch/`.
- Local HTML files for now; publishing is decided after the author has reviewed several lessons.

## Out of scope
- Teaching programming languages or frameworks directly (the agent picks them unless the learner cares).
- Backends, databases and logins before the capstone (covered later in Unit 8).
- Comparing agents or models as products.
