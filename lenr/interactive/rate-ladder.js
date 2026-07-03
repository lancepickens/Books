/* Chapter IX widget — The rate ladder.
   Numerically integrates the WKB action for two deuterons in a statically
   screened Coulomb potential, V(r) = 1.44 eV·nm / r − U_eff, from the nuclear
   radius r_n = 4 fm to the classical turning point r_t = 1.44/U_eff (capped at
   the molecular separation 74 pm / m*), with U_eff = U_e · (m* / m_e), so the
   heavy-lepton control compresses the whole screened geometry r → r·m_e/m*:

     lambda = C·nu0 · exp[ −(2/hbar) ∫ sqrt(2·mu·(V(r)−E)) dr ],  E ≈ 0.

   Calibrated so U_e = 27 eV, m* = m_e reproduces the Koonin–Nauenberg D₂
   molecular rate 3×10⁻⁶⁴ s⁻¹ (Nature 339, 690 (1989)); with nu0 = 10¹⁶ s⁻¹
   the calibration constant is C ≈ 3.5×10². The model is deliberately the most
   GENEROUS reading of static screening (see chapter §3 and the caption).
   Sources: WKB/Gamow per Clayton §4-2..4-4; constants e²/4πϵ₀ = 1.44 eV·nm,
   μc² = 937.81 MeV, ħc = 197.327 eV·nm; ladder anchors per chapter §1–§3. */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // second series: the "needed" line
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──
  const MU_C2 = 937.81e6;   // eV — reduced mass of the d+d pair, mu c^2
  const HBARC = 197.327;    // eV·nm
  const B_COUL = 1.44;      // eV·nm — e^2 / 4 pi eps0
  const R_NUC = 4e-6;       // nm — nuclear channel radius, 4 fm
  const R_MOL = 0.074;      // nm — D2 equilibrium separation, 74 pm
  const PREF = 2 * Math.sqrt(2 * MU_C2) / HBARC;  // (2/hbar)*sqrt(2 mu), in 1/(sqrt(eV)·nm)
  const LN10 = Math.LN10;

  // classical turning point of V(r) = B/r − U_eff at E = 0,
  // capped at the (mass-rescaled) molecular separation
  function turningPoint(UeEV, mStar) {
    const Ueff = UeEV * mStar;
    return Math.min(B_COUL / Ueff, R_MOL / mStar);
  }

  // WKB action G = PREF * ∫_{r_n}^{r_t} sqrt(max(B/r − U_eff, 0)) dr
  // (log-spaced composite Simpson; matches the closed form to 4 digits)
  function actionG(UeEV, mStar) {
    const Ueff = UeEV * mStar;
    const rt = turningPoint(UeEV, mStar);
    if (rt <= R_NUC) return 0;
    const N = 2000;
    const l0 = Math.log(R_NUC), l1 = Math.log(rt);
    let s = 0;
    for (let i = 0; i <= N; i++) {
      const r = Math.exp(l0 + (l1 - l0) * i / N);
      const f = Math.sqrt(Math.max(B_COUL / r - Ueff, 0)) * r; // dr = r d(ln r)
      s += (i === 0 || i === N ? 1 : (i % 2 ? 4 : 2)) * f;
    }
    return PREF * s * (l1 - l0) / N / 3;
  }

  // calibration: lambda(27 eV, m*=1) = 3e-64 s^-1 (Koonin–Nauenberg)
  const G_CAL = actionG(27, 1);                       // ≈ 188.97
  const LOG_PREF = Math.log10(3e-64) + G_CAL / LN10;  // ≈ 18.55 = log10(C·nu0)

  function log10Lambda(UeEV, mStar) {                 // log10 of lambda in s^-1
    return LOG_PREF - actionG(UeEV, mStar) / LN10;
  }

  // ladder anchors (log10 of s^-1 per d–d pair); sources in chapter §1–§3
  const NEEDED = -11.1;  // 1 W/cm^3 as d+d→4He in PdD (chapter §1)
  const RUNGS = [
    { v: -63.5, top: true,  label: "D₂ molecule",   sub: "Koonin–Nauenberg" },
    { v: -45,   top: false, label: "equilibrium ceiling", sub: "Leggett–Baym ≲10⁻⁴⁵" },
    { v: -23,   top: true,  label: "Jones level",   sub: "1989 neutron claim" },
    { v: NEEDED, top: false, label: "1 W cm⁻³",     sub: "the watt line", warm: true },
    { v: 8.5,   top: true,  label: "ddμ measured",  sub: "10⁸–10⁹ s⁻¹" }
  ];

  // ── Self-mount (skipped in DOM-free harnesses) ──
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-widget='rate-ladder']").forEach(section => {
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

    // axis: log10 lambda from −70 to +16
    const LX0 = -70, LX1 = 16;
    const AXL = 24, AXR = 496;
    const xPix = v => AXL + (v - LX0) / (LX1 - LX0) * (AXR - AXL);
    const TRACK_Y = 196, TRACK_H = 16;

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

    // sliders hold log10 of the physical value
    const uSlider = mkSlider(controls, "screening Uₑ (eV)", Math.log10(10), Math.log10(5000), 0.005, Math.log10(27));
    const mSlider = mkSlider(controls, "lepton mass m*/mₑ", 0, Math.log10(207), 0.005, 0);

    const presets = document.createElement("div");
    presets.style.display = "flex";
    presets.style.flexWrap = "wrap";
    presets.style.gap = "0.4rem";
    presets.style.justifyContent = "center";
    presets.style.fontFamily = "Inter, sans-serif";
    host.appendChild(presets);
    [
      { txt: "D₂ (27 eV)", ue: 27, m: 1 },
      { txt: "Pd theory (134 eV)", ue: 134, m: 1 },
      { txt: "Pd beam (296 eV)", ue: 296, m: 1 },
      { txt: "Raiola (800 eV)", ue: 800, m: 1 },
      { txt: "muon (m* = 207)", ue: 27, m: 207 }
    ].forEach(p => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p.txt;
      b.style.font = "600 0.7rem Inter, sans-serif";
      b.style.color = ACCENT_DEEP;
      b.style.background = "#fbfaf7";
      b.style.border = "1px solid " + RULE;
      b.style.borderRadius = "999px";
      b.style.padding = "0.25rem 0.7rem";
      b.style.cursor = "pointer";
      b.addEventListener("click", () => {
        uSlider.input.value = Math.log10(p.ue);
        mSlider.input.value = Math.log10(p.m);
        redraw();
      });
      presets.appendChild(b);
    });

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
      `<span style="color:${ACCENT};font-weight:700">━</span> computed λ (this model) &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">┃</span> the watt line &nbsp;&nbsp; ` +
      `<span style="color:${FAINT}">┆ ladder rungs (measured / canonical)</span>`;
    host.appendChild(legend);

    uSlider.input.addEventListener("input", redraw);
    mSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const Ue = Math.pow(10, parseFloat(uSlider.input.value));
      const mStar = Math.pow(10, parseFloat(mSlider.input.value));

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // axis ticks every 10 decades
      for (let v = -70; v <= 10; v += 10) {
        line(svg, xPix(v), TRACK_Y + TRACK_H + 4, xPix(v), TRACK_Y + TRACK_H + 10, FAINT, 1);
        text(svg, xPix(v), TRACK_Y + TRACK_H + 22, "10" + sup(v), "middle", 9, FAINT, "Inter, sans-serif");
      }
      text(svg, (AXL + AXR) / 2, H - 6, "λ  (fusions per d–d pair per second, log scale)", "middle", 11, MUTED, "italic 'Source Serif 4', serif");

      // track
      rect(svg, AXL, TRACK_Y, AXR - AXL, TRACK_H, "#f4f0e6");

      // rungs
      RUNGS.forEach(rg => {
        const x = xPix(rg.v);
        const col = rg.warm ? WARM : FAINT;
        line(svg, x, 66, x, TRACK_Y + TRACK_H + 2, col, rg.warm ? 2 : 1, rg.warm ? null : "4,4");
        const ly = rg.top ? 30 : 54;
        text(svg, x, ly, rg.label, "middle", 10, rg.warm ? WARM : MUTED, "Inter, sans-serif");
        text(svg, x, ly + 11, rg.sub, "middle", 8.5, FAINT, "Inter, sans-serif");
      });

      // computed value
      const lg = log10Lambda(Ue, mStar);
      const lgC = Math.max(LX0, Math.min(LX1, lg));
      rect(svg, AXL, TRACK_Y + 3, Math.max(0, xPix(lgC) - AXL), TRACK_H - 6, ACCENT);
      circle(svg, xPix(lgC), TRACK_Y + TRACK_H / 2, 6, ACCENT_DEEP);

      // gap bracket between computed and the watt line
      const gap = NEEDED - lg;
      const y = TRACK_Y + TRACK_H + 40;
      const x1 = xPix(lgC), x2 = xPix(NEEDED);
      line(svg, x1, y, x2, y, ACCENT_DEEP, 1.5);
      line(svg, x1, y - 4, x1, y + 4, ACCENT_DEEP, 1.5);
      line(svg, x2, y - 4, x2, y + 4, ACCENT_DEEP, 1.5);
      const gapTxt = gap > 0
        ? Math.round(gap) + " orders of magnitude still missing"
        : Math.round(-gap) + " orders PAST the watt line — see caption";
      text(svg, (x1 + x2) / 2, y - 8, gapTxt, "middle", 10.5, ACCENT_DEEP, "Inter, sans-serif");

      const rt = turningPoint(Ue, mStar);
      const G = actionG(Ue, mStar);
      const rtTxt = rt >= 1e-3 ? (rt * 1e3).toFixed(1) + " pm" : (rt * 1e6).toFixed(0) + " fm";
      readout.innerHTML =
        `Uₑ = <strong style="color:${ACCENT_DEEP}">${Ue < 100 ? Ue.toFixed(1) : Ue.toFixed(0)} eV</strong>` +
        ` &nbsp;·&nbsp; m*/mₑ = <strong style="color:${ACCENT_DEEP}">${mStar < 10 ? mStar.toFixed(2) : mStar.toFixed(0)}</strong>` +
        ` &nbsp;·&nbsp; turning point r<sub>t</sub> = ${rtTxt}` +
        ` &nbsp;·&nbsp; WKB action G = ${G.toFixed(1)}` +
        `<br/>λ ≈ 10<sup>${lg.toFixed(1)}</sup> s⁻¹ per pair` +
        (gap > 0 ? ` &nbsp;→&nbsp; <strong style="color:${WARM}">${gap.toFixed(1)} orders short</strong> of 1 W cm⁻³`
                 : ` &nbsp;→&nbsp; <strong style="color:${WARM}">above the watt line</strong> (the reductio of §3)`);
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
  function rect(svg, x, y, w, h, fill) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("width", w); el.setAttribute("height", h);
    el.setAttribute("fill", fill);
    el.setAttribute("rx", 2);
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

  // expose pure functions for the harness
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { turningPoint, actionG, log10Lambda, G_CAL, LOG_PREF, NEEDED };
  }
})();
