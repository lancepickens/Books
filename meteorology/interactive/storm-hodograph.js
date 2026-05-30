/* Interactive · Storm hodograph — Chapter VIII, Moist Convection and Mesoscale Storms.
   Plots a height-varying wind profile (u, v) on the u-v plane with clockwise-turning
   low levels. The user drags the storm-motion point c (or snaps it to the Bunkers
   right-mover). The widget computes the REAL chapter physics:
     - 0-6 km bulk shear magnitude  |V(6km) - V(0)|
     - 0-3 km storm-relative helicity  SRH = INT (V - c) . (k x dV/dz) dz
       evaluated as the discrete swept-area integral along the hodograph,
     - and classifies the likely storm mode from shear + SRH thresholds.
   Mounts into any [data-widget='storm-hodograph'] section. */

(function () {
  "use strict";

  // ── palette ────────────────────────────────────────────
  var ACCENT = "#2b5c8a";
  var ACCENT_DEEP = "#173a5a";
  var WARM = "#b8651a";
  var GOLD = "#c08a2d";
  var FAINT = "#8e9a9e";
  var RULE = "#dde3ea";
  var INK = "#1c1f21";
  var MUTED = "#5f6d72";
  var CARD = "#ffffff";

  // ── geometry ───────────────────────────────────────────
  var W = 520, H = 380;
  var CX = 232, CY = 196;          // plot centre (origin of u-v plane), px
  var SCALE = 5.4;                  // px per m/s
  var RING_MAX = 30;               // outermost ring, m/s

  // ── wind profile model ─────────────────────────────────
  // Levels every 0.5 km up to 6 km. Low levels turn clockwise (a backed surface
  // wind veering with height); a "curve" control sets how much the lowest 3 km bend.
  var Z = [];
  for (var zi = 0; zi <= 6; zi += 0.5) Z.push(zi);

  // Build (u, v) at each height z (km) given low-level curvature parameter curv in [0,1].
  // Anchors: surface ~ from the SE (light), 3 km westerly, 6 km strong westerly.
  // The 0-3 km segment bows out to the RIGHT (a clockwise-turning, veering wind);
  // curv sets how far it bows, so curv=0 is nearly straight (low SRH) and curv=1
  // loops far from the line (high enclosed area, high SRH). Above 3 km the
  // hodograph is a straight segment to the 6 km point.
  var SFC = { u: -3, v: -6 };       // surface wind (light, from the SSE)
  var KM3 = { u: 10, v: 3 };        // 3 km wind (westerly)
  var KM6 = { u: 19, v: 6 };        // 6 km wind (strong westerly)
  function profile(curv) {
    var pts = [];
    // straight chord from surface to 3 km, and its rightward normal
    var chx = KM3.u - SFC.u, chy = KM3.v - SFC.v;
    var clen = Math.sqrt(chx * chx + chy * chy) || 1;
    var nx = -chy / clen, ny = chx / clen;        // left-of-chord normal: bows the
                                                  // 0-3 km curve so the wind veers
                                                  // clockwise with height (NH, +SRH)
    var bow = 11 * curv;                          // peak bow distance, m/s
    for (var i = 0; i < Z.length; i++) {
      var z = Z[i];
      if (z <= 3) {
        var s = z / 3;                            // 0..1 along the low-level layer
        var bx = SFC.u + chx * s, by = SFC.v + chy * s;
        var bump = bow * Math.sin(Math.PI * s);   // 0 at ends, max mid-layer
        pts.push({ z: z, u: bx + nx * bump, v: by + ny * bump });
      } else {
        var r = (z - 3) / 3;                       // 0..1 from 3 km to 6 km
        pts.push({ z: z, u: KM3.u + (KM6.u - KM3.u) * r, v: KM3.v + (KM6.v - KM3.v) * r });
      }
    }
    return pts;
  }

  // 0-6 km bulk shear vector magnitude.
  function bulkShear(pts) {
    var lo = pts[0];
    var hi = pts[pts.length - 1];
    var du = hi.u - lo.u, dv = hi.v - lo.v;
    return Math.sqrt(du * du + dv * dv);
  }

  // 0-3 km storm-relative helicity, discrete form of
  //   SRH = INT (V - c) . (k x dV/dz) dz
  // With k vertical and V=(u,v): (k x dV/dz) = (-dv/dz, du/dz), so per layer
  //   (V-c).(k x dV/dz) dz = -(u-cu) dv + (v-cv) du
  // summed over consecutive levels from the surface to 3 km. This is exactly the
  // signed-swept-area (times -2) reading described in the chapter.
  function srh03(pts, cu, cv) {
    var sum = 0;
    for (var i = 0; i + 1 < pts.length; i++) {
      var a = pts[i], b = pts[i + 1];
      if (a.z >= 3) break;               // only the 0-3 km layer
      var du = b.u - a.u;
      var dv = b.v - a.v;
      // Midpoint storm-relative wind for the layer.
      var um = 0.5 * (a.u + b.u) - cu;
      var vm = 0.5 * (a.v + b.v) - cv;
      sum += vm * du - um * dv;          // (v-cv) du - (u-cu) dv
    }
    return sum;
  }

  // 0-6 km mean wind (for the Bunkers estimate).
  function meanWind(pts) {
    var su = 0, sv = 0;
    for (var i = 0; i < pts.length; i++) { su += pts[i].u; sv += pts[i].v; }
    return { u: su / pts.length, v: sv / pts.length };
  }

  // Bunkers right-mover: 7.5 m/s to the RIGHT of the 0-6 km mean wind,
  // perpendicular to the 0-6 km shear vector.
  function bunkersRight(pts) {
    var mean = meanWind(pts);
    var lo = pts[0], hi = pts[pts.length - 1];
    var sx = hi.u - lo.u, sy = hi.v - lo.v;
    var mag = Math.sqrt(sx * sx + sy * sy) || 1;
    // Rightward normal of the shear vector (clockwise rotation of (sx,sy)).
    var nx = sy / mag, ny = -sx / mag;
    var D = 7.5;
    return { u: mean.u + D * nx, v: mean.v + D * ny };
  }

  function classify(shear, srh) {
    // Threshold guide drawn from the chapter's §3-§5 discussion: shear sets the
    // ceiling on organisation; storm-relative helicity decides rotation. Dragging
    // c onto the curve kills SRH, so even strong shear then reads as a non-rotating
    // multicell — the point of §4.
    if (shear < 12) return { name: "Single cell / pulse", note: "weak shear — short-lived" };
    if (shear < 20) {
      return srh >= 150
        ? { name: "Multicell (rotating)", note: "moderate shear, helical inflow" }
        : { name: "Multicell", note: "moderate shear — clustering" };
    }
    // strong 0-6 km shear
    if (srh >= 250) return { name: "Supercell (tornadic potential)", note: "strong shear + large SRH" };
    if (srh >= 150) return { name: "Supercell", note: "strong shear + helical inflow" };
    if (srh >= 80) return { name: "Supercell (marginal)", note: "strong shear, modest rotation" };
    return { name: "Multicell", note: "shear present but inflow not helical" };
  }

  document.querySelectorAll("[data-widget='storm-hodograph']").forEach(function (section) {
    var host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // ── controls ─────────────────────────────────────────
    var controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    var curvWrap = document.createElement("label");
    curvWrap.style.fontFamily = "Inter, sans-serif";
    curvWrap.style.fontSize = "0.82rem";
    curvWrap.style.color = INK;
    curvWrap.style.display = "flex";
    curvWrap.style.alignItems = "center";
    curvWrap.style.gap = "0.5rem";
    curvWrap.innerHTML = "<span>low-level curvature</span>";
    var slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.value = "70";
    slider.step = "1";
    slider.style.width = "150px";
    slider.style.accentColor = ACCENT;
    curvWrap.appendChild(slider);
    controls.appendChild(curvWrap);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Snap c to Bunkers right-mover";
    styleBtn(btn);
    controls.appendChild(btn);

    // ── svg ──────────────────────────────────────────────
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    svg.style.touchAction = "none";
    host.appendChild(svg);

    // ── readout ──────────────────────────────────────────
    var readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.84rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    // ── legend ───────────────────────────────────────────
    var legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      "<span><span style='display:inline-block;width:24px;height:2px;background:" + ACCENT + ";vertical-align:middle;margin-right:0.35em'></span>wind profile (0–6 km)</span>" +
      "<span><span style='display:inline-block;width:10px;height:10px;border-radius:50%;background:" + ACCENT_DEEP + ";vertical-align:middle;margin-right:0.35em'></span>storm motion c (drag)</span>" +
      "<span><span style='display:inline-block;width:10px;height:10px;background:" + GOLD + ";opacity:0.32;vertical-align:middle;margin-right:0.35em'></span>swept area (∝ SRH)</span>";
    host.appendChild(legend);

    // ── state ────────────────────────────────────────────
    var curv = +slider.value / 100;
    var pts = profile(curv);
    var c = bunkersRight(pts);          // start at the Bunkers right-mover
    var dragging = false;

    // px <-> wind helpers
    function toX(u) { return CX + u * SCALE; }
    function toY(v) { return CY - v * SCALE; }
    function toU(x) { return (x - CX) / SCALE; }
    function toV(y) { return (CY - y) / SCALE; }

    function svgPoint(evt) {
      var r = svg.getBoundingClientRect();
      var sx = W / r.width, sy = H / r.height;
      var cxp = (evt.touches ? evt.touches[0].clientX : evt.clientX) - r.left;
      var cyp = (evt.touches ? evt.touches[0].clientY : evt.clientY) - r.top;
      return { x: cxp * sx, y: cyp * sy };
    }

    function nearC(p) {
      var dx = p.x - toX(c.u), dy = p.y - toY(c.v);
      return dx * dx + dy * dy <= 16 * 16;
    }

    svg.addEventListener("mousedown", function (e) { if (nearC(svgPoint(e))) { dragging = true; e.preventDefault(); } });
    svg.addEventListener("touchstart", function (e) { if (nearC(svgPoint(e))) { dragging = true; e.preventDefault(); } }, { passive: false });
    window.addEventListener("mousemove", function (e) { if (dragging) { moveC(svgPoint(e)); } });
    svg.addEventListener("touchmove", function (e) { if (dragging) { moveC(svgPoint(e)); e.preventDefault(); } }, { passive: false });
    window.addEventListener("mouseup", function () { dragging = false; });
    window.addEventListener("touchend", function () { dragging = false; });

    function moveC(p) {
      var u = toU(p.x), v = toV(p.y);
      var r = Math.sqrt(u * u + v * v);
      if (r > RING_MAX + 4) { u *= (RING_MAX + 4) / r; v *= (RING_MAX + 4) / r; }
      c = { u: u, v: v };
      redraw();
    }

    slider.addEventListener("input", function () {
      curv = +slider.value / 100;
      pts = profile(curv);
      redraw();
    });
    btn.addEventListener("click", function () {
      c = bunkersRight(pts);
      redraw();
    });

    function redraw() { render(svg, pts, c); updateReadout(); }

    function updateReadout() {
      var shear = bulkShear(pts);
      var srh = srh03(pts, c.u, c.v);
      var mode = classify(shear, srh);
      readout.innerHTML =
        "0–6 km bulk shear <strong style='color:" + ACCENT_DEEP + "'>" + shear.toFixed(1) + " m s⁻¹</strong>" +
        " &nbsp;·&nbsp; 0–3 km SRH <strong style='color:" + ACCENT_DEEP + "'>" + srh.toFixed(0) + " m² s⁻²</strong>" +
        "<br><span style='color:" + WARM + ";font-weight:600'>likely mode: " + mode.name + "</span>" +
        " <span style='color:" + FAINT + "'>(" + mode.note + ")</span>";
    }

    render(svg, pts, c);
    updateReadout();
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
    b.addEventListener("mouseenter", function () { b.style.background = ACCENT; b.style.color = "#fff"; });
    b.addEventListener("mouseleave", function () { b.style.background = CARD; b.style.color = ACCENT; });
  }

  function render(svg, pts, c) {
    var ns = "http://www.w3.org/2000/svg";
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    function add(tag, attrs) {
      var el = document.createElementNS(ns, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      svg.appendChild(el);
      return el;
    }
    function toX(u) { return CX + u * SCALE; }
    function toY(v) { return CY - v * SCALE; }

    // range rings every 10 m/s
    [10, 20, 30].forEach(function (r) {
      add("circle", { cx: CX, cy: CY, r: r * SCALE, fill: "none", stroke: RULE, "stroke-width": 1 });
      var lbl = add("text", { x: CX + r * SCALE + 2, y: CY - 3, "font-family": "Inter, sans-serif", "font-size": 9, fill: FAINT });
      lbl.textContent = r;
    });
    // axes
    add("line", { x1: CX - RING_MAX * SCALE, y1: CY, x2: CX + RING_MAX * SCALE, y2: CY, stroke: RULE, "stroke-width": 1 });
    add("line", { x1: CX, y1: CY - RING_MAX * SCALE, x2: CX, y2: CY + RING_MAX * SCALE, stroke: RULE, "stroke-width": 1 });
    // axis labels (italic serif for the variables)
    ["u (m s⁻¹) →", 1].forEach(function () {});
    var xl = add("text", { x: CX + RING_MAX * SCALE - 2, y: CY + 14, "text-anchor": "end", "font-family": "Source Serif 4, serif", "font-style": "italic", "font-size": 12, fill: MUTED });
    xl.textContent = "u (E) →";
    var yl = add("text", { x: CX + 5, y: CY - RING_MAX * SCALE + 10, "font-family": "Source Serif 4, serif", "font-style": "italic", "font-size": 12, fill: MUTED });
    yl.textContent = "v (N) ↑";

    // ── shaded swept area: triangles from c to each 0-3 km hodograph segment ──
    // The sum of these signed triangle areas is exactly -SRH/2, so the shaded
    // fan IS the geometric reading in the chapter.
    for (var i = 0; i + 1 < pts.length; i++) {
      if (pts[i].z >= 3) break;
      var a = pts[i], b = pts[i + 1];
      var path = "M " + toX(c.u).toFixed(1) + " " + toY(c.v).toFixed(1) +
                 " L " + toX(a.u).toFixed(1) + " " + toY(a.v).toFixed(1) +
                 " L " + toX(b.u).toFixed(1) + " " + toY(b.v).toFixed(1) + " Z";
      add("path", { d: path, fill: GOLD, "fill-opacity": 0.16, stroke: "none" });
    }

    // ── bulk-shear vector: 0 -> 6 km, dashed warm line ──
    add("line", {
      x1: toX(pts[0].u), y1: toY(pts[0].v),
      x2: toX(pts[pts.length - 1].u), y2: toY(pts[pts.length - 1].v),
      stroke: WARM, "stroke-width": 1.4, "stroke-dasharray": "5 4", "stroke-opacity": 0.85
    });

    // ── hodograph curve ──
    var d = "M " + toX(pts[0].u).toFixed(1) + " " + toY(pts[0].v).toFixed(1);
    for (var j = 1; j < pts.length; j++) d += " L " + toX(pts[j].u).toFixed(1) + " " + toY(pts[j].v).toFixed(1);
    add("path", { d: d, fill: "none", stroke: ACCENT, "stroke-width": 2.4, "stroke-linejoin": "round", "stroke-linecap": "round" });

    // height markers at integer km
    pts.forEach(function (p) {
      if (Math.abs(p.z - Math.round(p.z)) < 1e-6) {
        var isSurf = p.z === 0;
        add("circle", { cx: toX(p.u), cy: toY(p.v), r: isSurf ? 4.5 : 3, fill: isSurf ? WARM : ACCENT_DEEP, stroke: "#fff", "stroke-width": 1 });
        var t = add("text", { x: toX(p.u) + 6, y: toY(p.v) - 5, "font-family": "Inter, sans-serif", "font-size": 9, fill: MUTED });
        t.textContent = p.z + " km";
      }
    });

    // ── storm-motion point c (draggable) ──
    add("circle", { cx: toX(c.u), cy: toY(c.v), r: 13, fill: ACCENT_DEEP, "fill-opacity": 0.10, stroke: "none" });
    add("circle", { cx: toX(c.u), cy: toY(c.v), r: 6, fill: ACCENT_DEEP, stroke: "#fff", "stroke-width": 1.5 });
    var ct = add("text", { x: toX(c.u), y: toY(c.v) - 11, "text-anchor": "middle", "font-family": "Source Serif 4, serif", "font-style": "italic", "font-size": 12, fill: ACCENT_DEEP });
    ct.textContent = "c";
  }
})();
