/* Interactive · The Ekman spiral hodograph.
   Constant-K_m Ekman solution:
     u(z) = u_g (1 - e^{-z/d} cos(z/d))
     v(z) = u_g  e^{-z/d} sin(z/d)
     d    = sqrt(2 K_m / f),   f = 2 Omega sin(phi)
   Plots the tip of the wind vector (u,v) as height z rises from 0; it spirals
   from the 45-deg-deflected surface wind out to the geostrophic point (u_g, 0).
   On-screen d and surface-deflection angle are computed from the formulas.
   Mounts into any [data-widget='ekman-spiral'] section. */

(function () {
  "use strict";

  var W = 520, H = 360;
  var M = { l: 46, r: 18, t: 18, b: 40 };
  var PW = W - M.l - M.r, PH = H - M.t - M.b;

  var ACCENT = "#2b5c8a";
  var ACCENT_DEEP = "#173a5a";
  var WARM = "#b8651a";
  var GOLD = "#c08a2d";
  var FAINT = "#8e9a9e";
  var RULE = "#dde3ea";
  var INK = "#1c1f21";
  var MUTED = "#5f6d72";
  var CARD = "#ffffff";

  var OMEGA = 7.292e-5;     // Earth angular rate, 1/s
  var SVGNS = "http://www.w3.org/2000/svg";

  document.querySelectorAll("[data-widget='ekman-spiral']").forEach(function (section) {
    var host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // ── Controls ────────────────────────────────────────
    var controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    var km  = slider(controls, "Kₘ (m² s⁻¹)", 1, 25, 0.5, 5);
    var ug  = slider(controls, "u_g (m s⁻¹)", 2, 25, 1, 10);
    var lat = slider(controls, "latitude (°N)", 10, 80, 1, 45);

    // ── Plot ────────────────────────────────────────────
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // ── Readout ─────────────────────────────────────────
    var readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    host.appendChild(readout);

    // ── Legend ──────────────────────────────────────────
    var legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.1rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      "<span>" + swatch(ACCENT, "line") + "wind hodograph</span>" +
      "<span>" + swatch(GOLD, "dot") + "z = d, 2d, 3d</span>" +
      "<span>" + swatch(WARM, "dot") + "surface wind (z = 0)</span>" +
      "<span>" + swatch(ACCENT_DEEP, "tri") + "geostrophic (u_g, 0)</span>";
    host.appendChild(legend);

    function redraw() {
      var Km = +km.input.value;
      var Ug = +ug.input.value;
      var phi = +lat.input.value * Math.PI / 180;
      var f = 2 * OMEGA * Math.sin(phi);
      var d = Math.sqrt(2 * Km / f);

      km.val.textContent = Km.toFixed(1);
      ug.val.textContent = Ug.toFixed(0);
      lat.val.textContent = (+lat.input.value).toFixed(0);

      render(svg, Ug, d);

      // Surface deflection angle from the formula, evaluated just above ground
      // (the analytic small-z limit is exactly atan(v/u) -> 45 deg).
      var zs = 1e-4 * d;
      var us = Ug * (1 - Math.exp(-zs / d) * Math.cos(zs / d));
      var vs = Ug * Math.exp(-zs / d) * Math.sin(zs / d);
      var ang = Math.atan2(vs, us) * 180 / Math.PI;

      readout.innerHTML =
        "Ekman depth d = <strong style='color:" + ACCENT_DEEP + "'>" + d.toFixed(0) + " m</strong>" +
        " &nbsp;·&nbsp; layer top πd = <strong style='color:" + ACCENT_DEEP + "'>" + (Math.PI * d).toFixed(0) + " m</strong>" +
        " &nbsp;·&nbsp; f = " + f.toExponential(2) + " s⁻¹" +
        " &nbsp;·&nbsp; surface wind <strong style='color:" + WARM + "'>" + ang.toFixed(1) + "°</strong> left of geostrophic";
    }

    km.input.addEventListener("input", redraw);
    ug.input.addEventListener("input", redraw);
    lat.input.addEventListener("input", redraw);

    redraw();
  }

  // ── Render the hodograph in the (u, v) plane ──────────
  function render(svg, Ug, d) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Axes span: u in [-0.1, 1.15]*Ug, v in [-0.05, 0.55]*Ug (the spiral lives here).
    // Use symmetric-ish plotting with the geostrophic point near the right.
    var uMin = -0.12 * Ug, uMax = 1.18 * Ug;
    var vMin = -0.30 * Ug, vMax = 0.62 * Ug;
    // Guard degenerate Ug.
    if (uMax - uMin < 1e-6) { uMax = uMin + 1; }
    if (vMax - vMin < 1e-6) { vMax = vMin + 1; }

    var xS = function (u) { return M.l + (u - uMin) / (uMax - uMin) * PW; };
    var yS = function (v) { return M.t + (vMax - v) / (vMax - vMin) * PH; };

    // Zero axes
    axisLine(svg, xS(uMin), yS(0), xS(uMax), yS(0));   // v = 0
    axisLine(svg, xS(0), yS(vMin), xS(0), yS(vMax));   // u = 0

    // Axis tick labels (u along bottom, v along left)
    tickLabel(svg, xS(Ug), yS(vMin) + 14, Ug.toFixed(0), "middle");
    tickLabel(svg, xS(0) - 5, yS(vMin) + 14, "0", "end");
    tickLabel(svg, xS(0) - 8, yS(0) + 3.5, "0", "end");

    // Axis variable labels (italic serif)
    varLabel(svg, M.l + PW / 2, H - 6, "u  (eastward)");
    varLabelRot(svg, 14, M.t + PH / 2, "v  (northward)");

    // ── The spiral: sample z from 0 to ~3.3 d densely ──
    var pts = [];
    var zMax = 3.3 * d;
    var Nz = 240;
    for (var i = 0; i <= Nz; i++) {
      var z = zMax * i / Nz;
      var u = Ug * (1 - Math.exp(-z / d) * Math.cos(z / d));
      var v = Ug * Math.exp(-z / d) * Math.sin(z / d);
      pts.push([xS(u), yS(v)]);
    }
    var path = document.createElementNS(SVGNS, "path");
    path.setAttribute("d", polyPath(pts));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", ACCENT);
    path.setAttribute("stroke-width", "1.9");
    svg.appendChild(path);

    // Geostrophic target point (triangle) at (Ug, 0)
    triMarker(svg, xS(Ug), yS(0), ACCENT_DEEP);

    // Dashed guide from origin to geostrophic point (the geostrophic direction)
    var guide = document.createElementNS(SVGNS, "line");
    guide.setAttribute("x1", xS(0)); guide.setAttribute("y1", yS(0));
    guide.setAttribute("x2", xS(Ug)); guide.setAttribute("y2", yS(0));
    guide.setAttribute("stroke", FAINT);
    guide.setAttribute("stroke-width", "0.8");
    guide.setAttribute("stroke-dasharray", "3 3");
    svg.insertBefore(guide, path);

    // Marked heights z = d, 2d, 3d (gold dots + labels)
    [1, 2, 3].forEach(function (n) {
      var z = n * d;
      var u = Ug * (1 - Math.exp(-z / d) * Math.cos(z / d));
      var v = Ug * Math.exp(-z / d) * Math.sin(z / d);
      var cx = xS(u), cy = yS(v);
      dot(svg, cx, cy, 3.6, GOLD);
      var lbl = document.createElementNS(SVGNS, "text");
      lbl.setAttribute("x", cx + 6);
      lbl.setAttribute("y", cy - 5);
      lbl.setAttribute("font-family", "Inter, sans-serif");
      lbl.setAttribute("font-size", "9.5");
      lbl.setAttribute("fill", GOLD);
      lbl.textContent = (n === 1 ? "d" : n + "d");
      svg.appendChild(lbl);
    });

    // Surface wind (z = 0) — warm dot + arrow from origin
    var arrow = document.createElementNS(SVGNS, "line");
    arrow.setAttribute("x1", xS(0)); arrow.setAttribute("y1", yS(0));
    // near-surface point (small z) to show the 45-deg direction visibly
    var zs = 0.18 * d;
    var us = Ug * (1 - Math.exp(-zs / d) * Math.cos(zs / d));
    var vs = Ug * Math.exp(-zs / d) * Math.sin(zs / d);
    arrow.setAttribute("x2", xS(us)); arrow.setAttribute("y2", yS(vs));
    arrow.setAttribute("stroke", WARM);
    arrow.setAttribute("stroke-width", "1.4");
    arrow.setAttribute("stroke-dasharray", "2 2");
    svg.appendChild(arrow);
    dot(svg, xS(0), yS(0), 4.0, WARM);

    // Origin label
    tickLabel(svg, xS(0) + 8, yS(0) - 6, "z = 0", "start", WARM);
  }

  // ── small SVG helpers ─────────────────────────────────
  function axisLine(svg, x1, y1, x2, y2) {
    var l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", RULE);
    l.setAttribute("stroke-width", "1");
    svg.appendChild(l);
  }

  function dot(svg, cx, cy, r, fill) {
    var c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    c.setAttribute("fill", fill);
    c.setAttribute("stroke", "#fff");
    c.setAttribute("stroke-width", "0.9");
    svg.appendChild(c);
  }

  function triMarker(svg, cx, cy, fill) {
    var s = 5;
    var p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d",
      "M " + cx + " " + (cy - s) +
      " L " + (cx + s) + " " + (cy + s) +
      " L " + (cx - s) + " " + (cy + s) + " Z");
    p.setAttribute("fill", fill);
    p.setAttribute("stroke", "#fff");
    p.setAttribute("stroke-width", "0.9");
    svg.appendChild(p);
  }

  function tickLabel(svg, x, y, txt, anchor, fill) {
    var t = document.createElementNS(SVGNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", anchor || "middle");
    t.setAttribute("font-family", "Inter, sans-serif");
    t.setAttribute("font-size", "10");
    t.setAttribute("fill", fill || FAINT);
    t.textContent = txt;
    svg.appendChild(t);
  }

  function varLabel(svg, x, y, txt) {
    var t = document.createElementNS(SVGNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-family", "Source Serif 4, serif");
    t.setAttribute("font-style", "italic");
    t.setAttribute("font-size", "12");
    t.setAttribute("fill", MUTED);
    t.textContent = txt;
    svg.appendChild(t);
  }

  function varLabelRot(svg, x, y, txt) {
    var t = document.createElementNS(SVGNS, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-family", "Source Serif 4, serif");
    t.setAttribute("font-style", "italic");
    t.setAttribute("font-size", "12");
    t.setAttribute("fill", MUTED);
    t.setAttribute("transform", "rotate(-90, " + x + ", " + y + ")");
    t.textContent = txt;
    svg.appendChild(t);
  }

  function polyPath(pts) {
    if (!pts.length) return "";
    var d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
    for (var i = 1; i < pts.length; i++) {
      d += " L " + pts[i][0].toFixed(2) + " " + pts[i][1].toFixed(2);
    }
    return d;
  }

  // Build a labeled slider; returns { input, val }.
  function slider(parent, label, min, max, step, value) {
    var wrap = document.createElement("label");
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.8rem";
    wrap.style.color = INK;
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.45rem";

    var span = document.createElement("span");
    span.innerHTML = label + " <span style='font-weight:600;color:" + ACCENT + "'>" + value + "</span>";
    var val = span.querySelector("span");

    var input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.style.width = "120px";
    input.style.accentColor = ACCENT;

    wrap.appendChild(span);
    wrap.appendChild(input);
    parent.appendChild(wrap);
    return { input: input, val: val };
  }

  function swatch(color, kind) {
    if (kind === "line") {
      return "<span style='display:inline-block;width:22px;height:2px;background:" +
        color + ";vertical-align:middle;margin-right:0.35em'></span>";
    }
    if (kind === "tri") {
      return "<span style='display:inline-block;width:0;height:0;border-left:5px solid transparent;" +
        "border-right:5px solid transparent;border-bottom:9px solid " + color +
        ";vertical-align:middle;margin-right:0.35em'></span>";
    }
    return "<span style='display:inline-block;width:8px;height:8px;border-radius:50%;background:" +
      color + ";vertical-align:middle;margin-right:0.35em'></span>";
  }
})();
