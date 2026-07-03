/* Chapter VII widget — The lattice-fusion cascade (NASA LCF kinematics).
   Chain: photon E_gamma photodissociates a deuteron (B_d = 2.2246 MeV,
   Krane §4.2; Steinetz et al. PRC 101, 044610), the surplus is shared
   ~equally, giving a hot deuteron E_d = (E_gamma - B_d)/2; that deuteron
   fuses with cross section sigma(E) = S/E * exp(-sqrt(EG/E)) (EG = 986 keV,
   S = 56 keV·b; Ch. I conventions, Bosch-Hale), enhanced by screening as
   f = exp(pi*eta * Ue/E) (Assenbaum-Langanke-Rolfs 1987, first order).
   Reference values (chapter brief): E_gamma = 2.9 MeV -> E_d = 337.7 keV,
   2*pi*eta = 1.71, P = 0.18, sigma = 30 mb; at E_d = 5 keV, Ue = 800 eV,
   f = exp(7.02 * 0.16) ≈ 3.1. Deliberately idealized: skips the knock-on
   step's <= 8/9 transfer and the bremsstrahlung spectrum average. */

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
  const BD_MEV = 2.2246;   // deuteron binding energy, MeV (photodisintegration threshold)
  const EG_KEV = 986;      // d+d Gamow energy, keV
  const S_KEVB = 56;       // d(d,p)t astrophysical S-factor, keV·b

  function hotDeuteronKeV(EgammaMeV) {   // E_d = (E_gamma - B_d)/2, in keV
    return Math.max(0, (EgammaMeV - BD_MEV) / 2 * 1000);
  }
  function twoPiEta(EkeV) {              // sqrt(EG/E), dimensionless
    return Math.sqrt(EG_KEV / EkeV);
  }
  function sigmaBarns(EkeV) {            // sigma(E) = S/E * exp(-2*pi*eta), barns
    if (EkeV <= 0) return 0;
    return (S_KEVB / EkeV) * Math.exp(-twoPiEta(EkeV));
  }
  function enhancement(EkeV, UeEV) {     // f = exp(pi*eta * Ue/E)  (ALR, Ue << E)
    if (EkeV <= 0) return 1;
    const piEta = 0.5 * twoPiEta(EkeV);
    return Math.exp(piEta * (UeEV / 1000) / EkeV);
  }

  // ── Self-mount ──
  document.querySelectorAll("[data-widget='lattice-fusion']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // axis ranges: log10 E_d in keV from ~2 keV (near-threshold photons) to 400 keV
    const LX0 = Math.log10(2), LX1 = Math.log10(400);
    const LY0 = -9, LY1 = 0;   // log10 sigma (barns)

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

    const gSlider = mkSlider(controls, "photon Eγ (MeV)", 2.23, 3.0, 0.005, 2.9);
    const uSlider = mkSlider(controls, "screening Uₑ (eV)", 0, 1000, 25, 0);

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
      `<span style="color:${ACCENT};font-weight:700">━</span> bare σ(E) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">━</span> screened f·σ(E) &nbsp;&nbsp; ` +
      `<span style="color:${FAINT}">┆ NASA mean hot d (64 keV)</span>`;
    host.appendChild(legend);

    gSlider.input.addEventListener("input", redraw);
    uSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const Eg = parseFloat(gSlider.input.value);
      const Ue = parseFloat(uSlider.input.value);
      const Ed = hotDeuteronKeV(Eg);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // gridlines + axes
      for (let ly = LY1; ly >= LY0; ly -= 3) {
        line(svg, M.l, yPix(ly), M.l + PW, yPix(ly), RULE, 1);
        text(svg, M.l - 6, yPix(ly) + 3, String(ly), "end", 10, FAINT, "Inter, sans-serif");
      }
      [Math.log10(2), 1, 2, Math.log10(400)].forEach(t => {
        line(svg, xPix(t), M.t, xPix(t), M.t + PH, RULE, 1);
        const lab = t === 1 ? "10" : (t === 2 ? "100" : (t < 1 ? "2" : "400"));
        text(svg, xPix(t), M.t + PH + 14, lab, "middle", 10, FAINT, "Inter, sans-serif");
      });
      text(svg, M.l + PW / 2, H - 6, "hot deuteron energy E (keV, log scale)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");
      textRot(svg, 14, M.t + PH / 2, "log₁₀ σ (b)", 11, MUTED);

      // reference marker: NASA spectrum-averaged knock-on deuteron energy
      const lx64 = Math.log10(64);
      line(svg, xPix(lx64), M.t, xPix(lx64), M.t + PH, FAINT, 1, "4,4");
      text(svg, xPix(lx64) + 4, M.t + 12, "64 keV", "start", 9, FAINT, "Inter, sans-serif");

      // curves
      const bare = [], scr = [];
      const N = 220;
      for (let i = 0; i <= N; i++) {
        const lx = LX0 + (LX1 - LX0) * i / N;
        const E = Math.pow(10, lx);
        const sb = sigmaBarns(E);
        bare.push([xPix(lx), yPix(clampY(Math.log10(sb)))]);
        scr.push([xPix(lx), yPix(clampY(Math.log10(sb * enhancement(E, Ue))))]);
      }
      path(svg, scr, WARM, 2);
      path(svg, bare, ACCENT, 2);

      // current-point marker on the bare curve
      const sBare = sigmaBarns(Ed);
      const f = enhancement(Ed, Ue);
      if (Ed > 0) {
        const lE = Math.min(Math.max(Math.log10(Ed), LX0), LX1);
        circle(svg, xPix(lE), yPix(clampY(Math.log10(sBare))), 4.5, ACCENT_DEEP);
      }

      const strained = Ue > 0 && Ue / 1000 > 0.2 * Ed;
      readout.innerHTML =
        `Eγ = <strong style="color:${ACCENT_DEEP}">${Eg.toFixed(3)} MeV</strong>` +
        ` &nbsp;→&nbsp; E_d = (Eγ − 2.2246 MeV)/2 = <strong style="color:${ACCENT_DEEP}">${Ed.toFixed(1)} keV</strong>` +
        ` &nbsp;·&nbsp; 2πη = ${Ed > 0 ? twoPiEta(Ed).toFixed(2) : "—"}` +
        `<br/>σ_bare = <strong style="color:${ACCENT_DEEP}">${fmtMb(sBare)}</strong>` +
        ` &nbsp;·&nbsp; Uₑ = ${Ue} eV → f = <strong style="color:${WARM}">${fmtF(f)}</strong>` +
        ` &nbsp;·&nbsp; σ_screened = ${fmtMb(sBare * f)}` +
        (strained ? `<br/><span style="color:${ACCENT_DEEP}">first-order screening formula strained: Uₑ is no longer ≪ E (Pines et al. caveat)</span>` : "");
    }

    function clampY(ly) { return Math.max(LY0, Math.min(LY1, isFinite(ly) ? ly : LY0)); }
    function fmtMb(sigmaB) {
      const mb = sigmaB * 1000;
      if (mb >= 0.01) return mb.toPrecision(3) + " mb";
      return mb.toExponential(2) + " mb";
    }
    function fmtF(f) {
      if (f < 1000) return f.toFixed(2) + "×";
      return f.toExponential(2) + "×";
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
    module.exports = { hotDeuteronKeV, twoPiEta, sigmaBarns, enhancement, BD_MEV, EG_KEV, S_KEVB };
  }
})();
