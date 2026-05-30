/* Interactive · Eady baroclinic growth rate.
   The Eady model: uniform shear U = Lambda z, uniform N and f, rigid lids at 0 and H.
   Nondimensional wavenumber mu = k L_d = k N H / f, with L_d = N H / f.
   Growth rate sigma_E(k) = k c_i, where
     c_i = (Lambda H / mu) * sqrt[ (coth(mu/2) - mu/2)(mu/2 - tanh(mu/2)) ]   (real for mu < mu_c)
   Equivalently sigma_E = (Lambda f / N) * sqrt[ (coth(mu/2) - mu/2)(mu/2 - tanh(mu/2)) ].
   Most-unstable mu ~ 1.61, max coefficient ~ 0.31, short-wave cutoff mu_c ~ 2.399.
   Mounts into any [data-widget='eady-growth'] section. */

(function () {
  "use strict";

  const W = 560, H = 330;
  const M = { l: 54, r: 18, t: 20, b: 46 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  const ACCENT = "#2b5c8a";
  const ACCENT_DEEP = "#173a5a";
  const WARM = "#b8651a";
  const GOLD = "#c08a2d";
  const FAINT = "#8e9a9e";
  const RULE = "#dde3ea";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";

  const NS = "http://www.w3.org/2000/svg";

  function coth(x) { return 1 / Math.tanh(x); }

  // Real growth coefficient g(mu) = sqrt[(coth(mu/2)-mu/2)(mu/2-tanh(mu/2))], 0 where unstable cutoff.
  function growthCoef(mu) {
    if (mu <= 0) return 0;
    const a = coth(mu / 2) - mu / 2;     // positive for small mu, crosses 0 at mu_c
    const b = mu / 2 - Math.tanh(mu / 2); // always positive
    const prod = a * b;
    return prod > 0 ? Math.sqrt(prod) : 0;
  }

  // Precompute most-unstable mu and cutoff once (independent of the controls).
  const MU = (function () {
    let best = -1, bestMu = 0, cutoff = 0, prev = 1;
    for (let mu = 0.001; mu <= 3.2; mu += 0.0005) {
      const g = growthCoef(mu);
      if (g > best) { best = g; bestMu = mu; }
      if (prev > 0 && g <= 0 && cutoff === 0 && mu > 1) cutoff = mu;
      prev = g > 0 ? g : -1;
    }
    return { bestMu: bestMu, bestG: best, cutoff: cutoff || 2.3995 };
  })();

  document.querySelectorAll("[data-widget='eady-growth']").forEach(function (section) {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // Default physical parameters
    const state = {
      Lambda: 3.0e-3,   // shear dU/dz, s^-1   (U ~ 30 m/s over 10 km)
      N: 1.0e-2,        // Brunt-Vaisala, s^-1
      H: 1.0e4,         // tropopause depth, m
      f: 1.0e-4,        // Coriolis, s^-1
    };

    const controls = document.createElement("div");
    controls.style.display = "grid";
    controls.style.gridTemplateColumns = "auto 1fr auto";
    controls.style.gap = "0.35rem 0.7rem";
    controls.style.alignItems = "center";
    controls.style.width = "100%";
    controls.style.maxWidth = "440px";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.8rem";
    host.appendChild(controls);

    function addSlider(label, key, min, max, step, fmt) {
      const lab = document.createElement("span");
      lab.style.color = INK;
      lab.innerHTML = label;
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(min);
      slider.max = String(max);
      slider.step = String(step);
      slider.value = String(state[key]);
      slider.style.width = "100%";
      slider.style.accentColor = ACCENT;
      const val = document.createElement("span");
      val.style.fontWeight = "600";
      val.style.color = ACCENT_DEEP;
      val.style.fontVariantNumeric = "tabular-nums";
      val.style.minWidth = "5.4em";
      val.style.textAlign = "right";
      val.textContent = fmt(state[key]);
      slider.addEventListener("input", function () {
        state[key] = +slider.value;
        val.textContent = fmt(state[key]);
        redraw();
      });
      controls.appendChild(lab);
      controls.appendChild(slider);
      controls.appendChild(val);
    }

    addSlider('shear &Lambda; = &part;U/&part;z', "Lambda", 0.5e-3, 6e-3, 0.1e-3,
      function (v) { return (v * 1e3).toFixed(1) + " ms⁻¹km⁻¹"; });
    addSlider("stratification N", "N", 0.4e-2, 1.8e-2, 0.05e-2,
      function (v) { return (v * 1e3).toFixed(2) + "×10⁻³ s⁻¹"; });
    addSlider("depth H", "H", 6e3, 14e3, 0.5e3,
      function (v) { return (v / 1e3).toFixed(1) + " km"; });
    addSlider("Coriolis f", "f", 0.6e-4, 1.4e-4, 0.05e-4,
      function (v) { return (v * 1e4).toFixed(2) + "×10⁻⁴ s⁻¹"; });

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
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
    readout.style.minHeight = "2.6em";
    host.appendChild(readout);

    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.1rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      '<span><span style="display:inline-block;width:24px;height:2px;background:' + ACCENT +
        ';vertical-align:middle;margin-right:0.35em"></span>growth rate &sigma;<sub>E</sub>(L)</span>' +
      '<span><span style="display:inline-block;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ' + WARM +
        ';vertical-align:middle;margin-right:0.35em"></span>most unstable</span>' +
      '<span><span style="display:inline-block;width:14px;height:0;border-top:2px dashed ' + GOLD +
        ';vertical-align:middle;margin-right:0.35em"></span>short-wave cutoff</span>';
    host.appendChild(legend);

    function redraw() {
      const Ld = state.N * state.H / state.f;            // Rossby radius, m
      const coef = state.Lambda * state.f / state.N;      // (Lambda f / N), units s^-1

      // Sample sigma_E vs wavelength L. mu ranges (0, mu_c]; L = 2 pi L_d / mu.
      const pts = [];
      const muMax = 3.0;
      const Nsamp = 400;
      let maxSigma = 0;
      for (let i = 1; i <= Nsamp; i++) {
        const mu = (muMax * i) / Nsamp;
        const sigma = coef * growthCoef(mu);   // s^-1
        const L = (2 * Math.PI * Ld) / mu;      // m
        if (sigma > 0) {
          pts.push({ L: L, sigma: sigma, mu: mu });
          if (sigma > maxSigma) maxSigma = sigma;
        }
      }

      // Diagnostics at the most-unstable mode.
      const sigmaMax = coef * MU.bestG;             // s^-1
      const Lpeak = (2 * Math.PI * Ld) / MU.bestMu; // m
      const Lcut = (2 * Math.PI * Ld) / MU.cutoff;  // m
      const eFold = sigmaMax > 0 ? 1 / sigmaMax : Infinity; // s

      render(svg, pts, {
        Ld: Ld, sigmaMax: sigmaMax, Lpeak: Lpeak, Lcut: Lcut, maxSigma: maxSigma,
      });

      const eFoldDays = eFold / 86400;
      readout.innerHTML =
        "most-unstable wavelength <strong style=\"color:" + ACCENT_DEEP + "\">" +
          (Lpeak / 1e3).toFixed(0) + " km</strong> &nbsp;·&nbsp; " +
        "max growth &sigma;<sub>max</sub> = <strong style=\"color:" + ACCENT_DEEP + "\">" +
          sigmaMax.toExponential(2) + " s⁻¹</strong><br>" +
        "e-folding time 1/&sigma;<sub>max</sub> = <strong style=\"color:" + ACCENT_DEEP + "\">" +
          eFoldDays.toFixed(2) + " days</strong> &nbsp;·&nbsp; " +
        "Rossby radius L<sub>d</sub> = " + (Ld / 1e3).toFixed(0) + " km";
    }

    redraw();
  }

  function render(svg, pts, info) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // x: wavelength axis. Default ~9000 km, but expand so the peak and cutoff
    // always stay on-screen even at combined slider extremes (large L_d).
    const need = Math.max(info.Lpeak, info.Lcut) * 1.25;
    const Lmax = Math.max(9000e3, Math.ceil(need / 2000e3) * 2000e3);
    const sMax = Math.max(info.maxSigma, 1e-9) * 1.12;

    const xScale = function (L) { return M.l + (L / Lmax) * PW; };
    const yScale = function (s) { return M.t + (1 - s / sMax) * PH; };

    // Axes
    const xAxis = svg.appendChild(document.createElementNS(NS, "line"));
    xAxis.setAttribute("x1", M.l); xAxis.setAttribute("x2", M.l + PW);
    xAxis.setAttribute("y1", M.t + PH); xAxis.setAttribute("y2", M.t + PH);
    xAxis.setAttribute("stroke", FAINT); xAxis.setAttribute("stroke-width", "0.8");

    const yAxis = svg.appendChild(document.createElementNS(NS, "line"));
    yAxis.setAttribute("x1", M.l); yAxis.setAttribute("x2", M.l);
    yAxis.setAttribute("y1", M.t); yAxis.setAttribute("y2", M.t + PH);
    yAxis.setAttribute("stroke", FAINT); yAxis.setAttribute("stroke-width", "0.8");

    // x ticks (km) — generated so they span the (possibly expanded) axis.
    const Lmax_km = Math.round(Lmax / 1e3);
    const xStep_km = Lmax_km <= 9000 ? 2000 : Math.round(Lmax_km / 5 / 1000) * 1000;
    const xTicks = [];
    for (let km = 0; km < Lmax_km - 1; km += xStep_km) xTicks.push(km);
    xTicks.forEach(function (km) {
      const x = xScale(km * 1e3);
      const tick = svg.appendChild(document.createElementNS(NS, "line"));
      tick.setAttribute("x1", x); tick.setAttribute("x2", x);
      tick.setAttribute("y1", M.t + PH); tick.setAttribute("y2", M.t + PH + 4);
      tick.setAttribute("stroke", FAINT); tick.setAttribute("stroke-width", "0.8");
      const t = svg.appendChild(document.createElementNS(NS, "text"));
      t.setAttribute("x", x);
      t.setAttribute("y", M.t + PH + 16);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", "Inter, sans-serif");
      t.setAttribute("font-size", "10");
      t.setAttribute("fill", FAINT);
      t.textContent = km === 0 ? "0" : (km / 1000) + ",000";
    });

    // y ticks (per day for readability): convert s^-1 -> day^-1
    const nY = 4;
    for (let i = 0; i <= nY; i++) {
      const s = (sMax * i) / nY;
      const y = yScale(s);
      const t = svg.appendChild(document.createElementNS(NS, "text"));
      t.setAttribute("x", M.l - 8);
      t.setAttribute("y", y + 3.5);
      t.setAttribute("text-anchor", "end");
      t.setAttribute("font-family", "Inter, sans-serif");
      t.setAttribute("font-size", "10");
      t.setAttribute("fill", FAINT);
      t.textContent = (s * 86400).toFixed(1);
    }

    // Curve (filled under for emphasis)
    if (pts.length > 1) {
      const sorted = pts.slice().sort(function (a, b) { return a.L - b.L; });
      let dPath = "M " + xScale(sorted[0].L).toFixed(2) + " " + yScale(sorted[0].sigma).toFixed(2);
      for (let i = 1; i < sorted.length; i++) {
        dPath += " L " + xScale(sorted[i].L).toFixed(2) + " " + yScale(sorted[i].sigma).toFixed(2);
      }
      // Fill area
      const area = document.createElementNS(NS, "path");
      let aPath = dPath +
        " L " + xScale(sorted[sorted.length - 1].L).toFixed(2) + " " + yScale(0).toFixed(2) +
        " L " + xScale(sorted[0].L).toFixed(2) + " " + yScale(0).toFixed(2) + " Z";
      area.setAttribute("d", aPath);
      area.setAttribute("fill", ACCENT);
      area.setAttribute("opacity", "0.08");
      svg.appendChild(area);

      const curve = svg.appendChild(document.createElementNS(NS, "path"));
      curve.setAttribute("d", dPath);
      curve.setAttribute("fill", "none");
      curve.setAttribute("stroke", ACCENT);
      curve.setAttribute("stroke-width", "2");
    }

    // Most-unstable marker (warm triangle + drop line)
    if (info.Lpeak <= Lmax) {
      const xp = xScale(info.Lpeak), yp = yScale(info.sigmaMax);
      const drop = svg.appendChild(document.createElementNS(NS, "line"));
      drop.setAttribute("x1", xp); drop.setAttribute("x2", xp);
      drop.setAttribute("y1", yp); drop.setAttribute("y2", M.t + PH);
      drop.setAttribute("stroke", WARM); drop.setAttribute("stroke-width", "1");
      drop.setAttribute("stroke-dasharray", "3 3");
      drop.setAttribute("opacity", "0.7");
      const tri = svg.appendChild(document.createElementNS(NS, "path"));
      tri.setAttribute("d",
        "M " + xp + " " + (yp - 9) +
        " L " + (xp - 5) + " " + (yp - 18) +
        " L " + (xp + 5) + " " + (yp - 18) + " Z");
      tri.setAttribute("fill", WARM);
    }

    // Short-wave cutoff (gold dashed vertical)
    if (info.Lcut <= Lmax) {
      const xc = xScale(info.Lcut);
      const cut = svg.appendChild(document.createElementNS(NS, "line"));
      cut.setAttribute("x1", xc); cut.setAttribute("x2", xc);
      cut.setAttribute("y1", M.t); cut.setAttribute("y2", M.t + PH);
      cut.setAttribute("stroke", GOLD); cut.setAttribute("stroke-width", "1.4");
      cut.setAttribute("stroke-dasharray", "5 4");
      const ct = svg.appendChild(document.createElementNS(NS, "text"));
      ct.setAttribute("x", xc + 4);
      ct.setAttribute("y", M.t + 12);
      ct.setAttribute("font-family", "Inter, sans-serif");
      ct.setAttribute("font-size", "9.5");
      ct.setAttribute("fill", GOLD);
      ct.textContent = "cutoff";
    }

    // Axis labels
    const xl = svg.appendChild(document.createElementNS(NS, "text"));
    xl.setAttribute("x", M.l + PW / 2);
    xl.setAttribute("y", H - 4);
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("font-family", "Source Serif 4, serif");
    xl.setAttribute("font-style", "italic");
    xl.setAttribute("font-size", "12.5");
    xl.setAttribute("fill", MUTED);
    xl.textContent = "wavelength L  (km)";

    const yl = svg.appendChild(document.createElementNS(NS, "text"));
    yl.setAttribute("x", 13);
    yl.setAttribute("y", M.t + PH / 2);
    yl.setAttribute("text-anchor", "middle");
    yl.setAttribute("font-family", "Source Serif 4, serif");
    yl.setAttribute("font-style", "italic");
    yl.setAttribute("font-size", "12.5");
    yl.setAttribute("fill", MUTED);
    yl.setAttribute("transform", "rotate(-90, 13, " + (M.t + PH / 2) + ")");
    yl.textContent = "growth rate σₑ  (per day)";
  }
})();
