# House style — the per-chapter contract

This is the detailed reference behind `SKILL.md`. It specifies the exact HTML
structure, the conventions discipline, and the per-chapter equation brief. Match
it and a new book is indistinguishable in style from the four existing ones.

## Chapter HTML structure (exact order)

Every `chapters/NN-slug.html` is a complete standalone document (see `templates/chapter.html`):

1. `<p class="chapter-eyebrow">Chapter ROMAN</p>`
2. `<h1 class="chapter-title">Title</h1>`
3. `<p class="lede">` — one vivid italic sentence framing the chapter.
4. `<section class="preamble">`:
   - `<h2 class="preamble-title">Before we start</h2>`
   - `<div class="preamble-body">` — **two** short plain-English paragraphs, essentially
     no math: what the chapter does and why it matters.
   - `<h3 class="glossary-title">Terms you'll meet</h3>`
   - `<dl class="glossary">` — **18–30** `<dt>term</dt><dd>plain definition</dd>` pairs,
     covering every domain term in the chapter a newcomer wouldn't know. A reader should
     be able to decode any jargon without leaving the page.
5. **6–8 numbered sections**: `<h2><span class="sec-num">§N</span>Heading</h2>` then prose,
   display equations, Where-blocks, asides. Separate major sections with
   `<hr class="section-rule" />`.
6. **Exactly one** widget block, placed where it best illuminates the math:
   ```html
   <section class="interactive" data-widget="SLUG" aria-label="…">
     <header><h4>Interactive · Title</h4><span class="hint">short verbs</span></header>
     <div class="widget-mount"></div>
     <p class="caption">2–4 sentences; explain what it shows and the physics; inline $math$ ok.</p>
   </section>
   ```
7. `<section class="further-reading">` with `<h2><span class="sec-num"></span>Further reading</h2>`
   and a `<ul>` of **5–7** `<li><span class="src-title">Author(s).</span> <em>Title</em>,
   edition/venue year — coverage, §/chapter or arXiv ID.</li>`.
8. `<footer class="chapter-nav">` with `.prev` and `.next` links (exact filenames; chapter I's
   prev → `../index.html`; chapter X's next → `../index.html`).

The `<head>` and trailing `<script>` tags (KaTeX CDN with integrity hashes, then `../book.js`,
then `../interactive/SLUG.js`) are fixed boilerplate — copy them verbatim.

## Display equations and "Where" blocks

- Wrap each display equation in `<div class="equation-block"> $$ … $$ </div>`.
- **Immediately after any equation that introduces new symbols**, add a legend:
  ```html
  <aside class="where"><h4>Where</h4><dl>
    <dt>$symbol$</dt><dd>What it is — state its TYPE (scalar / vector / field / operator /
      constant with value+units) and physical ROLE.</dd>
  </dl></aside>
  ```
  Cluster 2–3 tightly-related equations under one Where block when natural. Not every
  equation needs one (re-derivations of already-defined symbols don't).
- Define inline jargon with `<dfn title="one-sentence definition">term</dfn>` on first use.
- `<aside class="jargon"><h4>TITLE</h4><p>…</p></aside>` for a deeper digression;
  `<aside class="note"><h4>Note</h4><p>…</p></aside>` for a caveat.

## KaTeX discipline (the correctness gate)

- Inline `\(…\)` or `$…$`; display `$$…$$`.
- **Use only macros defined in `book.js`.** An undefined `\macro` renders as *silent raw
  text* under `throwOnError:false` — a real bug. Spell out anything else with primitives
  (`\frac \partial \nabla \mathbf \boldsymbol \sqrt \sum \int \tfrac \mathrm \left \right …`).
- **Never shadow KaTeX built-ins** (`\theta`, `\P`, `\E`, `\k`, `\deg`, `\div`, `\Re`, …).
  Use them directly, or alias to a *new* name. (Greek letters, `\nabla`, etc. are built in.)
- Write `<` and `>` inside math as `&lt;`/`&gt;` (the browser decodes the entity in the text
  node before KaTeX sees it; a literal `<` can confuse the HTML parser).
- The final gate is `scripts/katex-check.js` — it renders every expression under
  `strict:"error"`. Nothing ships with failures.

## Conventions discipline (the consistency gate)

Pick these **once**, write them into the index conventions footer and `STATUS.md`, and hold
them in every chapter:
- **Units** and how quantities are quoted.
- **Every symbol's meaning** — and any *overloads* (a field like meteorology reuses `σ`, `β`,
  `ω`). Define each use where it appears; flag the clash in prose; list overloads in STATUS.
- **Coordinate / notation switches** and exactly where they happen (e.g. height → pressure
  coordinates), motivated in prose at the switch and re-flagged where later chapters adopt it.
- A small table of **reference constants** with values + units, used consistently.

## Per-chapter equation brief (write this before drafting)

For each chapter, write down — this is what makes equation accuracy achievable, because the
writer copies canonical forms instead of recalling them:

```
Chapter N — <title>   [vertical coordinate / notation regime]
THEME: 2–3 sentences on the chapter's arc and its link to the unifying frame.
SECTIONS: the 6–8 section headings.
CANONICAL EQUATIONS: each load-bearing equation in EXACT KaTeX form, with the
  named source (textbook §, paper, or lecture notes). Flag the constants/signs
  most easily gotten wrong for the verifier to check live.
WIDGET (slug): what it computes (the REAL equations), its controls, its readouts,
  and the reference values it should reproduce.
CITATIONS: 5–7 sources (textbook chapters + key papers with arXiv IDs).
```

The "flag the easily-wrong constants" line matters: things like a geometric `/4` factor, a
`2^{1/4}`, a growth-rate coefficient, a sign on a gradient, an arXiv ID — verify these against
the source with web access rather than trusting recall.

## Widget conventions

- Vanilla JS IIFE, no libraries, self-mounts on its `data-widget` slug into `.widget-mount`
  (see `templates/widget.js`). Must pass `node --check`.
- Computes the chapter's **real** equations — the numbers on screen come from the physics, not
  a cartoon. Keep the pure math functions DOM-free so `scripts/widget-run.js` can exercise them.
- Book palette: the accent + a warm contrast for a second series; Inter for UI text, italic
  Source Serif 4 for axis variable labels. 1–3 controls + a live numeric readout + a legend.
- Verify with `scripts/widget-run.js` (executes `build()` in JSDOM) and, before marking done,
  in a real browser (drag/animation can't be tested headlessly).
