/* Interactive · Autoionization of water versus temperature.
   pKw(T) from tabulated measurements (CRC Handbook; Bandura & Lvov,
   J. Phys. Chem. Ref. Data 35, 15 (2006)). Neutral pH = ½·pKw, since
   pure water has [H+] = [OH-] = sqrt(Kw). All numbers on screen come from
   linear interpolation of the table below — no cartoon. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  // Tabulated pKw at 1 atm. (T in °C, pKw)
  const TABLE = [
    [0, 14.94], [10, 14.53], [20, 14.17], [25, 13.995], [30, 13.83],
    [40, 13.53], [50, 13.26], [60, 13.02], [70, 12.80], [80, 12.61],
    [90, 12.42], [100, 12.26]
  ];

  // ── Pure functions (DOM-free, harness-testable) ──
  function pKwAt(T) {
    if (T <= TABLE[0][0]) return TABLE[0][1];
    const last = TABLE[TABLE.length - 1];
    if (T >= last[0]) return last[1];
    for (let i = 0; i < TABLE.length - 1; i++) {
      const [t0, p0] = TABLE[i], [t1, p1] = TABLE[i + 1];
      if (T >= t0 && T <= t1) {
        const f = (T - t0) / (t1 - t0);
        return p0 + f * (p1 - p0);
      }
    }
    return last[1];
  }
  function neutralPH(T) { return pKwAt(T) / 2; }
  function KwAt(T) { return Math.pow(10, -pKwAt(T)); }

  const W = 540, H = 320;
  const M = { l: 52, r: 18, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const T_MIN = 0, T_MAX = 100;
  const PK_MIN = 12.0, PK_MAX = 15.2;

  function xpx(T) { return M.l + (T - T_MIN) / (T_MAX - T_MIN) * PW; }
  function ypx(pk) { return M.t + (1 - (pk - PK_MIN) / (PK_MAX - PK_MIN)) * PH; }

  document.querySelectorAll("[data-widget='water-autoionization']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.8rem";

    let T = 25;

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

    // Slider
    const ctrl = document.createElement("div");
    ctrl.style.display = "flex";
    ctrl.style.alignItems = "center";
    ctrl.style.gap = "0.6rem";
    ctrl.style.width = "100%";
    ctrl.style.maxWidth = "440px";
    ctrl.style.fontFamily = "Inter, sans-serif";
    ctrl.style.fontSize = "0.82rem";
    ctrl.style.color = MUTED;
    const lab = document.createElement("span");
    lab.textContent = "Temperature";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0"; slider.max = "100"; slider.step = "1"; slider.value = "25";
    slider.style.flex = "1";
    slider.style.accentColor = ACCENT;
    const tlab = document.createElement("span");
    tlab.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    tlab.style.minWidth = "4.5em";
    tlab.style.textAlign = "right";
    tlab.style.color = INK;
    ctrl.appendChild(lab); ctrl.appendChild(slider); ctrl.appendChild(tlab);
    host.appendChild(ctrl);

    // Readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.86rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.6";
    host.appendChild(readout);

    slider.addEventListener("input", () => { T = +slider.value; redraw(); });

    redraw();

    function redraw() {
      const pk = pKwAt(T);
      const Kw = KwAt(T);
      const nph = neutralPH(T);
      tlab.textContent = T.toFixed(0) + " °C";

      // Build curve sampled every 1°C
      const pts = [];
      for (let t = T_MIN; t <= T_MAX; t += 1) pts.push([xpx(t), ypx(pKwAt(t))]);

      let svgStr = "";
      // grid + axes
      for (let g = 12; g <= 15; g += 1) {
        const y = ypx(g);
        svgStr += line(M.l, y, W - M.r, y, RULE, 1);
        svgStr += text(M.l - 8, y + 3, g.toFixed(0), 10, FAINT, "end");
      }
      for (let t = 0; t <= 100; t += 25) {
        const x = xpx(t);
        svgStr += line(x, M.t, x, M.t + PH, RULE, 1);
        svgStr += text(x, H - M.b + 16, t + "°", 10, FAINT, "middle");
      }
      svgStr += text(M.l - 8, M.t + 4, "", 10, FAINT, "end");
      // axis titles
      svgStr += text(M.l + PW / 2, H - 6, "temperature  (°C)", 11, MUTED, "middle");
      svgStr += `<text x="14" y="${M.t + PH / 2}" font-size="11" fill="${MUTED}" font-family="'Source Serif 4',serif" font-style="italic" text-anchor="middle" transform="rotate(-90 14 ${M.t + PH / 2})">pK_w</text>`;

      // pKw curve
      svgStr += path(pts, ACCENT, 2);

      // neutral-pH 7 reference line at pKw = 14 (where neutral pH would be 7)
      const y14 = ypx(14.0);
      svgStr += `<line x1="${M.l}" y1="${y14.toFixed(1)}" x2="${(W - M.r).toFixed(1)}" y2="${y14.toFixed(1)}" stroke="${WARM}" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>`;
      svgStr += text(W - M.r - 4, y14 - 5, "pK_w = 14  (pH 7 neutral)", 10, WARM, "end");

      // marker at current T
      const mx = xpx(T), my = ypx(pk);
      svgStr += line(mx, M.t, mx, M.t + PH, ACCENT_DEEP, 1);
      svgStr += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="${ACCENT}" stroke="#fff" stroke-width="1.5"/>`;

      svg.innerHTML = svgStr;

      readout.innerHTML =
        `$K_{\\mathrm{w}}$ &nbsp;<strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace">` +
        Kw.toExponential(2) + `</strong>&nbsp;&nbsp;·&nbsp;&nbsp; $\\mathrm{p}K_{\\mathrm{w}}$ &nbsp;<strong style="color:${ACCENT_DEEP};font-family:'JetBrains Mono',monospace">` +
        pk.toFixed(2) + `</strong><br>` +
        `$[\\mathrm{H}^+] = [\\mathrm{OH}^-] = \\sqrt{K_{\\mathrm{w}}}$ = <strong style="color:${WARM};font-family:'JetBrains Mono',monospace">` +
        Math.sqrt(Kw).toExponential(2) + ` M</strong>&nbsp;&nbsp;→&nbsp;&nbsp; neutral pH = <strong style="color:${WARM};font-family:'JetBrains Mono',monospace">` +
        nph.toFixed(2) + `</strong>`;

      if (window.renderMathInElement) {
        try {
          window.renderMathInElement(readout, {
            delimiters: [{ left: "$", right: "$", display: false }],
            throwOnError: false
          });
        } catch (e) { /* KaTeX not ready; plain text fallback is fine */ }
      }
    }
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
