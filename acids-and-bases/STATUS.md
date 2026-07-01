# Acids and Bases: A Primer — Project Status

**Last updated:** 2026-06-05
**Phase:** First-pass drafts of all 10 chapters + 10 widgets complete. Empirical gates (KaTeX strict render, widget syntax, widget JSDOM execution) run and passing. Browser-verify (Pass A) and advisor equation pass (Pass B) still open.

## What exists

Self-contained HTML book at `acids-and-bases/`. Serve over HTTP:

```
./serve.sh 8765 acids-and-bases/
```

- `index.html` — cover + 10-chapter TOC + conventions footer
- `style.css` — editorial theme (Source Serif 4 / Inter; **plum/mulberry accent `#8a3a6b`** on warm off-white, distinct from the other four books). The accent is the midpoint of the universal-indicator spectrum (acid red ↔ base violet).
- `book.js` — KaTeX bootstrap. Macros: `\Ka \Kb \Kw \Ksp \Kf \pKa \pKb \pKw \pH \pOH \Hp \Hthree \OHm \conc{} \eqm \Msol \dd \half \degC \Hzero \HR \sub \rxn`. **We deliberately do NOT define `\H`** (a KaTeX built-in accent); the proton is `\Hp`. Chemical species are spelled `\mathrm{...}`; reaction arrows use `\eqm` (= `\rightleftharpoons`). No mhchem / `\ce`.
- `chapters/` — `01-…html` through `10-…html`
- `interactive/` — one widget per chapter, mounted via `<section data-widget="…">`

## Editorial direction

- **Stance:** foundations → frontier. Chapters I–VI are the quantitative aqueous core (definitions, pH, exact equilibrium, buffers, titrations, speciation); VII explains acidity molecularly; VIII pushes past water (superacids); IX generalizes to the Lewis/electron-pair view and catalysis; X is the computational/ML frontier (pKa prediction).
- **Audience:** motivated polymath. Assumes basic chemistry; every equilibrium and method term is introduced inline via "Where" blocks and `<dfn>`.
- **Unifying frame:** *the proton's restless equilibrium* — every chapter is about where the proton sits, how tightly it is held, and how we move it.

## Conventions in force throughout (written into the index footer; every chapter honors them)

- **Concentrations** `[X]` in mol·L⁻¹ (M), referred to the standard state `c° = 1 M`, so equilibrium constants are **dimensionless**.
- **Temperature** 25 °C (298.15 K) unless noted, where `Kw = 1.0×10⁻¹⁴`, `pKw = 14.00`.
- **pH** `= −log₁₀ a(H⁺) ≈ −log₁₀[H⁺]`, taking activities = concentrations in dilute solution (Debye–Hückel flagged in Ch II §7 where it matters).
- **`H⁺` and `H₃O⁺`** both denote the hydrated proton.
- **`pKa = −log₁₀ Ka`**; for a conjugate pair `pKa + pKb = pKw = 14.00`.
- **`log` means `log₁₀`**; `ln` is natural.
- **Energies** in kJ·mol⁻¹ (Ch X also uses kcal·mol⁻¹, flagged): `ΔG° = −RT ln K`; `2.303 RT = 5.71 kJ·mol⁻¹ = 1.364 kcal·mol⁻¹` at 298 K, so **1 pKa unit = 1.364 kcal·mol⁻¹**.
- Ch VII uses Hammett `σ`, `ρ`; Ch VIII uses the Hammett acidity function `H₀` (macro `\Hzero`); Ch IX uses electronegativity `χ` and chemical hardness `η` (in eV, flagged).

## Chapter status

| # | Title | Widget file | Draft | KaTeX strict | Widget `node --check` | Widget JSDOM run | Advisor | Browser |
|---|---|---|---|---|---|---|---|---|
| I | Three Lenses on Acidity | `water-autoionization.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| II | The pH Scale and the Strength of Acids | `pka-ladder.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| III | Equilibrium in Water | `exact-ph-solver.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| IV | Buffers | `buffer-capacity.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| V | Titrations and Indicators | `titration-curve.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| VI | Polyprotic Acids and Speciation | `speciation-diagram.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| VII | The Molecular Origins of Acidity | `hammett-plot.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| VIII | Beyond Water: Solvents and Superacids | `acidity-window.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| IX | Lewis Acids, Hardness, and Catalysis | `hsab.js` | ✓ | ✓ | ✓ | ✓ | — | — |
| X | Computing pKa | `thermo-cycle.js` | ✓ | ✓ | ✓ | ✓ | — | — |

(The KaTeX / node / JSDOM columns are filled by the validation run recorded below.)

## Validation workflow (per CLAUDE.md gate)

```
# strict KaTeX over every expression (macros auto-read from book.js)
node .claude/skills/new-book/scripts/katex-check.js acids-and-bases
# widget syntax
for f in acids-and-bases/interactive/*.js; do node --check "$f"; done
# widget numerics in JSDOM
node .claude/skills/new-book/scripts/widget-run.js acids-and-bases
```

Harness deps (`katex@0.16.47`, `jsdom`) are installed under the scripts dir and git-ignored.

## Outstanding validation work

- **Pass A — browser-verify all 10 widgets.** They pass `node --check` and execute in JSDOM, but drag/animation and KaTeX-in-readout rendering need a real browser. Highest-scrutiny widgets: the exact pH solver (Ch III, numerical root-finding), the titration curve (Ch V, pH-sweep inversion), and the speciation diagram (Ch VI, multi-series alphas).
- **Pass B — advisor equation-accuracy pass on Ch II–X.** Each chapter has author/sub-agent self-checks and web-verified citations, but no independent advisor pass yet.

## Known caveats flagged for the validation phase

- **Ch I widget** uses tabulated `pKw(T)` (CRC / Bandura–Lvov 2006), linearly interpolated — illustrative, not a thermodynamic fit.
- **Ch III widget** covers monoprotic acid / base / strong-acid systems, not the diprotic ampholyte; the amphiprotic `pH ≈ ½(pKa₁+pKa₂)` is stated as the standard first approximation.
- **Ch VI** uses the exact diprotic α functions: HCO₃⁻ is ~92% of carbonate at pH 7.4 (the round "94–95%" sometimes quoted is approximate); prose and widget agree on 92%/8%/0.1%.
- **Ch VIII** `H₀` and `pKs` values are composition-dependent and quoted as accepted approximate values with the spread acknowledged (source: Olah, *Superacid Chemistry* 2nd ed.).
- **Ch IX** absolute-hardness values are in eV from Pearson, *Inorg. Chem.* 27, 734 (1988); H⁺ has η = ∞ (handled specially in the widget).
- **Ch X** widget is a thermodynamic-cycle estimator with `ΔG*solv(H⁺) = −265.9 kcal/mol` (Tissandier 1998) fixed; the preset reproduces a realistic acetic-acid-like pKa.

## Resume entry point

1. `~/dev/Books/serve.sh 8765 acids-and-bases/`
2. Open `http://localhost:8765/acids-and-bases/`, click through the TOC, exercise every widget (Pass A).
3. Then run the advisor equation pass (Pass B), Ch II–X.

## External accuracy review — 2026-07-01

An external factual-accuracy review pass was run against the book; its vetted corrections were applied (Ch I Arrhenius 1884/1887 note; Ch II HCl Ka ~10⁶, Debye–Hückel |z₊z₋| + Davies −0.3I form and naming, pH 2.88; Ch IV buffer capacity falls to ~⅓ at 10:1; Ch V pH 2.88; Ch X redundant kcal restatement removed; index TOC III "exact cubic" not "ICE tables").
