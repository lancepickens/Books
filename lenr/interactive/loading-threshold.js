/* Chapter V widget — Loading the lattice: the R/R0 curve and the threshold.
   Left/primary curve: the in-situ resistance-ratio calibration R/R0 vs
   loading x = D/Pd — a representative piecewise-linear digitization anchored
   at the established peak R/R0 ~= 2.0 near x ~= 0.74-0.75, with the falling
   branch following the polynomial calibration of McKubre & Tanzella,
   J. Condensed Matter Nucl. Sci. 29, 129 (2019): rho_beta/rho_Pd =
   0.97869 + 3.0001x - 15.090x^2 + 44.155x^3 - 49.119x^4 + 17.577x^5
   (= 1.80 at x = 0.90, 1.72 at 0.93, 1.66 at 0.95, 1.50 at 1.0).
   Method failure modes: Zhang, Zhang & Zhang, J. Electroanal. Chem. 528,
   1 (2002). Exact falling-branch values vary between laboratories
   (Benck et al., Chem. Mater. 31, 4234 (2019) showed resistance proxies
   mislead at high x) — the two-branch ambiguity is the physics point.
   Second curve: SRI's empirical excess-power correlation
   P_xs = k (x - 0.875)^2 (i - i0), i0 = 200 mA/cm^2 (McKubre et al.,
   ICCF-3 1993; J. Electroanal. Chem. 368, 55 (1994) for the calorimetry),
   with the |dx/dt| flux factor held constant and folded into k. k is
   NORMALIZED (illustratively — the constant is cell-specific and was never
   published as universal) so that x = 0.95, i = 250 mA/cm^2 gives
   100 mW/cm^3 of cathode. Also exposes the ideal Nernstian fugacity
   log10(f/f0) = 2 F eta / (R T ln 10) used in section 2. */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // second data series (excess-power correlation)
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 52, r: 56, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──

  // Representative R/R0 vs x calibration for D/Pd (see header comment).
  // Peak 2.0 at x = 0.75 (established); falling branch per the
  // McKubre-Tanzella polynomial (1.80/1.72/1.66/1.50 at 0.90/0.93/0.95/1.0).
  const RR0_POINTS = [
    [0.00, 1.00], [0.10, 1.13], [0.20, 1.28], [0.30, 1.43], [0.40, 1.58],
    [0.50, 1.73], [0.60, 1.86], [0.70, 1.97], [0.75, 2.00],
    [0.80, 1.97], [0.85, 1.90], [0.90, 1.80], [0.93, 1.72], [0.95, 1.66],
    [1.00, 1.50]
  ];
  const X_PEAK = 0.75;

  function rOverR0(x) {                 // piecewise-linear interpolation
    const xc = Math.max(0, Math.min(1, x));
    for (let k = 1; k < RR0_POINTS.length; k++) {
      const [x0, y0] = RR0_POINTS[k - 1];
      const [x1, y1] = RR0_POINTS[k];
      if (xc <= x1) return y0 + (y1 - y0) * (xc - x0) / (x1 - x0);
    }
    return RR0_POINTS[RR0_POINTS.length - 1][1];
  }

  // The curve is two-valued: same R/R0 can mean two different loadings.
  // Returns the loading on the OTHER branch with the same R/R0, or null.
  function conjugateLoading(x) {
    const target = rOverR0(x);
    const onRising = x < X_PEAK;
    const lo = onRising ? X_PEAK : 0;
    const hi = onRising ? 1 : X_PEAK;
    const N = 400;
    let prevX = lo, prevY = rOverR0(lo);
    for (let k = 1; k <= N; k++) {
      const xx = lo + (hi - lo) * k / N;
      const yy = rOverR0(xx);
      if ((prevY - target) * (yy - target) <= 0 && prevY !== yy) {
        return prevX + (xx - prevX) * (target - prevY) / (yy - prevY);
      }
      prevX = xx; prevY = yy;
    }
    return null;
  }

  // SRI empirical correlation, flux factor folded into K_NORM (see header).
  const X_C = 0.875;                    // loading threshold (McKubre)
  const I_C = 200;                      // mA/cm^2 current-density threshold
  const K_NORM = 100 / (Math.pow(0.95 - X_C, 2) * (250 - I_C)); // = 355.556
  function excessPowerMWcm3(x, i_mAcm2) {
    const dx = Math.max(0, x - X_C);
    const di = Math.max(0, i_mAcm2 - I_C);
    return K_NORM * dx * dx * di;      // mW per cm^3 of cathode
  }

  // Ideal Nernstian equivalent-fugacity exponent (section 2 equation):
  // log10(f/f0) = 2 F eta / (R T ln10). eta in volts, T in kelvin.
  const F_CONST = 96485;               // C/mol
  const R_GAS = 8.314462618;           // J/(mol K)
  function log10FugacityRatio(etaV, TK) {
    const T = TK || 298.15;
    return (2 * F_CONST * etaV) / (R_GAS * T * Math.LN10);
  }

  // ── Self-mount ──
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-widget='loading-threshold']").forEach(section => {
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

    // axes: x = loading 0..1 ; left y = R/R0 0.9..2.1 ; right y = P_xs 0..1800
    const X0 = 0, X1 = 1;
    const YL0 = 0.9, YL1 = 2.1;
    const YR0 = 0, YR1 = 1800;

    const xPix = x => M.l + (x - X0) / (X1 - X0) * PW;
    const yLPix = y => M.t + (YL1 - y) / (YL1 - YL0) * PH;
    const yRPix = y => M.t + (YR1 - y) / (YR1 - YR0) * PH;

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "0.6rem 1.4rem";
    controls.style.alignItems = "center";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.8rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    const xSlider = mkSlider(controls, "target loading x", 0.60, 1.00, 0.005, 0.95);
    const iSlider = mkSlider(controls, "current density i (mA/cm²)", 0, 500, 10, 250);

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
      `<span style="color:${ACCENT};font-weight:700">━</span> R/R₀ calibration (left axis) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">━</span> predicted P₍xs₎ at this i (right axis) &nbsp;&nbsp; ` +
      `<span style="color:${FAINT}">┆ x° = 0.875 threshold</span>`;
    host.appendChild(legend);

    xSlider.input.addEventListener("input", redraw);
    iSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const x = parseFloat(xSlider.input.value);
      const i = parseFloat(iSlider.input.value);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // shaded "claimed active" region x > 0.875
      const shade = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      shade.setAttribute("x", xPix(X_C));
      shade.setAttribute("y", M.t);
      shade.setAttribute("width", xPix(1) - xPix(X_C));
      shade.setAttribute("height", PH);
      shade.setAttribute("fill", "#f4ecdb");
      svg.appendChild(shade);

      // gridlines + axes labels
      for (let y = 1.0; y <= 2.0 + 1e-9; y += 0.25) {
        line(svg, M.l, yLPix(y), M.l + PW, yLPix(y), RULE, 1);
        text(svg, M.l - 6, yLPix(y) + 3, y.toFixed(2), "end", 10, FAINT, "Inter, sans-serif");
      }
      for (let x0 = 0; x0 <= 1 + 1e-9; x0 += 0.25) {
        line(svg, xPix(x0), M.t, xPix(x0), M.t + PH, RULE, 1);
        text(svg, xPix(x0), M.t + PH + 14, x0.toFixed(2), "middle", 10, FAINT, "Inter, sans-serif");
      }
      [0, 500, 1000, 1500].forEach(y => {
        text(svg, M.l + PW + 6, yRPix(y) + 3, String(y), "start", 10, WARM, "Inter, sans-serif");
      });
      text(svg, M.l + PW / 2, H - 6, "loading x = D/Pd", "middle", 11, MUTED, "italic 'Source Serif 4', serif");
      textRot(svg, 13, M.t + PH / 2, "R/R₀", 11, MUTED);
      textRot(svg, W - 8, M.t + PH / 2, "P (mW/cm³)", 11, WARM);

      // threshold marker
      line(svg, xPix(X_C), M.t, xPix(X_C), M.t + PH, FAINT, 1, "4,4");
      text(svg, xPix(X_C) + 4, M.t + 12, "x° = 0.875", "start", 9, FAINT, "Inter, sans-serif");
      line(svg, xPix(X_PEAK), M.t, xPix(X_PEAK), M.t + PH, RULE, 1, "2,4");
      text(svg, xPix(X_PEAK) - 4, M.t + 12, "R/R₀ peak", "end", 9, FAINT, "Inter, sans-serif");

      // excess-power curve at current i (right axis)
      const pPts = [];
      const N = 220;
      for (let k = 0; k <= N; k++) {
        const xx = X0 + (X1 - X0) * k / N;
        pPts.push([xPix(xx), yRPix(Math.min(YR1, excessPowerMWcm3(xx, i)))]);
      }
      path(svg, pPts, WARM, 2);

      // R/R0 curve (left axis)
      const rPts = [];
      for (let k = 0; k <= N; k++) {
        const xx = X0 + (X1 - X0) * k / N;
        rPts.push([xPix(xx), yLPix(rOverR0(xx))]);
      }
      path(svg, rPts, ACCENT, 2);

      // current point + conjugate-branch ghost (the ambiguity)
      const rr = rOverR0(x);
      circle(svg, xPix(x), yLPix(rr), 4.5, ACCENT_DEEP);
      const xConj = conjugateLoading(x);
      if (xConj !== null) {
        const ghost = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ghost.setAttribute("cx", xPix(xConj));
        ghost.setAttribute("cy", yLPix(rr));
        ghost.setAttribute("r", 4.5);
        ghost.setAttribute("fill", "none");
        ghost.setAttribute("stroke", ACCENT_DEEP);
        ghost.setAttribute("stroke-width", 1.5);
        ghost.setAttribute("stroke-dasharray", "2,2");
        svg.appendChild(ghost);
        line(svg, xPix(Math.min(x, xConj)), yLPix(rr), xPix(Math.max(x, xConj)), yLPix(rr), FAINT, 1, "2,3");
      }

      const pxs = excessPowerMWcm3(x, i);
      circle(svg, xPix(x), yRPix(Math.min(YR1, pxs)), 4, WARM);

      const status = x <= X_C
        ? `below x° — correlation predicts <strong>zero</strong> at any current`
        : (i <= I_C
          ? `x above threshold but i ≤ ${I_C} mA/cm² — correlation predicts <strong>zero</strong>`
          : `predicted P<sub>xs</sub> ≈ <strong style="color:${WARM}">${pxs < 10 ? pxs.toFixed(1) : Math.round(pxs)} mW/cm³</strong> of cathode`);
      readout.innerHTML =
        `x = <strong style="color:${ACCENT_DEEP}">${x.toFixed(3)}</strong>` +
        ` &nbsp;·&nbsp; R/R₀ = <strong style="color:${ACCENT_DEEP}">${rr.toFixed(2)}</strong>` +
        (xConj !== null ? ` <span style="color:${FAINT}">(same reading as x = ${xConj.toFixed(2)})</span>` : "") +
        ` &nbsp;·&nbsp; i = ${i} mA/cm²<br/>${status}`;
    }
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
    input.style.width = "150px";
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
  function path(svg, pts, stroke, w) {
    if (!pts.length) return;
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", w);
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
    module.exports = { rOverR0, conjugateLoading, excessPowerMWcm3, log10FugacityRatio, RR0_POINTS };
  }
})();
