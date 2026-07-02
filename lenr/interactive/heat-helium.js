/* Chapter IV widget — The heat–helium ledger.
   Plots excess power (mW) against helium detection rate (atoms/s, log axis)
   and overlays the commensurability line R_det = f_ret * P_xs / Q with
   Q = 23.85 MeV (d+d -> 4He), 1 MeV = 1.602e-13 J. A retention slider
   f_ret in [0.3, 1.0] tilts the line; the readout converts the selected
   point into an implied MeV per detected (and per produced) helium atom.
   Reference values: P_xs = 100 mW, f_ret = 1 -> R = 2.62e10 atoms/s;
   f_ret = 0.5 -> 47.7 MeV per detected atom for an on-line point.
   Data points are REPRESENTATIVE Miles-class placements drawn from the
   reported 1e11–1e12 atoms/s/W band (Miles et al., J. Electroanal. Chem.
   346, 99 (1993)), not digitized data; the square point carries SRI M4's
   reported raw ratio of ~31 MeV/He (ICCF-8 proceedings, conference-grade). */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // second data series (SRI M4 point)
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 60, r: 16, t: 18, b: 42 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──
  const Q_MEV = 23.85;            // d+d -> 4He Q-value, MeV
  const MEV_J = 1.602e-13;        // joules per MeV

  // Helium atoms/s expected in the gas for excess power P (watts),
  // if a fraction fret of production escapes the cathode.
  function commensurateRate(Pwatts, fret) {
    return fret * Pwatts / (Q_MEV * MEV_J);
  }
  // MeV of excess heat per DETECTED helium atom.
  function impliedQPerDetected(Pwatts, ratePerSec) {
    return Pwatts / (ratePerSec * MEV_J);
  }
  // MeV per PRODUCED atom, assuming retention fraction fret.
  function impliedQPerProduced(Pwatts, ratePerSec, fret) {
    return fret * impliedQPerDetected(Pwatts, ratePerSec);
  }

  // Representative Miles-class points: per-watt rates within the reported
  // 1e11–1e12 atoms/s/W band (illustrative placements, not digitized data).
  const MILES_PER_WATT = [
    [40, 1.2e11], [55, 4.0e11], [90, 2.6e11], [120, 1.6e11], [150, 6.0e11],
    [200, 3.0e11], [240, 1.1e11], [300, 2.4e11], [350, 8.0e11], [460, 2.0e11]
  ];
  const POINTS = MILES_PER_WATT.map(pw => ({
    pmW: pw[0],
    rate: (pw[0] / 1000) * pw[1],
    kind: "miles",
    label: "Miles-class (representative)"
  }));
  // SRI M4: raw ratio ~31 MeV per detected atom (before retained-He recovery).
  POINTS.push({
    pmW: 340,
    rate: (340 / 1000) / (31 * MEV_J),
    kind: "m4",
    label: "SRI M4 (raw ≈31 MeV/He, conference-grade)"
  });

  // ── Self-mount ──
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-widget='heat-helium']").forEach(section => {
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

    // axis ranges: x = excess power 0–500 mW (linear); y = log10 rate 9–12
    const X0 = 0, X1 = 500;
    const LY0 = 9, LY1 = 12;

    const xPix = p => M.l + (p - X0) / (X1 - X0) * PW;
    const yPix = ly => M.t + (LY1 - ly) / (LY1 - LY0) * PH;

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "0.6rem 1.4rem";
    controls.style.alignItems = "center";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.8rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    const fSlider = mkSlider(controls, "retention fᵣₑₜ", 0.3, 1.0, 0.01, 1.0);
    const pSlider = mkSlider(controls, "selected point", 0, POINTS.length - 1, 1, 0);

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
    legend.style.textAlign = "center";
    legend.innerHTML =
      `<span style="color:${ACCENT};font-weight:700">●</span> Miles-class (representative) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">■</span> SRI M4 raw &nbsp;&nbsp; ` +
      `<span style="color:${ACCENT_DEEP};font-weight:700">━</span> R = f·P/Q &nbsp;&nbsp; ` +
      `<span style="color:${FAINT}">┄ full release (f = 1)</span>`;
    host.appendChild(legend);

    fSlider.input.addEventListener("input", redraw);
    pSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const fret = parseFloat(fSlider.input.value);
      const sel = Math.round(parseFloat(pSlider.input.value));

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // gridlines + axes
      for (let ly = LY0; ly <= LY1; ly++) {
        line(svg, M.l, yPix(ly), M.l + PW, yPix(ly), RULE, 1);
        text(svg, M.l - 6, yPix(ly) + 3, "10" + sup(ly), "end", 10, FAINT, "Inter, sans-serif");
      }
      for (let px = 0; px <= X1; px += 100) {
        line(svg, xPix(px), M.t, xPix(px), M.t + PH, RULE, 1);
        text(svg, xPix(px), M.t + PH + 14, String(px), "middle", 10, FAINT, "Inter, sans-serif");
      }
      text(svg, M.l + PW / 2, H - 6, "excess power P (mW)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");
      textRot(svg, 14, M.t + PH / 2, "He atoms/s (log)", 11, MUTED);

      // commensurability curves: dashed reference at f = 1, solid at chosen f
      drawLine(1, FAINT, 1.5, "5,4");
      drawLine(fret, ACCENT_DEEP, 2, null);

      // data points
      POINTS.forEach((pt, i) => {
        const x = xPix(pt.pmW), y = yPix(clampY(Math.log10(pt.rate)));
        if (pt.kind === "m4") {
          rect(svg, x - 4.5, y - 4.5, 9, 9, WARM);
        } else {
          circle(svg, x, y, 4.5, ACCENT);
        }
        if (i === sel) ring(svg, x, y, 8, INK);
      });

      const pt = POINTS[sel];
      const Pw = pt.pmW / 1000;
      const qDet = impliedQPerDetected(Pw, pt.rate);
      const qProd = impliedQPerProduced(Pw, pt.rate, fret);
      const ratio = qProd / Q_MEV;
      const lineAt100 = commensurateRate(0.1, fret);
      readout.innerHTML =
        `<strong style="color:${pt.kind === "m4" ? WARM : ACCENT_DEEP}">${pt.label}</strong>: ` +
        `P = ${pt.pmW} mW · R = ${sci(pt.rate)} atoms/s` +
        `<br/>implied <strong>${qDet.toFixed(1)} MeV</strong> per detected atom; ` +
        `at f = ${fret.toFixed(2)}, <strong>${qProd.toFixed(1)} MeV</strong> per produced atom ` +
        `(${ratio.toFixed(2)}× the 23.85 MeV benchmark)` +
        `<br/>line check: at 100 mW the R = f·P/Q line sits at ${sci(lineAt100)} atoms/s`;

      function drawLine(f, stroke, w, dash) {
        const pts = [];
        const N = 160;
        for (let i = 0; i <= N; i++) {
          const pmW = X0 + (X1 - X0) * i / N;
          if (pmW <= 0) continue;
          const r = commensurateRate(pmW / 1000, f);
          const ly = Math.log10(r);
          if (ly < LY0 || ly > LY1) continue;
          pts.push([xPix(pmW), yPix(ly)]);
        }
        path(svg, pts, stroke, w, dash);
      }
    }

    function clampY(ly) { return Math.max(LY0, Math.min(LY1, ly)); }
  }

  // ── UI + SVG helpers ──
  function sci(v) {
    const e = Math.floor(Math.log10(v));
    const m = v / Math.pow(10, e);
    return m.toFixed(1) + "×10" + sup(e);
  }
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
  function sup(n) {
    const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(c => map[c] || c).join("");
  }
  function line(svg, x1, y1, x2, y2, stroke, w, dash) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    el.setAttribute("stroke", stroke); el.setAttribute("stroke-width", w);
    if (dash) el.setAttribute("stroke-dasharray", dash);
    svg.appendChild(el);
  }
  function path(svg, pts, stroke, w, dash) {
    if (!pts.length) return;
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", w);
    if (dash) el.setAttribute("stroke-dasharray", dash);
    svg.appendChild(el);
  }
  function circle(svg, cx, cy, r, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    el.setAttribute("cx", cx); el.setAttribute("cy", cy); el.setAttribute("r", r);
    el.setAttribute("fill", fill);
    svg.appendChild(el);
  }
  function ring(svg, cx, cy, r, stroke) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    el.setAttribute("cx", cx); el.setAttribute("cy", cy); el.setAttribute("r", r);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", stroke);
    el.setAttribute("stroke-width", 1.5);
    svg.appendChild(el);
  }
  function rect(svg, x, y, w, h, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("width", w); el.setAttribute("height", h);
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
    module.exports = { commensurateRate, impliedQPerDetected, impliedQPerProduced, Q_MEV, MEV_J };
  }
})();
