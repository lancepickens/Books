/* Interactive · One-dimensional energy-balance climate model with ice–albedo feedback.
   Diffusive EBM (Budyko 1969 / Sellers 1969; North 1975 coefficients):
       C ∂T/∂t = μ (S0/4) s(x)(1 − α(x;x_s)) − (A + B T)
                  + d/dx[ D(1 − x²) dT/dx ],     x = sin φ,  T in °C.
   The steady state is LINEAR in T once the ice line x_s is fixed, so the
   S-shaped equilibrium curve is traced by SWEEPING x_s (not μ): for each
   ice line, solve L G = Q once (tridiagonal), then μ(x_s)=(T_ice+A/B)/G(x_s)
   gives the multiplier that places the −10 °C ice edge there. The unstable
   middle branch — which no time-stepper can land on — appears automatically.
   A separate forward μ-ramp produces the hysteresis loop (jumps at the folds).
   Every on-screen number comes straight from these equations.
   Mounts into any [data-widget='energy-balance-model'] section. */

(function () {
  "use strict";

  // ── Palette ───────────────────────────────────────────
  const ACCENT = "#2b5c8a";
  const ACCENT_DEEP = "#173a5a";
  const WARM = "#b8651a";
  const GOLD = "#c08a2d";
  const FAINT = "#8e9a9e";
  const RULE = "#dde3ea";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";
  const CARD = "#ffffff";

  // ── Physics constants (North 1975; T in °C) ───────────
  const S0 = 1361;          // solar constant, W m^-2
  const A = 211.2;          // OLR intercept, W m^-2
  const B = 1.55;           // OLR slope, W m^-2 °C^-1
  const D = 0.65;           // diffusion, W m^-2 °C^-1
  const AW = 0.30;          // ice-free albedo
  const AI = 0.60;          // ice albedo
  const TICE = -10;         // ice-formation temperature, °C
  const N = 81;             // grid points in x = sin φ on [0,1]
  const DX = 1 / (N - 1);

  // mean-1 insolation distribution s(x) = 1 − 0.477 P2(x), P2 = (3x²−1)/2
  function sFun(x) { return 1 - 0.477 * (3 * x * x - 1) / 2; }
  function albedo(x, xs) { return Math.abs(x) < xs ? AW : AI; }

  // ── Canvas geometry ───────────────────────────────────
  const W = 540, H = 340;
  const M = { l: 52, r: 18, t: 16, b: 36 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // Plot ranges: μ on x-axis, global-mean T (°C) on y-axis.
  // Floor is −60 °C: the snowball branch (α=0.60 everywhere) sits near
  // −48 °C at μ=1 and −57 °C at μ=0.90, so it must be on-chart to be seen.
  const MU_MIN = 0.90, MU_MAX = 1.10;
  const T_MIN = -60, T_MAX = 30;

  document.querySelectorAll("[data-widget='energy-balance-model']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // ── Controls ────────────────────────────────────────
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const muCtl = makeSlider("solar multiplier S/S₀", 90, 110, 100, "%", 0.01);
    controls.appendChild(muCtl.wrap);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Ramp the hysteresis loop";
    styleBtn(btn);
    controls.appendChild(btn);

    // ── SVG ─────────────────────────────────────────────
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // ── Readout ─────────────────────────────────────────
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    // ── Legend ──────────────────────────────────────────
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.1rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      `<span><span style="display:inline-block;width:22px;height:2px;background:${WARM};vertical-align:middle;margin-right:0.35em"></span>stable branches</span>` +
      `<span><span style="display:inline-block;width:22px;height:0;border-top:2px dashed ${FAINT};vertical-align:middle;margin-right:0.35em"></span>unstable branch</span>` +
      `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ACCENT_DEEP};vertical-align:middle;margin-right:0.35em"></span>current climate</span>` +
      `<span><span style="display:inline-block;width:22px;height:2px;background:${ACCENT};vertical-align:middle;margin-right:0.35em"></span>ramp path</span>`;
    host.appendChild(legend);

    // ── Precompute the equilibrium S-curve by sweeping ice line x_s ──
    // Returns ordered list of {mu, Tbar, xs} from ice-free (warm) down through
    // the fold and along the unstable branch toward the snowball.
    const curve = computeEquilibriumCurve();
    // Also the fully ice-covered "snowball" branch (x_s = 0, α = α_ice everywhere).
    const snowball = computeSnowballBranch();

    // Hysteresis ramp state
    let rampPts = [];            // {mu, Tbar} visited during the ramp
    let ramping = false;
    let rampAl = null;           // current albedo pattern, carried forward
    let rampDir = 1, rampMu = MU_MIN, rampFrame = 0;

    function redraw() {
      const mu = muCtl.value() / 100;
      // Equilibrium the slider lands on: implicit fixed-point solve from a WARM
      // start, so the readout follows the stable upper branch until it tips.
      const eq = equilibriumAt(mu, warmAlbedo());
      render(svg, curve, snowball, rampPts, { mu, Tbar: eq.Tbar });
      const latStr = eq.frozen
        ? "fully glaciated (snowball)"
        : (eq.iceLat === null ? "no ice line (ice-free)" : `ice line near ${eq.iceLat.toFixed(0)}° latitude`);
      readout.innerHTML =
        `S/S₀ = <strong style="color:${ACCENT_DEEP}">${mu.toFixed(3)}</strong>` +
        ` &nbsp;·&nbsp; global mean T = <strong style="color:${ACCENT_DEEP}">${eq.Tbar.toFixed(1)} °C</strong>` +
        ` &nbsp;·&nbsp; ${latStr}`;
    }

    muCtl.input.addEventListener("input", () => {
      if (ramping) return;
      redraw();
    });

    btn.addEventListener("click", () => {
      if (ramping) return;
      startRamp();
    });

    function startRamp() {
      ramping = true;
      btn.disabled = true;
      btn.style.opacity = "0.5";
      rampPts = [];
      // Start on the WARM branch at HIGH forcing, where it is robust, and ramp
      // DOWN first. The warm branch exists only above the lower fold (μ≈0.96),
      // so starting low would collapse to snowball at once and show no loop.
      // Dimming makes the climate cling to warm until the lower fold, where it
      // drops to snowball; re-brightening then clings to snowball (its escape
      // fold lies past μ=1.10), tracing the open hysteresis gap.
      rampMu = MU_MAX;
      rampDir = -1;
      rampAl = warmAlbedo();
      rampFrame = 0;
      requestAnimationFrame(rampStep);
    }

    function rampStep() {
      // Advance the forcing slowly; at each μ converge the implicit solve
      // SEEDED from the previous albedo pattern — the branch persists until a
      // fold, where it jumps. That jump is the hysteresis.
      let Tbar = 0;
      for (let k = 0; k < 3; k++) {
        const r = solveSeeded(rampMu, rampAl);
        rampAl = r.al;
        Tbar = r.Tbar;
        rampPts.push({ mu: rampMu, Tbar });
        muCtl.setValue(Math.round(rampMu * 100) / 100);
        rampMu += rampDir * 0.0018;
        if (rampMu < MU_MIN) { rampMu = MU_MIN; rampDir = 1; }
        if (rampMu > MU_MAX && rampDir > 0) { ramping = false; break; }
      }
      const mu = Math.min(MU_MAX, Math.max(MU_MIN, rampMu));
      render(svg, curve, snowball, rampPts, { mu, Tbar });
      readout.innerHTML =
        `ramping S/S₀ = <strong style="color:${ACCENT_DEEP}">${mu.toFixed(3)}</strong>` +
        ` &nbsp;·&nbsp; T = <strong style="color:${ACCENT_DEEP}">${Tbar.toFixed(1)} °C</strong>` +
        ` &nbsp;·&nbsp; dim past the fold and it drops to snowball`;
      if (ramping) {
        rampFrame++;
        requestAnimationFrame(rampStep);
      } else {
        btn.disabled = false;
        btn.style.opacity = "1";
        redraw();
      }
    }

    redraw();
  }

  // ── EBM solver core ───────────────────────────────────

  // Solve L G = Q(·;x_s) on x in [0,1] with symmetry at x=0 and natural
  // (no-flux) pole at x=1, where a(x)=D(1−x²)→0. Tridiagonal Thomas solve.
  // L T = B T − d/dx[D(1−x²) dT/dx].  Returns G with T = μ G − A/B.
  function solveG(xs) {
    const lo = new Array(N).fill(0), di = new Array(N).fill(0),
          up = new Array(N).fill(0), rhs = new Array(N).fill(0);
    const ac = x => D * (1 - x * x);
    for (let i = 0; i < N; i++) {
      const x = i * DX;
      rhs[i] = (S0 / 4) * sFun(x) * (1 - albedo(x, xs));
      if (i === 0) {
        const ap = ac(0.5 * DX);
        di[i] = B + ap / (DX * DX);
        up[i] = -ap / (DX * DX);
      } else if (i === N - 1) {
        const am = ac(x - 0.5 * DX);
        di[i] = B + am / (DX * DX);
        lo[i] = -am / (DX * DX);
      } else {
        const ap = ac(x + 0.5 * DX), am = ac(x - 0.5 * DX);
        lo[i] = -am / (DX * DX);
        di[i] = B + (ap + am) / (DX * DX);
        up[i] = -ap / (DX * DX);
      }
    }
    return thomas(lo, di, up, rhs);
  }

  function thomas(lo, di, up, rhs) {
    const cp = new Array(N), dp = new Array(N), x = new Array(N);
    cp[0] = up[0] / di[0]; dp[0] = rhs[0] / di[0];
    for (let i = 1; i < N; i++) {
      const m = di[i] - lo[i] * cp[i - 1];
      cp[i] = up[i] / m;
      dp[i] = (rhs[i] - lo[i] * dp[i - 1]) / m;
    }
    x[N - 1] = dp[N - 1];
    for (let i = N - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
    return x;
  }

  // Area-weighted hemispheric mean: dx is the area measure in x = sin φ.
  function meanX(arr) {
    let s = 0;
    for (let i = 0; i < N; i++) {
      const w = (i === 0 || i === N - 1) ? 0.5 : 1;
      s += arr[i] * w;
    }
    return s * DX;
  }

  function interp(G, xs) {
    const fi = xs / DX, i0 = Math.floor(fi), fr = fi - i0;
    const i1 = Math.min(N - 1, i0 + 1);
    return G[i0] * (1 - fr) + G[i1] * fr;
  }

  // Trace the equilibrium curve by sweeping the ice line.
  function computeEquilibriumCurve() {
    const pts = [];
    for (let k = 0; k <= 120; k++) {
      const xs = 1 - k / 120;            // from ice-free (1) to snowball edge (0)
      if (xs < 0.02) continue;
      const G = solveG(xs);
      const Gx = interp(G, xs);
      if (Gx <= 0) continue;
      const mu = (TICE + A / B) / Gx;     // closed form, no root-finder
      const T = G.map(g => mu * g - A / B);
      pts.push({ mu, Tbar: meanX(T), xs });
    }
    return pts;
  }

  // Snowball branch: α = α_ice everywhere; T = μ G − A/B is linear in μ.
  function computeSnowballBranch() {
    const G = solveG(0);                  // xs=0 ⇒ ice everywhere
    const pts = [];
    for (let k = 0; k <= 60; k++) {
      const mu = MU_MIN + (MU_MAX - MU_MIN) * k / 60;
      const T = G.map(g => mu * g - A / B);
      pts.push({ mu, Tbar: meanX(T) });
    }
    return pts;
  }

  function warmAlbedo() { return new Array(N).fill(AW); }

  // Implicit steady solve for a FIXED albedo pattern and multiplier μ:
  //   B T − d/dx[D(1−x²)T'] = μ (S0/4) s(x)(1−α) − A.
  // Tridiagonal, unconditionally stable — no time-step limit.
  function solveT(al, mu) {
    const lo = new Array(N).fill(0), di = new Array(N).fill(0),
          up = new Array(N).fill(0), rhs = new Array(N).fill(0);
    const ac = x => D * (1 - x * x);
    for (let i = 0; i < N; i++) {
      const x = i * DX;
      rhs[i] = mu * (S0 / 4) * sFun(x) * (1 - al[i]) - A;
      if (i === 0) {
        const ap = ac(0.5 * DX);
        di[i] = B + ap / (DX * DX);
        up[i] = -ap / (DX * DX);
      } else if (i === N - 1) {
        const am = ac(x - 0.5 * DX);
        di[i] = B + am / (DX * DX);
        lo[i] = -am / (DX * DX);
      } else {
        const ap = ac(x + 0.5 * DX), am = ac(x - 0.5 * DX);
        lo[i] = -am / (DX * DX);
        di[i] = B + (ap + am) / (DX * DX);
        up[i] = -ap / (DX * DX);
      }
    }
    return thomas(lo, di, up, rhs);
  }

  // Fixed-point on the ice line: solve T, recompute albedo from T (ice where
  // T < TICE), repeat to convergence. Seeding the albedo selects the branch.
  function solveSeeded(mu, alSeed) {
    let al = alSeed.slice();
    let T = solveT(al, mu);
    for (let it = 0; it < 100; it++) {
      let changed = false;
      const al2 = new Array(N);
      for (let i = 0; i < N; i++) {
        const a = T[i] < TICE ? AI : AW;
        if (a !== al[i]) changed = true;
        al2[i] = a;
      }
      al = al2;
      T = solveT(al, mu);
      if (!changed) break;
    }
    return { T, al, Tbar: meanX(T) };
  }

  // Equilibrium the slider reports: converge from a given albedo seed, read ice line.
  function equilibriumAt(mu, alSeed) {
    const { T, Tbar } = solveSeeded(mu, alSeed);
    let iceLat = null, frozen = false;
    if (T[0] < TICE) { frozen = true; }
    else {
      for (let i = 0; i < N - 1; i++) {
        if (T[i] >= TICE && T[i + 1] < TICE) {
          const fr = (T[i] - TICE) / (T[i] - T[i + 1]);
          iceLat = Math.asin(Math.min(1, (i + fr) * DX)) * 180 / Math.PI;
          break;
        }
      }
    }
    return { Tbar, iceLat, frozen };
  }

  // ── Rendering ─────────────────────────────────────────
  function xScale(mu) { return M.l + ((mu - MU_MIN) / (MU_MAX - MU_MIN)) * PW; }
  function yScale(T) { return M.t + ((T_MAX - T) / (T_MAX - T_MIN)) * PH; }

  function render(svg, curve, snowball, rampPts, cur) {
    const ns = "http://www.w3.org/2000/svg";
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // axes frame
    addLine(svg, M.l, M.t, M.l, M.t + PH, RULE, 1);
    addLine(svg, M.l, M.t + PH, M.l + PW, M.t + PH, RULE, 1);

    // gridline at μ = 1 (present-day insolation)
    const x1 = xScale(1.0);
    addLine(svg, x1, M.t, x1, M.t + PH, RULE, 1, "3 3");
    addText(svg, x1, M.t + PH + 26, "1.00", FAINT, 9, "middle");

    // x ticks
    [0.90, 0.95, 1.00, 1.05, 1.10].forEach(mu => {
      const px = xScale(mu);
      addLine(svg, px, M.t + PH, px, M.t + PH + 3, FAINT, 0.8);
      if (mu !== 1.0) addText(svg, px, M.t + PH + 14, mu.toFixed(2), FAINT, 9, "middle");
    });
    // y ticks
    [-60, -40, -20, 0, 20].forEach(T => {
      const py = yScale(T);
      addLine(svg, M.l - 3, py, M.l, py, FAINT, 0.8);
      addText(svg, M.l - 6, py + 3, String(T), FAINT, 9, "end");
    });
    // freezing reference
    const y0 = yScale(0);
    addLine(svg, M.l, y0, M.l + PW, y0, RULE, 0.8);

    // ── snowball branch (cold, stable) — warm-colour solid ──
    drawPoly(svg, snowball.map(p => [xScale(p.mu), yScale(p.Tbar)]), WARM, 2, null, 0.9);

    // ── equilibrium S-curve: split stable (warm) vs unstable middle ──
    // Stable = where dμ/dx_s ≤ 0 along the sweep (warm upper branch);
    // the fold marks the minimum μ. Detect fold by the μ minimum.
    let foldIdx = 0, muMin = Infinity;
    curve.forEach((p, i) => { if (p.mu < muMin) { muMin = p.mu; foldIdx = i; } });
    const upper = curve.slice(0, foldIdx + 1).map(p => [xScale(p.mu), yScale(p.Tbar)]);
    const lower = curve.slice(foldIdx).map(p => [xScale(p.mu), yScale(p.Tbar)]);
    drawPoly(svg, upper, WARM, 2.2, null, 1);            // warm stable branch
    drawPoly(svg, lower, FAINT, 1.8, "5 4", 1);          // unstable middle branch

    // fold marker (the snowball tipping point)
    const fp = curve[foldIdx];
    addDot(svg, xScale(fp.mu), yScale(fp.Tbar), 2.6, GOLD);
    addText(svg, xScale(fp.mu) - 6, yScale(fp.Tbar) - 6,
      "tipping point", GOLD, 9, "end");

    // ── ramp path ──
    if (rampPts.length > 1) {
      drawPoly(svg, rampPts.map(p => [xScale(p.mu), yScale(p.Tbar)]), ACCENT, 1.6, null, 0.85);
    }

    // ── current-climate marker ──
    addDot(svg, xScale(cur.mu), yScale(cur.Tbar), 5, ACCENT_DEEP);
    addRing(svg, xScale(cur.mu), yScale(cur.Tbar), 7.5, ACCENT_DEEP);

    // axis labels
    addItalic(svg, M.l + PW / 2, H - 2, "S / S₀  (solar multiplier)", MUTED, 12, "middle", 0);
    addItalic(svg, 13, M.t + PH / 2, "global-mean T  (°C)", MUTED, 12, "middle", -90, 13);
  }

  // ── DOM / SVG helpers ─────────────────────────────────
  function makeSlider(label, min, max, val, unit, stepPct) {
    const wrap = document.createElement("label");
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.82rem";
    wrap.style.color = INK;
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.5rem";

    const span = document.createElement("span");
    const valSpan = document.createElement("span");
    valSpan.style.fontWeight = "600";
    valSpan.style.color = ACCENT;
    valSpan.textContent = (val / 100).toFixed(2);
    span.appendChild(document.createTextNode(label + " "));
    span.appendChild(valSpan);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.value = String(val);
    input.step = String(stepPct || 1);
    input.style.width = "150px";
    input.style.accentColor = ACCENT;
    input.addEventListener("input", () => { valSpan.textContent = (+input.value / 100).toFixed(2); });

    wrap.appendChild(span);
    wrap.appendChild(input);
    return {
      wrap, input,
      value: () => +input.value,
      setValue: v => { input.value = String(v); valSpan.textContent = (v / 100).toFixed(2); }
    };
  }

  function styleBtn(b) {
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.78rem";
    b.style.padding = "0.32rem 0.85rem";
    b.style.border = "1px solid " + ACCENT;
    b.style.background = CARD;
    b.style.color = ACCENT;
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    b.style.transition = "background 100ms, color 100ms";
    b.addEventListener("mouseenter", () => { if (!b.disabled) { b.style.background = ACCENT; b.style.color = "#fff"; } });
    b.addEventListener("mouseleave", () => { b.style.background = CARD; b.style.color = ACCENT; });
  }

  function addLine(svg, x1, y1, x2, y2, stroke, w, dash) {
    const ns = "http://www.w3.org/2000/svg";
    const l = document.createElementNS(ns, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", stroke); l.setAttribute("stroke-width", w);
    if (dash) l.setAttribute("stroke-dasharray", dash);
    svg.appendChild(l);
    return l;
  }

  function drawPoly(svg, pts, stroke, w, dash, opacity) {
    if (pts.length < 2) return;
    const ns = "http://www.w3.org/2000/svg";
    const p = document.createElementNS(ns, "path");
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", stroke);
    p.setAttribute("stroke-width", w);
    if (dash) p.setAttribute("stroke-dasharray", dash);
    if (opacity != null) p.setAttribute("stroke-opacity", String(opacity));
    svg.appendChild(p);
  }

  function addText(svg, x, y, str, fill, size, anchor) {
    const ns = "http://www.w3.org/2000/svg";
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill);
    t.setAttribute("font-family", "Inter, sans-serif");
    t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", anchor || "start");
    t.textContent = str;
    svg.appendChild(t);
    return t;
  }

  function addItalic(svg, x, y, str, fill, size, anchor, rot, rx) {
    const ns = "http://www.w3.org/2000/svg";
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill);
    t.setAttribute("font-family", "Source Serif 4, serif");
    t.setAttribute("font-style", "italic");
    t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", anchor || "start");
    if (rot) t.setAttribute("transform", `rotate(${rot}, ${rx != null ? rx : x}, ${y})`);
    t.textContent = str;
    svg.appendChild(t);
    return t;
  }

  function addDot(svg, x, y, r, fill) {
    const ns = "http://www.w3.org/2000/svg";
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y);
    c.setAttribute("r", r); c.setAttribute("fill", fill);
    c.setAttribute("stroke", "#fff"); c.setAttribute("stroke-width", "1.1");
    svg.appendChild(c);
    return c;
  }

  function addRing(svg, x, y, r, stroke) {
    const ns = "http://www.w3.org/2000/svg";
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y);
    c.setAttribute("r", r); c.setAttribute("fill", "none");
    c.setAttribute("stroke", stroke); c.setAttribute("stroke-width", "1");
    c.setAttribute("stroke-opacity", "0.5");
    svg.appendChild(c);
    return c;
  }
})();
