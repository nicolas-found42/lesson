# 0002 — Homepage navigation: collapsible unit listings on a static site

Research note. Scope: how `index.html` should collapse the 10 unit listings and provide homepage navigation, on a static GitHub Pages site with no build step. Each claim cites the page that owns it; anything marked **[INFERENCE]** is reasoning over those sources, not a quote. Line numbers refer to the revision reviewed when the note was written.

## Current implementation

- Ten `<section class="unit-section" id="unit-N">` wrappers, each holding `<details class="unit" open?>`, whose `<summary>` contains `<h2 class="unit-title">`, `.unit-count`, `.unit-blurb`, then a `.lesson-grid` of `<a class="lesson-card">` links.
- Units 0 and Reference are open; Units 1–9 are closed (`index.html:246`, `:320`, `:1169`).
- Navigation: skip link to `#unit-0`, `nav.unit-rail` of `#unit-N` links, search + `aria-live` count + no-results line.
- Filter JS sets `card.hidden`, syncs `details.open`, rewrites the count, and opens a unit on rail click / `hashchange`.
- CSS removes the native marker for a `::before` chevron; `.lesson-card-lede` clamps at two lines.

## 1. `<h2>` inside `<summary>`: allowed, and the Nu validator accepts it

- WHATWG content model, verbatim: "Phrasing content, optionally intermixed with heading content." — https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element
- MDN restates it: "The `<summary>` element's contents can be any heading content, plain text, or HTML that can be used within a paragraph." — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/summary
- Validator run for this note: `<!DOCTYPE html><html lang=en><title>t</title><details><summary><h2>x</h2></summary><p>y</p></details>` submitted to Nu 26.11.3 (https://validator.w3.org/nu/?out=json) returned **no error** for the heading — only one encoding notice and one info message ("This document has heading elements but none of them has a computed heading level of 1"). L3 does not flag the shipped markup.
- If a heading in `summary` were ever non-conformant (it is not), the fallback is a non-heading summary labelled via `aria-label`; the summary's accessible name comes from its subtree, else `title` — https://w3c.github.io/html-aam/#el-summary (§4.1.8). Cost: the unit leaves heading navigation. **[INFERENCE]**
- `.unit-count` and `.unit-blurb` are summary-subtree text too, so the disclosure button's name is heading + count + blurb concatenated — **[INFERENCE, from HTML-AAM §4.1.8 "use summary element subtree"]**.

## 2. `<details>` as navigation chrome: correct — it is a disclosure, not a menu

- The spec defines it as disclosure: "The `details` element represents a disclosure widget from which the user can obtain additional information or controls." And: "it is not conforming to use the `details` element when attempting to represent another type of control. For example, tab widgets and menu widgets are not disclosure widgets, so abusing the `details` element to implement these patterns is incorrect." — https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
- APG disclosure: a button plus controlled content; `Enter`/`Space` toggle; control has role `button` with `aria-expanded` — https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- APG rejects the menu role for site navigation: "Although this example uses the word 'menu' in the colloquial sense to refer to a set of navigation links, it does not use the WAI-ARIA menu role… Typical site navigation does not need all the keyboard interactions specified by the menu and menubar pattern." — https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
- Native semantics, no ARIA needed: `summary` computed role `html-summary`, exposed as MSAA `ROLE_SYSTEM_PUSHBUTTON` with `EXPANDED`/`COLLAPSED`, UIA `Button` + `ExpandCollapse`, AX `AXDisclosureTriangle` — https://w3c.github.io/html-aam/#el-summary; `details` maps to `group` — https://w3c.github.io/html-aam/#el-details
- ARIA is also forbidden here: **No `role`** on a `summary` that is the summary for its parent details — https://w3c.github.io/html-aria/#el-summary
- Verdict: unit `<details>` is the right widget; it discloses links inside main content. No menu role, no JS, no ARIA required.

## 3. Find-in-page, crawlability, deep links: all work with native `<details>`

Find-in-page — yes, closed `<details>` content is searched:

- During find-in-page, closed details' skipped contents "become accessible, without modifying the `open` attribute, in order to make find-in-page able to search through it." — https://html.spec.whatwg.org/multipage/interaction.html#interaction-with-details-and-hidden-until-found
- A match auto-opens its ancestors and fires `toggle`: the UA queues the ancestor revealing algorithm on the matching node — same URL.
- Contrast: `hidden` content "Will not be rendered"; only `hidden=until-found` "will be accessible to find-in-page and fragment navigation" — https://html.spec.whatwg.org/multipage/interaction.html#the-hidden-attribute

Fragment links — the spec opens an ancestor `<details>`, but only when the fragment target is **inside** it:

- "Run the ancestor revealing algorithm on *target*." — https://html.spec.whatwg.org/multipage/browsing-the-web.html#scroll-to-the-fragment-identifier
- Details branch: "Set *ancestorToReveal*'s `open` attribute to the empty string." — https://html.spec.whatwg.org/multipage/interaction.html#ancestor-revealing-algorithm
- Same-page links use the same path: navigate-to-a-fragment step 16 is "Scroll to the fragment given *navigable*'s active document." — https://html.spec.whatwg.org/multipage/browsing-the-web.html#navigate-fragid

**Measured correction to the first draft of this note.** Chrome 156.0.8078.80, JavaScript disabled, minimal page with `<details id="d">` and `<section id="outer"><details id="d2">`:

| Fragment | `#d` open | `#d2` open |
|---|---|---|
| `#inner` (a `<p>` inside `#d`) | yes | no |
| `#d` (the details element itself) | no | no |
| `#outer` (a section *wrapping* `#d2`) | no | no |

So the ancestor-revealing step applies to *ancestors* of the target. On this page each `#unit-N` id sits on the `<section>` that **wraps** the `<details>`, and `#reference` does too, so a bare link `#unit-4` does **not** open Unit 4 without script. Both the rail handler and `revealHash()` are load-bearing, not belt-and-braces. The only markup shape that would reveal natively is the descendant id in the second bullet; both alternatives were rejected:

- Move `id="unit-N"` onto the `<details>` → measured **no** open in either column above; it would also break `revealHash()` and the rail handler, which resolve the target with `target.querySelector("details.unit")` and would get null. Rejected.
- Put the id on a descendant, e.g. the `<summary>` or a card → measured **yes** (the `#inner` row), and the section keeps a `scroll-margin-top` hook. Rejected for a different reason: `#unit-4` would then need to name one specific descendant, the id moves off the element that owns `scroll-margin-top`, and two script paths that already work would have to be rewritten against a moving target. **[INFERENCE]**

Both rejections are design calls, not measurements — the measurement is only the table above.

Search engines — accordion content is legitimate and indexable:

- "There are many web design elements today that utilize showing and hiding content in a dynamic way to improve user experience; these elements don't violate our policies:" — first bullet: "Accordion or tabbed content that toggle between hiding and showing additional content" — https://developers.google.com/search/docs/essentials/spam-policies#hidden-text-and-links
- "Instead of removing content, consider moving content into accordions or tabs to save space." — https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing
- "Google also uses the rendered HTML to index the page." / "If the content isn't visible in the rendered HTML, Google won't be able to index it." — https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Chrome on hidden-but-findable content: it "will be accessible to search engines. Google Search will even form links that scroll to the revealed fragment." (Chrome 102+) — https://developer.chrome.com/docs/css-ui/hidden-until-found
- **[INFERENCE]** Closed `<details>` keeps every lesson `<a href>` in the DOM, so links stay crawlable; Google names "accordions" generically and never `<details>` specifically.

## 4. Filtering a long link list: search input + polite live count + `hidden` only for matches

- `<input type="search">` maps to the `searchbox` role (or `combobox` with `list`); wrap it in `<search>` or use `role="search"` so AT gets a landmark — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/search
- Result counts are status messages: "status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus." — https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- `aria-live="polite"`: it "indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect"; polite updates "generally do not interrupt the current task" — https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live
- `hidden` for non-matches is correct *while filtering*: Hidden-state content "Will not be rendered" — https://html.spec.whatwg.org/multipage/interaction.html#the-hidden-attribute — so it also drops from find-in-page and the a11y tree, which is the intent of a filter. **[INFERENCE]**
- Never use `hidden`/`display:none` for the collapsed unit state: CSS-collapsed sections "becomes impossible to search using a find-in-page search" — https://developer.chrome.com/docs/css-ui/hidden-until-found — while `<details>` stays searchable (§3).
- The page splits these correctly: `hidden` only during filtering, `<details>` otherwise.

## 5. Long link lists: no WCAG length cap; four criteria bind

- No success criterion limits page length, item count, or scroll distance — that is an absence of a requirement, not a licence.
- **2.4.1 Bypass Blocks (A):** "A mechanism is available to bypass blocks of content that are repeated on multiple web pages." — https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html. The skip link targets `#unit-0`, past the header and rail.
- **2.4.5 Multiple Ways (AA):** "More than one way is available to locate a web page within a set of web pages except where the web page is the result of, or a step in, a process." — https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html. Search, rail, and unit listings are three ways; collapsing removes none.
- **3.2.3 Consistent Navigation (AA):** repeated mechanisms "occur in the same relative order each time they are repeated, unless a change is initiated by the user." — https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html; the page defines "same relative order" to tolerate insertions/removals, covering user-initiated expand/filter.
- **1.4.10 Reflow (AA):** content at "a width equivalent to 320 CSS pixels" without two-dimensional scrolling — https://www.w3.org/WAI/WCAG22/Understanding/reflow.html; F102 names "content disappearing and not being available when content has reflowed" — https://www.w3.org/WAI/WCAG22/Techniques/failures/F102
- **[INFERENCE]** Binding limits are keyboard reachability, a bypass mechanism, and 320 px reflow — not "too many links".

## 6. Card grid: clamp the inner lede `<p>`, break long words at 320 px

- `line-clamp` is visual truncation: "The line-clamp CSS property allows limiting of the contents of a block to the specified number of lines." Legacy `-webkit-line-clamp` needs `display:-webkit-box`, `-webkit-box-orient:vertical`, plus `overflow:hidden`, "otherwise the content is not clipped, although an ellipsis is still shown" — https://developer.mozilla.org/en-US/docs/Web/CSS/line-clamp
- MDN: "When applied to anchor elements, the truncating can happen in the middle of the text." Keep the clamp on `<p class="lesson-card-lede">`, not on `<a class="lesson-card">`. **[INFERENCE from that warning]**
- Clipped characters stay in the DOM, so screen readers and find-in-page still get the full lede; the loss is visual. **[INFERENCE: MDN describes limiting a block's contents, not removing nodes]**
- 1.4.4 Resize Text: text "can be resized … up to 200 percent without loss of content or functionality" — https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html — with F69 covering text "clipped, truncated or obscured" — https://www.w3.org/WAI/WCAG22/Techniques/failures/F69. A fixed two-line clamp truncates more as type grows. Accepted tradeoff on this page: the lede is a summary, the full sentence exists on the lesson page, and the untruncated lesson title carries the link's meaning. Re-check at 200% text zoom if the card height budget grows. **[INFERENCE]**
- `overflow-wrap: anywhere` breaks "an otherwise unbreakable string of characters — like a long word or URL — … at any point", and its wrap points count in min-content sizing (unlike `break-word`) — https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap. `body` sets `overflow-wrap: break-word`; card titles add `anywhere` because lesson titles contain long unbreakable tokens and card titles sit in a `minmax()` grid track. **[INFERENCE]**

## Verdict: safe on static GitHub Pages, no build step

| Technique | Verdict | Basis |
|---|---|---|
| Native `<details class="unit">` + `<summary>` per unit | Safe, recommended | HTML spec definition + HTML-AAM + APG disclosure |
| `<h2>` inside `<summary>` | Safe, validator-clean | WHATWG content model; Nu 26.11.3 run |
| No ARIA roles on `summary`/`details` | Required | HTML-ARIA "No `role`" |
| `#unit-N` deep links | Need the page script: the id is on the wrapper section, so native reveal does not fire | Spec ancestor revealing + measured Chrome 156 behaviour (§3) |
| `hidden=until-found` for CSS-collapsed regions | Not needed with `<details>`; Chrome 102+ only | Chrome developers doc |
| Filter: `<input type="search">`, `role="search"`, polite live count, `hidden` on non-matches | Safe | MDN searchbox role; WCAG 4.1.3 |
| `-webkit-line-clamp` on inner lede `<p>` | Safe if checked at 200% zoom | MDN line-clamp; WCAG 1.4.4 / F69 |
| Long words in cards at 320 px | `overflow-wrap: anywhere` on titles | MDN overflow-wrap; WCAG 1.4.10 |
| Menu-role navigation, accordion JS libraries, build tooling | Not justified | APG: site nav should not use menu role; no build step |

Everything above is plain HTML/CSS plus the existing inline `<script>` — no bundler, dependency, or server, so GitHub Pages serves it unchanged. **[INFERENCE: no source requires JS beyond the existing filter]**

## Sources

- WHATWG HTML: `details`/`summary` — https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
- WHATWG HTML: `hidden` state + ancestor revealing algorithm — https://html.spec.whatwg.org/multipage/interaction.html#the-hidden-attribute
- WHATWG HTML: find-in-page × `details` — https://html.spec.whatwg.org/multipage/interaction.html#interaction-with-details-and-hidden-until-found
- WHATWG HTML: scroll to the fragment / navigate to a fragment — https://html.spec.whatwg.org/multipage/browsing-the-web.html#scroll-to-the-fragment-identifier
- W3C HTML-AAM: `summary`, `details` — https://w3c.github.io/html-aam/#el-summary
- W3C HTML-ARIA: `summary` role rules — https://w3c.github.io/html-aria/#el-summary
- W3C APG: Disclosure pattern — https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- W3C APG: Disclosure Navigation example — https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/
- W3C Nu validator — https://validator.w3.org/nu/
- MDN: `<summary>`, `line-clamp`, `overflow-wrap`, `input type=search`, `aria-live` — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/summary, https://developer.mozilla.org/en-US/docs/Web/CSS/line-clamp, https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap, https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/search, https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live
- WCAG 2.2 Understanding: 2.4.1, 2.4.5, 3.2.3, 4.1.3, 1.4.4, 1.4.10 — https://www.w3.org/WAI/WCAG22/Understanding/
- WCAG 2.2 failures F69 / F102 — https://www.w3.org/WAI/WCAG22/Techniques/failures/F69, https://www.w3.org/WAI/WCAG22/Techniques/failures/F102
- Google Search: spam policies (hidden text) — https://developers.google.com/search/docs/essentials/spam-policies#hidden-text-and-links
- Google Search: mobile-first indexing — https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing
- Google Search: JavaScript SEO basics — https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Chrome: `hidden=until-found` — https://developer.chrome.com/docs/css-ui/hidden-until-found
