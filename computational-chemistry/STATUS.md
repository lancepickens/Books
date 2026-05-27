# Computational Chemistry: A Primer — Project Status

**Last updated:** 2026-05-26
**Phase:** First-pass drafts complete; Passes C (citation verification) and D (notation audit) complete. Passes A (browser-verify) and B (advisor on Ch 2–10) still open.

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
| 2 | Hartree–Fock | `scf-iteration.js` | ✓ | self+C+D | — | — |
| 3 | Basis Sets and Correlation | `basis-convergence.js` | ✓ | self+C+D | — | — |
| 4 | Density Functional Theory | `jacobs-ladder.js` | ✓ | self+C+D | — | — |
| 5 | Periodic Systems and Plane Waves | `band-structure.js` | ✓ | self+C+D | — | — |
| 6 | Dynamics on the Surface | `muller-brown.js` | ✓ | self+C+D | — | — |
| 7 | Excited States and Photochemistry | `conical-intersection.js` | ✓ | self+C+D | — | — |
| 8 | Descriptors and Kernel Potentials | `gap-1d.js` | ✓ | self+C+D | — | — |
| 9 | Equivariant Neural Potentials | `equivariance.js` | ✓ | self+C+D | — | — |
| 10 | Quantum Computing for Chemistry | `vqe-h2.js` | ✓ | self+C+D | — | — |

**Outstanding validation work** (per CLAUDE.md gate). Tracked in the project TaskList (tasks 12–16):

- **Pass A — Browser-verify all 10 widgets** (task 13). JS passes `node --check` but no widget has been opened in a real browser. The Müller–Brown (Ch 6) and conical-intersection (Ch 7) widgets do the heaviest work and warrant the most scrutiny; the orbital viewer (Ch 1) and SCF iteration (Ch 2) are the most user-facing.
- **Pass B — Advisor equation-accuracy on Ch 2–10** (task 14). Ch 1 already had a full advisor pass. The remaining nine chapters have author self-checks only.
- ~~Pass C — Citation verification~~ **DONE 2026-05-26.** Targeted verification of 13 priority refs + 3 spot-checks. Three corrections applied (see "Pass C findings" below); the canonical refs (Hohenberg–Kohn, Kohn–Sham, Born–Oppenheimer, Møller–Plesset, Roothaan, Monkhorst–Pack, Tully, Verlet, Car–Parrinello, PBE, SCAN, D3, Bravyi–Kitaev, Peruzzo, Kandala, McArdle RMP, Bartók GAP/SOAP, Behler–Parrinello) were not re-checked individually.
- ~~Pass D — Notation audit~~ **DONE 2026-05-26.** Three inline disambiguations added (see "Pass D findings" below). The $\phi$ AO vs $\varphi$ KS distinction holds throughout — index style (Greek $\mu$ vs Latin $i$) makes it robust independent of glyph rendering.

## Pass C findings (citation verification, 2026-05-26)

Corrections applied to chapter files:

- **Ch 9 / `09-equivariant-nnps.html`**: the original entry "C. L. Zitnick et al. (Meta FAIR Chemistry team). 'The Open Catalyst 2024 (OC24) dataset and Universal Materials Atomistic model (UMA).' 2024/2025 technical reports" conflated three artifacts and misattributed authorship. Split into two correct refs: OMat24 dataset (Barroso-Luque, Shuaibi, Fu, Wood, Dzamba, et al., arXiv:2410.12771, 2024) and the UMA model (Wood, Dzamba, Fu, Gao, Shuaibi, et al., arXiv:2506.23971, 2025). The "OC24" name does not exist — the FAIR 2024 catalyst dataset is "OCx24" (arXiv:2411.11783), which the chapter no longer needs to cite by name.
- **Ch 8 / `08-descriptors-and-kernels.html`**: Vandermause et al. title was truncated. Added the trailing "for atomistic rare events." Volume/article number (6, 20, 2020) were correct.
- **Ch 10 / `10-quantum-computing.html`**: §5 prose cites "Goings et al. (PNAS 2022) for cytochrome P450" but the ref was missing from Further reading. Added: Goings, White, Lee, Tautermann, Degroote, Gidney, Shiozaki, Babbush, Rubin, PNAS 119(38), e2203533119 (2022).

Verified-as-written (no change): MACE-MP-0 arXiv:2401.00096; ORB arXiv:2410.22570; TFN arXiv:1802.08219; NequIP Nat. Commun. 13, 2453 (2022); Allegro Nat. Commun. 14, 579 (2023); Lee PRX Quantum 2, 030305 (2021); von Burg Phys. Rev. Research 3, 033055 (2021); Mardirossian–Head-Gordon Mol. Phys. 115, 2315 (2017); Plasser et al. JCTC 12, 1207 (2016); Deringer Chem. Rev. 121, 10073 (2021); Müller–Brown TCA 53, 75 (1979); Helgaker–Klopper–Koch–Noga JCP 106, 9639 (1997); Giannozzi QE J. Phys. Condens. Matter 21, 395502 (2009).

## Pass D findings (notation audit, 2026-05-26)

Three inline disambiguation notes added to the chapter HTML:

- **Ch 5 §1 (`05-periodic-systems.html`)**: $\mathbf{R}$ is introduced as a Bravais lattice vector but the same glyph was used for nuclear coordinates in Chs 1–4. Added a one-line reminder that within this chapter $\mathbf{R}$ means a lattice translation; nuclei don't appear so context disambiguates.
- **Ch 3 §1 (`03-basis-sets-and-correlation.html`)**: $\mathbf{P} = (\alpha\mathbf{A} + \beta\mathbf{B})/(\alpha+\beta)$ is the Gaussian product center, but Ch 2 uses the same bold $\mathbf{P}$ for the density matrix. Added an inline parenthetical to that effect.
- **Ch 8 §3 (`08-descriptors-and-kernels.html`)**: $\rho_i(\mathbf{r})$ is the SOAP "local atomic density" — a Gaussian smear of neighbor positions, not the electronic density $\rho(\mathbf{r})$ of Ch 4. Added a clarifier paragraph after the defining equation.

Other collisions surveyed and judged not to need an inline note (different chapters, glyph-weight or hat-vs-no-hat distinguishes them, or context is unmistakable): $\hat T$ kinetic vs cluster operator; $\rho_{nm}$ population matrix (Ch 7) vs $\rho$ electron density; $\mathbf{G}$ reciprocal lattice (Ch 5) vs $G_i$ symmetry function (Ch 8); $h$ core integral (Ch 2) vs $h$ coupling mode (Ch 7) vs $\mathbf{h}_i$ feature vector (Ch 9); $\phi$ AO basis vs $\phi$ message-passing update function (Ch 9); $\sigma$ spin label vs Gaussian width; $\hat X, \hat Y, \hat Z$ Pauli (Ch 10) vs $Y_l^m$ spherical harmonics; $K$ basis size vs $\mathbf{K}$ kernel matrix vs $\hat K_j$ exchange operator.

Cosmetic inconsistency not changed: cutoff radius is written $R_c$ in Ch 8 (faithful to Behler–Parrinello 2007 notation) and $r_c$ in Chs 5 and 9. Standardizing would diverge from the literature notation that Ch 8 is teaching, so left as-is. Note for any future reader.

Convention confirmed to hold: $\phi_\mu$ (Greek subscript) for atomic-orbital basis, $\varphi_i$ (Latin subscript) for Kohn–Sham orbitals. The subscript discipline is more robust than the $\phi$/$\varphi$ glyph distinction (which depends on font rendering).

---

## Where we left off (2026-05-26)

Drafts complete; Passes C (citations) and D (notation) done in this session. Remaining: Pass A (browser-verify widgets) and Pass B (advisor equation pass on Ch 2–10). Pass A is still the recommended next step — cheapest and surfaces the most issues the other passes can't see.

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
