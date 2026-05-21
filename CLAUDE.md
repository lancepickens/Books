# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This directory is a workspace for self-contained HTML books, each on a specific topic. There is no shared application — each book is an independent static site.

## Structure

- One subfolder per book, named after its topic (kebab-case).
- Each subfolder contains everything the book needs: `index.html`, CSS, JS, data files, images.
- The root may hold a landing/index page that links to books, but per-book content does not live at the root.

## Constraints on code

- All code runs in the browser, OR is a one-time generator script whose static output (tables, JSON, etc.) is committed alongside the book. There is no server runtime and no build step the reader must run to view a book.
- A book is "done" when opening its `index.html` directly in a browser (file:// or any static host) renders it fully.

## Equations

- Render math with KaTeX by default (load `katex.min.css` + `katex.min.js` + `auto-render.min.js` from a CDN, then call `renderMathInElement` on `DOMContentLoaded`).
- Use MathJax only if a book needs features KaTeX doesn't support (e.g. `\require`, AMScd diagrams).
- Inline math: `\(...\)`. Display math: `$$...$$`.

## Visual style: bright editorial

Reference points: Stripe Press, Tufte CSS, Distill.pub, long-form NYT features.

- Light background (off-white, e.g. `#fbfaf7` or `#ffffff`), dark warm-grey body text.
- Serif body face for prose (e.g. Source Serif, Charter, Iowan Old Style, Georgia fallback); sans-serif for UI/captions/headers if desired.
- Generous line-height (~1.6) and a narrow measure (~32–38em) for body copy.
- Restrained accent color used sparingly for links and emphasis — not a full palette.
- Clear typographic hierarchy via size and weight, not boxes or rules.
- Figures and tables breathe: caption below, ample margin, no heavy borders.

## When scaffolding a new book

1. Create `./<book-slug>/` with its own `index.html`, `style.css`, and `data/` if it needs static tables/JSON.
2. Inline the KaTeX CDN tags and auto-render hook.
3. Apply the editorial theme locally (per-book CSS) so books remain self-contained and portable.

## Shared rules for every book in this workspace

These apply to every active book; per-book sections below cover constraints unique to that book.

- **Equation accuracy gates completion.** Every formula must match a named, established source (textbook section, paper, or established lecture notes). Pick conventions once per book and apply consistently.
- **Citations are verified before a chapter counts as done.** Each chapter ends with a "Further reading" section listing the specific source — page/section for textbooks, arXiv ID for primary papers.
- **Per-chapter interactive guide.** Each chapter includes at least one in-browser interactive element (SVG/canvas slider, mode visualizer, mini-simulator) mounted via `<section data-widget="…">` and a corresponding file in `interactive/`. The widget illuminates the math, not decoration.
- **Jargon and variables are explained inline.** Every new symbol appears in a "Where" block under its first display equation; every new technical term appears in a `<dfn>` inline definition or jargon aside.
- **Validation workflow.** After drafting a chapter: (1) re-read for equation correctness against a cited source, (2) call the advisor for a sanity check, (3) browser-verify the widget, (4) only then mark the chapter task complete.
- **STATUS.md per book.** Each book's status, conventions in force, and open validation passes live in its own `STATUS.md`. Read that file first when resuming work on a book.

## Active book 1: `string-theory-primer/`

A primer on string theory. Specific constraints:

- **At most 15 chapters.** Each chapter steadily covers results and the background math needed for them.
- **Audience assumes a geometric perspective.** Ground every concept in geometric thinking: manifolds, metrics, geodesics, curvature, bundles, connections, submanifolds, characteristic classes. Equations should be readable as geometry ("this is an area", "this is a curvature 2-form", "this is a Laplacian on Σ"), not just algebra.
- **Source corpus:** Polchinski Vols I/II, Becker-Becker-Schwarz, Zwiebach 2nd ed., GSW, Tong's DAMTP lectures.
- **Conventions:** natural units $\hbar = c = 1$; mostly-plus signature; $T = 1/(2\pi\alpha')$, $\ell_s = \sqrt{\alpha'}$; worldsheet metric $h_{ab}$ (Polchinski uses $\gamma_{ab}$; flagged in book conventions).

## Active book 2: `computational-chemistry/`

A 10-chapter primer on computational chemistry. Modern, ML-forward — foundations (Ch 1–4) compressed so that Ch 8–10 can carry the contemporary story (descriptor + kernel potentials, equivariant NNPs and foundation models, quantum computing). Specific constraints:

- **Exactly 10 chapters.** No expansion without explicit user approval.
- **Audience is a motivated polymath.** Assumes basic chemistry. QM and all method-specific terminology are introduced inline through "Where" blocks and `<dfn>` definitions.
- **Unifying frame:** the potential energy surface — every method either *computes*, *samples*, *traverses*, or *learns* it.
- **Source corpus:** Szabo-Ostlund for WFT; Helgaker-Jørgensen-Olsen for advanced WFT; Parr-Yang and Burke's ABC for DFT; Martin for solids; Frenkel-Smit and Tuckerman for MD; Behler 2007 / Bartók 2010 / Batzner 2022 / Batatia 2022 for ML potentials; McArdle RMP 2020 for quantum.
- **Conventions:** atomic units throughout ($\hbar = m_e = e = 1/(4\pi\epsilon_0) = 1$; $1\,\mathrm{Ha} = 27.2114$ eV; $1\,a_0 = 0.5292$ Å). Electron coordinates $\mathbf{r}$; nuclear $\mathbf{R}$. Operators wear hats. **Chemists' notation** $(ij|kl)$ throughout Ch 1–9; Ch 10 deliberately switches to physicists' notation for second quantization and flags this in prose.
