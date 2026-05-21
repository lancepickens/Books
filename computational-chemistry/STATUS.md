# Computational Chemistry: A Primer — Project Status

**Last updated:** 2026-05-21
**Phase:** First-pass drafts complete for all 10 chapters; user review pending.

## What exists

Self-contained HTML book at `computational-chemistry/`. Open by serving the folder over HTTP:

```
./serve.sh 8765 computational-chemistry/
```

- `index.html` — book cover + 10-chapter TOC + conventions footer
- `style.css` — editorial theme (Source Serif 4 / Inter; petroleum-teal accent on warm off-white, distinct from string-theory's terracotta)
- `book.js` — KaTeX bootstrap. Macros: `\R \C \Z \eps \dd \half \bra \ket \braket \matrixel \op \vr \vR \vk \vq`. Avoid `\d` (reserved by KaTeX); use `\mathrm{d}` or `\dd`.
- `chapters/` — chapters drop here as `01-…html` through `10-…html`
- `interactive/` — one widget per chapter, mounted via `<section data-widget="…">`

## Editorial direction

- **Stance:** Modern, ML-forward. Foundations compressed into Ch 1–4 so we can spend Ch 8–10 on the genuinely contemporary story (descriptor potentials, equivariant nets and foundation models, quantum computing).
- **Audience:** Motivated polymath. Assumes basic chemistry. QM and all method-specific terminology are introduced inline through "Where" blocks and `<dfn>` definitions.
- **Unifying frame:** the potential energy surface. Every method either *computes* E(R) at a point, *samples* it, *traverses* it, or *learns* it.

## Conventions in force throughout the book

These are written into the index footer; every chapter must honor them.

- **Atomic units:** $\hbar = m_e = e = 1/(4\pi\epsilon_0) = 1$. Energies in Hartrees ($1\,\mathrm{Ha} = 27.2114\,\mathrm{eV}$). Lengths in Bohr radii ($1\,a_0 = 0.5292\,$Å).
- **Electron coordinates:** lowercase $\mathbf{r}_i$. **Nuclear coordinates:** uppercase $\mathbf{R}_A$.
- **Operators wear hats:** $\hat H$, $\hat F$, $\hat T$, $\hat V$.
- **Chemists' notation** for two-electron integrals: $(ij|kl) = \int \phi_i^*(1)\phi_j(1) \frac{1}{r_{12}} \phi_k^*(2)\phi_l(2)\,d1\,d2$.
- **Spin orbitals:** lowercase $\chi_i(\mathbf{x})$ where $\mathbf{x} = (\mathbf{r}, \sigma)$. **Spatial orbitals:** $\psi_i(\mathbf{r})$.
- **Molecular orbital expansion:** $\psi_i = \sum_\mu C_{\mu i}\, \phi_\mu$ with $\phi_\mu$ Gaussian atomic basis functions.
- **Density:** $\rho(\mathbf{r})$ for electron density (always positive, integrates to N).
- **Citations:** Szabo–Ostlund for wavefunction methods, Helgaker–Jørgensen–Olsen for advanced WFT, Parr–Yang for DFT, Martin for solids, Frenkel–Smit for MD, Tully JCP 1990 for surface hopping, Behler 2007 / Bartók 2010 / Batzner 2022 / Batatia 2022 for ML potentials, McArdle et al. RMP 2020 for quantum.

## Chapter status

| # | Title | Widget file | Draft | Eqn audit | Advisor | Browser-verified |
|---|---|---|---|---|---|---|
| 1 | The PES and the Problem | `h-orbital-viewer.js` | ✓ | ✓ | ✓ (Ch 1 only) | — |
| 2 | Hartree–Fock | `scf-iteration.js` | ✓ | self-check | — | — |
| 3 | Basis Sets and Correlation | `basis-convergence.js` | ✓ | self-check | — | — |
| 4 | Density Functional Theory | `jacobs-ladder.js` | ✓ | self-check | — | — |
| 5 | Periodic Systems and Plane Waves | `band-structure.js` | ✓ | self-check | — | — |
| 6 | Dynamics on the Surface | `muller-brown.js` | ✓ | self-check | — | — |
| 7 | Excited States and Photochemistry | `conical-intersection.js` | ✓ | self-check | — | — |
| 8 | Descriptors and Kernel Potentials | `gap-1d.js` | ✓ | self-check | — | — |
| 9 | Equivariant Neural Potentials | `equivariance.js` | ✓ | self-check | — | — |
| 10 | Quantum Computing for Chemistry | `vqe-h2.js` | ✓ | self-check | — | — |

**Outstanding validation work** (per CLAUDE.md gate). Tracked in the project TaskList (tasks 12–16):

- **Pass A — Browser-verify all 10 widgets** (task 13). JS passes `node --check` but no widget has been opened in a real browser. The Müller–Brown (Ch 6) and conical-intersection (Ch 7) widgets do the heaviest work and warrant the most scrutiny; the orbital viewer (Ch 1) and SCF iteration (Ch 2) are the most user-facing.
- **Pass B — Advisor equation-accuracy on Ch 2–10** (task 14). Ch 1 already had a full advisor pass. The remaining nine chapters have author self-checks only.
- **Pass C — Citation verification** (task 15). Confirm every "Further reading" entry: titles, journals, volume/page, year; verify arXiv IDs where listed; spot-check primary papers in each chapter.
- **Pass D — Notation audit** (task 16). Confirm conventions hold chapter-to-chapter (see "Conventions in force"). Specifically check the $\phi$ overload between AO basis (Ch 2–3) and KS orbitals (Ch 4) — currently distinguished as $\phi$ vs $\varphi$, but worth verifying every instance.

---

## Where we left off (2026-05-21)

The user's instruction was "write the first pass drafts of the whole thing, then we'll start reviewing." That first pass is complete. **All ten chapters and ten widgets are drafted; nothing has been browser-tested or advisor-passed beyond Ch 1.**

## Resume entry point

When picking this back up:

1. Start the local server: `~/dev/Books/serve.sh 8765 computational-chemistry/`
2. Open `http://localhost:8765/computational-chemistry/`
3. Click through the TOC, opening each chapter and exercising its widget. Note anything that misrenders or feels off — that's Pass A.
4. The user wants to review before further drafting changes. Don't propagate fixes across chapters until the pattern has been confirmed against Ch 1–2 first.
5. If continuing autonomously rather than waiting for user review, start with Pass A (browser verify) — it's the cheapest and most likely to surface things the other passes can't see (typography, mobile, KaTeX rendering, canvas sizing).

## Known unfinished details flagged for the validation phase

- **Ch 3 widget**: H₂O energies across basis sets are rounded literature values, illustrative only. The chapter caption says so. If we want to tighten, pick a specific reference (Helgaker-Klopper-Koch-Noga JCP 106, 1997 is the right target for H₂O) and recompute.
- **Ch 4 widget**: Functional MAEs on W4-11/BH76/S66/MOR41 are approximate. If tightened, cite Goerigk-Grimme GMTKN55 (PCCP 19, 2017) or Mardirossian-Head-Gordon (Mol. Phys. 115, 2017) precisely.
- **Ch 7 widget**: Surface-hopping rule is a simplified Landau-Zener heuristic, not the full Tully fewest-switches algorithm. The caption frames it as "Landau-Zener-style" intentionally.
- **Ch 9 widget**: Naive model is a fitted ridge regression in raw Cartesian features evaluated at one orientation. It's a faithful illustration of the failure mode but doesn't claim to be a neural net.
- **Ch 10 widget**: 2-determinant Hamiltonian uses approximate (E_HF, E_DD, H_HD) values; verify against an actual H₂/STO-3G FCI calculation if tightening.

## Per-chapter workflow

Per CLAUDE.md gating:

1. Draft chapter HTML following the section/widget/where-block conventions.
2. Re-read every equation against a cited source (Szabo–Ostlund eq. numbers, Parr–Yang, Helgaker, etc.). Use the same conventions throughout.
3. Verify "Further reading" citations: titles, journals, years, arXiv IDs.
4. Call the advisor for a sanity check on equations and prose.
5. Build the chapter's in-browser interactive widget; eyeball it in a real browser before marking the chapter complete.
