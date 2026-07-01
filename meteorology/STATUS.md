# Meteorology: The Atmosphere in Motion — Project Status

**Last updated:** 2026-05-30
**Phase:** First-pass drafts complete for all 10 chapters + 10 widgets; equation, citation, KaTeX, and widget-numerics validation passed. User review pending.

## What exists

Self-contained HTML book at `meteorology/`. Open by serving over HTTP:

```
./serve.sh 8765 meteorology/
```

- `index.html` — book cover + 10-chapter TOC + conventions footer
- `style.css` — editorial theme (Source Serif 4 / Inter; **storm slate-blue accent `#2b5c8a`** on warm off-white `#fbfaf7`, distinct from string-theory's terracotta `#a83e2a`, comp-chem's petroleum-teal `#1f6f7a`, and modern-ml's forest-green `#2f6b4a`)
- `book.js` — KaTeX bootstrap. Macros: `\R \Ex \half \dd \pd \grad \Dt \DDt \vu \vv \vV \vU \vk \vr \vx \vF \vg \vQ \vOmega \vnabla \Rd \Rv \cp \cv \Lv \Ro \CAPE \CIN \degC \unit \abs \norm \inner`. **Avoids KaTeX built-in clashes**: `\theta` (potential temperature), `\zeta` (vorticity), `\Phi` (geopotential), `\phi` (latitude), `N` (Brunt–Väisälä) are the built-ins, used directly — not overridden.
- `chapters/01-…html` through `10-…html` — all 10 drafted
- `interactive/*.js` — 10 widgets, one per chapter, mounted via `<section data-widget="…">`

## Editorial direction

- **Stance:** A dynamics-forward physical primer. Foundations (Ch I–III: structure, thermodynamics, radiation) build the state of the atmosphere; the dynamical core (Ch IV–VII: equations of motion, balanced flow, boundary layer, mid-latitude systems) builds its motion; the synthesis (Ch VIII–X: convection/mesoscale, general circulation/climate, numerical + ML prediction) carries it to the contemporary frontier. Ends on the 2022–2026 machine-learning weather-prediction revolution, mirroring the workspace's other books.
- **Audience:** A motivated polymath comfortable with multivariable calculus and introductory physics. No prior meteorology assumed; every term and symbol is introduced inline (preamble glossary + per-equation "Where" blocks + inline `<dfn>`).
- **Unifying frame:** the atmosphere as a thin shell of moist, compressible fluid on a rotating planet, forced by the Sun. Every chapter computes, balances, samples, or predicts some part of its state and motion.

## Conventions in force throughout the book

- **SI units**; pressure in hectopascals (hPa = mbar).
- **Velocity components:** $u$ eastward, $v$ northward, $w$ upward.
- **Vertical coordinate:** height $z$ in Ch I–III, VI; **pressure $p$ with geopotential $\Phi$** for the large-scale dynamics of Ch V, VII, IX. The switch is motivated and flagged at the end of Ch IV (hydrostatic balance makes $p$ monotonic in height) and re-flagged where each later chapter adopts it.
- **Rotating frame:** Northern Hemisphere, Coriolis parameter $f = 2\Omega\sin\phi > 0$. Lapse rate $\Gamma \equiv -dT/dz$ (positive when $T$ falls with height). $\omega \equiv Dp/Dt$, with $\omega<0$ = ascent.
- **Constants:** $g=9.81$, $R_d=287$, $c_p=1004$, $c_v=717$, $\kappa=0.286$, $\Omega=7.292\times10^{-5}$, $a=6.371\times10^6$, $\sigma=5.67\times10^{-8}$, $S_0=1361$, $L_v=2.5\times10^6$, $p_0=1000$ hPa, $\epsilon=R_d/R_v=0.622$, von Kármán $k=0.4$.
- **Logs natural** unless noted.
- **Known symbol overloads** (inherent to meteorology; each defined where used, all context-clear): $\sigma$ = Stefan–Boltzmann (III) / static-stability parameter (VII) / Lorenz parameter (X); $\beta$ = Rossby parameter $df/dy$ (V) / Lorenz parameter (X); $\omega$ = pressure-vertical-velocity (IV–IX) / wave frequency (V, VII). Ch X explicitly notes its $\sigma,\rho,\beta$ are the Lorenz parameters (Prandtl, Rayleigh, aspect ratio), not the book's earlier symbols.

## Chapter status

| # | Title | Widget file | Draft | Eqn audit | Citations | KaTeX strict | Widget numerics |
|---|---|---|---|---|---|---|---|
| 1 | The Atmosphere as a System | `standard-atmosphere.js` | ✓ | ✓ web (pass 1) + spot-check | ✓ pass 1 | ✓ | ✓ JSDOM exec |
| 2 | Atmospheric Thermodynamics | `skew-t.js` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3 | Radiation & Energy Balance | `gray-greenhouse.js` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4 | The Equations of Motion | `coriolis-circles.js` | ✓ | ✓ (full read by lead) | ✓ | ✓ | ✓ |
| 5 | Balanced Flow & Vorticity | `geostrophic-wind.js` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 6 | Boundary Layer & Turbulence | `ekman-spiral.js` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 7 | Mid-latitude Systems | `eady-growth.js` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 8 | Moist Convection & Mesoscale | `storm-hodograph.js` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 9 | General Circulation & Climate | `energy-balance-model.js` | ✓ | ✓ | ✓ | ✓ | ✓ |
| 10 | Numerical Prediction & Frontier | `lorenz-attractor.js` | ✓ | ✓ | ✓ | ✓ | ✓ |

## Validation performed (2026-05-30)

- **KaTeX strict harness.** A Node + KaTeX `0.16.47` harness rendered **all 1,950 math expressions** across the 10 chapters under `strict:"error"` + `throwOnError:true` (stricter than the runtime `strict:"ignore"`), with the exact `book.js` macros and HTML-entity decoding (so `&lt;`/`&gt;` are treated as the browser would). **0 failures** — no undefined macros, no unbalanced braces, nothing that would silently render as raw text. Harness: `/tmp/katexharness/check.js`.
- **`node --check`.** All 10 widget JS files parse cleanly.
- **Widget numerics (empirical).** Each widget's real code was executed in a JSDOM DOM (`/tmp/katexharness/widget-run.js`); all 10 `build()` end-to-end with **no runtime error**, and their default readouts were checked against reference values — every one matches: std-atmosphere 8 km → 236.1 K / 356 hPa (US Std); Skew-T CAPE 1294 J/kg, $w_{\max}$ 51 m/s; greenhouse $T_e=255$ K, $T_s=288$ K, fluxes energy-balanced (238+152=390); inertial period 16.9 h at 45°N; Ekman depth 311 m $=\sqrt{2K_m/f}$, 45° deflection; Eady $\sigma_{\max}=9.29\times10^{-6}$/s $=0.31\,f\Lambda/N$, $\lambda=3912$ km, e-fold 1.25 d; SRH 246 m²/s² → supercell; EBM $T=17.2°$C with hysteresis; Lorenz $\lambda\approx0.9$.
- **Structural lint.** Every chapter has the preamble + glossary, ≥1 "Where" block per symbol-introducing equation, the correctly-wired widget (`data-widget` slug ↔ `interactive/<slug>.js` script tag), further-reading, chapter-nav, and `../style.css`/`../book.js`. All internal chapter links and all 10 index TOC links resolve.
- **Citations.** Two layers. (a) The build's per-chapter adversarial verify pass web-checked Further-reading entries and refined several (e.g. it corrected the Ch X ML papers to their published journal titles/venues). (b) The lead then independently spot-verified the highest-risk references via live lookup (2026-05-30), breaking the circularity that the ML arXiv IDs originally came from the author's brief: **all six Ch X ML arXiv IDs confirmed** to resolve to the correct papers — GraphCast `2212.12794` (Science 382, 1416–1421), Pangu `2211.02556` (Nature 619, 533–538), GenCast `2312.15796` (Nature 637, 84–90), FourCastNet `2202.11214`, Aurora `2405.13063`, AIFS `2406.01465` — plus **Eady 1949** (Tellus 1, 33–52) and **Holton & Hakim 5th ed.** (Academic Press, 2013). The chapter prudently gives full journal cites only where confirmed and arXiv-only for FourCastNet/Aurora/AIFS (avoiding Aurora's renamed-title trap). The remaining textbook-chapter/section references (Vallis 2e, Wallace & Hobbs 2e, Marshall & Plumb, Pierrehumbert, Stull, Markowski & Richardson, Emanuel, Kalnay; Held & Hou 1980; Emanuel 1986) carry over from the build verify pass and were **not** individually re-checked by the lead — a light citation pass over those remains a reasonable (low-risk) to-do.

## External accuracy review (2026-07-01)

An external expert accuracy review found no equation-level errors; its nine vetted corrections (citation section numbers, Holton & Hakim 2013 dates in Ch V/VI, BRN storm-mode regimes, Richardson-failure attribution, mid-troposphere emission level, storm-size magnitude span, La Niña wording) were applied on 2026-07-01.

## How it was built

Two `Workflow` runs orchestrated subagents:
1. **Build** (`/tmp/met_wf/build.js`, 20 agents): per chapter, a *draft* agent wrote the HTML + widget from a shared house-style spec and a canonical, source-anchored equation brief, then an *adversarial verify* agent web-checked equations + citations and fixed in place. (Note: the intended Ch IV-first "gold template" sequencing was bypassed because `args` arrived as a string, so all 10 built in one pass; consistency held because every agent received the same spec + Ch IV brief.)
2. **Audit** (`/tmp/met_wf/audit.js`): a second perspective-diverse pass **stalled** (one background agent hung ~3.3 h on a web/tool call; only ~30k tokens; no files changed). It was abandoned in favor of the lead doing the widget-numerics verification directly (JSDOM, above) and personally spot-checking every load-bearing constant — which is stronger and more reliable than the stalled pass would have been.

## Conscious omissions (not gaps — scope choices, matching the sibling books' dynamics-forward stance)

- **Cloud microphysics** (drop/ice nucleation, the Bergeron process, size distributions) is deliberately omitted; the book treats moisture thermodynamically (Clausius–Clapeyron, latent heat, CAPE) but not the microscale. A natural extension chapter if ever wanted.
- **Atmospheric chemistry / air quality / the ozone layer** beyond the structural mention in Ch I.
- **Observation systems** (radar, satellite retrievals) are referenced functionally (data assimilation in Ch X) but not detailed.

## Outstanding (for a human review pass)

- **Browser interaction testing.** Widgets are verified to *execute* and compute correctly in JSDOM, but the live drag/slider/animation interactions (Coriolis play/pause, Lorenz ensemble animation, hodograph storm-motion drag, EBM hysteresis ramp) have not been exercised in a real browser. This is the cheapest next pass — open each chapter via `serve.sh` and click through. Most-interactive: `coriolis-circles`, `lorenz-attractor`, `storm-hodograph`, `energy-balance-model`.
- **Advisor equation pass** on the most delicate derivations (Ch VII Eady dispersion relation + Q-vector omega equation; Ch III gray-atmosphere layer derivation; Ch VIII potential-intensity form) — spot-checked by the lead and the build verifier, but a dedicated advisor read would add confidence.
- **Mobile/typography pass** at ≤600px (the `aside.where` and glossary grids stack to one column; confirm long unit strings and the wide widgets don't overflow).

## Per-chapter workflow (per workspace CLAUDE.md gating)

1. Draft chapter HTML following the section/widget/Where-block conventions.
2. Re-read every equation against a cited source; hold conventions book-wide.
3. Verify "Further reading" citations (web).
4. Advisor sanity check on equations and prose.
5. Build + browser-verify the widget before marking the chapter complete.
