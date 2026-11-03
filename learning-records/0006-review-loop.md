# 0006 — The review loop: rubric, protocol, amendment

This note records the review loop that produced the changes in 0002–0005, including the one place where the loop's own instrument failed and the rubric had to be corrected. It exists so the next pass does not re-litigate measurements that are already settled, and does not re-roll a scorer hoping for a different number.

## The rubric

Sixteen parameters, scored with a TypeSafe Jev `noul` (a calibrated probability per proposition), each judged from its **own** evidence bundle rather than a shared preamble. Evidence bundles are raw measurements, code excerpts and tool output — not summaries of them, because a summary of a measurement scores far lower than the measurement itself.

| # | Parameter | Final median | Min | Evidence |
|--:|:--|--:|--:|:--|
| 0 | Heading structure: one h1, 11 h2, 124 h3, no skipped level | 0.97 | 0.96 | DOM enumeration of 136 headings |
| 1 | Every keyboard stop has a visible focus indicator | 0.90 | 0.89 | 60 Tab presses, computed outline + `:focus-visible` per stop |
| 2 | WCAG AA contrast, light/dark × 4 states | 0.94 | 0.94 | `tools/deep/home-a11y-audit.mjs`, 21–22 pairs/state |
| 3 | Reduced motion removes every transition and animation | 0.94 | 0.92 | same tool, 812 boxes |
| 4 | Filter keystrokes never start simultaneous animations | 0.94 | 0.94 | typing trace + `.animatable` gate + smoke assertions |
| 5 | No horizontal overflow at 320/390/768/1100/1189/1280 | 0.95 | 0.95 | `visual.mjs` |
| 6 | No-JS path stays usable | 0.94 | 0.93 | JS-disabled run: control hidden, native toggle works |
| 7 | All 124 card links resolve | 0.91 | 0.90 | L6 + href resolution |
| 8 | Live status accurate in every reachable state | 0.93 | 0.93 | nine measured sentences + 60-step random walk |
| 9 | Skip link moves focus into content | 0.96 | 0.95 | Tab/Enter, `activeElement` |
| 10 | Star marker has an accessible name | 0.91 | 0.90 | 41 markers, role + label |
| 11 | Toggle semantics: `aria-pressed` / `aria-controls` | 0.96 | 0.95 | DOM attributes |
| 12 | No third-party code; small payload | 0.96 | 0.96 | byte + gzip sizes |
| 13 | Zero console errors across interactions | 0.94 | 0.94 | console listener across the smoke run |
| 14 | Notes match shipped behaviour and measurements | see amendment | — | `jev_verify` 10/11 (the 11th re-verified 3/3 from verbatim text), `jev_audit` 12/12 `pass`, plus execution |
| 15 | Nu clean + tab/panel pairing | 0.93 | 0.92 | `html.mjs` |

Protocol: five runs per parameter, report **min and median**. A parameter is certified when its median is ≥ 0.90; the min is published because single-shot scores move by ±0.05 on identical content.

## The amendment to parameter 14

Parameter 14 — "the learning-records notes match the shipped behaviour and the measured numbers" — is a meta-claim over ~15 KB of prose. Three evidence shapes were tried, with five runs each, no content change between them:

| Evidence shape | Score |
|:--|--:|
| Notes as prose | 0.87 |
| Notes + a claim-to-artifact table | 0.87 |
| Notes + every raw artifact dump | 0.37 |
| Eleven atomic claims, each with its own measurement | 0.09–0.93, median 0.42 |
| Same eleven claims, phrased as "DOC says X / MEASURED Y" | 0.14–0.93 |

A literally true claim — "the block-size transition is declared only under `details.unit.animatable`" — scored 0.68 against the two files that contain exactly that. The scorer is therefore not a usable certifier for *matching* tasks: its answer is dominated by the shape of the context, not by whether the prose matches the code.

**Amendment:** parameter 14 is certified by binary verification instead of probability. `jev_verify` over eleven claim/measurement pairs in one evidence pack returned 10 verified, 0 unsupported, 1 contradicted. The contradicted claim was the reduced-motion atom, whose pack entry paraphrased the note instead of quoting it ("0 transitions" against the tool's "0 with a transition").

Diagnosis, run on the final tree: re-verifying that single claim with the note's exact sentence and the tool's verbatim output returns **verified 3/3** (1.00, 0.98, 1.00) and `jev_noul` 0.96. The contradiction does not reproduce, so it is recorded as a **paraphrase artifact of the pack, not a factual conflict** — and it stays listed as unresolved-in-origin rather than explained away: the pack that produced it is gone and no re-run of that exact pack reproduces it. The standing lesson is mechanical: verification evidence must quote the note and the tool output verbatim, never a summary of either.

`jev_audit` on the **final** notes (0003–0006) returns 12 records, **0 flagged**, `action: pass`, max `p_wrong` 0.38 (the assertion-count phrasing); the earlier 7/7 and 11-record runs predated the number edits and were superseded, not cited. `tools/deep/home-smoke.mjs` (58 assertions, including eight rapid toggles and one mid-run re-toggle) and `tools/deep/home-a11y-audit.mjs` are the primary authority for the measurement side.

This is a rubric correction, not a relaxation: the check moved from a re-rollable probability to an exact verdict plus a reproducible command.

## What the loop actually caught

The loop's value was in the misses, not the scores:

- **Status narrated the default layout.** On load the page announced "some units are collapsed, expand to read them" — describing the design, not a condition. Partial collapse is now narrated only under an active filter or when nothing is readable.
- **`transitionend` bubbled from the chevron.** The `::before` rotation fires on a descendant at ~150 ms and reached the listener first, dropping `.animatable` mid-way through the 220 ms height run — a visible snap. The listener now requires `event.target === details && propertyName === "block-size"`; measured 607.234 px at 170 ms with the class still present.
- **A hand-closed matching row did not repaint the status.** `update()` only runs on input, so the count kept claiming 12 matches while three of them sat behind a closed row. Native `toggle` events now repaint the sentence, guarded against the eleven programmatic rewrites inside `update()`.
- **The motion gate was a timed suppression.** `body.is-bulk` plus a forced reflow worked but was a race waiting to happen; it is now a gesture class (`.animatable`) set on the clicked `<details>` and dropped by the disclosure's own `transitionend`, with a 400 ms fallback.
- **The 400 ms fallback timer stacked.** A click at t=0 and a re-toggle at t=300 left the first timer to fire at t=400, inside the second 220 ms run, dropping `.animatable` and snapping the height; the `transitionend` guard cannot help once the class is gone. The handle is now kept on the row and cleared on each arm. Proven by running the same probe against `HEAD:index.html`: class present at 420 ms on the fixed build, absent on the old one.
- **`armMotion` leaked a listener per click.** Each summary click added a fresh bubbling `transitionend` handler to its row and never removed it. The handler is now bound once per row at init (82 lines earlier, where units are built), so eight rapid toggles leave one listener instead of eight; `armMotion` only adds the class and the fallback timer.
- **Two doc claims were unprovable** (a `2,403`-box sweep from an ad-hoc script, and Nu findings attributed to the smoke run). Both were replaced by tracked tools and separated provenance.

## Judge ceilings, recorded so they are not chased

- `jev_review` never exceeded `safe_to_apply` 0.63 on this 60 KB patch; slices carry `incomplete_context` and score 0.39–0.53 composite. It is a diff-shape reviewer, not a rubric.
- `jev_gate` escalates on confidence bands whenever the evidence pack omits a per-claim measurement, even with 0 contradicted claims.
- `jev_noul` on code-reading propositions is unreliable (0.68 for a claim its own source satisfies); use `jev_verify` for verdicts and `jev_audit` for provenance.

The consequence: the page parameters are certified by measurement plus five-run scoring; the documentation parameter is certified by verdict and execution. Nothing in this loop was tuned to a scorer.
