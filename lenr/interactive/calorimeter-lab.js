/* Chapter III widget — The calorimeter truth machine.
   An idealized isoperibolic cell. True physics:
     T_cell = T_bath + (P_in + P_xs_true) / k_true .
   The experimenter infers excess through an assumed calibration constant
   k_a = k_true (1 + delta) from noisy temperature readings:
     P_xs_inf = k_a (T_cell - T_bath) - P_in
              = P_xs_true + delta (P_in + P_xs_true) + k_a * noise_T .
   Reference values (chapter brief): k_true = 0.8 W/K; P_in = 10 W,
   P_xs_true = 0, delta = +1%  ->  inferred phantom = +100 mW;
   delta = 0, P_xs_true = 200 mW  ->  inferred = 200 mW.
   Noise uses a fixed-seed LCG (deterministic default path for the JSDOM
   harness). Sources: Fleischmann et al., J. Electroanal. Chem. 287, 293
   (1990) (isoperibolic balance); Shanahan, Thermochim. Acta 387, 95 (2002)
   (calibration-constant shift). */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // second data series (true excess)
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 62, r: 16, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──
  const K_TRUE = 0.8;          // true heat-transfer coefficient, W/K
  const N_POINTS = 60;         // simulated readings
  const T_HOURS = 120;         // simulated run length, hours
  const SEED = 42;             // deterministic default noise path

  // Cell-bath temperature difference set by the true physics (K).
  function deltaT(PinW, PxsTrueW, kTrue) {
    return (PinW + PxsTrueW) / kTrue;
  }

  // Noise-free inferred excess power (W) for calibration error delta.
  // P_xs_inf = (1+delta)(P_in + P_xs_true) - P_in
  //          = P_xs_true + delta (P_in + P_xs_true).
  function inferredExcessW(PinW, PxsTrueW, delta) {
    return PxsTrueW + delta * (PinW + PxsTrueW);
  }

  // Phantom component only (W): inferred minus true.
  function phantomW(PinW, PxsTrueW, delta) {
    return delta * (PinW + PxsTrueW);
  }

  // 1-sigma of a single inferred-power reading (W) from temperature
  // noise sigmaT (K): sigma_P = k_a * sigma_T.
  function sigmaPowerW(kTrue, delta, sigmaT) {
    return kTrue * (1 + delta) * sigmaT;
  }

  // Fixed linear congruential generator -> uniform [0,1).
  function makeLCG(seed) {
    let s = seed >>> 0;
    return function () {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  // Box-Muller standard normal from two uniforms.
  function gauss(u1, u2) {
    return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Simulated time series of inferred excess power (W).
  function simulateSeries(PinW, PxsTrueW, kTrue, delta, sigmaT, n, seed) {
    const rand = makeLCG(seed);
    const base = inferredExcessW(PinW, PxsTrueW, delta);
    const sig = sigmaPowerW(kTrue, delta, sigmaT);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(base + sig * gauss(rand(), rand()));
    }
    return out;
  }

  function mean(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return arr.length ? s / arr.length : 0;
  }

  // ── Self-mount ──
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-widget='calorimeter-lab']").forEach(section => {
      const host = section.querySelector(".widget-mount");
      if (host) build(host);
    });
  }

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "0.6rem 1.4rem";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.8rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    const pSlider = mkSlider(controls, "input Pᵢₙ (W)", 1, 20, 0.5, 10);
    const xSlider = mkSlider(controls, "true excess (mW)", 0, 500, 10, 0);
    const dSlider = mkSlider(controls, "calibration drift δk (%)", -2, 2, 0.1, 1);
    const nSlider = mkSlider(controls, "noise σ_T (mK)", 0, 50, 1, 10);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.75rem";
    legend.style.color = MUTED;
    legend.innerHTML =
      `<span style="color:${ACCENT_DEEP};font-weight:700">●</span> inferred readings &nbsp;&nbsp; ` +
      `<span style="color:${ACCENT};font-weight:700">━</span> inferred mean (bias) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">╌</span> true excess &nbsp;&nbsp; ` +
      `<span style="color:${FAINT}">▮ ±1σ noise band</span>`;
    host.appendChild(legend);

    [pSlider, xSlider, dSlider, nSlider].forEach(s =>
      s.input.addEventListener("input", redraw));
    redraw();

    function redraw() {
      const PinW = parseFloat(pSlider.input.value);
      const PxsTrueW = parseFloat(xSlider.input.value) / 1000;   // mW -> W
      const delta = parseFloat(dSlider.input.value) / 100;       // % -> fraction
      const sigmaT = parseFloat(nSlider.input.value) / 1000;     // mK -> K

      const dT = deltaT(PinW, PxsTrueW, K_TRUE);
      const baseW = inferredExcessW(PinW, PxsTrueW, delta);
      const phW = phantomW(PinW, PxsTrueW, delta);
      const sigW = sigmaPowerW(K_TRUE, delta, sigmaT);
      const series = simulateSeries(PinW, PxsTrueW, K_TRUE, delta, sigmaT, N_POINTS, SEED);
      const avg = mean(series);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // y-range in mW, padded to hold band, true line, and zero
      const baseMW = baseW * 1000, trueMW = PxsTrueW * 1000, sigMW = sigW * 1000;
      let yLo = Math.min(0, baseMW - 4 * sigMW, trueMW) - 40;
      let yHi = Math.max(120, baseMW + 4 * sigMW, trueMW) + 40;
      const xPix = h => M.l + (h / T_HOURS) * PW;
      const yPix = mw => M.t + (yHi - mw) / (yHi - yLo) * PH;

      // gridlines + axes
      const step = niceStep((yHi - yLo) / 5);
      for (let g = Math.ceil(yLo / step) * step; g <= yHi; g += step) {
        line(svg, M.l, yPix(g), M.l + PW, yPix(g), RULE, 1);
        text(svg, M.l - 6, yPix(g) + 3, String(Math.round(g)), "end", 10, FAINT, "Inter, sans-serif");
      }
      for (let hgrid = 0; hgrid <= T_HOURS; hgrid += 24) {
        line(svg, xPix(hgrid), M.t, xPix(hgrid), M.t + PH, RULE, 1);
        text(svg, xPix(hgrid), M.t + PH + 14, String(hgrid), "middle", 10, FAINT, "Inter, sans-serif");
      }
      text(svg, M.l + PW / 2, H - 6, "time (h)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");
      textRot(svg, 14, M.t + PH / 2, "inferred Pₓₛ (mW)", 11, MUTED);

      // ±1σ noise band around the biased mean
      if (sigMW > 0) {
        const band = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        band.setAttribute("x", M.l);
        band.setAttribute("y", Math.max(M.t, yPix(baseMW + sigMW)));
        band.setAttribute("width", PW);
        band.setAttribute("height",
          Math.max(0, Math.min(M.t + PH, yPix(baseMW - sigMW)) - Math.max(M.t, yPix(baseMW + sigMW))));
        band.setAttribute("fill", FAINT);
        band.setAttribute("fill-opacity", "0.18");
        svg.appendChild(band);
      }

      // zero line, true-excess line (dashed WARM), inferred mean (ACCENT)
      line(svg, M.l, yPix(0), M.l + PW, yPix(0), INK, 1);
      line(svg, M.l, yPix(trueMW), M.l + PW, yPix(trueMW), WARM, 2, "6,5");
      line(svg, M.l, yPix(baseMW), M.l + PW, yPix(baseMW), ACCENT, 2);

      // simulated readings
      series.forEach((pw, i) => {
        const hx = (i + 0.5) / N_POINTS * T_HOURS;
        circle(svg, xPix(hx), yPix(clamp(pw * 1000, yLo, yHi)), 2.6, ACCENT_DEEP);
      });

      const verdictColor = Math.abs(phW) > 0.0005 ? ACCENT_DEEP : WARM;
      readout.innerHTML =
        `ΔT = <strong>${dT.toFixed(2)} K</strong>` +
        ` &nbsp;·&nbsp; true excess = <strong style="color:${WARM}">${(trueMW).toFixed(0)} mW</strong>` +
        ` &nbsp;·&nbsp; inferred = <strong style="color:${ACCENT_DEEP}">${baseMW.toFixed(0)} mW</strong>` +
        ` (mean of readings ${(avg * 1000).toFixed(0)} mW)` +
        `<br/>phantom from δk = <strong style="color:${verdictColor}">${phW >= 0 ? "+" : ""}${(phW * 1000).toFixed(0)} mW</strong>` +
        ` &nbsp;·&nbsp; single-reading noise σ = ${sigMW.toFixed(0)} mW` +
        ` &nbsp;·&nbsp; averaging shrinks σ, never the phantom`;
    }
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    if (m < 1.5) return p;
    if (m < 3.5) return 2 * p;
    if (m < 7.5) return 5 * p;
    return 10 * p;
  }

  // ── UI + SVG helpers ──
  function mkSlider(parent, label, min, max, step, val) {
    const wrap = document.createElement("label");
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.45rem";
    const span = document.createElement("span");
    span.textContent = label;
    const input = document.createElement("input");
    input.type = "range";
    input.min = min; input.max = max; input.step = step; input.value = val;
    input.style.width = "130px";
    input.style.accentColor = "#a06010";
    wrap.appendChild(span);
    wrap.appendChild(input);
    parent.appendChild(wrap);
    return { wrap, input };
  }
  function line(svg, x1, y1, x2, y2, stroke, w, dash) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    el.setAttribute("stroke", stroke); el.setAttribute("stroke-width", w);
    if (dash) el.setAttribute("stroke-dasharray", dash);
    svg.appendChild(el);
  }
  function circle(svg, cx, cy, r, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    el.setAttribute("cx", cx); el.setAttribute("cy", cy); el.setAttribute("r", r);
    el.setAttribute("fill", fill);
    svg.appendChild(el);
  }
  function text(svg, x, y, str, anchor, size, fill, font) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-size", size);
    el.setAttribute("fill", fill);
    if (font) el.setAttribute("style", "font: " + size + "px " + font + ";");
    el.textContent = str;
    svg.appendChild(el);
  }
  function textRot(svg, x, y, str, size, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("text-anchor", "middle");
    el.setAttribute("font-size", size);
    el.setAttribute("fill", fill);
    el.setAttribute("transform", `rotate(-90 ${x} ${y})`);
    el.setAttribute("style", "font: italic " + size + "px 'Source Serif 4', serif;");
    el.textContent = str;
    svg.appendChild(el);
  }

  // expose pure functions for the harness
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      K_TRUE, deltaT, inferredExcessW, phantomW, sigmaPowerW,
      makeLCG, gauss, simulateSeries, mean
    };
  }
})();
