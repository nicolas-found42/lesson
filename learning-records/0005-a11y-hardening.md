# 0005 — Accessibility hardening of the home page

The unit map (0003) and the one motion effect (0004) changed the page's shape. This note records the accessibility decisions made on top of them, because the review loop that produced them kept finding that a visually correct page can still be wrong for a keyboard or screen-reader visitor.

## What changed, and why

- **Skip link moves focus, not just scroll.** `<a class="skip-link" href="#main">` points at `<main id="main" tabindex="-1">`. A plain anchor scrolls but leaves focus at the top, so the next Tab returns to the header. Measured: Tab then Enter leaves `document.activeElement.id === "main"`, and the next Tab lands on the first CTA inside `main`. `main` itself draws no ring (`main:focus, main:focus-visible { outline: none }`) because it is a region, not a control.
- **Unit sections are focus targets too.** Each `<section class="unit-section">` carries `tabindex="-1"` and `scroll-margin-top: 5.5rem`, so a rail chip or a `#unit-N` deep link moves focus to the unit rather than dropping it back at the document top. Measured: after clicking the Unit 6 chip, `document.activeElement.id === "unit-6"` and the section is open.
- **The ★ marker has a name.** Every first-ship card carries `<span class="star-badge" role="img" aria-label="First-ship">★</span>`; a bare "★" announces as "black star" or nothing. 41 markers, verified in the DOM.
- **The star filter exposes state, the expand button exposes relation.** `#star-toggle` is a `<button aria-pressed="false|true">` whose label never changes (`First-ship only (41)`), so the state is a property, not a word the reader has to re-read. `#expand-toggle` dropped `aria-pressed` entirely: it is a command, not a toggle of one thing, and it now names what it changes with `aria-controls` listing the eleven unit ids. `expandMode` in the script is the single source of truth.
- **Focus rings are visible on every keyboard stop.** `.lesson-card:focus-visible` draws a 2 px accent outline; measured by walking the page with Tab and reading the computed outline of each stop. The accent measures 8.55:1 against the page background in light, 8.47:1 in dark — well past the 3:1 non-text minimum.
- **The live status describes what is readable.** A count sentence names the number of matching cards; when every visible row is closed it gains "all units collapsed, expand to read them", and while a filter is active a partly closed result gains "some units are collapsed…". The default layout's own closed rows stay silent — the page ships with Unit 0 and Reference open, so narrating that on load would describe the design, not a condition. Native `toggle` events repaint the sentence, so closing a matching row by hand updates it without another keystroke. A zero-match sentence never starts with "0 of" and never carries a collapse hint. A 60-step randomised walk over query, star, expand and Escape actions found no state where the announced count differed from the visible cards.
- **The filter cannot start a pile of animations.** See 0004: the disclosure transition is enabled only by a click on a summary, so a keystroke that rewrites `open` for eleven units starts nothing.

## Rejected

- **`aria-live="polite"` on the whole results region.** It would announce every card change on each keystroke, including the ones already on screen. The short status line is the announcement surface.
- **`role="status"` plus an empty element swapped in and out.** One persistent element whose text changes is announced once per change by every tested reader; swapping nodes loses the announcement.
- **`aria-pressed` on the expand button.** It reads as "pressed = expanded", which is wrong while some units are open and others are not; `aria-controls` plus a label that describes the next action is accurate in every state.
- **A visible skip link pinned to the top.** It would occupy the first line of a scan-first page for the majority who never need it; the standard off-screen-until-focused pattern costs nothing visually.

## Verification

`tools/deep/home-smoke.mjs` (57 assertions, `PASS 57 / FAIL 0`) covers the skip-link focus target, keyboard-reached card ring, the star `aria-pressed` transitions, the expand button's `aria-controls` and absent `aria-pressed`, the status sentence in every state, including a hand-closed matching row, the randomised consistency walk, and zero console errors. W3C Nu reports no HTML or inline-CSS errors; every tab set has a matching panel set. Contrast was computed in-page with relative luminance and alpha compositing across light/dark and four states (default, unit query, star filter, all expanded): 21–22 colour-size pairs per state, zero AA failures across eight combinations (`tools/deep/home-a11y-audit.mjs`).

## Claim ledger

| Claim in the notes | Artifact |
|:---|:---|
| Heights 38,562 / 5,021 / 19,645 / 2,473 px (0003) | baseline copy of `HEAD:index.html` beside `assets/`, then the shipped page, 1280×900 and 320 px |
| 124 cards, 116 lessons, 11 disclosures, 41 stars, 11 rail chips (0003) | live DOM counts |
| Rail chip focuses its unit (0003) | `document.activeElement.id === "unit-6"`, hash `#unit-6`, unit open |
| Status sentences in eight states, 60-step walk with no mismatch | `tools/deep/home-smoke.mjs` output |
| One disclosure transition, gated on `.animatable` (0004) | `assets/home-motion.css`, `index.html` chevron rule |
| Filter typing: `260.375px` ×5, `getAnimations()` 0, no `.animatable` | in-page sampling at 25 ms |
| Click walk 38.5 → 630.5 px; Enter on a summary animates | in-page sampling at 25 ms |
| Reduced motion: 812 boxes, 0 transitions, 0 animations | `tools/deep/home-a11y-audit.mjs` on the expanded page |
| Nu probe: 3 errors (2× `interpolate-size`, 1× `allow-discrete`) | probe copy with the sheet inlined |
| Skip link focuses `main`, next Tab reaches the first CTA (0005) | keyboard walk |
| Contrast: 21–22 pairs per state, 0 AA failures, accent 8.55:1 / 8.47:1 | `tools/deep/home-a11y-audit.mjs` |
