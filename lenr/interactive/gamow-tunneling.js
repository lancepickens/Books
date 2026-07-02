/* Chapter I widget — The Gamow window.
   Computes the d+d barrier-penetration factor exp(-2*pi*eta) with
   2*pi*eta = sqrt(EG/E), EG = 986 keV, the cross section
   sigma(E) = S(E)/E * exp(-2*pi*eta) with S = 56 keV·b, and the electron-
   screening enhancement f = P(E+Ue)/P(E). All log-space so meV energies
   (log10 P ~ -2700) don't underflow. Sources: Clayton §4-2..4-4 (Gamow),
   NACRE (S(0)), Assenbaum-Langanke-Rolfs (screening). */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // second data series (screened curve)
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 56, r: 16, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──
  const EG_KEV = 986;      // d+d Gamow energy, keV
  const S_KEVB = 56;       // d(d,p)t astrophysical S-factor, keV·b
  const LN10 = Math.log(10);

  function twoPiEta(EkeV) {            // sqrt(EG/E), dimensionless
    return Math.sqrt(EG_KEV / EkeV);
  }
  function log10Penetration(EkeV) {    // log10 of exp(-2*pi*eta)
    return -twoPiEta(EkeV) / LN10;
  }
  function log10Sigma(EkeV) {          // log10 of sigma in barns
    return Math.log10(S_KEVB / EkeV) + log10Penetration(EkeV);
  }
  function log10Enhancement(EkeV, UeEV) { // log10 of P(E+Ue)/P(E)
    const Ue = UeEV / 1000;            // keV
    return log10Penetration(EkeV + Ue) - log10Penetration(EkeV);
  }

  // ── Self-mount ──
  document.querySelectorAll("[data-widget='gamow-tunneling']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // axis ranges: log10 E in keV from 2.5e-5 keV (25 meV) to 100 keV
    const LX0 = Math.log10(2.5e-5), LX1 = 2;
    const LY0 = -3000, LY1 = 0;   // log10 penetration

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

    const eSlider = mkSlider(controls, "collision energy E", LX0, LX1, 0.01, Math.log10(1)); // start 1 keV
    const uSlider = mkSlider(controls, "screening Uₑ (eV)", 0, 1000, 5, 0);

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
      `<span style="color:${ACCENT};font-weight:700">━</span> bare P(E) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">━</span> screened P(E+Uₑ) &nbsp;&nbsp; ` +
      `<span style="color:${FAINT}">┆ room temp · hot fusion</span>`;
    host.appendChild(legend);

    eSlider.input.addEventListener("input", redraw);
    uSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const lE = parseFloat(eSlider.input.value);
      const Ue = parseFloat(uSlider.input.value);
      const EkeV = Math.pow(10, lE);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // gridlines + axes
      for (let ly = 0; ly >= LY0; ly -= 500) {
        line(svg, M.l, yPix(ly), M.l + PW, yPix(ly), RULE, 1);
        text(svg, M.l - 6, yPix(ly) + 3, String(ly), "end", 10, FAINT, "Inter, sans-serif");
      }
      const ticks = [-4, -3, -2, -1, 0, 1, 2];
      ticks.forEach(t => {
        if (t < LX0) return;
        line(svg, xPix(t), M.t, xPix(t), M.t + PH, RULE, 1);
        const lab = t <= 0 ? ("10" + sup(t)) : (t === 1 ? "10" : "100");
        text(svg, xPix(t), M.t + PH + 14, lab + "", "middle", 10, FAINT, "Inter, sans-serif");
      });
      text(svg, M.l + PW / 2, H - 6, "E (keV, log scale)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");
      textRot(svg, 14, M.t + PH / 2, "log₁₀ P", 11, MUTED);

      // reference markers: room temperature (25 meV) and hot fusion (50 keV)
      [Math.log10(2.5e-5), Math.log10(50)].forEach(lx => {
        line(svg, xPix(lx), M.t, xPix(lx), M.t + PH, FAINT, 1, "4,4");
      });
      text(svg, xPix(Math.log10(2.5e-5)) + 4, M.t + 12, "room T", "start", 9, FAINT, "Inter, sans-serif");
      text(svg, xPix(Math.log10(50)) - 4, M.t + 12, "hot fusion", "end", 9, FAINT, "Inter, sans-serif");

      // curves
      const bare = [], scr = [];
      const N = 220;
      for (let i = 0; i <= N; i++) {
        const lx = LX0 + (LX1 - LX0) * i / N;
        const E = Math.pow(10, lx);
        bare.push([xPix(lx), yPix(clampY(log10Penetration(E)))]);
        scr.push([xPix(lx), yPix(clampY(log10Penetration(E + Ue / 1000)))]);
      }
      path(svg, scr, WARM, 2);
      path(svg, bare, ACCENT, 2);

      // current-point marker on the bare curve
      const lyNow = clampY(log10Penetration(EkeV));
      circle(svg, xPix(lE), yPix(lyNow), 4.5, ACCENT_DEEP);

      const eta2pi = twoPiEta(EkeV);
      const lp = log10Penetration(EkeV);
      const ls = log10Sigma(EkeV);
      const lf = log10Enhancement(EkeV, Ue);
      const fTxt = lf < 3 ? Math.pow(10, lf).toFixed(1) + "×" : "10" + sup(Math.round(lf)) + "×";
      readout.innerHTML =
        `E = <strong style="color:${ACCENT_DEEP}">${fmtE(EkeV)}</strong>` +
        ` &nbsp;·&nbsp; 2πη = <strong style="color:${ACCENT_DEEP}">${eta2pi < 100 ? eta2pi.toFixed(1) : eta2pi.toExponential(2)}</strong>` +
        ` &nbsp;·&nbsp; P = 10<sup>${Math.round(lp)}</sup>` +
        ` &nbsp;·&nbsp; σ ≈ 10<sup>${Math.round(ls)}</sup> b` +
        `<br/>screening Uₑ = ${Ue} eV &nbsp;→&nbsp; enhancement f ≈ <strong style="color:${WARM}">${Ue > 0 ? fTxt : "1×"}</strong>`;
    }

    function clampY(ly) { return Math.max(LY0, Math.min(LY1, ly)); }
    function fmtE(EkeV) {
      if (EkeV >= 1) return EkeV.toFixed(EkeV < 10 ? 2 : 0) + " keV";
      if (EkeV >= 1e-3) return (EkeV * 1000).toFixed(0) + " eV";
      return (EkeV * 1e6).toFixed(0) + " meV";
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
    module.exports = { twoPiEta, log10Penetration, log10Sigma, log10Enhancement };
  }
})();
