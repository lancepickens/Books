/* Interactive · Acid–base titration curve from the exact master equation.
   Sweeps pH and reads off the titrant volume Vb via de Levie's master equation
   (Aqueous Acid–Base Equilibria and Titrations, Oxford Chemistry Primer 80, 1999):

       Vb = Va · (Ca·alpha - Delta) / (Cb + Delta),
       alpha = Ka / (Ka + [H+]),   Delta = [H+] - Kw/[H+].

   For a strong acid analyte alpha = 1 at all pH. The curve is plotted as pH (y)
   versus Vb (x). All numbers on screen come from this formula — no cartoon.
   Reference: weak acid pKa 4.76, Ca = Cb = 0.1 M, Va = 50 mL → Veq = 50 mL,
   half-equivalence pH ≈ 4.76, equivalence pH ≈ 8.7. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  const KW = 1e-14;
  const VA = 50; // mL, fixed analyte volume

  // ── Pure functions (DOM-free, harness-testable) ──
  function alphaA(Ka, h) {
    return Ka / (Ka + h);
  }
  // Titrant volume (mL) producing a given [H+]=h, for the chosen parameters.
  // params: { strong:bool, Ka, Ca, Cb }
  function volumeAtPH(pH, params) {
    const h = Math.pow(10, -pH);
    const delta = h - KW / h;
    const a = params.strong ? 1 : alphaA(params.Ka, h);
    const denom = params.Cb + delta;
    return VA * (params.Ca * a - delta) / denom;
  }
  function equivVolume(params) {
    return params.Ca * VA / params.Cb; // mL
  }

  const W = 540, H = 340;
  const M = { l: 48, r: 18, t: 16, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const PH_MIN = 0, PH_MAX = 14;

  function ypx(pH) { return M.t + (1 - (pH - PH_MIN) / (PH_MAX - PH_MIN)) * PH; }

  document.querySelectorAll("[data-widget='titration-curve']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.75rem";

    const state = { strong: false, pKa: 4.76, Ca: 0.100, Cb: 0.100 };

    // SVG plot
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // Controls block
    const controls = document.createElement("div");
    controls.style.width = "100%";
    controls.style.maxWidth = "460px";
    controls.style.display = "flex";
    controls.style.flexDirection = "column";
    controls.style.gap = "0.5rem";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.82rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    // Analyte selector
    const selRow = document.createElement("div");
    selRow.style.display = "flex";
    selRow.style.alignItems = "center";
    selRow.style.gap = "0.6rem";
    const selLab = document.createElement("span");
    selLab.textContent = "Analyte";
    const sel = document.createElement("select");
    sel.style.flex = "0 0 auto";
    sel.style.fontFamily = "Inter, sans-serif";
    sel.style.fontSize = "0.82rem";
    sel.style.padding = "0.15rem 0.3rem";
    ["weak acid", "strong acid"].forEach(opt => {
      const o = document.createElement("option");
      o.value = opt; o.textContent = opt;
      sel.appendChild(o);
    });
    sel.value = "weak acid";
    selRow.appendChild(selLab);
    selRow.appendChild(sel);
    controls.appendChild(selRow);

    // Slider factory
    function mkSlider(label, min, max, step, value, fmt) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "0.6rem";
      const lab = document.createElement("span");
      lab.style.minWidth = "9.5em";
      lab.innerHTML = label;
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(min); slider.max = String(max);
      slider.step = String(step); slider.value = String(value);
      slider.style.flex = "1";
      slider.style.accentColor = ACCENT;
      const val = document.createElement("span");
      val.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
      val.style.minWidth = "5em";
      val.style.textAlign = "right";
      val.style.color = INK;
      val.textContent = fmt(value);
      row.appendChild(lab); row.appendChild(slider); row.appendChild(val);
      controls.appendChild(row);
      return { row, slider, val };
    }

    const pkaCtl = mkSlider("p<i>K</i><sub>a</sub>", 1, 11, 0.01, state.pKa, v => (+v).toFixed(2));
    const caCtl = mkSlider("acid conc <i>C</i><sub>a</sub> (M)", 0.01, 1, 0.01, state.Ca, v => (+v).toFixed(2));
    const cbCtl = mkSlider("titrant conc <i>C</i><sub>b</sub> (M)", 0.01, 1, 0.01, state.Cb, v => (+v).toFixed(2));

    // Readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.86rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.65";
    host.appendChild(readout);

    sel.addEventListener("change", () => {
      state.strong = (sel.value === "strong acid");
      pkaCtl.row.style.opacity = state.strong ? "0.35" : "1";
      pkaCtl.slider.disabled = state.strong;
      redraw();
    });
    pkaCtl.slider.addEventListener("input", () => {
      state.pKa = +pkaCtl.slider.value;
      pkaCtl.val.textContent = state.pKa.toFixed(2);
      redraw();
    });
    caCtl.slider.addEventListener("input", () => {
      state.Ca = +caCtl.slider.value;
      caCtl.val.textContent = state.Ca.toFixed(2);
      redraw();
    });
    cbCtl.slider.addEventListener("input", () => {
      state.Cb = +cbCtl.slider.value;
      cbCtl.val.textContent = state.Cb.toFixed(2);
      redraw();
    });

    redraw();

    function redraw() {
      const params = {
        strong: state.strong,
        Ka: Math.pow(10, -state.pKa),
        Ca: state.Ca,
        Cb: state.Cb
      };
      const Veq = equivVolume(params);
      const xMax = Math.max(2 * Veq, 1); // plot window in mL

      function xpx(vb) { return M.l + (vb / xMax) * PW; }

      // Sweep pH, keep points with 0 <= Vb <= xMax (and finite).
      const pts = [];
      for (let pH = 0.5; pH <= 13.0001; pH += 0.02) {
        const vb = volumeAtPH(pH, params);
        if (isFinite(vb) && vb >= -0.001 && vb <= xMax) {
          pts.push([xpx(Math.max(0, vb)), ypx(pH)]);
        }
      }

      // Equivalence-point pH: value of the curve at Vb = Veq (find by bisection on pH).
      const phEq = phAtVolume(Veq, params);
      // Half-equivalence pH read from the curve at Veq/2 (weak acid → ≈ pKa).
      const phHalf = state.strong ? null : phAtVolume(Veq / 2, params);

      let s = "";

      // grid: horizontal pH lines
      for (let g = 0; g <= 14; g += 2) {
        const y = ypx(g);
        s += line(M.l, y, W - M.r, y, RULE, 1);
        s += text(M.l - 7, y + 3, g.toFixed(0), 10, FAINT, "end");
      }
      // vertical volume gridlines (~5 ticks)
      const vStep = niceStep(xMax);
      for (let v = 0; v <= xMax + 1e-6; v += vStep) {
        const x = xpx(v);
        s += line(x, M.t, x, M.t + PH, RULE, 1);
        s += text(x, H - M.b + 16, v.toFixed(0), 10, FAINT, "middle");
      }

      // axis titles
      s += text(M.l + PW / 2, H - 5, "volume of base added  (mL)", 11, MUTED, "middle");
      s += `<text x="13" y="${M.t + PH / 2}" font-size="11" fill="${MUTED}" font-family="'Source Serif 4',serif" font-style="italic" text-anchor="middle" transform="rotate(-90 13 ${M.t + PH / 2})">pH</text>`;

      // half-equivalence marker (weak acid): dashed line at pH = pKa
      if (!state.strong) {
        const yk = ypx(state.pKa);
        s += `<line x1="${M.l}" y1="${yk.toFixed(1)}" x2="${(W - M.r).toFixed(1)}" y2="${yk.toFixed(1)}" stroke="${WARM}" stroke-width="1" stroke-dasharray="4 4" opacity="0.75"/>`;
        s += text(M.l + 4, yk - 4, "pH = pK_a  (half-equivalence)", 10, WARM, "start");
        const xhalf = xpx(Veq / 2);
        s += `<line x1="${xhalf.toFixed(1)}" y1="${M.t}" x2="${xhalf.toFixed(1)}" y2="${(M.t + PH).toFixed(1)}" stroke="${WARM}" stroke-width="1" stroke-dasharray="2 3" opacity="0.55"/>`;
      }

      // titration curve
      s += path(pts, ACCENT, 2.2);

      // equivalence point marker
      const xeq = xpx(Veq), yeq = ypx(phEq);
      s += `<line x1="${xeq.toFixed(1)}" y1="${M.t}" x2="${xeq.toFixed(1)}" y2="${(M.t + PH).toFixed(1)}" stroke="${ACCENT_DEEP}" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>`;
      s += `<circle cx="${xeq.toFixed(1)}" cy="${yeq.toFixed(1)}" r="5" fill="${ACCENT_DEEP}" stroke="#fff" stroke-width="1.5"/>`;
      s += text(xeq + 7, yeq + 3, "V_eq", 10, ACCENT_DEEP, "start");

      svg.innerHTML = s;

      // Readout text
      let html =
        `equivalence: <strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace">V_eq = ` +
        Veq.toFixed(1) + ` mL</strong>, <strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace">pH = ` +
        phEq.toFixed(2) + `</strong>`;
      if (!state.strong) {
        html += `<br>half-equivalence (V_eq/2 = ` + (Veq / 2).toFixed(1) +
          ` mL): pH = <strong style="color:${WARM};font-family:'JetBrains Mono',monospace">` +
          phHalf.toFixed(2) + `</strong> &nbsp;≈&nbsp; pK_a = <strong style="color:${WARM};font-family:'JetBrains Mono',monospace">` +
          state.pKa.toFixed(2) + `</strong>`;
      } else {
        html += `<br>strong acid: fully dissociated (α = 1), equivalence is neutral`;
      }
      readout.innerHTML = html;
    }
  }

  // Invert the master equation: pH such that Vb(pH) = vTarget, by bisection.
  function phAtVolume(vTarget, params) {
    let lo = 0.3, hi = 13.5;
    // Vb is monotonically increasing with pH (more base → higher pH).
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      const v = volumeAtPH(mid, params);
      if (v < vTarget) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  function niceStep(xMax) {
    const raw = xMax / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    let step;
    if (n < 1.5) step = 1;
    else if (n < 3) step = 2;
    else if (n < 7) step = 5;
    else step = 10;
    return step * mag;
  }

  // ── SVG helpers ──
  function line(x1, y1, x2, y2, color, w) {
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${w}"/>`;
  }
  function text(x, y, str, size, color, anchor) {
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${color}" font-family="Inter,sans-serif" text-anchor="${anchor}">${str}</text>`;
  }
  function path(pts, color, w) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
  }
})();
