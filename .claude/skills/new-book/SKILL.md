---
name: new-book
description: Use when the user wants to create, scaffold, or write a new self-contained HTML book in the ~/dev/Books workspace (e.g. "write a book on X", "add a book about Y", "make a primer on Z"). Captures the house style, conventions, per-chapter structure, interactive-widget pattern, and validation workflow shared by every book in this folder.
version: 1.0.0
---

# Writing a new book in the Books workspace

This workspace holds **self-contained, browser-only HTML books**, one folder per book, in a shared "bright editorial" style (Stripe Press / Tufte CSS / Distill.pub). There is no build step and no server runtime: a book is *done* when opening its `index.html` in a browser renders it fully. This skill is the playbook for adding another one that matches the three existing books (`string-theory-primer/`, `computational-chemistry/`, `modern-ml/`, and `meteorology/`).

Read `~/dev/Books/CLAUDE.md` first — it has the binding workspace rules. This skill operationalizes them.

## The shape of a book

```
<book-slug>/
  index.html              cover + chapter TOC + conventions footer
  style.css               the editorial theme (per-book accent color)
  book.js                 KaTeX bootstrap + this book's macros
  STATUS.md               status, conventions in force, open validation passes
  chapters/NN-slug.html   one file per chapter (zero-padded, kebab-case)
  interactive/<slug>.js    one self-mounting widget per chapter
```

Books are **independent** — no shared code. Copy the theme into each book so it stays portable. The templates in `templates/` here are starting points, not a shared dependency.

## Non-negotiable rules (from CLAUDE.md)

- **Equation accuracy gates completion.** Every formula matches a named source (textbook §, paper, or established lecture notes). Pick conventions *once* per book and hold them everywhere.
- **Citations are verified** before a chapter counts as done. Each chapter ends with a "Further reading" list (page/section for textbooks, arXiv ID for papers).
- **One interactive widget per chapter**, mounted via `<section data-widget="…">` with a file in `interactive/`. It must illuminate the math, not decorate.
- **Jargon and symbols explained inline.** Every new symbol gets a "Where" block under its first display equation; every new term gets a `<dfn>` or a jargon aside.
- **KaTeX by default** (CDN; MathJax only if you need `\require`/AMScd). Inline `\(…\)` / `$…$`; display `$$…$$`.

## Process

### 1. Decide the spec with the user (briefly)

Pin these before writing — they are the implicit constraints that, left to chance, cause drift:
- **Chapter count and arc.** Default to **10 chapters, foundations → frontier**, ending on the contemporary / ML edge of the field (every book here does). Confirm the count.
- **Audience.** Default: "a motivated polymath comfortable with multivariable calculus and basic physics/probability; no domain knowledge assumed." Everything domain-specific is introduced inline.
- **Unifying frame.** One sentence the whole book hangs on (comp-chem: "the potential energy surface"; modern-ml: "data + function class + loss"; meteorology: "a moist fluid on a rotating planet, forced by the Sun"). Every chapter computes/relates to it.
- **Conventions & notation.** Units, symbol meanings, and any coordinate/notation *switches* (and where they happen). Write these into the spec so parallel writers don't diverge. **This is the single highest-leverage decision** — see `reference/house-style.md`.
- **Accent color.** Each book gets a distinct one. Taken: terracotta `#a83e2a` (string-theory), petroleum-teal `#1f6f7a` (comp-chem), forest-green `#2f6b4a` (modern-ml), storm slate-blue `#2b5c8a` (meteorology). Pick a new one; keep the warm off-white `#fbfaf7` background.

### 2. Scaffold the shell yourself (deterministic, for consistency)

Create `<book-slug>/{chapters,interactive}/`. Then:
- Copy `templates/style.css` → `<book-slug>/style.css`; edit only the `:root` accent variables (`--accent`, `--accent-soft`, `--accent-deep`, `--rule`, `--bg-soft`) and the header comment. Leave everything else identical so books stay visually coherent.
- Copy `templates/book.js` → `<book-slug>/book.js`; set the macro list for *this* book (see the KaTeX discipline below).
- Write `index.html` from `templates/index.html` (cover eyebrow/title/subtitle, the 10-item TOC, the conventions footer).
- Write `STATUS.md` (see the existing books' for format).

Doing the shell yourself — not via subagents — guarantees the CSS/JS/scaffold are byte-consistent across chapters.

### 3. Write a house-style spec + per-chapter equation briefs

Before drafting prose, write down, per chapter: the section outline, the **canonical load-bearing equations in exact form with their source**, the widget's physics, and the citations. This brief is what makes equation accuracy achievable — writers copy canonical forms instead of recalling them. See `reference/house-style.md` for the full chapter HTML structure and the brief template.

### 4. Draft chapters (optionally fan out)

For a single chapter, draft it directly. For a whole book, **multi-agent orchestration pays off** (see `reference/workflow-orchestration.md`): one workflow that pipelines each chapter through *draft → adversarial verify*, each chapter owning its own two files (no write conflicts). Give every drafting agent the *same* house-style spec + the chapter brief + a finished chapter as a template. Consider drafting the conventions-anchor chapter (the one that fixes coordinates/signs) first and reviewing it yourself before fanning out the rest.

Each chapter HTML follows the fixed structure: eyebrow → title → lede → `preamble` (plain-English + glossary) → numbered `§` sections with display equations + `Where` blocks → one widget → `further-reading` → `chapter-nav`. Templates: `templates/chapter.html`, `templates/widget.js`.

### 5. Validate (this is the gate — do not skip)

Run the harnesses in `scripts/` and fix everything they find:

```
# 1. KaTeX strict: render EVERY math expression under strict:"error".
#    The ONLY thing that catches silently-broken formulas (undefined macros,
#    unbalanced braces) that throwOnError:false hides as raw text.
node scripts/katex-check.js <book-slug>            # edit the macro list to match book.js

# 2. Widget syntax
for f in <book-slug>/interactive/*.js; do node --check "$f"; done

# 3. Widget numerics: execute each widget's real build() in JSDOM, confirm it
#    runs without error and its readouts match known reference values.
node scripts/widget-run.js <book-slug>
```

Both harness scripts need a one-time `npm install katex@0.16.47 jsdom` in their working dir. The KaTeX harness must use the **same macros as `book.js`** and decode HTML entities (`&lt;`→`<`) so it mirrors the browser.

Then, per CLAUDE.md: **call the advisor** for an equation/prose sanity check, **browser-verify** each widget (`./serve.sh 8765 <book-slug>/` then click through — drag/animation can't be tested headlessly), and only then mark chapters done. Record what was and wasn't browser-tested honestly in `STATUS.md`.

### 6. Record status & memory

Update `STATUS.md` with conventions in force, the chapter table, and open passes. If the user uses auto-memory, add a `project` memory pointer for the new book.

## Pitfalls (learned the hard way)

- **KaTeX macros:** use only macros you actually define in `book.js`. An undefined `\macro` renders as **silent raw text** under `throwOnError:false`. Never shadow KaTeX built-ins (`\theta`, `\P`, `\E`, `\k`, `\deg`) — use them directly or alias to a new name (`\vtheta`). The strict harness is what catches violations.
- **`<` and `>` inside math:** write them as `&lt;`/`&gt;` in the HTML (the browser decodes the entity in the text node before KaTeX sees it). The strict harness must decode entities to match.
- **Notation drift across chapters** is the main risk when fanning out. Pin every symbol and coordinate switch in the spec up front; audit for collisions at the end (fields like meteorology overload `σ`, `β`, `ω` — define each use where it appears and note the clash).
- **Background workflows can stall** on a hung web/tool call (one agent blocked ~3 h once). Prefer doing empirical verification (the Node/JSDOM harnesses) yourself in the main loop; they're reliable and fast.
- **Widget reality:** the numbers on screen must come from the chapter's real equations, not a cartoon. The JSDOM harness + reference-value checks are how you prove it.

## Files in this skill

- `templates/` — `style.css`, `book.js`, `index.html`, `chapter.html`, `widget.js` to copy and adapt.
- `scripts/katex-check.js` — strict KaTeX harness (takes a book slug).
- `scripts/widget-run.js` — JSDOM widget executor (takes a book slug).
- `reference/house-style.md` — the full per-chapter HTML structure, the "Where"/preamble/aside conventions, and the per-chapter equation-brief template.
- `reference/workflow-orchestration.md` — how to fan a whole book out across subagents with the `Workflow` tool (draft → verify pipeline).
