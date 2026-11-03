# 0003 — The home page is a map of ten units, not a wall of 116 links

Decision: `index.html` lists the corpus as ten collapsed `<details class="unit">` rows — title, lesson count, ★ count, and a one-line payoff — each opening onto a compact auto-fill card grid. Three access paths survive collapsing: the search box (filters all 124 cards, opens matching units), the ★ First-ship toggle (41 of 116 lessons), and an 11-chip unit rail that jumps and opens a unit. Unit 0 and Reference cards start open.

**Why**: the shipped page was 116 full-width cards in one column. Measured page height before → after:

| Viewport | Before | After (default disclosures) |
|:--|--:|--:|
| 320 px | 38,562 px | 5,021 px |
| 1280 px | 19,645 px | 2,473 px |

At 1280 px the first screen now ends inside Unit 0's cards; the other nine units are one line each. No lesson link was removed — L6 still reports index.html links all 116 lessons, and all 124 cards remain in the DOM, so Ctrl+F and crawlers see everything.

**Rejected**: a flat multi-column grid (still ~40 rows); a separate `/lessons` index page (an extra hop plus a second list to keep in sync, against the L6 index-sync rule); JS tabs (hide content from find-in-page and delete the no-JS path); ARIA `menu` navigation (APG says site navigation should not use it).

**Tradeoffs taken**:
- Card ledes clamp to two lines. The full sentence stays in the DOM and on the lesson page; the title is never truncated. Documented as a 1.4.4/F69 tradeoff in `0002-homepage-navigation-research.md` §6.
- Units start closed, so a shared `#unit-N` link needs the inline script: the id sits on the wrapping `<section>`, and the browser's fragment-driven revealing only opens a `<details>` when the fragment target is *inside* it, not when it is an ancestor (measured in Chrome 156, §3 of 0002). Each section carries `tabindex="-1"`, so a rail chip or deep link moves keyboard focus to the unit (measured: `document.activeElement.id === "unit-6"` after a chip click) instead of only scrolling; the section itself draws no ring.
- The filter controls are `hidden` until the script unhides them, so a no-JS visit shows no dead search box. Units still expand natively.
- The live status states what is actually readable, not just what matched: with every row closed it appends "all units collapsed, expand to read them"; with some rows closed it appends "some units are collapsed…" only while a filter is active, because the default layout's own closed rows are not a condition worth announcing; and when every visible row is open it stops at the count. Closing a matching row by hand repaints the sentence, so the hint appears without another keystroke. A zero-match sentence never carries that hint, so "nothing matched" and "matches are hidden" stay distinct.

**Verification** (all run, not inferred; the smoke script is `tools/deep/home-smoke.mjs`, run with `node tools/deep/home-smoke.mjs`): `tools/deep/visual.mjs index.html` at 320/390/768/1100/1189/1280 — no horizontal overflow; `tools/deep/html.mjs index.html` — W3C Nu clean; `python3 -I tools/run_layers.py index.html` — all layers, no findings. A 57-assertion Playwright pass covered initial state, search (word and `unit N` queries), Escape, ★ filter (41 shown, empty units hidden), expand/collapse all, rail jump, `hashchange`, deep link on load, empty state, keyboard toggle of a summary, and zero console errors. Screenshots checked in light and dark.

**Bug worth remembering**: the first filter draft stored text on the anchor with `card.text = …`. `HTMLAnchorElement.text` is a live setter for `textContent`, so it flattened every card to plain text. Card data now lives in plain objects.
