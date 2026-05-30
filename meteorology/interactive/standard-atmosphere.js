/* Interactive · The US/ICAO Standard Atmosphere (1976), integrated.
   Piecewise-linear T(z) over geopotential height; hydrostatic balance solved
   EXACTLY per layer; rho from the ideal gas law. A draggable altitude marker
   reads off T, p, rho. An optional surface-temperature offset shifts every
   layer base.  Mounts into any [data-widget='standard-atmosphere'] section. */

(function () {
  "use strict";

  // ── Palette ────────────────────────────────────────────
  const ACCENT = "#2b5c8a";
  const ACCENT_DEEP = "#173a5a";
  const WARM = "#b8651a";
  const GOLD = "#c08a2d";
  const FAINT = "#8e9a9e";
  const RULE = "#dde3ea";
  const INK = "#1c1f21";
  const MUTED = "#5f6d72";
  const CARD = "#ffffff";

  // ── Physical constants ─────────────────────────────────
  const g = 9.80665;      // m s^-2 (standard gravity used by the 1976 model)
  const Rd = 287.05;      // J kg^-1 K^-1 (specific gas constant, dry air)
  const P0 = 1013.25;     // hPa, sea-level standard pressure
  const T0 = 288.15;      // K, sea-level standard temperature

  // 1976 layers as (base geopotential height [km], lapse dT/dz [K/km]).
  // Lapse is dT/dz, so the standard 6.5 K/km *fall* is -6.5.
  const LAYERS = [
    { z0: 0,  L: -6.5 },   // troposphere
    { z0: 11, L: 0.0 },    // tropopause / lower stratosphere (isothermal)
    { z0: 20, L: 1.0 },    // mid stratosphere
    { z0: 32, L: 2.8 },    // upper stratosphere
    { z0: 47, L: 0.0 },    // stratopause (isothermal cap for the plot)
  ];
  const Z_TOP = 50;        // km, top of the displayed column

  // Build absolute base (T, p) for each layer by integrating upward.
  // Returns an array parallel to LAYERS with {z0, L, Tb, pb}.
  function buildProfile(dT) {
    const out = [];
    let Tb = T0 + dT;
    let pb = P0;
    for (let i = 0; i < LAYERS.length; i++) {
      const { z0, L } = LAYERS[i];
      out.push({ z0, L, Tb, pb });
      // Advance base to the next layer top (this layer's top = next z0).
      const zTop = (i + 1 < LAYERS.length) ? LAYERS[i + 1].z0 : Z_TOP;
      const dz = (zTop - z0) * 1000; // m
      const Ttop = Tb + L * (zTop - z0);
      pb = pressureInLayer(pb, Tb, L, dz, Ttop);
      Tb = Ttop;
    }
    return out;
  }

  // Pressure at the top of a layer given its base pressure pb, base temp Tb,
  // lapse L (K/km), thickness dz (m), and top temp Ttop.
  function pressureInLayer(pb, Tb, L, dz, Ttop) {
    if (Math.abs(L) < 1e-9) {
      // Isothermal: p = pb * exp(-g dz / (Rd T))
      return pb * Math.exp(-g * dz / (Rd * Tb));
    }
    // Constant lapse: p = pb * (T/Tb)^(-g/(Rd*L')), L' in K/m.
    const Lm = L / 1000; // K/m
    return pb * Math.pow(Ttop / Tb, -g / (Rd * Lm));
  }

  // State at an arbitrary geopotential height z (km) for a profile.
  function stateAt(profile, zkm) {
    let i = profile.length - 1;
    for (let k = 0; k < profile.length; k++) {
      const top = (k + 1 < profile.length) ? profile[k + 1].z0 : Z_TOP + 1;
      if (zkm < top) { i = k; break; }
    }
    const lay = profile[i];
    const dz = (zkm - lay.z0) * 1000; // m
    const T = lay.Tb + lay.L * (zkm - lay.z0);
    const p = pressureInLayer(lay.pb, lay.Tb, lay.L, dz, T);
    const rho = (p * 100) / (Rd * T); // p in Pa → rho in kg m^-3
    return { T, p, rho };
  }

  // ── Mount ──────────────────────────────────────────────
  document.querySelectorAll("[data-widget='standard-atmosphere']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.4rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const offWrap = labelWrap();
    offWrap.firstChild.innerHTML =
      `surface offset <span data-role="off-val" style="font-weight:600;color:${ACCENT}">+0</span> K`;
    const offset = document.createElement("input");
    offset.type = "range";
    offset.min = "-20"; offset.max = "20"; offset.value = "0"; offset.step = "1";
    offset.style.width = "150px";
    offset.style.accentColor = ACCENT;
    offWrap.appendChild(offset);
    controls.appendChild(offWrap);

    const altWrap = labelWrap();
    altWrap.firstChild.innerHTML =
      `altitude <span data-role="alt-val" style="font-weight:600;color:${WARM}">8.0</span> km`;
    const alt = document.createElement("input");
    alt.type = "range";
    alt.min = "0"; alt.max = String(Z_TOP); alt.value = "8"; alt.step = "0.1";
    alt.style.width = "150px";
    alt.style.accentColor = WARM;
    altWrap.appendChild(alt);
    controls.appendChild(altWrap);

    // Plot
    const W = 540, Hpx = 360;
    const M = { l: 46, r: 46, t: 16, b: 38 };
    const PW = W - M.l - M.r, PH = Hpx - M.t - M.b;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${Hpx}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", Hpx);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    svg.style.touchAction = "none";
    host.appendChild(svg);

    // Readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.84rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    host.appendChild(readout);

    // Legend
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      swatch(WARM, "temperature T") +
      swatch(ACCENT, "pressure p (log)") +
      swatch(GOLD, "density ρ");
    host.appendChild(legend);

    // Scales. y = altitude (km). x is normalized 0..1 per quantity.
    const yScale = z => M.t + (1 - z / Z_TOP) * PH;
    const yInv = py => Z_TOP * (1 - (py - M.t) / PH);
    const xScale = u => M.l + u * PW; // u in [0,1]

    // Fixed plotting ranges so axes are stable as the offset changes.
    // T range is widened beyond the slider's reach (surface T can hit 308 K
    // at +20 K offset) so the temperature curve never clamps to the frame.
    const T_MIN = 190, T_MAX = 315;          // K
    const RHO_MAX = 1.30;                     // kg m^-3
    const LOGP_MIN = Math.log(0.5), LOGP_MAX = Math.log(P0); // hPa

    const tU = T => (T - T_MIN) / (T_MAX - T_MIN);
    const rhoU = r => r / RHO_MAX;
    const pU = p => (Math.log(Math.max(p, 0.5)) - LOGP_MIN) / (LOGP_MAX - LOGP_MIN);

    let profile = buildProfile(0);

    function curve(fn, uFn, color, width) {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const z = (i / 120) * Z_TOP;
        const s = stateAt(profile, z);
        pts.push([xScale(clamp01(uFn(fn(s)))), yScale(z)]);
      }
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", makePath(pts));
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", String(width));
      svg.appendChild(path);
    }

    function redraw() {
      const off = +offset.value;
      offWrap.querySelector("[data-role='off-val']").textContent =
        (off >= 0 ? "+" : "") + off;
      profile = buildProfile(off);

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const ns = "http://www.w3.org/2000/svg";

      // Shade troposphere vs stratosphere (boundary = tropopause at 11 km).
      const tropo = rect(M.l, yScale(11), PW, yScale(0) - yScale(11), "#eef3f8");
      svg.appendChild(tropo);
      const strato = rect(M.l, yScale(Z_TOP), PW, yScale(11) - yScale(Z_TOP), "#f6f1e9");
      svg.appendChild(strato);

      // Layer-boundary guides at 11, 20, 32, 47 km.
      [11, 20, 32, 47].forEach(zb => {
        const ln = line(M.l, yScale(zb), M.l + PW, yScale(zb), RULE, 0.7);
        ln.setAttribute("stroke-dasharray", "2 3");
        svg.appendChild(ln);
      });

      // Region labels.
      svg.appendChild(text(M.l + 6, yScale(5) + 3, "troposphere", 10, FAINT, "start"));
      svg.appendChild(text(M.l + 6, yScale(30) + 3, "stratosphere", 10, FAINT, "start"));

      // Altitude axis (left).
      [0, 10, 20, 30, 40, 50].forEach(zt => {
        svg.appendChild(text(M.l - 7, yScale(zt) + 3.5, String(zt), 10, FAINT, "end"));
      });
      svg.appendChild(rotLabel(14, M.t + PH / 2, "altitude z (km)"));

      // Bottom axis: temperature scale (warm), in K.
      [200, 225, 250, 275, 300].forEach(tt => {
        svg.appendChild(text(xScale(tU(tt)), Hpx - 22, String(tt), 9.5, WARM, "middle"));
      });
      svg.appendChild(text(M.l + PW / 2, Hpx - 6, "T (K, warm)  ·  p, ρ scaled", 10, MUTED, "middle"));

      // The three curves.
      curve(s => s.T, tU, WARM, 2.0);
      curve(s => s.p, pU, ACCENT, 2.0);
      curve(s => s.rho, rhoU, GOLD, 2.0);

      // Altitude marker.
      const zk = +alt.value;
      altWrap.querySelector("[data-role='alt-val']").textContent = zk.toFixed(1);
      const ym = yScale(zk);
      const mline = line(M.l, ym, M.l + PW, ym, ACCENT_DEEP, 1.1);
      svg.appendChild(mline);
      const s = stateAt(profile, zk);
      // Dots where each curve crosses the marker.
      dot(svg, xScale(clamp01(tU(s.T))), ym, WARM);
      dot(svg, xScale(clamp01(pU(s.p))), ym, ACCENT);
      dot(svg, xScale(clamp01(rhoU(s.rho))), ym, GOLD);

      readout.innerHTML =
        `at ${zk.toFixed(1)} km:  ` +
        `<strong style="color:${WARM}">T = ${s.T.toFixed(1)} K</strong>` +
        ` (${(s.T - 273.15).toFixed(1)} °C) &nbsp;·&nbsp; ` +
        `<strong style="color:${ACCENT_DEEP}">p = ${fmtP(s.p)} hPa</strong> &nbsp;·&nbsp; ` +
        `<strong style="color:${GOLD}">ρ = ${s.rho.toFixed(3)} kg m⁻³</strong>`;

      // Local scale height H = Rd T / g, in km — a nice derived number.
      const Hkm = (Rd * s.T / g) / 1000;
      readout.innerHTML += `<br><span style="color:${FAINT}">local scale height H = R<sub>d</sub>T/g = ${Hkm.toFixed(2)} km</span>`;
    }

    // Dragging on the SVG sets altitude.
    function setAltFromEvent(ev) {
      const rectB = svg.getBoundingClientRect();
      const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
      const py = (cy - rectB.top) * (Hpx / rectB.height);
      let z = yInv(py);
      z = Math.max(0, Math.min(Z_TOP, z));
      alt.value = z.toFixed(1);
      redraw();
    }
    let dragging = false;
    svg.addEventListener("pointerdown", ev => { dragging = true; setAltFromEvent(ev); });
    svg.addEventListener("pointermove", ev => { if (dragging) setAltFromEvent(ev); });
    window.addEventListener("pointerup", () => { dragging = false; });

    offset.addEventListener("input", redraw);
    alt.addEventListener("input", redraw);

    redraw();
  }

  // ── Small helpers ──────────────────────────────────────
  function labelWrap() {
    const w = document.createElement("label");
    w.style.fontFamily = "Inter, sans-serif";
    w.style.fontSize = "0.82rem";
    w.style.color = INK;
    w.style.display = "flex";
    w.style.alignItems = "center";
    w.style.gap = "0.5rem";
    const span = document.createElement("span");
    w.appendChild(span);
    return w;
  }

  function swatch(color, label) {
    return `<span><span style="display:inline-block;width:24px;height:2px;` +
      `background:${color};vertical-align:middle;margin-right:0.35em"></span>${label}</span>`;
  }

  function clamp01(u) { return Math.max(0, Math.min(1, u)); }

  function fmtP(p) {
    if (p >= 100) return p.toFixed(0);
    if (p >= 10) return p.toFixed(1);
    return p.toFixed(2);
  }

  function makePath(pts) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return d;
  }

  function line(x1, y1, x2, y2, stroke, w) {
    const ns = "http://www.w3.org/2000/svg";
    const el = document.createElementNS(ns, "line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    el.setAttribute("stroke", stroke); el.setAttribute("stroke-width", String(w));
    return el;
  }

  function rect(x, y, w, h, fill) {
    const ns = "http://www.w3.org/2000/svg";
    const el = document.createElementNS(ns, "rect");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("width", w); el.setAttribute("height", h);
    el.setAttribute("fill", fill);
    return el;
  }

  function text(x, y, str, size, fill, anchor) {
    const ns = "http://www.w3.org/2000/svg";
    const el = document.createElementNS(ns, "text");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-family", "Inter, sans-serif");
    el.setAttribute("font-size", String(size));
    el.setAttribute("fill", fill);
    el.textContent = str;
    return el;
  }

  function rotLabel(x, y, str) {
    const ns = "http://www.w3.org/2000/svg";
    const el = document.createElementNS(ns, "text");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("text-anchor", "middle");
    el.setAttribute("font-family", "Source Serif 4, serif");
    el.setAttribute("font-style", "italic");
    el.setAttribute("font-size", "12");
    el.setAttribute("fill", MUTED);
    el.setAttribute("transform", `rotate(-90, ${x}, ${y})`);
    el.textContent = str;
    return el;
  }

  function dot(svg, x, y, fill) {
    const ns = "http://www.w3.org/2000/svg";
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", "4");
    c.setAttribute("fill", fill);
    c.setAttribute("stroke", "#fff"); c.setAttribute("stroke-width", "1");
    svg.appendChild(c);
  }
})();
