# Building apps with a coding agent — Resources

All entries below were fetched live on 2026-11-02 (full quotes and caveats in the private `.scratch/sources.md`). Re-check permission-mode pages before publishing; they change often.

## Knowledge

### Claude Code (Anthropic)
- [Claude Code overview](https://code.claude.com/docs/en/overview) — what it is, macOS install, first-use login. Use for: setup page, lesson 0.1/0.5.
- [Quickstart](https://code.claude.com/docs/en/quickstart) — first session, `/help`, `/resume`, `claude -c`. Use for: first prompt (0.7), resuming (5.1).
- [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works) — the gather-context / act / verify loop, tools, sessions, context window. Use for: **primary source for 0.1**, Unit 5.
- [Choose a permission mode](https://code.claude.com/docs/en/permission-modes) · [Permissions](https://code.claude.com/docs/en/permissions) · [Sandboxing](https://code.claude.com/docs/en/sandboxing) — modes (default, acceptEdits, plan, auto, dontAsk, bypassPermissions). Use for: 0.6. Note: since v2.1.283 sessions start in auto mode.
- [How Claude remembers your project (CLAUDE.md)](https://code.claude.com/docs/en/memory) — rules files, `/init`, AGENTS.md compatibility. Use for: 1.12.
- [Interactive mode](https://code.claude.com/docs/en/interactive-mode) · [Commands](https://code.claude.com/docs/en/commands) · [Skills](https://code.claude.com/docs/en/skills) — Esc to interrupt, slash commands, skills. Use for: 1.10, 1.11.
- [Best practices](https://code.claude.com/docs/en/best-practices) — give a way to verify, interrupt early, plan first. Use for: Units 1, 2, 4.

### Codex (OpenAI)
- [Codex CLI](https://learn.chatgpt.com/docs/codex/cli) — install and sign-in. Docs moved here from developers.openai.com. Use for: setup page.
- [Authentication](https://learn.chatgpt.com/docs/auth) · [Permissions](https://learn.chatgpt.com/docs/permission-modes) · [Sandboxing](https://learn.chatgpt.com/docs/sandboxing) · [Approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security) — sandbox modes (read-only, workspace-write, danger-full-access) and approval policies. Use for: 0.6.
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md) — project rules file. Use for: 1.12.
- [Slash commands / CLI reference](https://learn.chatgpt.com/docs/developer-commands?surface=cli) · [Skills and plugins](https://learn.chatgpt.com/docs/skills-and-plugins) — steering, queueing, resume, `$` skills. Use for: 1.10, 1.11.
- [Best practices](https://learn.chatgpt.com/guides/best-practices) — beginner guidance; four-part prompt (Goal, Context, Constraints, Done when). Use for: Unit 1, 4.1.
- [ChatGPT desktop app](https://learn.chatgpt.com/docs/app) — where the Codex app now lives. Use for: setup page.

### omp (oh-my-pi) — single-vendor sources only
- [omp.sh](https://omp.sh/) · [GitHub repo](https://github.com/can1357/oh-my-pi) — install, provenance (fork of Pi). No independent review exists; label this when cited.
- [Quickstart](https://omp.sh/docs/quickstart) · [Sessions](https://omp.sh/docs/sessions) · [Keybindings](https://omp.sh/docs/keybindings) · [Skills](https://omp.sh/docs/skills) — first launch, Esc, `-c`, `/resume`. Use for: 0.5, 0.7, 1.10.
- [Tool approvals](https://omp.sh/docs/approvals) — modes always-ask / write / yolo; **built-in default is yolo**. Use for: 0.6 (beginners must change it first).
- [Context files](https://omp.sh/docs/context-files) — AGENTS.md, RULES.md. Use for: 1.12.

### General
- [Building effective agents](https://www.anthropic.com/research/building-effective-agents) (Anthropic, Dec 2024) — "LLMs using tools … in a loop". Banner says tooling details are outdated; cite only the core definition.
- [Pro Git](https://git-scm.com/book/en/v2) (Chacon & Straub) — snapshots, three states, status/add/commit. Use for: Unit 3.
- [GitHub Pages quickstart](https://docs.github.com/en/pages/quickstart) — publish a site. Use for: Unit 6, mini-ship.

## Wisdom (Communities)

None verified yet (see Gaps). The user has not opted out of communities.

## Gaps
- A reputable, moderated community for non-programmers building with agents (vet before listing).
- Independent confirmation of omp behaviour; Codex Esc-to-interrupt is undocumented (test before claiming).
- Which mode a fresh Claude Code / Codex session opens in on a clean machine (not launched during research).
- Beginner-friendly explainers on HTML/CSS/JS basics (for lesson 0.8) and on terminals (0.4): not yet sourced.
