/* Chapter II widget — The open-cell energy budget.
   Audits the Fleischmann–Pons open-cell bookkeeping: input power I·V splits
   into chemical power leaving with the gas, I·Etn·(1−γ), and heat actually
   deposited, P_heat = I·(V − Etn·(1−γ)), with the D2O thermoneutral potential
   Etn = 1.527 V. An experimenter who assumes zero recombination books an
   apparent excess P_app = I·Etn·γ. Reference values (chapter brief): I = 0.5 A,
   V = 4.5 V, γ = 0 → P_heat = 1.487 W, apparent excess 0; γ = 0.10 → apparent
   excess 76 mW ≈ 5.1% of the γ=0 heat. Sources: Fleischmann & Pons, JEAC 287,
   293 (1990) enthalpy balance; Miles, JCMNS 33, 74 (2020) Etn(D2O) = 1.5267 V;
   Lewis et al., Science 246, 793 (1989) recombination critique. */

(function () {
  "use strict";

  const ACCENT = "#a06010";
  const ACCENT_DEEP = "#6f430a";
  const WARM = "#2b5c8a";      // second series (gas-stream power)
  const FAINT = "#8e9a9e";
  const RULE = "#e6ddcb";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const W = 520, H = 320;
  const M = { l: 56, r: 16, t: 24, b: 46 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // ── Pure physics (DOM-free; exercised by the JSDOM harness) ──
  const ETN_D2O = 1.527;   // thermoneutral potential of D2O electrolysis, V

  function inputPower(I, V) {              // electrical input, W
    return I * V;
  }
  function gasPower(I, gamma) {            // chemical power leaving with gas, W
    return I * ETN_D2O * (1 - gamma);
  }
  function heatPower(I, V, gamma) {        // heat actually deposited in cell, W
    return I * (V - ETN_D2O * (1 - gamma));
  }
  function apparentExcess(I, gamma) {      // phantom excess if γ assumed 0, W
    return I * ETN_D2O * gamma;
  }
  function baselineHeat(I, V) {            // expected heat for a vented cell, W
    return I * (V - ETN_D2O);
  }

  // ── Self-mount ──
  document.querySelectorAll("[data-widget='fp-energy-budget']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

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
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.8rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    const iSlider = mkSlider(controls, "current I (A)", 0.05, 1, 0.01, 0.5);
    const vSlider = mkSlider(controls, "cell voltage V (V)", 2, 6, 0.05, 4.5);
    const gSlider = mkSlider(controls, "recombination γ", 0, 1, 0.01, 0);

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
      `<span style="color:${FAINT};font-weight:700">━</span> input I·V &nbsp;&nbsp; ` +
      `<span style="color:${WARM};font-weight:700">━</span> gas stream I·E&#8202;<sub>tn</sub>(1−γ) &nbsp;&nbsp; ` +
      `<span style="color:${ACCENT};font-weight:700">━</span> heat deposited &nbsp;&nbsp; ` +
      `<span style="color:${ACCENT_DEEP};font-weight:700">━</span> apparent "excess"`;
    host.appendChild(legend);

    iSlider.input.addEventListener("input", redraw);
    vSlider.input.addEventListener("input", redraw);
    gSlider.input.addEventListener("input", redraw);
    redraw();

    function redraw() {
      const I = parseFloat(iSlider.input.value);
      const V = parseFloat(vSlider.input.value);
      const g = parseFloat(gSlider.input.value);

      const pIn = inputPower(I, V);
      const pGas = gasPower(I, g);
      const pHeat = heatPower(I, V, g);
      const pApp = apparentExcess(I, g);
      const pBase = baselineHeat(I, V);

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // y scale: 0 .. max input at slider extremes rounded up
      const yMax = Math.max(pIn * 1.15, 0.5);
      const yPix = p => M.t + PH - (p / yMax) * PH;

      // gridlines
      const step = niceStep(yMax);
      for (let p = 0; p <= yMax + 1e-9; p += step) {
        line(svg, M.l, yPix(p), M.l + PW, yPix(p), RULE, 1);
        text(svg, M.l - 6, yPix(p) + 3, p.toFixed(step < 0.5 ? 1 : 1), "end", 10, FAINT, "Inter, sans-serif");
      }
      textRot(svg, 14, M.t + PH / 2, "P (W)", 11, MUTED);

      // bars
      const bars = [
        { label: "input I·V", val: pIn, color: FAINT },
        { label: "to gas", val: pGas, color: WARM },
        { label: "heat deposited", val: pHeat, color: ACCENT },
        { label: "apparent excess", val: pApp, color: ACCENT_DEEP }
      ];
      const n = bars.length;
      const slot = PW / n;
      const bw = slot * 0.52;
      bars.forEach((b, k) => {
        const x = M.l + slot * k + (slot - bw) / 2;
        const y = yPix(Math.max(b.val, 0));
        rect(svg, x, y, bw, M.t + PH - y, b.color);
        text(svg, x + bw / 2, M.t + PH + 14, b.label, "middle", 10, MUTED, "Inter, sans-serif");
        text(svg, x + bw / 2, y - 5, fmtW(b.val), "middle", 10, INK, "Inter, sans-serif");
      });

      // dashed marker: expected heat for a truly vented cell, I(V − Etn)
      line(svg, M.l, yPix(pBase), M.l + PW, yPix(pBase), ACCENT_DEEP, 1, "5,4");
      text(svg, M.l + PW - 4, yPix(pBase) - 4, "vented-cell heat I(V − Etn)", "end", 9, ACCENT_DEEP, "Inter, sans-serif");

      // baseline axis
      line(svg, M.l, M.t + PH, M.l + PW, M.t + PH, MUTED, 1);

      const pct = pBase > 0 ? (100 * pApp / pBase) : 0;
      readout.innerHTML =
        `I = <strong style="color:${ACCENT_DEEP}">${I.toFixed(2)} A</strong>` +
        ` &nbsp;·&nbsp; V = <strong style="color:${ACCENT_DEEP}">${V.toFixed(2)} V</strong>` +
        ` &nbsp;·&nbsp; γ = <strong style="color:${ACCENT_DEEP}">${(100 * g).toFixed(0)}%</strong>` +
        ` &nbsp;·&nbsp; heat deposited = <strong style="color:${ACCENT}">${fmtW(pHeat)}</strong>` +
        `<br/>apparent excess (if γ assumed 0) = <strong style="color:${ACCENT_DEEP}">${fmtW(pApp)}</strong>` +
        (g > 0 ? ` &nbsp;≈&nbsp; <strong style="color:${ACCENT_DEEP}">${pct.toFixed(1)}%</strong> of the vented-cell heat` : " — the ledger balances");
    }
  }

  // ── UI + SVG helpers ──
  function fmtW(p) {
    if (Math.abs(p) >= 1) return p.toFixed(3) + " W";
    return (p * 1000).toFixed(0) + " mW";
  }
  function niceStep(yMax) {
    const raw = yMax / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / pow;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * pow;
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
    el.setAttribute("width", w); el.setAttribute("height", Math.max(h, 0));
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
    module.exports = { ETN_D2O, inputPower, gasPower, heatPower, apparentExcess, baselineHeat };
  }
})();
