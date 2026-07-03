/* Chapter VI widget — The screening discount.
   Computes the Assenbaum–Langanke–Rolfs enhancement factor
   f(E) = exp(pi*eta * Ue/E) with pi*eta = 0.5*sqrt(EG/E), EG = 986 keV (d+d),
   plus the exact shifted form f_exact = (E/(E+Ue)) * exp(2πη(E) − 2πη(E+Ue)).
   E is the CENTER-OF-MASS energy in keV; Ue in eV.
   Reference values (brief): E = 2 keV, Ue = 800 eV → πη = 11.10, f ≈ 85;
   E = 10 keV, Ue = 800 eV → πη = 4.96, f ≈ 1.49.
   Sources: Assenbaum-Langanke-Rolfs Z. Phys. A 327, 461 (1987) (formula);
   Ue anchors 25 eV (D₂ gas), 300 eV (theory ceiling), 800 eV (Raiola Pd). */

(function () {
  "use strict";

  const ACCENT = "#a06010";      // measured Pd, 800 eV
  const ACCENT_DEEP = "#6f430a"; // user (slider) curve + marker
  const WARM = "#2b5c8a";        // theory ceiling, 300 eV
  const FAINT = "#8e9a9e";       // gas, 25 eV + guides
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 52, r: 16, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──
  const EG_KEV = 986;           // d+d Gamow energy, keV (Ch. I convention)
  const LN10 = Math.log(10);

  function piEta(EkeV) {                 // pi*eta = 0.5*sqrt(EG/E)
    return 0.5 * Math.sqrt(EG_KEV / EkeV);
  }
  function log10FApprox(EkeV, UeEV) {    // log10 of exp(pi*eta*Ue/E), Ue<<E form
    return piEta(EkeV) * (UeEV / 1000) / EkeV / LN10;
  }
  function fApprox(EkeV, UeEV) {
    return Math.pow(10, log10FApprox(EkeV, UeEV));
  }
  function fExact(EkeV, UeEV) {          // (E/(E+Ue)) * exp(2πη(E) − 2πη(E+Ue))
    const U = UeEV / 1000;               // keV
    return (EkeV / (EkeV + U)) *
      Math.exp(Math.sqrt(EG_KEV / EkeV) - Math.sqrt(EG_KEV / (EkeV + U)));
  }
  function ordersGainedAt2keV(UeEV) {    // log10 f at the 2 keV benchmark
    return log10FApprox(2, UeEV);
  }

  // ── Self-mount (guarded so the module is require-able in Node) ──
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-widget='screening-enhancement']").forEach(section => {
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

    // axes: log10 E (keV) from 0 (1 keV) to 2 (100 keV); log10 f from 0 to 7
    const LX0 = 0, LX1 = 2;
    const LY0 = 0, LY1 = 7;

    const xPix = lx => M.l + (lx - LX0) / (LX1 - LX0) * PW;
    const yPix = ly => M.t + (LY1 - ly) / (LY1 - LY0) * PH;

    // controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "0.6rem 1.4rem";
    controls.style.alignItems = "center";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.8rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    const uSlider = mkSlider(controls, "screening Uₑ (eV)", 0, 1000, 5, 800);
    const eSlider = mkSlider(controls, "marker energy E", LX0, LX1, 0.01, Math.log10(2)); // start 2 keV

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
      `<span style="color:${FAINT};font-weight:700">━</span> 25 eV (D₂ gas) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">━</span> 300 eV (theory max) &nbsp;&nbsp; ` +
      `<span style="color:${ACCENT};font-weight:700">━</span> 800 eV (Pd, measured) &nbsp;&nbsp; ` +
      `<span style="color:${ACCENT_DEEP};font-weight:700">┅</span> your Uₑ`;
    host.appendChild(legend);

    uSlider.input.addEventListener("input", redraw);
    eSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const Ue = parseFloat(uSlider.input.value);
      const lE = parseFloat(eSlider.input.value);
      const EkeV = Math.pow(10, lE);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // horizontal gridlines: powers of ten in f
      for (let ly = LY0; ly <= LY1; ly += 1) {
        line(svg, M.l, yPix(ly), M.l + PW, yPix(ly), RULE, 1);
        text(svg, M.l - 6, yPix(ly) + 3, ly === 0 ? "1" : "10" + sup(ly), "end", 10, FAINT, "Inter, sans-serif");
      }
      // vertical gridlines at 1, 2, 5, 10, 20, 50, 100 keV
      [1, 2, 5, 10, 20, 50, 100].forEach(Ek => {
        const lx = Math.log10(Ek);
        line(svg, xPix(lx), M.t, xPix(lx), M.t + PH, RULE, 1);
        text(svg, xPix(lx), M.t + PH + 14, String(Ek), "middle", 10, FAINT, "Inter, sans-serif");
      });
      text(svg, M.l + PW / 2, H - 6, "E (keV c.m., log scale)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");
      textRot(svg, 14, M.t + PH / 2, "enhancement f", 11, MUTED);

      // 2 keV benchmark guide
      line(svg, xPix(Math.log10(2)), M.t, xPix(Math.log10(2)), M.t + PH, FAINT, 1, "4,4");
      text(svg, xPix(Math.log10(2)) + 4, M.t + 12, "2 keV benchmark", "start", 9, FAINT, "Inter, sans-serif");

      // reference curves + user curve
      drawCurve(25, FAINT, null);
      drawCurve(300, WARM, null);
      drawCurve(800, ACCENT, null);
      if (Ue > 0) drawCurve(Ue, ACCENT_DEEP, "6,3");

      // marker on the user curve (or on f=1 axis when Ue = 0)
      const lf = Ue > 0 ? log10FApprox(EkeV, Ue) : 0;
      circle(svg, xPix(lE), yPix(clampY(lf)), 4.5, ACCENT_DEEP);

      const pe = piEta(EkeV);
      const fa = fApprox(EkeV, Ue);
      const fx = fExact(EkeV, Ue);
      const gain2 = ordersGainedAt2keV(Ue);
      readout.innerHTML =
        `E = <strong style="color:${ACCENT_DEEP}">${fmtE(EkeV)}</strong>` +
        ` &nbsp;·&nbsp; πη = <strong style="color:${ACCENT_DEEP}">${pe.toFixed(2)}</strong>` +
        ` &nbsp;·&nbsp; f ≈ <strong style="color:${ACCENT_DEEP}">${fmtF(fa)}</strong> <span style="opacity:.75">(first-order)</span>` +
        ` &nbsp;·&nbsp; ${fmtF(fx)} <span style="opacity:.75">(exact shifted)</span>` +
        `<br/>Uₑ = ${Ue} eV &nbsp;→&nbsp; orders of magnitude gained at 2 keV: ` +
        `<strong style="color:${WARM}">${gain2.toFixed(2)}</strong>`;

      function drawCurve(UeEV, stroke, dash) {
        const pts = [];
        const N = 200;
        for (let i = 0; i <= N; i++) {
          const lx = LX0 + (LX1 - LX0) * i / N;
          const E = Math.pow(10, lx);
          pts.push([xPix(lx), yPix(clampY(log10FApprox(E, UeEV)))]);
        }
        path(svg, pts, stroke, 2, dash);
      }
    }

    function clampY(ly) { return Math.max(LY0, Math.min(LY1, ly)); }
    function fmtE(EkeV) {
      return EkeV >= 10 ? EkeV.toFixed(0) + " keV" : EkeV.toFixed(2) + " keV";
    }
    function fmtF(f) {
      if (f < 1000) return f >= 10 ? f.toFixed(0) + "×" : f.toFixed(2) + "×";
      const lg = Math.log10(f);
      return "10" + sup(Math.round(lg)) + "×";
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
    module.exports = { piEta, log10FApprox, fApprox, fExact, ordersGainedAt2keV };
  }
})();
