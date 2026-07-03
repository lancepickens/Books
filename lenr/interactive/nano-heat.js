/* Chapter VIII widget — The beyond-chemistry auditor.
   Computes the specific energy per hydrogen atom E/H = E_xs / N_H with
   N_H = (m_H / M_H) * N_A, and places it on a log ladder against chemical
   and nuclear reference rungs:
     Pd-H hydride formation ~0.2 eV/H (beta-PdH, ~40 kJ/mol H2),
     H2 combustion ~1.48 eV/H (286 kJ/mol H2),
     NEDO nano-composite claims ~10-100 eV/H (Kitamura et al., IJHE 43,
       16187 (2018)),
     Iwamura multilayer claim >1e4 eV/H (JJAP 63, 037001 (2024)),
     Kasagi photon-calorimetry claim ~4.1e5 eV/H (JCMNS/arXiv only),
     d+d -> 4He fusion ~1.19e7 eV per deuteron (23.85 MeV / 2d).
   Reference check (brief): E_xs = 100 kJ from 10 mg H
     -> N_H = 5.974e21, E/H = 104.5 eV/H, ~70x the 1.5 eV/H chemistry
     ceiling. Duration slider converts E_xs to average power. */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // slate-blue, nuclear-side rungs
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 16, r: 16, t: 16, b: 46 };
  const PW = W - M.l - M.r;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──
  const NA = 6.02214076e23;        // Avogadro, 1/mol
  const M_H = 1.008;               // molar mass of H, g/mol
  const EV_J = 1.602176634e-19;    // J per eV
  const CHEM_CEILING_EV = 1.5;     // H2 combustion, eV per H atom (286 kJ/mol H2)

  function nHydrogen(massMg) {           // atoms of H in massMg milligrams
    return (massMg * 1e-3 / M_H) * NA;
  }
  function ePerH(ExsKJ, massMg) {        // eV per H atom
    return (ExsKJ * 1e3 / EV_J) / nHydrogen(massMg);
  }
  function chemFactor(evPerH) {          // multiples of the chemistry ceiling
    return evPerH / CHEM_CEILING_EV;
  }
  function avgPowerW(ExsKJ, hours) {     // mean power over the run, W
    return ExsKJ * 1e3 / (hours * 3600);
  }

  // reference rungs on the eV/H ladder (band: [lo, hi] where a range is claimed)
  const RUNGS = [
    { lo: 0.2,    hi: 0.2,    label: "Pd–H hydride",        color: FAINT,  solid: true },
    { lo: 1.48,   hi: 1.48,   label: "H₂ combustion",       color: ACCENT_DEEP, solid: true },
    { lo: 10,     hi: 100,    label: "NEDO claim",          color: ACCENT, solid: false },
    { lo: 1e4,    hi: 1e4,    label: "Iwamura JJAP",        color: ACCENT, solid: false },
    { lo: 4.1e5,  hi: 4.1e5,  label: "Kasagi (JCMNS)",      color: FAINT,  solid: false },
    { lo: 1.19e7, hi: 1.19e7, label: "d+d fusion",          color: WARM,   solid: true }
  ];

  // ── Self-mount ──
  document.querySelectorAll("[data-widget='nano-heat']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // ladder axis: log10 E/H from 1e-2 to 1e8 eV
    const LX0 = -2, LX1 = 8;
    const xPix = lx => M.l + (lx - LX0) / (LX1 - LX0) * PW;
    const AXIS_Y = 210;          // ladder baseline in the 320-high viewBox

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

    // log sliders: E_xs 1–1e5 kJ, mass 0.1–1000 mg, duration 1–2000 h
    const eSlider = mkSlider(controls, "excess energy E (kJ)", 0, 5, 0.01, 2);          // default 100 kJ
    const mSlider = mkSlider(controls, "absorbed H (mg)", -1, 3, 0.01, 1);              // default 10 mg
    const tSlider = mkSlider(controls, "duration (h)", 0, Math.log10(2000), 0.01, Math.log10(168)); // default 1 week

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
      `<span style="color:${ACCENT_DEEP};font-weight:700">━</span> chemistry &nbsp;&nbsp; ` +
      `<span style="color:${ACCENT};font-weight:700">┆</span> contested claims &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">━</span> d+d fusion &nbsp;&nbsp; ` +
      `<span style="color:${INK};font-weight:700">▼</span> your experiment`;
    host.appendChild(legend);

    eSlider.input.addEventListener("input", redraw);
    mSlider.input.addEventListener("input", redraw);
    tSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const ExsKJ = Math.pow(10, parseFloat(eSlider.input.value));
      const massMg = Math.pow(10, parseFloat(mSlider.input.value));
      const hours = Math.pow(10, parseFloat(tSlider.input.value));

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // baseline + decade ticks
      line(svg, M.l, AXIS_Y, M.l + PW, AXIS_Y, INK, 1.2);
      for (let d = LX0; d <= LX1; d++) {
        line(svg, xPix(d), AXIS_Y - 4, xPix(d), AXIS_Y + 4, INK, 1);
        text(svg, xPix(d), AXIS_Y + 18, "10" + sup(d), "middle", 10, FAINT, "Inter, sans-serif");
      }
      text(svg, M.l + PW / 2, H - 8, "E / H (eV per hydrogen atom, log scale)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");

      // shaded "no known process" gap between chemistry ceiling and fusion
      rect(svg, xPix(Math.log10(CHEM_CEILING_EV)), AXIS_Y - 120, xPix(Math.log10(1.19e7)) - xPix(Math.log10(CHEM_CEILING_EV)), 120, "#f7f2e6");
      text(svg, xPix(3.5), AXIS_Y - 106, "no known process", "middle", 9, FAINT, "Inter, sans-serif");

      // rungs (staggered label rows so they don't collide)
      RUNGS.forEach((r, i) => {
        const x0 = xPix(Math.log10(r.lo));
        const x1 = xPix(Math.log10(r.hi));
        const labY = AXIS_Y - 68 - (i % 2) * 22;
        if (r.hi > r.lo) {   // band
          rect(svg, x0, AXIS_Y - 56, x1 - x0, 56, "rgba(160,96,16,0.14)");
          line(svg, x0, AXIS_Y - 56, x0, AXIS_Y, r.color, 1.4, r.solid ? null : "4,3");
          line(svg, x1, AXIS_Y - 56, x1, AXIS_Y, r.color, 1.4, r.solid ? null : "4,3");
          text(svg, (x0 + x1) / 2, labY, r.label, "middle", 9.5, r.color, "Inter, sans-serif");
        } else {
          line(svg, x0, AXIS_Y - 56, x0, AXIS_Y, r.color, 1.6, r.solid ? null : "4,3");
          text(svg, x0, labY, r.label, "middle", 9.5, r.color, "Inter, sans-serif");
        }
      });

      // computed marker
      const ev = ePerH(ExsKJ, massMg);
      const lev = Math.max(LX0, Math.min(LX1, Math.log10(ev)));
      const mx = xPix(lev);
      tri(svg, mx, AXIS_Y - 10, 7, INK);
      line(svg, mx, AXIS_Y - 10, mx, AXIS_Y, INK, 1.4);
      text(svg, mx, AXIS_Y - 26, fmt(ev) + " eV/H", "middle", 11, INK, "Inter, sans-serif");

      const NH = nHydrogen(massMg);
      const factor = chemFactor(ev);
      const pw = avgPowerW(ExsKJ, hours);
      const verdict = factor > 1
        ? `chemistry <strong style="color:${ACCENT_DEEP}">cannot</strong> explain this — beyond the 1.5 eV/H ceiling by <strong style="color:${ACCENT_DEEP}">×${fmt(factor)}</strong>`
        : `chemistry <strong style="color:${WARM}">can</strong> explain this — a factor ${fmt(1 / factor)} below the 1.5 eV/H ceiling`;
      readout.innerHTML =
        `E<sub>xs</sub> = <strong style="color:${ACCENT_DEEP}">${fmt(ExsKJ)} kJ</strong>` +
        ` &nbsp;·&nbsp; m<sub>H</sub> = ${fmt(massMg)} mg &nbsp;→&nbsp; N<sub>H</sub> = ${NH.toExponential(2).replace("e+", "×10^")}` +
        ` &nbsp;·&nbsp; E/H = <strong style="color:${ACCENT_DEEP}">${fmt(ev)} eV</strong>` +
        `<br/>${verdict} &nbsp;·&nbsp; over ${fmt(hours)} h the mean power is ${fmtP(pw)}`;
    }
  }

  // ── UI + SVG helpers ──
  function fmt(v) {
    if (v >= 1e4 || (v > 0 && v < 0.01)) {
      const e = Math.floor(Math.log10(v));
      const m = v / Math.pow(10, e);
      return (m >= 9.95 ? "10" : m.toFixed(1)) + "×10" + sup(e);
    }
    if (v >= 100) return v.toFixed(0);
    if (v >= 10) return v.toFixed(1);
    return v.toFixed(2);
  }
  function fmtP(w) {
    if (w >= 1) return w.toFixed(w < 10 ? 2 : 1) + " W";
    if (w >= 1e-3) return (w * 1e3).toFixed(1) + " mW";
    return (w * 1e6).toFixed(1) + " µW";
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
    input.style.width = "130px";
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
  function rect(svg, x, y, w, h, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("width", Math.max(0, w)); el.setAttribute("height", h);
    el.setAttribute("fill", fill);
    svg.appendChild(el);
  }
  function tri(svg, cx, cy, r, fill) {   // downward triangle marker
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", `M ${cx - r} ${cy - r} L ${cx + r} ${cy - r} L ${cx} ${cy + r} Z`);
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

  // expose pure functions for the harness
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { nHydrogen, ePerH, chemFactor, avgPowerW, CHEM_CEILING_EV };
  }
})();
