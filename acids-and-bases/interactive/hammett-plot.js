/* Interactive · The Hammett plot for substituted-benzoic-acid ionization.
   x-axis: substituent constant sigma (Hansch–Leo–Taft 1991).
   y-axis: log10(K/K0) = pKa0 - pKa, with pKa0 = 4.20 for benzoic acid.
   The reference reaction defines rho = 1.00 exactly, so the line is y = sigma
   through the origin. Toggle substituents and drag sigma to read off the
   predicted pKa = 4.20 - rho*sigma. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  const PKA0 = 4.20;   // unsubstituted benzoic acid
  const RHO = 1.00;    // defining reaction: rho = 1 exactly

  // label, sigma (Hansch–Leo–Taft 1991), measured pKa (= 4.20 - sigma here)
  const DATA = [
    ["p-NH2",  -0.66],
    ["p-OCH3", -0.27],
    ["p-CH3",  -0.17],
    ["H",       0.00],
    ["p-Cl",    0.23],
    ["p-Br",    0.23],
    ["m-Cl",    0.37],
    ["m-NO2",   0.71],
    ["p-NO2",   0.78]
  ];

  // ── Pure functions (DOM-free) ──
  function predictedPKa(sigma, rho, pKa0) {
    return pKa0 - rho * sigma;
  }
  function logKratio(pKa, pKa0) {
    return pKa0 - pKa;
  }

  const W = 580, H = 520;
  const M = { l: 64, r: 24, t: 26, b: 56 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const SX_MIN = -0.8, SX_MAX = 0.9;     // sigma axis
  const SY_MIN = -0.9, SY_MAX = 0.9;     // log(K/K0) axis

  function xpx(s) {
    const v = Math.max(SX_MIN, Math.min(SX_MAX, s));
    return M.l + (v - SX_MIN) / (SX_MAX - SX_MIN) * PW;
  }
  function ypx(y) {
    const v = Math.max(SY_MIN, Math.min(SY_MAX, y));
    return M.t + (SY_MAX - v) / (SY_MAX - SY_MIN) * PH;
  }

  document.querySelectorAll("[data-widget='hammett-plot']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // which data points are shown
    const active = DATA.map(() => true);
    let sigma = 0.0;   // slider position

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // sigma slider
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
    lab.textContent = "σ";
    lab.style.fontStyle = "italic";
    lab.style.minWidth = "1em";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-0.8"; slider.max = "0.9"; slider.step = "0.01"; slider.value = "0";
    slider.style.flex = "1";
    slider.style.accentColor = ACCENT;
    const sval = document.createElement("span");
    sval.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    sval.style.minWidth = "4em";
    sval.style.textAlign = "right";
    sval.style.color = INK;
    ctrl.appendChild(lab); ctrl.appendChild(slider); ctrl.appendChild(sval);
    host.appendChild(ctrl);

    // substituent toggles
    const toggles = document.createElement("div");
    toggles.style.display = "flex";
    toggles.style.flexWrap = "wrap";
    toggles.style.justifyContent = "center";
    toggles.style.gap = "0.35rem 0.5rem";
    toggles.style.fontFamily = "Inter, sans-serif";
    toggles.style.fontSize = "0.76rem";
    toggles.style.maxWidth = "480px";
    DATA.forEach((d, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = pretty(d[0]);
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid " + RULE;
      btn.style.borderRadius = "10px";
      btn.style.padding = "0.12rem 0.5rem";
      btn.style.fontFamily = "Inter, sans-serif";
      btn.style.fontSize = "0.76rem";
      styleToggle(btn, active[i]);
      btn.addEventListener("click", () => {
        active[i] = !active[i];
        styleToggle(btn, active[i]);
        redraw();
      });
      toggles.appendChild(btn);
    });
    host.appendChild(toggles);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.84rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    slider.addEventListener("input", () => { sigma = +slider.value; redraw(); });

    function styleToggle(btn, on) {
      if (on) {
        btn.style.background = ACCENT;
        btn.style.color = "#fff";
        btn.style.borderColor = ACCENT;
        btn.style.opacity = "1";
      } else {
        btn.style.background = "#fff";
        btn.style.color = MUTED;
        btn.style.borderColor = RULE;
        btn.style.opacity = "0.7";
      }
    }

    redraw();

    function redraw() {
      sval.textContent = (sigma >= 0 ? "+" : "") + sigma.toFixed(2);
      let s = "";

      // axes box
      const x0 = xpx(SX_MIN), x1 = xpx(SX_MAX);
      const y0 = ypx(SY_MIN), y1 = ypx(SY_MAX);

      // gridlines + ticks on sigma axis
      for (let g = -0.8; g <= 0.9001; g += 0.2) {
        const gx = xpx(g);
        s += `<line x1="${gx.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${gx.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="${RULE}" stroke-width="1"/>`;
        s += txt(gx, y0 + 16, fmt(g), 9.5, FAINT, "middle");
      }
      // gridlines + ticks on y axis
      for (let g = -0.8; g <= 0.8001; g += 0.2) {
        const gy = ypx(g);
        s += `<line x1="${x0.toFixed(1)}" y1="${gy.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="${RULE}" stroke-width="1"/>`;
        s += txt(x0 - 8, gy + 3, fmt(g), 9.5, FAINT, "end");
      }

      // zero axes (heavier)
      const xZero = xpx(0), yZero = ypx(0);
      s += `<line x1="${xZero.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${xZero.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="${FAINT}" stroke-width="1.4"/>`;
      s += `<line x1="${x0.toFixed(1)}" y1="${yZero.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${yZero.toFixed(1)}" stroke="${FAINT}" stroke-width="1.4"/>`;

      // Hammett line: y = rho * sigma through origin, rho = 1
      const lx0 = SX_MIN, lx1 = SX_MAX;
      s += `<line x1="${xpx(lx0).toFixed(1)}" y1="${ypx(RHO * lx0).toFixed(1)}" x2="${xpx(lx1).toFixed(1)}" y2="${ypx(RHO * lx1).toFixed(1)}" stroke="${ACCENT_DEEP}" stroke-width="2"/>`;
      // line label
      s += txt(xpx(0.62), ypx(0.62) - 8, "slope ρ = 1.00", 10.5, ACCENT_DEEP, "middle");

      // axis titles
      s += `<text x="${((x0 + x1) / 2).toFixed(1)}" y="${(H - 12).toFixed(1)}" font-size="11.5" fill="${INK}" font-family="Inter,sans-serif" text-anchor="middle">substituent constant  σ</text>`;
      s += `<text x="16" y="${((y0 + y1) / 2).toFixed(1)}" font-size="11.5" fill="${INK}" font-family="Inter,sans-serif" text-anchor="middle" transform="rotate(-90 16 ${((y0 + y1) / 2).toFixed(1)})">log₁₀(K / K₀) = pKa⁰ − pKa</text>`;

      // data points
      let nShown = 0;
      DATA.forEach((d, i) => {
        if (!active[i]) return;
        nShown++;
        const sg = d[1];
        const pKa = predictedPKa(sg, RHO, PKA0);
        const y = logKratio(pKa, PKA0);
        const cx = xpx(sg), cy = ypx(y);
        const col = sg > 0.001 ? WARM : (sg < -0.001 ? ACCENT : ACCENT_DEEP);
        s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.2" fill="${col}" stroke="#fff" stroke-width="0.8"/>`;
        // label: nudge to avoid the line
        const dy = sg >= 0 ? 14 : -8;
        s += txt(cx, cy + dy, pretty(d[0]), 9.5, col, "middle");
      });

      // movable sigma marker on the line
      const mPKa = predictedPKa(sigma, RHO, PKA0);
      const mY = logKratio(mPKa, PKA0);
      const mx = xpx(sigma), my = ypx(mY);
      s += `<line x1="${mx.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3"/>`;
      s += `<line x1="${x0.toFixed(1)}" y1="${my.toFixed(1)}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="${INK}" stroke-width="1" stroke-dasharray="3 3"/>`;
      s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="5" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
      s += `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="2" fill="${INK}"/>`;

      svg.innerHTML = s;

      const sign = sigma >= 0 ? "+" : "−";
      readout.innerHTML =
        `At σ = <strong style="color:${INK}">${(sigma >= 0 ? "+" : "") + sigma.toFixed(2)}</strong>, ` +
        `the line predicts pKa = 4.20 − (1.00)(${sign}${Math.abs(sigma).toFixed(2)}) = ` +
        `<strong style="color:${ACCENT_DEEP}">${mPKa.toFixed(2)}</strong>` +
        ` &nbsp;·&nbsp; <strong style="color:${ACCENT}">${nShown}</strong> substituents shown.`;
    }
  }

  function fmt(g) {
    const r = Math.round(g * 10) / 10;
    if (Math.abs(r) < 1e-9) return "0";
    return (r > 0 ? "+" : "") + r.toFixed(1);
  }

  // pretty substituent labels with unicode subscripts for SVG text
  function pretty(name) {
    return name
      .replace(/NH2/g, "NH₂")
      .replace(/NO2/g, "NO₂")
      .replace(/OCH3/g, "OCH₃")
      .replace(/CH3/g, "CH₃");
  }

  function txt(x, y, s, size, color, anchor) {
    return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-size="${size}" fill="${color}" font-family="Inter,sans-serif" text-anchor="${anchor}">${s}</text>`;
  }
})();
