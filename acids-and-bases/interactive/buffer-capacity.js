/* Interactive · Buffer capacity β(pH).
   Exact (Van Slyke) buffer-capacity formula for a single monoprotic
   conjugate pair, including the water self-buffering terms:

     β(pH) = 2.303 ( [H+] + [OH-] + C_tot · Ka[H+] / (Ka + [H+])^2 ).

   See Urbansky & Schock, J. Chem. Educ. 77, 1640 (2000); Harris,
   Quantitative Chemical Analysis 9th ed., ch. 9. The buffer term peaks at
   [H+] = Ka (pH = pKa), where Ka[H+]/(Ka+[H+])^2 = 1/4, giving
   β_max ≈ 2.303·C_tot/4 = 0.576·C_tot. Reference: β_max(C_tot=0.2) = 0.115.
   All plotted numbers come from the formula — no cartoon. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  const LN10 = 2.302585092994046; // 2.303

  // ── Pure functions (DOM-free, harness-testable) ──
  // pH -> buffer capacity β in mol·L⁻¹ per pH unit.
  function betaOfPH(pH, pKa, Ctot, Kw) {
    const H = Math.pow(10, -pH);
    const OH = Kw / H;
    const Ka = Math.pow(10, -pKa);
    const denom = (Ka + H) * (Ka + H);
    const bufferTerm = Ctot * (Ka * H) / denom;
    return LN10 * (H + OH + bufferTerm);
  }
  function betaMax(Ctot) { return LN10 * Ctot / 4; } // ≈ 0.576·Ctot

  const W = 540, H = 320;
  const M = { l: 54, r: 18, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const PH_MIN = 0, PH_MAX = 14;
  const KW = 1e-14;

  function xpx(pH) { return M.l + (pH - PH_MIN) / (PH_MAX - PH_MIN) * PW; }
  function ypx(beta, bMax) { return M.t + (1 - clamp01(beta / bMax)) * PH; }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  document.querySelectorAll("[data-widget='buffer-capacity']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.8rem";

    let pKa = 4.76;
    let Ctot = 0.20;
    let selPH = 4.76;

    // SVG plot
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    svg.style.cursor = "crosshair";
    host.appendChild(svg);

    // Controls
    const ctrls = document.createElement("div");
    ctrls.style.display = "flex";
    ctrls.style.flexDirection = "column";
    ctrls.style.gap = "0.5rem";
    ctrls.style.width = "100%";
    ctrls.style.maxWidth = "460px";
    host.appendChild(ctrls);

    const pKaRow = sliderRow("pKₐ", "2", "12", "0.01", "4.76");
    const cRow = sliderRow("C_tot (M)", "0.01", "1", "0.01", "0.20");
    ctrls.appendChild(pKaRow.row);
    ctrls.appendChild(cRow.row);

    // Readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.86rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.6";
    host.appendChild(readout);

    pKaRow.slider.addEventListener("input", () => {
      pKa = +pKaRow.slider.value; selPH = pKa; redraw();
    });
    cRow.slider.addEventListener("input", () => { Ctot = +cRow.slider.value; redraw(); });

    function pickPH(evt) {
      const rect = svg.getBoundingClientRect();
      const px = (evt.clientX - rect.left) / rect.width * W;
      let p = PH_MIN + (px - M.l) / PW * (PH_MAX - PH_MIN);
      if (p < PH_MIN) p = PH_MIN;
      if (p > PH_MAX) p = PH_MAX;
      selPH = p; redraw();
    }
    let dragging = false;
    svg.addEventListener("mousedown", e => { dragging = true; pickPH(e); });
    svg.addEventListener("mousemove", e => { if (dragging) pickPH(e); });
    window.addEventListener("mouseup", () => { dragging = false; });

    redraw();

    function redraw() {
      const bMax = betaMax(Ctot);
      // Scale the y-axis so the buffer peak sits at ~80% height, leaving room
      // for the water-driven rise at the extremes.
      const yTop = bMax * 1.25;

      // Sample the curve
      const pts = [];
      for (let p = PH_MIN; p <= PH_MAX + 1e-9; p += 0.05) {
        pts.push([xpx(p), ypxScaled(betaOfPH(p, pKa, Ctot, KW))]);
      }
      function ypxScaled(b) { return M.t + (1 - clamp01(b / yTop)) * PH; }

      let s = "";

      // useful-range shading pKa ± 1
      const xL = xpx(Math.max(PH_MIN, pKa - 1));
      const xR = xpx(Math.min(PH_MAX, pKa + 1));
      s += `<rect x="${xL.toFixed(1)}" y="${M.t}" width="${(xR - xL).toFixed(1)}" height="${PH}" fill="${ACCENT}" opacity="0.08"/>`;

      // grid: vertical pH lines
      for (let g = 0; g <= 14; g += 2) {
        const x = xpx(g);
        s += line(x, M.t, x, M.t + PH, RULE, 1);
        s += text(x, H - M.b + 16, g.toFixed(0), 10, FAINT, "middle");
      }
      // horizontal β grid at 0, ¼, ½, ¾, 1 of yTop
      for (let k = 0; k <= 4; k++) {
        const bv = yTop * k / 4;
        const y = M.t + (1 - k / 4) * PH;
        s += line(M.l, y, W - M.r, y, RULE, 1);
        s += text(M.l - 8, y + 3, bv.toFixed(2), 10, FAINT, "end");
      }
      // axis titles
      s += text(M.l + PW / 2, H - 6, "pH", 11, MUTED, "middle");
      s += `<text x="14" y="${M.t + PH / 2}" font-size="11" fill="${MUTED}" font-family="'Source Serif 4',serif" font-style="italic" text-anchor="middle" transform="rotate(-90 14 ${M.t + PH / 2})">β  (mol·L⁻¹ / pH)</text>`;

      // β curve
      s += path(pts, ACCENT, 2);

      // peak marker at pH = pKa
      const peakX = xpx(pKa);
      const peakY = ypxScaled(betaOfPH(pKa, pKa, Ctot, KW));
      s += `<line x1="${peakX.toFixed(1)}" y1="${peakY.toFixed(1)}" x2="${peakX.toFixed(1)}" y2="${(M.t + PH).toFixed(1)}" stroke="${ACCENT_DEEP}" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>`;
      s += `<circle cx="${peakX.toFixed(1)}" cy="${peakY.toFixed(1)}" r="4.5" fill="${ACCENT_DEEP}" stroke="#fff" stroke-width="1.5"/>`;
      s += text(peakX, peakY - 9, "pH = pKₐ", 10, ACCENT_DEEP, "middle");

      // selected-pH marker
      const bSel = betaOfPH(selPH, pKa, Ctot, KW);
      const selX = xpx(selPH);
      const selY = ypxScaled(bSel);
      s += `<line x1="${selX.toFixed(1)}" y1="${M.t}" x2="${selX.toFixed(1)}" y2="${(M.t + PH).toFixed(1)}" stroke="${WARM}" stroke-width="1.2"/>`;
      s += `<circle cx="${selX.toFixed(1)}" cy="${selY.toFixed(1)}" r="5" fill="${WARM}" stroke="#fff" stroke-width="1.5"/>`;

      svg.innerHTML = s;

      pKaRow.val.textContent = pKa.toFixed(2);
      cRow.val.textContent = Ctot.toFixed(2) + " M";

      readout.innerHTML =
        `useful range &nbsp;<strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace">` +
        (pKa - 1).toFixed(2) + `</strong>–<strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace">` +
        (pKa + 1).toFixed(2) + `</strong> &nbsp;·&nbsp; $\\beta_{\\max}$ = <strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace">` +
        bMax.toFixed(3) + `</strong> M/pH<br>` +
        `at pH <strong style="color:${WARM};font-family:'JetBrains Mono',monospace">` +
        selPH.toFixed(2) + `</strong> &nbsp;→&nbsp; $\\beta$ = <strong style="color:${WARM};font-family:'JetBrains Mono',monospace">` +
        bSel.toFixed(3) + `</strong> M/pH`;

      if (window.renderMathInElement) {
        try {
          window.renderMathInElement(readout, {
            delimiters: [{ left: "$", right: "$", display: false }],
            throwOnError: false
          });
        } catch (e) { /* KaTeX not ready; plain-text fallback is fine */ }
      }
    }
  }

  // ── DOM helpers ──
  function sliderRow(label, min, max, step, value) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "0.6rem";
    row.style.fontFamily = "Inter, sans-serif";
    row.style.fontSize = "0.82rem";
    row.style.color = MUTED;
    const lab = document.createElement("span");
    lab.textContent = label;
    lab.style.minWidth = "5.5em";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min; slider.max = max; slider.step = step; slider.value = value;
    slider.style.flex = "1";
    slider.style.accentColor = ACCENT;
    const val = document.createElement("span");
    val.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    val.style.minWidth = "4.5em";
    val.style.textAlign = "right";
    val.style.color = INK;
    row.appendChild(lab); row.appendChild(slider); row.appendChild(val);
    return { row, slider, val };
  }

  // ── SVG helpers ──
  function line(x1, y1, x2, y2, color, w) {
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${w}"/>`;
  }
  function text(x, y, s, size, color, anchor) {
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${color}" font-family="Inter,sans-serif" text-anchor="${anchor}">${s}</text>`;
  }
  function path(pts, color, w) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
  }
})();
