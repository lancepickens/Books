/* Interactive · Exact pH versus the square-root shortcut.
   Solves the exact charge balance for [H+] by bisection and compares it with
   the simple [H+] ≈ sqrt(Ka·C) approximation.

   System types:
     weak acid  — exact cubic  h^3 + Ka h^2 - (Ka C + Kw) h - Ka Kw = 0
                  (charge/proton balance h = Ka(C-A)/h + Kw/h).
     strong acid — Ka -> infinity, so [A-] = C and h satisfies
                  h^2 - C h - Kw = 0.
     weak base   — symmetric: solve for [OH-] from Kb = Kw/Ka, then pH = 14 - pOH.

   Reference checks (see chapter §4–§5):
     weak acid pKa 4.76, C = 0.1   -> exact pH ≈ 2.88, alpha ≈ 1.3%.
     strong acid C = 1e-7          -> exact pH ≈ 6.79  (NOT 7).
     weak base  pKa 4.76, C = 0.1  -> pH ≈ 8.88 (acetate via Kb).

   Pure functions (solveExactH, approxH, ...) are DOM-free for a Node harness. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  const KW = 1.0e-14;

  // ── Pure functions (DOM-free, harness-testable) ──

  // Charge-balance residual for a weak acid, written so its sign brackets the
  // root: f(h) = h - Ka(C - A)/h ... but more robustly we use the cubic value.
  // For a weak acid with analytical conc C: f(h) = h - [A-] - [OH-], where
  // [A-] = Ka*C/(Ka + h) (combining Ka and mass balance) and [OH-] = Kw/h.
  function acidResidual(h, Ka, C, Kw) {
    const A = Ka * C / (Ka + h);
    return h - A - Kw / h;
  }

  // Strong acid: A- = C exactly, so f(h) = h - C - Kw/h.
  function strongResidual(h, C, Kw) {
    return h - C - Kw / h;
  }

  // Generic bisection for a monotonically-increasing-through-zero residual on
  // [lo, hi]. Returns h.
  function bisect(f, lo, hi) {
    let flo = f(lo);
    let fhi = f(hi);
    // Expand if not bracketed (defensive; for our residuals f(lo)<0, f(hi)>0).
    if (flo > 0) return lo;
    if (fhi < 0) return hi;
    for (let i = 0; i < 200; i++) {
      const mid = Math.sqrt(lo * hi); // geometric midpoint: residual spans decades
      const fm = f(mid);
      if (!isFinite(fm)) break;
      if (Math.abs(fm) < 1e-30 || (hi / lo) < 1 + 1e-12) return mid;
      if (fm < 0) { lo = mid; flo = fm; } else { hi = mid; fhi = fm; }
    }
    return Math.sqrt(lo * hi);
  }

  // Exact [H+] for a weak acid via bisection of the charge balance.
  function solveExactH(Ka, C, Kw) {
    const f = function (h) { return acidResidual(h, Ka, C, Kw); };
    return bisect(f, 1e-15, 1.0);
  }

  // Exact [H+] for a strong acid (Ka -> infinity): h^2 - C h - Kw = 0.
  function solveStrongH(C, Kw) {
    return (C + Math.sqrt(C * C + 4 * Kw)) / 2;
  }

  // Exact [OH-] for a weak base of constant Kb (mirror of solveExactH).
  function solveExactOH(Kb, C, Kw) {
    const f = function (oh) {
      const B = Kb * C / (Kb + oh);
      return oh - B - Kw / oh;
    };
    return bisect(f, 1e-15, 1.0);
  }

  // Simple shortcut [H+] ≈ sqrt(Ka C) (or [OH-] ≈ sqrt(Kb C) for a base).
  function approxH(Ka, C) { return Math.sqrt(Ka * C); }

  // Fraction dissociated for a weak acid: alpha = Ka/(Ka + h).
  function alphaOf(Ka, h) { return Ka / (Ka + h); }

  // Master solver: returns {pHexact, pHapprox, pctErr, alpha} for a system.
  // type ∈ {"acid","base","strong"}.
  function solveSystem(type, pKa, C, Kw) {
    const Ka = Math.pow(10, -pKa);
    if (type === "strong") {
      const h = solveStrongH(C, Kw);
      const pHexact = -Math.log10(h);
      const hApprox = C;                       // naive: pH = -log C
      const pHapprox = -Math.log10(hApprox);
      const pctErr = Math.abs(pHexact - pHapprox) / pHexact * 100;
      return { Ka: Infinity, pHexact: pHexact, pHapprox: pHapprox,
               pctErr: pctErr, alpha: 1.0, h: h };
    }
    if (type === "base") {
      const Kb = Kw / Ka;
      const oh = solveExactOH(Kb, C, Kw);
      const pOHexact = -Math.log10(oh);
      const pHexact = -Math.log10(Kw) - pOHexact;
      const ohApprox = approxH(Kb, C);
      const pHapprox = -Math.log10(Kw) - (-Math.log10(ohApprox));
      const pctErr = Math.abs(pHexact - pHapprox) / pHexact * 100;
      const alpha = Kb / (Kb + oh);
      return { Ka: Ka, Kb: Kb, pHexact: pHexact, pHapprox: pHapprox,
               pctErr: pctErr, alpha: alpha, h: Kw / oh, oh: oh };
    }
    // weak acid (default)
    const h = solveExactH(Ka, C, Kw);
    const pHexact = -Math.log10(h);
    const hApprox = approxH(Ka, C);
    const pHapprox = -Math.log10(hApprox);
    const pctErr = Math.abs(pHexact - pHapprox) / pHexact * 100;
    return { Ka: Ka, pHexact: pHexact, pHapprox: pHapprox,
             pctErr: pctErr, alpha: alphaOf(Ka, h), h: h };
  }

  // Export for Node harness.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      solveExactH: solveExactH, solveStrongH: solveStrongH,
      solveExactOH: solveExactOH, approxH: approxH, alphaOf: alphaOf,
      solveSystem: solveSystem, KW: KW
    };
  }

  // ── Plot geometry ──
  const W = 540, H = 320;
  const M = { l: 50, r: 18, t: 18, b: 42 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const LOGC_MIN = -6, LOGC_MAX = 0;
  const PH_MIN = 0, PH_MAX = 14;

  function xpx(logC) { return M.l + (logC - LOGC_MIN) / (LOGC_MAX - LOGC_MIN) * PW; }
  function ypx(pH) { return M.t + (1 - (pH - PH_MIN) / (PH_MAX - PH_MIN)) * PH; }

  if (typeof document === "undefined") return;

  document.querySelectorAll("[data-widget='exact-ph-solver']").forEach(function (section) {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.8rem";

    let type = "acid";
    let pKa = 4.76;
    let logC = -1; // 0.1 M

    // SVG plot
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // Controls container
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexDirection = "column";
    controls.style.gap = "0.55rem";
    controls.style.width = "100%";
    controls.style.maxWidth = "440px";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.82rem";
    controls.style.color = MUTED;
    host.appendChild(controls);

    // System-type selector
    const selRow = document.createElement("div");
    selRow.style.display = "flex";
    selRow.style.alignItems = "center";
    selRow.style.gap = "0.6rem";
    const selLab = document.createElement("span");
    selLab.textContent = "System";
    selLab.style.minWidth = "5.5em";
    const sel = document.createElement("select");
    sel.style.flex = "1";
    sel.style.fontFamily = "Inter, sans-serif";
    sel.style.fontSize = "0.82rem";
    sel.style.padding = "0.2rem 0.3rem";
    [["acid", "weak acid"], ["base", "weak base"], ["strong", "strong acid"]].forEach(function (o) {
      const opt = document.createElement("option");
      opt.value = o[0]; opt.textContent = o[1];
      sel.appendChild(opt);
    });
    selRow.appendChild(selLab); selRow.appendChild(sel);
    controls.appendChild(selRow);

    // pKa slider
    const pkRow = document.createElement("div");
    pkRow.style.display = "flex";
    pkRow.style.alignItems = "center";
    pkRow.style.gap = "0.6rem";
    const pkLab = document.createElement("span");
    pkLab.innerHTML = "p$K_a$";
    pkLab.style.minWidth = "5.5em";
    const pkSlider = document.createElement("input");
    pkSlider.type = "range";
    pkSlider.min = "0"; pkSlider.max = "14"; pkSlider.step = "0.01"; pkSlider.value = "4.76";
    pkSlider.style.flex = "1";
    pkSlider.style.accentColor = ACCENT;
    const pkVal = document.createElement("span");
    pkVal.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    pkVal.style.minWidth = "3.5em";
    pkVal.style.textAlign = "right";
    pkVal.style.color = INK;
    pkRow.appendChild(pkLab); pkRow.appendChild(pkSlider); pkRow.appendChild(pkVal);
    controls.appendChild(pkRow);

    // Concentration slider (log-spaced)
    const cRow = document.createElement("div");
    cRow.style.display = "flex";
    cRow.style.alignItems = "center";
    cRow.style.gap = "0.6rem";
    const cLab = document.createElement("span");
    cLab.innerHTML = "conc. $C$";
    cLab.style.minWidth = "5.5em";
    const cSlider = document.createElement("input");
    cSlider.type = "range";
    cSlider.min = "-6"; cSlider.max = "0"; cSlider.step = "0.02"; cSlider.value = "-1";
    cSlider.style.flex = "1";
    cSlider.style.accentColor = ACCENT;
    const cVal = document.createElement("span");
    cVal.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    cVal.style.minWidth = "5.5em";
    cVal.style.textAlign = "right";
    cVal.style.color = INK;
    cRow.appendChild(cLab); cRow.appendChild(cSlider); cRow.appendChild(cVal);
    controls.appendChild(cRow);

    // Readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.86rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.7";
    host.appendChild(readout);

    sel.addEventListener("change", function () {
      type = sel.value;
      pkRow.style.opacity = (type === "strong") ? "0.35" : "1";
      pkSlider.disabled = (type === "strong");
      redraw();
    });
    pkSlider.addEventListener("input", function () { pKa = +pkSlider.value; redraw(); });
    cSlider.addEventListener("input", function () { logC = +cSlider.value; redraw(); });

    redraw();

    function redraw() {
      const C = Math.pow(10, logC);
      const res = solveSystem(type, pKa, C, KW);

      pkVal.textContent = (type === "strong") ? "—" : pKa.toFixed(2);
      cVal.textContent = C.toExponential(1).replace("e", "e") + " M";

      // Build exact-pH sweep over log10 C
      const pts = [];
      for (let lc = LOGC_MIN; lc <= LOGC_MAX + 1e-9; lc += 0.05) {
        const Cc = Math.pow(10, lc);
        const r = solveSystem(type, pKa, Cc, KW);
        pts.push([xpx(lc), ypx(clampPH(r.pHexact))]);
      }
      // Approximate-pH sweep (the straight shortcut)
      const apts = [];
      for (let lc = LOGC_MIN; lc <= LOGC_MAX + 1e-9; lc += 0.05) {
        const Cc = Math.pow(10, lc);
        const r = solveSystem(type, pKa, Cc, KW);
        apts.push([xpx(lc), ypx(clampPH(r.pHapprox))]);
      }

      let s = "";
      // grid: pH gridlines
      for (let g = 0; g <= 14; g += 2) {
        const y = ypx(g);
        s += line(M.l, y, W - M.r, y, RULE, 1);
        s += text(M.l - 7, y + 3, g.toFixed(0), 10, FAINT, "end");
      }
      // grid: logC ticks
      for (let lc = LOGC_MIN; lc <= LOGC_MAX; lc += 1) {
        const x = xpx(lc);
        s += line(x, M.t, x, M.t + PH, RULE, 1);
        s += text(x, H - M.b + 16, "10" + sup(lc), 10, FAINT, "middle");
      }
      // axis titles
      s += text(M.l + PW / 2, H - 6, "concentration  C  (M)", 11, MUTED, "middle");
      s += '<text x="13" y="' + (M.t + PH / 2) + '" font-size="11" fill="' + MUTED +
           '" font-family="Inter,sans-serif" text-anchor="middle" transform="rotate(-90 13 ' +
           (M.t + PH / 2) + ')">pH</text>';

      // neutral pH 7 reference line
      const y7 = ypx(7.0);
      s += '<line x1="' + M.l + '" y1="' + y7.toFixed(1) + '" x2="' + (W - M.r).toFixed(1) +
           '" y2="' + y7.toFixed(1) + '" stroke="' + FAINT +
           '" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"/>';
      s += text(W - M.r - 4, y7 - 4, "pH 7 (neutral)", 9, FAINT, "end");

      // approximate curve (warm, dashed) then exact (accent, solid)
      s += pathDash(apts, WARM, 1.6, "5 4");
      s += path(pts, ACCENT, 2);

      // marker at current C on exact curve
      const mx = xpx(logC), my = ypx(clampPH(res.pHexact));
      s += line(mx, M.t, mx, M.t + PH, ACCENT_DEEP, 1);
      s += '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) +
           '" r="5" fill="' + ACCENT + '" stroke="#fff" stroke-width="1.5"/>';

      // legend
      s += '<line x1="' + (M.l + 8) + '" y1="' + (M.t + 12) + '" x2="' + (M.l + 30) +
           '" y2="' + (M.t + 12) + '" stroke="' + ACCENT + '" stroke-width="2"/>';
      s += text(M.l + 34, M.t + 15, "exact", 10, ACCENT_DEEP, "start");
      s += '<line x1="' + (M.l + 80) + '" y1="' + (M.t + 12) + '" x2="' + (M.l + 102) +
           '" y2="' + (M.t + 12) + '" stroke="' + WARM + '" stroke-width="1.6" stroke-dasharray="5 4"/>';
      s += text(M.l + 106, M.t + 15, "shortcut √(KaC)", 10, WARM, "start");

      svg.innerHTML = s;

      const errStr = res.pctErr < 0.05 ? "&lt;0.05" : res.pctErr.toFixed(2);
      readout.innerHTML =
        'exact pH <strong style="color:' + ACCENT_DEEP + ';font-family:\'JetBrains Mono\',monospace">' +
        res.pHexact.toFixed(2) + '</strong>&nbsp;&nbsp;·&nbsp;&nbsp; shortcut pH <strong style="color:' +
        WARM + ';font-family:\'JetBrains Mono\',monospace">' + res.pHapprox.toFixed(2) + '</strong><br>' +
        'error <strong style="color:' + INK + ';font-family:\'JetBrains Mono\',monospace">' + errStr +
        ' %</strong>&nbsp;&nbsp;·&nbsp;&nbsp; fraction reacted $\\alpha$ = <strong style="color:' +
        ACCENT_DEEP + ';font-family:\'JetBrains Mono\',monospace">' + (res.alpha * 100).toFixed(2) + ' %</strong>';

      if (window.renderMathInElement) {
        try {
          window.renderMathInElement(readout, {
            delimiters: [{ left: "$", right: "$", display: false }],
            throwOnError: false
          });
          window.renderMathInElement(pkLab, { delimiters: [{ left: "$", right: "$", display: false }], throwOnError: false });
          window.renderMathInElement(cLab, { delimiters: [{ left: "$", right: "$", display: false }], throwOnError: false });
        } catch (e) { /* KaTeX not ready; plain text fallback is fine */ }
      }
    }
  }

  function clampPH(p) {
    if (!isFinite(p)) return 7;
    if (p < PH_MIN) return PH_MIN;
    if (p > PH_MAX) return PH_MAX;
    return p;
  }

  // ── SVG helpers ──
  function line(x1, y1, x2, y2, color, w) {
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) +
           '" y2="' + y2.toFixed(1) + '" stroke="' + color + '" stroke-width="' + w + '"/>';
  }
  function text(x, y, str, size, color, anchor) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + size +
           '" fill="' + color + '" font-family="Inter,sans-serif" text-anchor="' + anchor + '">' + str + '</text>';
  }
  function path(pts, color, w) {
    if (!pts.length) return "";
    let d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
    for (let i = 1; i < pts.length; i++) d += " L " + pts[i][0].toFixed(2) + " " + pts[i][1].toFixed(2);
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w + '"/>';
  }
  function pathDash(pts, color, w, dash) {
    if (!pts.length) return "";
    let d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
    for (let i = 1; i < pts.length; i++) d += " L " + pts[i][0].toFixed(2) + " " + pts[i][1].toFixed(2);
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + w +
           '" stroke-dasharray="' + dash + '"/>';
  }
  function sup(n) {
    const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²",
      "3": "³", "4": "⁴", "5": "⁵", "6": "⁶" };
    return String(n).split("").map(function (c) { return map[c] || c; }).join("");
  }
})();
