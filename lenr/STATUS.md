# Low-Energy Nuclear Reactions — Project Status

**Last updated:** 2026-07-02 (night)
**Phase:** ALL TEN CHAPTERS + widgets drafted; mechanical gates pass book-wide (KaTeX strict 754/754 expressions; 10/10 widgets execute in JSDOM reproducing brief reference values; structure/nav lint clean). Adversarial verification: Ch II done (5 substantive fixes incl. a sign error in the thermoneutral-potential aside; all 7 citations web-confirmed). Verify passes for Ch I, III-X resume after the 02:40 UTC token reset (workflow runId wf_5537d654-23b; note draft:ch9 files are complete but uncached, so Ch IX will be redrafted on resume - re-run gates after).

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
| 1 | The Yardstick: Fusion and the Coulomb Barrier | `gamow-tunneling.js` | ✓ lead | lead spot-check (K&N/ALR/NACRE web-verified) | partial | ✓ | ✓ |
| 2 | 1989: Palladium, Heavy Water, and a Scientific Crisis | `fp-energy-budget.js` | ✓ | ✓ verify agent (5 fixes) | ✓ web (all 7) | ✓ | ✓ |
| 3 | The Art of the Calorimeter | `calorimeter-lab.js` | ✓ | pending | pending | ✓ | ✓ |
| 4 | The Claimed Nuclear Evidence | `heat-helium.js` | ✓ | pending | pending | ✓ | ✓ |
| 5 | Loading the Lattice | `loading-threshold.js` | ✓ | pending | pending | ✓ | ✓ |
| 6 | Electron Screening: The Accepted Anomaly | `screening-enhancement.js` | ✓ | pending | pending | ✓ | ✓ |
| 7 | The Reassessment: Google and NASA | `lattice-fusion.js` | ✓ | pending | pending | ✓ | ✓ |
| 8 | New Programs: Japan, Europe, ARPA-E | `nano-heat.js` | ✓ | pending | pending | ✓ | ✓ |
| 9 | Theories and the Explanatory Gap | `rate-ladder.js` | ✓ | pending | pending | ✓ | ✓ |
| 10 | Where the Breakthroughs May Come From | `bayes-replication.js` | ✓ | pending | pending | ✓ | ✓ |

## Build process (user-mandated accounting)

Per the commissioning request, the subagent model type used for each chapter/task is recorded in a footnote in each chapter, and `chapters/appendix-methods.html` documents in detail how the research was conducted and analyzed and by which models. Research: 10-area parallel literature workflow + gap-check critic (all agents on `claude-fable-5`). Build: draft → adversarial-verify pipeline per chapter.

## Outstanding

- Resume build workflow after 02:40 UTC (runId wf_5537d654-23b): adversarial verify Ch I, III-X (Ch II done). Ch IX will be redrafted (its draft agent died at return, so no cache entry); re-run all gates and re-check the USD/dollar-sign discipline afterward.
- After verification: restore standard footnote wording in Ch III-X, final gates, update methods-appendix statistics, browser interaction pass.
- Lead fixes applied post-draft: literal $ amounts in Ch VII/VIII prose rewritten as "USD n" (KaTeX delimiter collision); footnotes reworded to "verification pass scheduled" where verification is pending.
- PRs #3 and #4 were merged by the user 2026-07-02; remaining work continues on the restarted branch as a new PR.
