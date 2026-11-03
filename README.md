# Building Apps with a Coding Agent

A comprehensive, zero-jargon curriculum designed to teach a complete non-programmer ("any general user") how to take an idea and ship a working, public web application by directing modern AI coding agents—without getting lost, stalled, or letting agents run wild.

---

## 🎯 Mission & Philosophy

Beginners directing AI coding assistants today face two major derailments:
1. **Setup paralysis**: Confusion over the terminal, permission prompts, environments, or project file layouts.
2. **Supervision breakdown**: Letting an agent loop indefinitely, burning hours, tokens, and context on unasked-for rewrites, hallucinated successes, or phantom bugs.

This course teaches you how to direct an agent like an experienced software project lead:
- **Scope cleanly**: Every task gets a goal, an audience, acceptance criteria, a stop condition, and a budget.
- **Verify with evidence**: "Done" is a claim, not proof. Run the app yourself, look at the live screen, check exit codes, and inspect diffs.
- **Maintain a safety net**: Use version control (`git`, commits, branches, pull requests) so no agent mistake can ever destroy working software.
- **Keep approvals on**: Start safely with strict human-in-the-loop permission gates before graduating to selective automation.

---

## 🛠️ The Three Supported Agents

All core concepts in this curriculum are vendor-neutral and agent-agnostic. Where specific commands, configuration files, and keybindings differ, lessons provide parallel, tabbed instructions across the three major command-line agents:

| Feature / Control | Claude Code (Anthropic) | Codex (OpenAI) | omp (oh-my-pi) |
| :--- | :--- | :--- | :--- |
| **Launch Command** | `claude` | `codex` | `omp` |
| **Project Rules File** | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` / `RULES.md` |
| **Interrupt Key** | `Esc` | Not documented to interrupt turn (`Ctrl+C` exits session) | `Esc` |
| **Approval / Safety Modes** | `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` | `read-only`, `workspace-write`, `danger-full-access` | `always-ask`, `write`, `yolo` |
| **Beginner Rule** | Set to ask / review | Keep sandboxed approvals ON | Move off `yolo` default to `always-ask` |

---

## 🗺️ Curriculum Architecture

The curriculum is planned as a granular graph of ~15-minute lessons across 10 sequential units. The course home page (`index.html`) serves as the public navigation portal for published modules, while the author's local planning specifications are tracked in `.scratch/lesson-index.md` and `.scratch/curriculum.json`.

A prioritized **First-Ship Path (marked with ★)** guides learners from zero terminal knowledge to deploying a live static web page via GitHub Pages before exploring deeper topics. The lesson files in `lessons/` are populated progressively against this curriculum specification.

### Course Outline

1. **Unit 0: Orientation & Setup**
   - What an agent loop is (Gather → Act → Verify).
   - Projects as folders, the terminal in five commands, approvals, and launching a local dev server.
2. **Unit 1: Telling the Agent What You Want**
   - Goal & audience over implementation recipes.
   - Cheap orienting questions, interactive interviews, the plan-then-go gate, and project rules files.
3. **Unit 2: Knowing What It Actually Did (Verification)**
   - Running the app yourself; treating claims vs. empirical evidence.
   - Regression tests, linters, one-command gates (`make check`), real browser verification, and independent reviewer agents.
4. **Unit 3: Version Control as the Safety Net**
   - Repositories, working trees, commits as save points, branches, remotes, pull requests, and safe undos.
5. **Unit 4: Scope & Stopping (Field Guide to Derailments)**
   - Definitions of done, scope ladders, explicit stop conditions, token/time budgets, and recovering from derailed runs.
6. **Unit 5: How Agents Work (Mental Model)**
   - Context windows, compaction, tool calling, model effort, subagents, and background processes.
7. **Unit 6: Shipping a Static App**
   - Build steps, static vs. dynamic architectures, GitHub Pages workflows, custom domains, and rollback procedures.
8. **Unit 7: Capstone Project**
   - End-to-end execution: ideation, scoping interview, development, verification, deployment, and post-launch retrospective.
9. **Unit 8: Beyond Static (Advanced Tracks)**
   - Secrets management, environment variables, third-party APIs, backends, emulators, authentication, and performance.
10. **Unit 9: Working at Scale**
    - Multi-ticket dependency graphs, worktrees, parallel agents, swarm research, and handoff documentation.

---

## 📂 Repository Layout
```
.
├── lessons/              # Standalone, interactive HTML lesson modules (actively populated)
│   ├── 0001-what-a-coding-agent-is.html
│   ├── 0002-the-three-agents.html
│   ├── 0003-your-project-is-a-folder.html
│   └── ... (navigable via index.html)
├── assets/               # Shared, lightweight CSS & JS runtime
│   ├── lesson.css        # Minimalist, accessible Tufte-style typography
│   └── lesson.js         # Interactive tabs, revealable recalls, and quiz scoring
├── index.html            # Course home portal and lesson directory
├── curriculum.json       # Public curriculum graph and lesson sequence
├── tools/                # Automated verification gates and pre-commit checks
├── MISSION.md            # Target learner persona, learning objectives, and core constraints
├── NOTES.md              # Author decisions, privacy rules, and pedagogical guidelines
├── RESOURCES.md          # Primary source documentation references & URLs
└── README.md             # Project documentation and navigation guide
```

*(Note: `.scratch/` contains the author's local working draft notes, validation scripts, and raw curriculum maps with internal audit annotations, which are kept uncommitted to preserve private session logs.)*
---

## 📖 Lesson Design & Standards

Every lesson is published as a standalone HTML file adhering to strict pedagogical and stylistic constraints:
- **Tufte-inspired typography**: Serif body text, generous margins, responsive layout, and zero distracting animations or marketing hype.
- **Standardized components**:
  - `<div class="agent-tabs">`: Tool-specific commands for Claude Code, Codex, and omp.
  - `<div class="vignette">` & `<pre class="transcript">`: Anonymized real-world case studies based on actual developer sessions.
  - `<div class="recall">`: Active retrieval practice before introducing downstream concepts.
  - `<div class="quiz">`: Fair, balanced multiple-choice checks (equal option lengths, non-trivial distractors, in-depth rationale for every answer).
  - `<div class="source-box">`: Grounded citations linking directly to official vendor documentation.

---

## 🚀 Getting Started

1. Clone or open this repository locally.
2. Navigate to `lessons/` in your file browser or terminal.
3. Open `lessons/0001-what-a-coding-agent-is.html` in any web browser to begin Lesson 0.1.
4. Follow the **Builds on** links and breadcrumb trails to progress sequentially through the First-Ship Path.
