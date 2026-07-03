# Low-Energy Nuclear Reactions — Project Status

**Last updated:** 2026-07-03
**Phase:** All 10 chapters + appendix + 10 widgets drafted. Adversarial verification complete for Ch II–VII and IX (web-checked citations + equation fixes in place). **Ch I, VIII, X verification still pending** (workflow cut off by session limits). All mechanical gates green: KaTeX strict 765/765, widgets 10/10 execute in JSDOM and reproduce brief reference values.

## What exists

Self-contained HTML book at `lenr/`. Open by serving over HTTP:

```
./serve.sh 8765 lenr/
```

- `index.html` — book cover + 10-chapter TOC + conventions footer + methods-appendix link
- `style.css` — editorial theme (Source Serif 4 / Inter; **deep amber/copper accent `#a06010`** on warm off-white `#fbfaf7`, distinct from the five existing books)
- `book.js` — KaTeX bootstrap. Macros: `\dd \half \unit{} \abs{} \eV \keV \MeV \Ue \EG \nuc{}{} \Pd \Dtwo \DPd \Pxs \Sfac \barns \lam`. KaTeX built-ins `\eta` (Sommerfeld), `\sigma` (cross section), `\theta`, `\Gamma` used directly, never shadowed.
- `chapters/` — 10 chapters + `appendix-methods.html` (planned)
- `interactive/` — one widget per chapter (planned)

## Editorial direction

- **Stance:** a *critical compilation*. The book reports what the peer-reviewed record actually contains — claims, replications, failures, critiques — and cleanly separates three registers: established physics, contested claims, and clearly-labeled speculation (Ch X). Results that outrun theory are explicitly flagged in a ledger (Ch IX) for future research follow-up.
- **Audience:** a motivated polymath comfortable with calculus and introductory physics. No nuclear physics assumed; everything introduced inline.
- **Unifying frame:** *the Gamow factor and the error bar.* Every experiment in this field either raises the tunneling probability (materials, screening, energetic particles) or tightens the measurement (calorimetry, nuclear diagnostics) — and every claim lives or dies by one of those two numbers.

## Conventions in force throughout the book

- Energies in eV/keV/MeV; cross sections in barns; S-factor in keV·b; $\sigma(E)=\frac{S(E)}{E}e^{-2\pi\eta}$.
- Loading is the atomic ratio $x_{\mathrm{D/Pd}}$; excess power $P_{\mathrm{xs}}$ in W; screening energy $U_e$ in eV.
- Nuclides $\nuc{4}{He}$-style; "D" deuterium atom, "d" deuteron.
- Constants: $e^2/4\pi\epsilon_0 = 1.44$ eV·nm; D+D Q-values 4.03 MeV (t+p), 3.27 MeV ($^3$He+n), 23.85 MeV ($^4$He+γ); D+D Gamow energy $E_G \approx 0.986$ MeV (verify at draft time).
- Register discipline: established / contested / speculative always labeled in prose; Ch X is explicitly speculative.

## Chapter plan

| # | Title | Widget file | Draft | Eqn audit | Citations | KaTeX strict | Widget numerics |
|---|---|---|---|---|---|---|---|
| 1 | The Yardstick: Fusion and the Coulomb Barrier | `gamow-tunneling.js` | ✓ lead | lead spot-check (K&N/ALR/NACRE web-verified); **subagent pass pending** | partial | ✓ | ✓ |
| 2 | 1989: Palladium, Heavy Water, and a Scientific Crisis | `fp-energy-budget.js` | ✓ | ✓ verify agent | ✓ web (all 7) | ✓ | ✓ |
| 3 | The Art of the Calorimeter | `calorimeter-lab.js` | ✓ | ✓ verify agent | ✓ web | ✓ | ✓ |
| 4 | The Claimed Nuclear Evidence | `heat-helium.js` | ✓ | ✓ verify agent | ✓ web | ✓ | ✓ |
| 5 | Loading the Lattice | `loading-threshold.js` | ✓ | ✓ verify agent | ✓ web | ✓ | ✓ |
| 6 | Electron Screening: The Accepted Anomaly | `screening-enhancement.js` | ✓ | ✓ verify agent | ✓ web | ✓ | ✓ |
| 7 | The Reassessment: Google and NASA | `lattice-fusion.js` | ✓ | ✓ verify agent | ✓ web | ✓ | ✓ |
| 8 | New Programs: Japan, Europe, ARPA-E | `nano-heat.js` | ✓ | **pending** | **pending** | ✓ | ✓ |
| 9 | Theories and the Explanatory Gap | `rate-ladder.js` | ✓ | ✓ verify agent | ✓ web | ✓ | ✓ |
| 10 | Where the Breakthroughs May Come From | `bayes-replication.js` | ✓ | **pending** | **pending** | ✓ | ✓ |

## Build process (user-mandated accounting)

Per the commissioning request, the subagent model type used for each chapter/task is recorded in a footnote in each chapter, and `chapters/appendix-methods.html` documents in detail how the research was conducted and analyzed and by which models. Research: 10-area parallel literature workflow + gap-check critic (all agents on `claude-fable-5`). Build: draft → adversarial-verify pipeline per chapter.

## Outstanding

1. **Adversarial verification of Ch I, VIII, X** — their verify agents never ran (session-limit failures across three workflow resumes). Options: resume workflow `wf_5537d654-23b` after a reset, or lead-verify in the main loop (web-check the ~5–7 Further-reading citations per chapter, re-derive display equations vs the briefs). Their footnotes and this table honestly say "pending" until then; on completion restore the standard "adversarially verified" footnote wording in Ch I/VIII/X.
2. **Methods-appendix statistics** — update the model-accounting table and token totals in `chapters/appendix-methods.html` to the final build numbers (research 1.00M tok / 11 agents done; build across three resumes ~3.8M tok / draft+verify agents).
3. **Browser interaction pass** — widgets are verified to execute and compute correctly in JSDOM; live drag/slider/animation not yet exercised in a real browser (`./serve.sh 8765 lenr/`). Most-interactive: `gamow-tunneling`, `rate-ladder` (7 controls), `bayes-replication`, `calorimeter-lab`.

## Lead fixes applied during validation

- Literal `$` amounts in Ch VII/VIII prose rewritten as "USD n" (they collided with KaTeX inline-math `$` delimiters).
- Ch I arithmetic corrected ("fifty-three" → "about fifty-two" orders of magnitude; matches the `rate-ladder` widget's "52 orders still missing").
- Footnote integrity: Ch V/VI/VII said "verification scheduled" but their verify agents had in fact completed — restored to "adversarially verified". Ch X said "verified" but its verify never ran — corrected to "pending". Ch I over-claimed a subagent verification — corrected to "lead spot-check; subagent pass pending".

## PR history

PRs #3, #4, #5 were each merged by the user (2026-07-02). Because a merged PR is terminal, each round of follow-up work restarts this branch from the updated `main` and opens a fresh PR — this is the intended pattern for staged delivery, not stacking on merged history.
