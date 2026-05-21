# String Theory: A Primer — Project Status

**Last updated:** 2026-05-20
**Phase:** First draft complete; validation pending.

## What exists

Self-contained HTML book at `string-theory-primer/`. Opens by serving the folder over HTTP:

```
python3 -m http.server 8765
open http://localhost:8765/string-theory-primer/
```

- `index.html` — book cover + 15-chapter TOC + conventions footer
- `style.css` — editorial theme (Source Serif 4 / Inter; terracotta accent on warm off-white)
- `book.js` — KaTeX bootstrap with the macros `\R, \C, \Z, \eps, \dd, \half`. `\d` is reserved by KaTeX; use `\mathrm{d}` directly. (Burned by this once already.)
- `chapters/01..15-*.html` — all 15 chapters drafted
- `interactive/*.js` — 15 widgets, one per chapter, mounted via `<section data-widget="…">`
- `CLAUDE.md` (one level up, in `~/dev/Books/`) — workspace + book conventions

## Validation gates (the bar for "done")

The user set the completion bar as: every equation accurate, every citation accurate, every chapter validated. This breaks down into five passes:

| # | Pass | Status |
|---|---|---|
| A | **Notation audit** — catch conflated symbols across chapters and disambiguate. (User's specific concern.) | not started |
| B | **Equation-term explanation pass** — confirm every display equation has either a "Where" block or in-prose definitions for every new symbol. Avoid silent reuse of names. | not started |
| C | **Widget verification in browser** — open each chapter's widget and confirm it renders + interacts correctly. Ch 1–3 already eyeballed; Ch 4–15 are syntax-clean but unverified. | not started |
| D | **Equation-accuracy advisor pass for Ch 4–15** — Ch 1–3 had a full advisor pass already. The other twelve are first drafts. | not started |
| E | **Citation verification** — confirm titles, journals, years, page numbers, and arXiv IDs in every "Further reading" block. Spot-check a few primary papers (Strominger–Vafa, Maldacena, Polchinski's D-brane paper, GSO, Polyakov 1981). | not started |

## Conventions in force throughout the book

These are written into the book index and `CLAUDE.md`. The notation audit must enforce them.

- Natural units: $\hbar = c = 1$
- Spacetime signature: mostly-plus, $\eta_{\mu\nu} = \mathrm{diag}(-1, +1, +1, \dots, +1)$
- Target-space indices: $\mu, \nu, \rho, \sigma \in \{0, 1, \dots, D-1\}$
- Worldsheet indices: $a, b, c, d \in \{0, 1\} = \{\tau, \sigma\}$
- Worldsheet light-cone indices: $\pm$ (we write $T_{\pm\pm}$, not $T_{++}, T_{--}$)
- Worldsheet metric: **$h_{ab}$** (we explicitly flag that Polchinski writes $\gamma_{ab}$)
- String tension: $T = 1/(2\pi\alpha')$
- String length: $\ell_s = \sqrt{\alpha'}$
- Closed string $\sigma$ range: $[0, 2\pi)$; open string: $[0, \pi]$
- Closed-string oscillators: $\alpha_n^\mu$ (right-movers), $\tilde\alpha_n^\mu$ (left-movers)
- Open string Neumann boundary: $\tilde\alpha_n = \alpha_n$
- Level number: $N$ (open) or $N, \tilde N$ (closed)
- Virasoro generators: $L_n$, $\tilde L_n$
- D-brane: D$p$-brane, dimension $p+1$
- BH brane charges: $(Q_1, Q_5, N)$ — note the collision with level number $N$. **This is a known conflation; the notation audit should flag it.**

## Known notation collisions (start the audit here)

These all appear in multiple chapters with different meanings; audit must add explicit reminders or rename one usage.

- **$N$** — (a) string level number from Ch VI onward; (b) number of D-branes / colors of $U(N)$ from Ch XIII onward; (c) brane-momentum charge in Ch XIV. Context distinguishes, but a reader skimming will trip.
- **$T$** — (a) string tension $1/(2\pi\alpha')$ throughout; (b) worldsheet stress tensor $T_{ab}$ from Ch V; (c) Hawking temperature in Ch XIV (mentioned briefly).
- **$\sigma$** — (a) worldsheet coordinate; (b) Pauli/spin index (not yet used but watch for it if we extend the superstring chapter).
- **$\Sigma$** — (a) worldsheet manifold; (b) summation in mode expansions. The summation is unambiguous in context (always with a subscript like $\sum_{n}$), but worth a note.
- **$a$** — (a) worldsheet index; (b) normal-ordering shift in $L_0$ (Ch VII–VIII); (c) brane index in some texts (we mostly avoid this).
- **$\Phi$** — dilaton. Single use. OK.
- **$L$** — (a) AdS radius (Ch XV); (b) Virasoro generators $L_n$ (Ch VII onward); (c) longitudinal brane length, used briefly in widgets. Worth a note when both appear in a chapter.
- **$D$** — (a) spacetime dimension; (b) D-brane prefix. Always distinguishable by surrounding letters but flag.
- **$p$** — (a) brane spatial dimension in "D$p$-brane"; (b) momentum $p^\mu$. Both ubiquitous.
- **$h$ vs $\gamma$** — worldsheet metric — we settled on $h$; flagged in index conventions.

## Outstanding work, in suggested order

1. **Pass A — Notation audit.** Walk through Ch IV–XV; for each chapter, list new symbols and verify against the global symbol table above. Add an inline reminder ("here $N$ refers to the level number, not the brane count of Ch XIII") wherever a previously-used letter takes on a new meaning.
2. **Pass B — Equation-term explanation.** For every display equation in Ch IV–XV, confirm there is either an `aside.where` block with one entry per new symbol, or an inline `<dfn>`-style note in the prose just before/after. The `aside.where` template is in `style.css`. Pattern to copy: see Ch I §1 (Einstein eq), Ch II §3 (metric).
3. **Pass C — Widget verification.** Open each chapter in browser, exercise its widget. Suspected weak spots:
   - Ch IV worldsheet heatmap (5760 rects, may be slow on small devices; numerical area integration may have sign issues at high amplitude).
   - Ch IX `beta-flow` (axis labels not vertically centered on a couple of grids).
   - Ch XV `ads-disk` Poincaré geodesics — the arc-orientation logic is heuristic; corner cases when the two points are close to a common diameter may render the wrong arc.
4. **Pass D — Equation accuracy advisor pass on Ch IV–XV.** Spot-check Virasoro algebra, the $D=26$ derivation, the RNS action, the sigma-model $\beta$-functions, the Strominger–Vafa Cardy step, and the GKP–Witten dictionary.
5. **Pass E — Citation verification.** Sample at least two citations per chapter for accuracy of journal, volume, year, page. arXiv IDs need to load.

## Things known to be true (don't rework)

- Ch I–III have been through advisor review and visual verification. Their math, framing, and widgets are confirmed.
- KaTeX SRI hashes are correct for v0.16.47 (verified against the KaTeX docs page on 2026-05-20).
- All chapter HTML files serve HTTP 200 and all JS passes `node --check`.

## Resuming cleanly

To pick this back up:

1. Make sure the local server is running: `python3 -m http.server 8765` from `~/dev/Books/`.
2. Read this file.
3. Read `CLAUDE.md` (one level up) for theme + workspace constraints.
4. Open `TaskList` to see granular status (tasks 17–22 cover the validation phase).
5. Start with Pass A unless told otherwise — every other pass benefits from a clean notation table.
