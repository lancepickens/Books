/* Interactive · Geostrophic and gradient wind around a pressure center.
   Draws circular geopotential contours (isobars on a constant-pressure surface)
   around a low or high. The geostrophic wind blows parallel to the contours with
   speed Vg = |dPhi/dn| / f. Curvature corrects this to the gradient wind V via
   V^2/R + f V = -dPhi/dn, solved as separate low and high cases with R taken as a
   positive magnitude. (The chapter uses signed R with n to the left of the flow;
   here each case is handled explicitly, so R is just |R|.) All on-screen numbers
   come from these equations.
   Mounts into any [data-widget='geostrophic-wind'] section. */

(function () {
  "use strict";

  const W = 560, H = 360;
  const CX = 188, CY = H / 2;          // center of the pressure system
  const R_MAX = 150;                    // outer drawn radius (px)

  const ACCENT = "#2b5c8a";
  const ACCENT_DEEP = "#173a5a";
  const WARM = "#b8651a";
  const GOLD = "#c08a2d";
  const FAINT = "#8e9a9e";
  const RULE = "#dde3ea";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";
  const CARD = "#ffffff";

  const OMEGA = 7.292e-5;               // Earth rotation rate, s^-1

  document.querySelectorAll("[data-widget='geostrophic-wind']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // ── Controls ───────────────────────────────────────────────
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.3rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const grad = mkSlider(controls, "pressure gradient |∂Φ/∂n|", 2, 30, 12, 1, "");
    const lat = mkSlider(controls, "latitude φ", 15, 75, 45, 1, "°");

    // Low / High toggle
    const toggleWrap = document.createElement("div");
    toggleWrap.style.display = "flex";
    toggleWrap.style.gap = "0";
    toggleWrap.style.border = "1px solid " + ACCENT;
    toggleWrap.style.borderRadius = "2px";
    toggleWrap.style.overflow = "hidden";
    const btnLow = mkToggle("Low (cyclonic)");
    const btnHigh = mkToggle("High (anticyclonic)");
    toggleWrap.appendChild(btnLow);
    toggleWrap.appendChild(btnHigh);
    controls.appendChild(toggleWrap);

    let sign = -1; // -1 = low (cyclonic), +1 = high (anticyclonic); R used as |R|
    function paintToggle() {
      const lowOn = sign === -1;
      btnLow.style.background = lowOn ? ACCENT : CARD;
      btnLow.style.color = lowOn ? "#fff" : ACCENT;
      btnHigh.style.background = lowOn ? CARD : ACCENT;
      btnHigh.style.color = lowOn ? ACCENT : "#fff";
    }
    btnLow.addEventListener("click", () => { sign = -1; redraw(); });
    btnHigh.addEventListener("click", () => { sign = +1; redraw(); });

    // Curvature radius slider
    const radius = mkSlider(controls, "curvature radius R", 200, 3000, 1000, 50, " km");

    // ── SVG plot ───────────────────────────────────────────────
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // ── Readout ────────────────────────────────────────────────
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "2.4em";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    // ── Legend ─────────────────────────────────────────────────
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      swatch(ACCENT, "isobars (Φ contours)") +
      arrowSwatch(ACCENT_DEEP, "geostrophic wind") +
      arrowSwatch(WARM, "gradient wind");
    host.appendChild(legend);

    function redraw() {
      paintToggle();
      const phi = +lat.input.value;
      const gradVal = +grad.input.value;          // |dPhi/dn| in m^2 s^-2 per 100 km
      const Rkm = +radius.input.value;
      lat.out.textContent = phi + "°";
      radius.out.textContent = Rkm + " km";
      grad.out.textContent = gradVal;

      const f = 2 * OMEGA * Math.sin(phi * Math.PI / 180);   // s^-1
      // Pressure-gradient magnitude in SI: gradVal "units" -> m s^-2.
      // Calibrated so the default (gradVal=12, phi=45) gives Vg ~ 14 m s^-1,
      // a realistic synoptic wind; the full slider spans gentle to gale.
      const dPhidn = gradVal * 1.2e-4;             // m s^-2 (geopotential gradient)
      const R = Rkm * 1000;                         // m

      // Geostrophic speed: f * Vg = |dPhi/dn|  =>  Vg = |dPhi/dn| / f
      const Vg = dPhidn / f;

      // Gradient wind: V^2/R + f V = -dPhi/dn along n (toward center).
      // For a LOW (sign=-1): center is the pressure minimum, the pressure-gradient
      // force points inward (toward center, +n); the balance gives the
      // regular (positive) root  V = (-fR/2) + sqrt((fR/2)^2 + R*|dPhi/dn|).
      // For a HIGH (sign=+1): force points outward; the physically admissible root is
      //   V = (fR/2) - sqrt((fR/2)^2 - R*|dPhi/dn|),  real only if |dPhi/dn| <= f^2 R/4.
      const half = f * R / 2;
      let Vgrad = NaN, regime = "", note = "";
      if (sign === -1) {
        // cyclonic: subgeostrophic
        Vgrad = -half + Math.sqrt(half * half + R * dPhidn);
        regime = "subgeostrophic";
      } else {
        // anticyclonic: supergeostrophic, with a maximum
        const disc = half * half - R * dPhidn;
        if (disc < 0) {
          Vgrad = NaN;
          note = "no balanced flow — pressure gradient exceeds the anticyclonic limit |∂Φ/∂n| = f²R/4";
        } else {
          Vgrad = half - Math.sqrt(disc);
          regime = "supergeostrophic";
        }
      }

      render(svg, { sign, Vg, Vgrad, f });

      const ratio = (isFinite(Vgrad) && Vg > 0) ? (Vgrad / Vg) : NaN;
      const around = sign === -1 ? "around a LOW" : "around a HIGH";
      let html =
        `f = <strong style="color:${ACCENT_DEEP}">${f.toExponential(2)}</strong> s⁻¹ ` +
        `&nbsp;·&nbsp; V<sub>g</sub> = <strong style="color:${ACCENT_DEEP}">${Vg.toFixed(1)}</strong> m s⁻¹`;
      if (isFinite(Vgrad)) {
        html +=
          ` &nbsp;·&nbsp; V = <strong style="color:${WARM}">${Vgrad.toFixed(1)}</strong> m s⁻¹ ` +
          `&nbsp;·&nbsp; V / V<sub>g</sub> = <strong>${ratio.toFixed(2)}</strong> (${regime}, ${around})`;
      } else {
        html += ` &nbsp;·&nbsp; <span style="color:${WARM}">${note}</span>`;
      }
      readout.innerHTML = html;
    }

    [grad.input, lat.input, radius.input].forEach(el =>
      el.addEventListener("input", redraw));

    redraw();
  }

  // ── Rendering ────────────────────────────────────────────────
  function render(svg, st) {
    const ns = "http://www.w3.org/2000/svg";
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    defsArrow(svg, "arrG", ACCENT_DEEP);
    defsArrow(svg, "arrV", WARM);

    // Concentric isobars
    const nRings = 5;
    for (let i = 1; i <= nRings; i++) {
      const r = (R_MAX * i) / nRings;
      const c = svg.appendChild(document.createElementNS(ns, "circle"));
      c.setAttribute("cx", CX);
      c.setAttribute("cy", CY);
      c.setAttribute("r", r);
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", ACCENT);
      c.setAttribute("stroke-width", "1.1");
      c.setAttribute("opacity", "0.55");
    }

    // Center label L or H
    const lab = svg.appendChild(document.createElementNS(ns, "text"));
    lab.setAttribute("x", CX);
    lab.setAttribute("y", CY + 8);
    lab.setAttribute("text-anchor", "middle");
    lab.setAttribute("font-family", "Source Serif 4, serif");
    lab.setAttribute("font-size", "26");
    lab.setAttribute("font-weight", "600");
    lab.setAttribute("fill", st.sign === -1 ? ACCENT_DEEP : WARM);
    lab.textContent = st.sign === -1 ? "L" : "H";

    // Pick a parcel on a mid radius, draw the wind arrows tangent to the isobar.
    const rP = R_MAX * 0.66;
    const px = CX + rP, py = CY;          // parcel to the east of center

    // Tangent (counterclockwise) unit vector at (east) point is (0,-1) i.e. northward.
    // Cyclonic (low, NH): wind blows counterclockwise -> northward here.
    // Anticyclonic (high): clockwise -> southward here.
    // Northward is negative y in screen coords, so cyclonic => arrow points up.
    const ty = (st.sign === -1) ? -1 : +1;

    // scale: 1 m/s -> px. Cap arrows so they stay on screen.
    const SCALE = 2.4;
    const lenG = Math.min(120, st.Vg * SCALE);
    const lenV = isFinite(st.Vgrad) ? Math.min(120, st.Vgrad * SCALE) : 0;

    // Geostrophic arrow (drawn slightly offset so both are visible)
    drawArrow(svg, px - 7, py, px - 7, py + ty * lenG, ACCENT_DEEP, "arrG", 2.4);
    // Gradient-wind arrow
    if (lenV > 0) {
      drawArrow(svg, px + 7, py, px + 7, py + ty * lenV, WARM, "arrV", 2.4);
    }

    // Parcel dot
    const dot = svg.appendChild(document.createElementNS(ns, "circle"));
    dot.setAttribute("cx", px);
    dot.setAttribute("cy", py);
    dot.setAttribute("r", "3.2");
    dot.setAttribute("fill", INK);

    // Inward-pointing pressure-gradient-force hint (toward center for a low)
    const pgfLen = 34;
    const pgfDir = st.sign === -1 ? -1 : +1; // low: force points toward center (left here)
    drawDashed(svg, px, py + 26, px + pgfDir * pgfLen, py + 26, GOLD);
    const pgfLab = svg.appendChild(document.createElementNS(ns, "text"));
    pgfLab.setAttribute("x", px + (pgfDir * pgfLen) / 2);
    pgfLab.setAttribute("y", py + 42);
    pgfLab.setAttribute("text-anchor", "middle");
    pgfLab.setAttribute("font-family", "Inter, sans-serif");
    pgfLab.setAttribute("font-size", "9.5");
    pgfLab.setAttribute("fill", GOLD);
    pgfLab.textContent = "−∂Φ/∂n";

    // Caption strip on the right
    const tag = svg.appendChild(document.createElementNS(ns, "text"));
    tag.setAttribute("x", W - 14);
    tag.setAttribute("y", 26);
    tag.setAttribute("text-anchor", "end");
    tag.setAttribute("font-family", "Inter, sans-serif");
    tag.setAttribute("font-size", "11");
    tag.setAttribute("fill", MUTED);
    tag.textContent = st.sign === -1 ? "cyclonic — counterclockwise (NH)" : "anticyclonic — clockwise (NH)";
  }

  function drawArrow(svg, x1, y1, x2, y2, color, markerId, w) {
    const ns = "http://www.w3.org/2000/svg";
    const ln = svg.appendChild(document.createElementNS(ns, "line"));
    ln.setAttribute("x1", x1); ln.setAttribute("y1", y1);
    ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
    ln.setAttribute("stroke", color);
    ln.setAttribute("stroke-width", w);
    ln.setAttribute("marker-end", `url(#${markerId})`);
  }

  function drawDashed(svg, x1, y1, x2, y2, color) {
    const ns = "http://www.w3.org/2000/svg";
    const ln = svg.appendChild(document.createElementNS(ns, "line"));
    ln.setAttribute("x1", x1); ln.setAttribute("y1", y1);
    ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
    ln.setAttribute("stroke", color);
    ln.setAttribute("stroke-width", "1.6");
    ln.setAttribute("stroke-dasharray", "3 2");
  }

  function defsArrow(svg, id, color) {
    const ns = "http://www.w3.org/2000/svg";
    let defs = svg.querySelector("defs");
    if (!defs) { defs = svg.appendChild(document.createElementNS(ns, "defs")); }
    const m = defs.appendChild(document.createElementNS(ns, "marker"));
    m.setAttribute("id", id);
    m.setAttribute("viewBox", "0 0 10 10");
    m.setAttribute("refX", "8");
    m.setAttribute("refY", "5");
    m.setAttribute("markerWidth", "6");
    m.setAttribute("markerHeight", "6");
    m.setAttribute("orient", "auto-start-reverse");
    const p = m.appendChild(document.createElementNS(ns, "path"));
    p.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    p.setAttribute("fill", color);
  }

  // ── Small UI builders ────────────────────────────────────────
  function mkSlider(parent, label, min, max, val, step, suffix) {
    const wrap = document.createElement("label");
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.8rem";
    wrap.style.color = INK;
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "0.2rem";
    wrap.style.alignItems = "flex-start";

    const top = document.createElement("span");
    const out = document.createElement("span");
    out.style.fontWeight = "600";
    out.style.color = ACCENT;
    out.textContent = val + suffix;
    top.appendChild(document.createTextNode(label + "  "));
    top.appendChild(out);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.value = String(val);
    input.step = String(step);
    input.style.width = "160px";
    input.style.accentColor = ACCENT;

    wrap.appendChild(top);
    wrap.appendChild(input);
    parent.appendChild(wrap);
    return { input, out };
  }

  function mkToggle(text) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.74rem";
    b.style.padding = "0.32rem 0.7rem";
    b.style.border = "0";
    b.style.background = "#fff";
    b.style.color = ACCENT;
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    return b;
  }

  function swatch(color, text) {
    return `<span><span style="display:inline-block;width:22px;height:2px;background:${color};vertical-align:middle;margin-right:0.35em"></span>${text}</span>`;
  }
  function arrowSwatch(color, text) {
    return `<span><span style="display:inline-block;width:0;height:0;border-left:7px solid ${color};border-top:4px solid transparent;border-bottom:4px solid transparent;vertical-align:middle;margin-right:0.35em"></span>${text}</span>`;
  }
})();
