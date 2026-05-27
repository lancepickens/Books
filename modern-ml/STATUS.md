# A Modern Introduction to Machine Learning — Project Status

**Last updated:** 2026-05-27
**Phase:** First-pass drafts complete for all 10 chapters; user review pending.

## What exists

Self-contained HTML book at `modern-ml/`. Open by serving over HTTP:

```
./serve.sh 8765 modern-ml/
```

- `index.html` — book cover + 10-chapter TOC + conventions footer
- `style.css` — editorial theme (Source Serif 4 / Inter; forest-green accent `#2f6b4a` on warm off-white, distinct from string-theory's terracotta and comp-chem's petroleum-teal)
- `book.js` — KaTeX bootstrap. Macros: `\R \Ex \Prob \NN \ZZ \ind \eps \dd \half \loss \data \hyp \KL \softmax \argmin \argmax \norm \abs \inner \vx \vy \vw \vh \vz \vq \vk \vv \vtheta \mW \mX \mA \mK`. **Avoided clashing with KaTeX built-ins**: `\E`, `\P`, `\1`, `\theta` are NOT overridden (the parser uses them); use `\Ex`, `\Prob`, `\ind`, `\boldsymbol{\theta}` (or `\vtheta`) instead.
- `chapters/01-…html` through `10-…html` — all 10 drafted
- `interactive/*.js` — 10 widgets, one per chapter, mounted via `<section data-widget="…">`

## Editorial direction

- **Stance:** Modern, frontier-leaning balanced. Foundations (Ch I–IV) cover the learning problem through CNNs/ViTs at deliberate but compressed pace; the second half (Ch V–X) carries the contemporary story — transformers, pretraining + scaling laws, alignment, reasoning, agents, generative.
- **Audience:** Comfortable with multivariable calculus, linear algebra, basic probability. Geometry-first phrasing where natural. Same audience contract as the workspace's other books.
- **Unifying frame:** the triple (data, function class, loss), optimized by gradient descent on a loss. Every method is a different choice of those three plus an optimizer.

## Conventions in force throughout the book

- **Vectors:** bold lowercase ($\mathbf{x}, \mathbf{w}$). **Matrices:** bold uppercase ($\mathbf{W}, \mathbf{X}$). **Scalars:** italic ($x, y, \theta_i$).
- **Parameters:** $\boldsymbol{\theta}$. **Loss:** $\mathcal{L}$. **Expectation:** $\mathbb{E}$. **KL:** $\mathrm{KL}$.
- **Data distribution:** $\mathcal{D}$. **Hypothesis class:** $\mathcal{H}$.
- **Logs are natural** (`log = ln`) unless explicitly noted.

## Chapter status

| # | Title | Widget file | Draft | Eqn audit | Advisor | Browser-verified |
|---|---|---|---|---|---|---|
| 1 | Foundations | `bias-variance.js` | ✓ | self-check | — | — |
| 2 | Linear Models & Kernels | `ridge-path.js` | ✓ | self-check | — | — |
| 3 | NNs & Backprop | `mlp-decision.js` | ✓ | self-check | — | — |
| 4 | Vision: CNNs & ViTs | `conv-demo.js` | ✓ | self-check | — | — |
| 5 | Sequences & Transformers | `attention-viewer.js` | ✓ | self-check | — | — |
| 6 | Pretraining & Scaling Laws | `scaling-laws.js` | ✓ | self-check | — | — |
| 7 | Alignment (SFT/RLHF/DPO) | `rlhf-kl.js` | ✓ | self-check | — | — |
| 8 | Reasoning & Test-Time | `best-of-n.js` | ✓ | self-check | — | — |
| 9 | Agents, Tools, RAG | `rag-retrieval.js` | ✓ | self-check | — | — |
| 10 | Generative & Frontier | `diffusion-2d.js` | ✓ | self-check | — | — |

All chapter HTML files serve; all widget JS files pass `node --check`.

## Citation status (2026-05-26 / 2026-05-27)

Three rounds of citation verification have run, covering effectively every Further-reading entry in the book (108 verifications across ~95 unique refs after dedup):

**Round 1 (2026-05-26)** — verified at scaffold-decision time: 26 modern refs spanning DeepSeek-V3 / R1, Llama 3, Snell test-time, Lightman PRM, Wei CoT, Yao ReAct, Lewis RAG, Schick Toolformer, DINOv2, CLIP, Flow Matching, Latent Diffusion, V-JEPA, Elhage superposition, Olsson induction heads, Rafailov DPO, Ouyang InstructGPT, Bai Constitutional AI, LoRA, QLoRA, Gu/Dao Mamba. Found 4 minor corrections (DeepSeek-V3 title precision, DeepSeek-R1 date precision, DINOv2 date, V-JEPA Feb-not-Apr). Got canonical refs for the 4 ambiguous-by-name items: OpenAI o1 system card (arXiv:2412.16720); MCP (anthropic.com/news/model-context-protocol, Nov 2024); Sora (openai.com/index/video-generation-models-as-world-simulators, Feb 2024); Scaling Monosemanticity (transformer-circuits.pub/2024/scaling-monosemanticity, May 2024). Noted Llama 4 release (April 2025) — incorporated into Ch VI alongside Llama 3.

**Round 2 (2026-05-27)** — focused on the 17 refs introduced in chapters 1, 2, 3, 8, 9, 10 that round 1 did not cover (Belkin/Nakkiran double descent, NTK, Baydin autodiff, self-consistency, GSM8K, ToT, Qwen2.5-Math, AutoGen, Voyager, SWE-bench, DiT, Cunningham SAE, FineWeb, emergence-mirage, RLAIF, Llama 3 lead author). Found 1 correction: Baydin autodiff survey is JMLR 18(153) **2018**, not 2017.

**Round 3 (2026-05-27)** — comprehensive verification of all remaining ~64 refs across both chapter halves (textbooks, foundational papers, every Further-reading entry not yet checked). Found 4 corrections applied and one title swap:
- Ch 6 SentencePiece: full title is "…tokenizer and detokenizer **for Neural Text Processing**" (trailing phrase was missing).
- Ch 6 Switch: title is "Switch **Transformers**" (plural), not singular.
- Ch 6 Llama 4 blog: cited title was a paraphrase; replaced with the actual headline "The Llama 4 herd: The beginning of a new era of natively multimodal AI innovation" while keeping "Scout/Maverick/Behemoth" as a descriptive trail.
- Ch 7 Stiennon: title is "Learning to summarize **from** human feedback" (not "with").
- Ch 9 Reflexion: author list was missing **E. Berman** between Cassano and Gopinath.

All other ~89 refs verified as-cited. arXiv IDs, years, venues, page numbers, edition information all checked.

## Outstanding validation work

Tracked in the project TaskList. Four passes mirror the comp-chem workflow:

- **Pass A — Browser-verify all 10 widgets.** JS passes `node --check` but none has been opened in a real browser yet. Most-risky widgets: `attention-viewer.js` (drag interactions on SVG), `mlp-decision.js` (live training loop on canvas), `diffusion-2d.js` (timer-driven SDE), `scaling-laws.js` (Newton solver for optimal allocation). Most-user-facing: `bias-variance.js`, `attention-viewer.js`.
- **Pass B — Advisor equation-accuracy on all 10 chapters.** No chapter has had an advisor pass yet. Ch V (attention math), Ch VI (Chinchilla loss model), Ch VII (DPO derivation, KL-RL closed-form), Ch X (DDPM forward/reverse formulas) deserve the most scrutiny.
- ~~Pass C — Citation verification.~~ **DONE 2026-05-27** (rounds 1, 2, 3). Every Further-reading entry verified or corrected.
- **Pass D — Notation audit.** Confirm conventions hold chapter-to-chapter. The macros are clean (no built-in shadows), but watch:
  - $\rho$ is not used in this book (no comp-chem-style collision).
  - $\eps$ is used both for noise (Ch X diffusion) and for epsilon balls / numerical stability (Ch III Adam). Context disambiguates.
  - $\mathbf{R}$ is not used here for nuclear coords; reserved for $\mathbb{R}$ via `\R`.
  - $\beta$ overloads: noise schedule (Ch X), KL-RL strength (Ch VII), momentum coefficient (Ch III). Always context-clear.

## Where we left off (2026-05-27)

The user's instruction was "finish the draft of all chapters, check references and fix any errors you find" via /goal. That first pass is complete: 10 chapters + 10 widgets drafted, JS clean, 44 references actively verified across two rounds, the worst-case macro collisions in `book.js` fixed pre-emptively.

## Resume entry point

When picking this back up:

1. Start the local server: `~/dev/Books/serve.sh 8765 modern-ml/`
2. Open `http://localhost:8765/modern-ml/`
3. Click through the TOC, open each chapter, exercise each widget. That's Pass A.
4. Spot-check a handful of equations against the cited sources — start with the chapters flagged above (V, VI, VII, X).
5. If continuing autonomously rather than waiting for user review, start with Pass A — it's the cheapest, most likely to surface things the other passes can't see (typography, mobile, KaTeX rendering, canvas/SVG sizing, hover/drag interactions).

## Known unfinished details flagged for the validation phase

- **Ch IV widget** uses hand-set 3×3 kernels on procedural images. The point is to make the convolution operation legible — not to demonstrate learned CNN features. If we later want a "learned filter" widget, that's a Ch IV extension.
- **Ch VI widget** uses the Hoffmann et al. fit constants ($A=406.4$, $\alpha=0.34$, $B=410.7$, $\beta=0.28$, $E=1.69$); these reproduce Chinchilla qualitatively but should not be cited as exact for any downstream calculation.
- **Ch VII widget** uses a hand-set 1D reward and a Gaussian reference policy — illustrative of the closed-form $\pi^* \propto \pi_{\text{ref}} e^{r/\beta}$, not a realistic LLM policy.
- **Ch VIII widget** assumes independent samples (Bernoulli model). Real best-of-N traces are correlated; the curve is an upper bound.
- **Ch X widget** uses the *true* analytic score of the noised mixture, since the data distribution is closed-form. A real diffusion model approximates this with a neural net. The caption flags this.
- The agent widget (Ch IX) is RAG-only; no live tool-loop simulator. Could be added.

## Per-chapter workflow

Per workspace CLAUDE.md gating:

1. Draft chapter HTML following the section/widget/where-block conventions.
2. Re-read every equation against a cited source. Use the same conventions throughout.
3. Verify "Further reading" citations.
4. Call the advisor for a sanity check on equations and prose.
5. Build the chapter's in-browser interactive widget; eyeball it in a real browser before marking the chapter complete.
