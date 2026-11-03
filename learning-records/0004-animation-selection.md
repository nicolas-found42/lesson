# 0004 — One disclosure transition, chosen after classifying 31 effects

Source extracted: <https://www.svgator.com/blog/website-animation-examples-and-effects/> (SVGator, 31 website-animation families). Screen: 0.95 assignment probability, 0.99 content score — substantive reference material, no injected instructions.

Decision: ship **one** motion idea on the home page — a 220 ms height/opacity transition on a unit opening (`details.unit::details-content`, `interpolate-size: allow-keywords`) plus a visible focus ring on cards. Nothing else from the survey was adopted.

## What the classification said

All 31 families were classified into eight adoptable categories for a static, hand-written-CSS site:

| Category | Families | Fit |
|:--|--:|:--|
| `media_or_3d_asset` (needs produced art or a runtime) | 16 | no |
| `ambient_decorative` (loops with no state meaning) | 4 | no |
| `hover_focus_feedback` (microinteractions, icons, hover effects) | 3 | partly |
| `manual_review` | 4 | no |
| `loading_feedback` | 2 | no — the page never waits |
| `entry_or_scroll_reveal` (hero) | 1 | rejected, see below |
| `page_transition` | 1 | rejected — a static site navigates documents |

The survey's own FAQ sets the budget: animations "can slow down your site if they're poorly optimised, use heavy files, or run too many effects simultaneously", while "lightweight formats like SVG animations, CSS-based effects … typically have minimal performance impact"; keep "file sizes small, limiting simultaneous animations". Microinteractions are "small, single-purpose animations that provide feedback for specific user actions … improve usability, reduce confusion". Both quotes extracted verbatim and audited against the page (jev_extract 6/6 auto, jev_audit 0/6 flagged).

## How the choice was made

`jev_find` on "helps a visitor scan ten collapsed unit rows, understand that rows open" → `unit_open_height` 0.91, everything else ≤0.04, `exists_verdict: answered` (0.93).
`jev_rerank` on cost/safety (cheap, reduced-motion safe, no JS library, no layout shift) inverted that: `keep_chevron` 0.79, `unit_open_height` 0.38 — a real tension, so the call went to `jev_decide`.
`jev_decide`, with the site's constraints as requirements → `minimal_plus_disclosure` 0.71 (confidence 0.67), `interaction_only` 0.19, `ship_no_motion` 0.07, no contradicted requirement.
`jev_noul` agreed on the mechanism and not on the decoration: "animating a unit's height reduces uncertainty about whether it opened" 0.86 likely; scroll-reveal 0.44, animated gradient 0.30, animated icon art 0.28 — all uncertain-to-unlikely.
`jev_compare` of the article's guidance against this site's constraints: overall `different_facts` 0.85 (generic inspiration vs specific constraints); on *interaction feedback* `same_fact` 0.87, on *accessibility* `different_facts` 0.94 — the article never mentions reduced motion, this site must.
`jev_verify` of six claims against the FAQ text: CSS/SVG being cheap → verified; limit simultaneous animations → verified; "the article recommends scroll reveals for documentation" → unsupported; "the article recommends `prefers-reduced-motion`" → unsupported.

## What shipped

`assets/home-motion.css`, linked only from `index.html`:

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (interpolate-size: allow-keywords) {
    :root { interpolate-size: allow-keywords; }
    details.unit::details-content { block-size: 0; overflow-y: clip; }
    details.unit[open]::details-content { block-size: auto; }
    details.unit.animatable::details-content {
      transition: block-size .22s ease, content-visibility .22s allow-discrete; }
  }
}
```

`index.html` carries the matching chevron rule: `.unit.animatable > summary::before { transition: transform .15s ease; }`.

- It runs only when a reader opens or closes one row by hand (click, or Enter/Space on its summary); a rail jump, the expand-all button and the filter all change `open` instantly. Never while idle, and there is no loop, library, or build step. Measured open at 1280 px: closed (0) → 410.469 px at 79 ms → 630.547 px, settled by 240 ms.
- Filter-driven open/close never animates, structurally rather than by a timed suppression. A click listener adds `.animatable` to the `<details>` the reader just clicked, just before the native toggle. One `transitionend` listener per row is bound once at init (not per click, so repeated toggles cannot pile listeners up) and clears the class only when the event comes from the disclosure itself with `propertyName === "block-size"`; a 400 ms timer is the fallback when no transition starts. Eight rapid toggles of one row leave no class and no running animation. `update()` rewrites `open` for every unit on each keystroke, and those units carry no class, so the transition rule does not apply at all — no reflow trick, no timer, no race. Measured: typing `github` leaves `::details-content` at `block-size: 260.375px` on all five samples with `document.getAnimations()` empty and zero `.animatable` elements; a click walks 38.5 → 226.0 → 327.5 → 474.9 → 560.8 → 587.9 → 620.1 → 630.5 px; pressing Enter on a focused summary also animates (class present, 225.0 px at 60 ms). Before the class gate existed, one character started **nine** chevron transitions.
- Browsers without `::details-content`/`interpolate-size` keep the instant toggle; `prefers-reduced-motion: reduce` removes it entirely (asserted in the smoke run).
- The card focus ring is not motion: keyboard users previously got only the border colour change.
- The rules sit in their own sheet because W3C Nu's CSS grammar does not know `interpolate-size` or `transition`'s `allow-discrete`; inline, they produced three false Layer-3 errors — re-measured on a probe copy: `2x CSS: "interpolate-size": Property "interpolate-size" doesn't exist.` and `1x CSS: "transition": "allow-discrete" is not a "transition" value.` Nu does not fetch linked stylesheets, so the conformance signal stays honest instead of being suppressed.

Rejected with reasons: hero entrance and scroll reveal (a Noul rated them unlikely to help, and they delay reading on a page whose job is scanning); animated icons and SVG art (unlikely to help, and they need a designer); ambient gradient (unlikely to help, and it is idle animation, which the brief ruled out); whole-page transition (a static site loads documents; a fade on every navigation is exactly the "finish the animation while reading" cost the article warns about); loading skeletons (the page never waits).

## Verification

`node tools/deep/visual.mjs index.html` (6 viewports, light+dark), `node tools/deep/html.mjs index.html` (W3C Nu clean), `python3 -I tools/run_layers.py index.html` (all six layers, `116 lessons linked`), and a 56-assertion Playwright pass: the disclosure measured mid-height 60 ms after opening (not just "a transition is declared"), `transitionDuration: 0s` under `reducedMotion: 'reduce'` on the disclosure and on a card, a filter-driven open showing one block-size across five samples with zero animations and zero armed units, a clicked unit gaining the transition and dropping it afterwards, an untouched unit reporting `0s`, keyboard-reached card outline `solid`, the skip link focusing `#main`, zero console errors, and a 60-step randomised walk over query/star/expand/Escape actions in which the announced match count equalled the visible cards at every step. Screenshots reviewed at 320 dark and 1280 light.

The broader sweep is `tools/deep/home-a11y-audit.mjs`, tracked next to the smoke pass and not wired into `run_layers.py`. On the fully expanded page under `reducedMotion: 'reduce'` it enumerates every element plus every generated `::before`/`::after` box: 801 elements + 11 generated boxes = 812 boxes, 0 with a nonzero `transitionDuration`, `document.getAnimations()` empty, `scroll-behavior: auto`. It prints that line and exits non-zero if any box keeps a transition or an animation runs.

**Re-running the smoke pass**: the 57-assertion Playwright script is `tools/deep/home-smoke.mjs`, tracked alongside `visual.mjs` and `html.mjs` but not wired into `run_layers.py`, so the corpus layers are unchanged. It needs `npm install` for Playwright plus system Chrome: `node tools/deep/home-smoke.mjs` from the repo root, which prints `PASS 57 / FAIL 0` and writes screenshots to `$TMPDIR/shots`.

**Coverage caveat**: `tools/run_layers.py` builds its deep targets from `lessons/*.html` (`deep_targets = lesson_targets or all_targets()`), so the hook's `--staged` run and the full corpus run both skip `index.html` for L2/L3/L5 — the page most of this change touches. Its visual/Nu/semantic checks here come from explicit `visual.mjs index.html` / `html.mjs index.html` / `run_layers.py index.html` runs. The Nu findings on the first draft of this CSS (`interpolate-size` "doesn't exist", `allow-discrete` "not a transition value") were validator-database gaps on spec'd CSS, not page errors; the response was to keep the CSS correct and move it to its own sheet, not to drop the feature or hand-roll a JS height animation.
