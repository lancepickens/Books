/* Interactive · Inertial circles on an f-plane.
   With no pressure gradient and no friction the horizontal momentum equations
   reduce to  du/dt = f v,  dv/dt = -f u.  The exact solution is an inertial
   circle of radius V/f swept CLOCKWISE in the Northern Hemisphere with period
   T_i = 2π/f = (11.97 h)/sin φ.  Controls: latitude φ (sets f) and initial
   speed V.  On-screen numbers come straight from these equations.
   Mounts into any [data-widget='coriolis-circles'] section. */

(function () {
  "use strict";

  // ── Palette ───────────────────────────────────────────
  const ACCENT = "#2b5c8a";
  const ACCENT_DEEP = "#173a5a";
  const WARM = "#b8651a";
  const GOLD = "#c08a2d";
  const FAINT = "#8e9a9e";
  const RULE = "#dde3ea";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";
  const CARD = "#ffffff";

  // ── Physics constants ─────────────────────────────────
  const OMEGA = 7.292e-5;            // Earth's angular speed, s^-1
  const DEG = Math.PI / 180;

  // ── Geometry of the SVG canvas ────────────────────────
  const W = 460, H = 360;
  const CX = W / 2, CY = H / 2;      // map centre (parcel starts here)
  const PLOT_R = 150;                // pixels available around centre
  const LAT_MIN = 5;                 // slider's minimum latitude (deg) — sets the map scale

  document.querySelectorAll("[data-widget='coriolis-circles']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // ── Controls ────────────────────────────────────────
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const latCtl = makeSlider("latitude φ", LAT_MIN, 80, 45, "°");
    const spdCtl = makeSlider("speed V", 2, 30, 10, " m s⁻¹");
    controls.appendChild(latCtl.wrap);
    controls.appendChild(spdCtl.wrap);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Pause";
    styleBtn(btn);
    controls.appendChild(btn);

    // ── SVG ─────────────────────────────────────────────
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    const circleEl = document.createElementNS(ns, "circle");   // inertial circle outline
    const trailEl = document.createElementNS(ns, "path");      // path swept so far
    const parcelEl = document.createElementNS(ns, "circle");   // the parcel
    const velEl = document.createElementNS(ns, "line");        // velocity arrow
    const corEl = document.createElementNS(ns, "line");        // Coriolis-force arrow

    // ── Readout ─────────────────────────────────────────
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    // ── Legend ──────────────────────────────────────────
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      `<span><span style="display:inline-block;width:24px;height:2px;background:${ACCENT};vertical-align:middle;margin-right:0.35em"></span>inertial circle</span>` +
      `<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${WARM};vertical-align:middle;margin-right:0.35em"></span>parcel</span>` +
      `<span><span style="display:inline-block;width:24px;height:2px;background:${ACCENT_DEEP};vertical-align:middle;margin-right:0.35em"></span>velocity</span>` +
      `<span><span style="display:inline-block;width:24px;height:2px;background:${GOLD};vertical-align:middle;margin-right:0.35em"></span>Coriolis force</span>`;
    host.appendChild(legend);

    // ── State that depends on the controls ──────────────
    // Real-world geometry of the inertial circle, recomputed on input.
    let f = 0;          // Coriolis parameter, s^-1
    let R_m = 0;        // inertial radius V/f, metres
    let T_i = 0;        // inertial period 2π/f, seconds
    let metresPerPx = 1;
    let phase0 = 0;     // angle (rad) of the START point on the circle
    // Circle CENTRE in metres, relative to the start point at map centre.
    // Start velocity is due EAST (u0 = V, v0 = 0). For clockwise motion the
    // centre sits to the parcel's RIGHT, i.e. due SOUTH of the start point.
    let cxM = 0, cyM = 0;

    let running = true;
    let tSim = 0;          // simulated seconds elapsed
    let lastReal = null;   // wall-clock timestamp of previous frame

    const SIM_SPEEDUP = 1800;   // 1 real second ≈ 30 simulated minutes

    function recompute() {
      const phiDeg = latCtl.value();
      const V = spdCtl.value();
      const sinphi = Math.sin(phiDeg * DEG);
      f = 2 * OMEGA * sinphi;                 // s^-1
      R_m = V / f;                            // metres
      T_i = (2 * Math.PI) / f;                // seconds

      // Pin the map scale to the LARGEST circle the slider can make at this
      // speed — the one at the minimum latitude (smallest f). That reference
      // is independent of the current φ, so raising φ now visibly TIGHTENS the
      // drawn circle: its on-screen radius is (sin φ_min / sin φ) · FIT·PLOT_R,
      // and shrinks as φ rises. (Per-φ autoscaling would have pinned every
      // circle to the same size and hidden the effect.)
      // The circle's centre sits one radius SOUTH of the start point, which is
      // at canvas centre (CY); the circle therefore spans 2·r_px downward, so
      // it fits only if 2·r_px ≤ H − CY = 180 px, i.e. r_px ≤ 90. FIT = 0.55
      // gives r_px ≈ 82 px at φ_min and keeps the whole loop inside the SVG.
      const FIT = 0.55;
      const R_ref = V / (2 * OMEGA * Math.sin(LAT_MIN * DEG));
      metresPerPx = R_ref / (PLOT_R * FIT);

      // Start at map centre, velocity due east. Centre of the circle is one
      // radius to the parcel's right (south) → +y in metres means north, so
      // south is -y. Place centre due south of the start point.
      cxM = 0;
      cyM = -R_m;          // metres: centre is south of start
      // Start point sits due NORTH of the centre → phase angle measured from
      // centre is +90° (pointing north).
      phase0 = Math.PI / 2;

      tSim = 0;
      drawStatic();
      updateReadout(V);
    }

    // Parcel position (metres, relative to map centre = start point) at sim time t.
    // Clockwise sweep: angle decreases with time.  Position on circle of centre
    // (cxM, cyM) and radius R_m, starting at phase0.
    function posAt(t) {
      const ang = phase0 - 2 * Math.PI * (t / T_i);   // clockwise → subtract
      const xM = cxM + R_m * Math.cos(ang);
      const yM = cyM + R_m * Math.sin(ang);
      return { xM, yM, ang };
    }

    // metres (east +x, north +y) → SVG pixels (y down)
    function toPx(xM, yM) {
      return { px: CX + xM / metresPerPx, py: CY - yM / metresPerPx };
    }

    function drawStatic() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // compass rose / axes through the centre
      addLine(svg, CX - PLOT_R, CY, CX + PLOT_R, CY, RULE, 1);
      addLine(svg, CX, CY - PLOT_R, CX, CY + PLOT_R, RULE, 1);
      addText(svg, CX + PLOT_R - 2, CY - 6, "E", FAINT, 11, "end");
      addText(svg, CX - PLOT_R + 2, CY - 6, "W", FAINT, 11, "start");
      addText(svg, CX + 6, CY - PLOT_R + 10, "N", FAINT, 11, "start");
      addText(svg, CX + 6, CY + PLOT_R - 2, "S", FAINT, 11, "start");

      // the inertial circle (where the parcel will travel)
      const c = toPx(cxM, cyM);
      circleEl.setAttribute("cx", c.px);
      circleEl.setAttribute("cy", c.py);
      circleEl.setAttribute("r", R_m / metresPerPx);
      circleEl.setAttribute("fill", "none");
      circleEl.setAttribute("stroke", ACCENT);
      circleEl.setAttribute("stroke-width", "1.4");
      circleEl.setAttribute("stroke-dasharray", "4 4");
      svg.appendChild(circleEl);

      // start marker
      const s = toPx(0, 0);
      addDot(svg, s.px, s.py, 2.5, FAINT);
      addText(svg, s.px + 7, s.py - 7, "start", FAINT, 10, "start");

      // trail (built up during animation)
      trailEl.setAttribute("fill", "none");
      trailEl.setAttribute("stroke", WARM);
      trailEl.setAttribute("stroke-width", "2");
      trailEl.setAttribute("stroke-opacity", "0.55");
      trailEl.setAttribute("d", "");
      svg.appendChild(trailEl);

      // Coriolis-force arrow (drawn under velocity)
      corEl.setAttribute("stroke", GOLD);
      corEl.setAttribute("stroke-width", "2");
      svg.appendChild(corEl);

      // velocity arrow
      velEl.setAttribute("stroke", ACCENT_DEEP);
      velEl.setAttribute("stroke-width", "2");
      svg.appendChild(velEl);

      // parcel
      parcelEl.setAttribute("r", "5");
      parcelEl.setAttribute("fill", WARM);
      parcelEl.setAttribute("stroke", "#fff");
      parcelEl.setAttribute("stroke-width", "1.2");
      svg.appendChild(parcelEl);
    }

    function updateReadout(V) {
      const T_h = T_i / 3600;
      const R_km = R_m / 1000;
      readout.innerHTML =
        `f = <strong style="color:${ACCENT_DEEP}">${f.toExponential(2)}</strong> s⁻¹` +
        ` &nbsp;·&nbsp; radius V/f = <strong style="color:${ACCENT_DEEP}">${R_km.toFixed(0)}</strong> km` +
        ` &nbsp;·&nbsp; period T<sub>i</sub> = 2π/f = <strong style="color:${ACCENT_DEEP}">${T_h.toFixed(1)}</strong> h`;
    }

    // ── Animation loop ──────────────────────────────────
    function frame(now) {
      if (lastReal === null) lastReal = now;
      const dtReal = Math.min(0.05, (now - lastReal) / 1000); // clamp big gaps
      lastReal = now;
      if (running) {
        tSim += dtReal * SIM_SPEEDUP;
        if (tSim > T_i) tSim -= T_i;   // loop one full circle
      }
      render();
      requestAnimationFrame(frame);
    }

    function render() {
      const V = spdCtl.value();
      const p = posAt(tSim);
      const px = toPx(p.xM, p.yM);

      parcelEl.setAttribute("cx", px.px);
      parcelEl.setAttribute("cy", px.py);

      // Velocity is tangent to the circle; for clockwise motion the velocity
      // direction is the position angle minus 90°. Encode as screen vector.
      const velAng = p.ang - Math.PI / 2;     // math angle of velocity
      // map angle (math, y up) → screen components (y down)
      const vxs = Math.cos(velAng), vys = -Math.sin(velAng);
      const vLen = 34;
      drawArrow(velEl, px.px, px.py, px.px + vxs * vLen, px.py + vys * vLen);

      // Coriolis force = -f k×u, magnitude f·V, pointing to the RIGHT of the
      // velocity (toward the circle centre). Right of velocity = velAng - 90°.
      const corAng = velAng - Math.PI / 2;
      const cxs = Math.cos(corAng), cys = -Math.sin(corAng);
      const cLen = 26;
      drawArrow(corEl, px.px, px.py, px.px + cxs * cLen, px.py + cys * cLen);

      // grow the trail up to the current sim time
      const Npts = 90;
      let d = "";
      const frac = tSim / T_i;
      for (let i = 0; i <= Npts; i++) {
        const t = (i / Npts) * frac * T_i;
        const q = posAt(t);
        const qp = toPx(q.xM, q.yM);
        d += (i === 0 ? "M " : " L ") + qp.px.toFixed(1) + " " + qp.py.toFixed(1);
      }
      trailEl.setAttribute("d", d);
    }

    // ── Wiring ──────────────────────────────────────────
    latCtl.input.addEventListener("input", recompute);
    spdCtl.input.addEventListener("input", recompute);
    btn.addEventListener("click", () => {
      running = !running;
      btn.textContent = running ? "Pause" : "Play";
    });

    recompute();
    requestAnimationFrame(frame);
  }

  // ── Small DOM / SVG helpers ───────────────────────────
  function makeSlider(label, min, max, val, unit) {
    const wrap = document.createElement("label");
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.82rem";
    wrap.style.color = INK;
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.5rem";

    const span = document.createElement("span");
    const valSpan = document.createElement("span");
    valSpan.style.fontWeight = "600";
    valSpan.style.color = ACCENT;
    valSpan.textContent = val + unit;
    span.appendChild(document.createTextNode(label + " "));
    span.appendChild(valSpan);

    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.value = String(val);
    input.step = "1";
    input.style.width = "120px";
    input.style.accentColor = ACCENT;
    input.addEventListener("input", () => { valSpan.textContent = input.value + unit; });

    wrap.appendChild(span);
    wrap.appendChild(input);
    return { wrap, input, value: () => +input.value };
  }

  function styleBtn(b) {
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.78rem";
    b.style.padding = "0.32rem 0.85rem";
    b.style.border = "1px solid " + ACCENT;
    b.style.background = CARD;
    b.style.color = ACCENT;
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    b.style.transition = "background 100ms, color 100ms";
    b.addEventListener("mouseenter", () => { b.style.background = ACCENT; b.style.color = "#fff"; });
    b.addEventListener("mouseleave", () => { b.style.background = CARD; b.style.color = ACCENT; });
  }

  function addLine(svg, x1, y1, x2, y2, stroke, w) {
    const ns = "http://www.w3.org/2000/svg";
    const l = document.createElementNS(ns, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", stroke); l.setAttribute("stroke-width", w);
    svg.appendChild(l);
    return l;
  }

  function addText(svg, x, y, str, fill, size, anchor) {
    const ns = "http://www.w3.org/2000/svg";
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("fill", fill);
    t.setAttribute("font-family", "Inter, sans-serif");
    t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", anchor || "start");
    t.textContent = str;
    svg.appendChild(t);
    return t;
  }

  function addDot(svg, x, y, r, fill) {
    const ns = "http://www.w3.org/2000/svg";
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y);
    c.setAttribute("r", r); c.setAttribute("fill", fill);
    svg.appendChild(c);
    return c;
  }

  // Draw an arrow as a line with a small V-head, all on the given <line> element's
  // parent. We approximate the head by appending two short lines once.
  function drawArrow(lineEl, x1, y1, x2, y2) {
    lineEl.setAttribute("x1", x1); lineEl.setAttribute("y1", y1);
    lineEl.setAttribute("x2", x2); lineEl.setAttribute("y2", y2);
    // arrowhead via marker-like short strokes stored on the element id
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const hl = 6, spread = 0.5;
    const stroke = lineEl.getAttribute("stroke");
    const parent = lineEl.parentNode;
    if (!parent) return;
    // reuse two child <line>s tagged to this arrow
    let h1 = lineEl.__h1, h2 = lineEl.__h2;
    const ns = "http://www.w3.org/2000/svg";
    if (!h1) {
      h1 = document.createElementNS(ns, "line"); h1.setAttribute("stroke-width", "2");
      h2 = document.createElementNS(ns, "line"); h2.setAttribute("stroke-width", "2");
      lineEl.__h1 = h1; lineEl.__h2 = h2;
    }
    h1.setAttribute("stroke", stroke); h2.setAttribute("stroke", stroke);
    h1.setAttribute("x1", x2); h1.setAttribute("y1", y2);
    h1.setAttribute("x2", x2 - hl * Math.cos(ang - spread));
    h1.setAttribute("y2", y2 - hl * Math.sin(ang - spread));
    h2.setAttribute("x1", x2); h2.setAttribute("y1", y2);
    h2.setAttribute("x2", x2 - hl * Math.cos(ang + spread));
    h2.setAttribute("y2", y2 - hl * Math.sin(ang + spread));
    if (h1.parentNode !== parent) { parent.appendChild(h1); parent.appendChild(h2); }
  }
})();
