/* Interactive · The Lorenz-63 attractor and ensemble divergence.
   Integrates dx/dt = sigma(y-x), dy/dt = x(rho-z)-y, dz/dt = xy - beta z
   with classic parameters (10, 28, 8/3) via fourth-order Runge-Kutta.
   Launches a small ensemble of nearby initial states, traces them on the
   x-z projection of the butterfly, and reads out the RMS spread S(t) versus
   model time — the predictability horizon made visible.
   Mounts into any [data-widget='lorenz-attractor'] section. No libraries. */

(function () {
  "use strict";

  // ── Palette (house style) ──────────────────────────────
  var ACCENT = "#2b5c8a";
  var ACCENT_DEEP = "#173a5a";
  var WARM = "#b8651a";
  var GOLD = "#c08a2d";
  var FAINT = "#8e9a9e";
  var RULE = "#dde3ea";
  var INK = "#1c1f21";
  var MUTED = "#5f6d72";
  var CARD = "#ffffff";

  // ── Lorenz parameters (classic, chaotic) ───────────────
  var SIGMA = 10, RHO = 28, BETA = 8 / 3;
  var DT = 0.01;            // RK4 step
  var SUB = 2;              // integrator sub-steps per drawn frame
  var TRAIL = 1100;         // max points kept in each trajectory trail

  // ── Plot geometry (x-z projection) ─────────────────────
  var W = 560, H = 360;
  var M = { l: 38, r: 14, t: 14, b: 30 };
  var PW = W - M.l - M.r, PH = H - M.t - M.b;
  // Attractor bounds in (x, z): x in [-22,22], z in [0,52].
  var XMIN = -24, XMAX = 24, ZMIN = 0, ZMAX = 52;

  document.querySelectorAll("[data-widget='lorenz-attractor']").forEach(function (section) {
    var host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // ── Controls ──
    var controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "1.1rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    var sizeWrap = mkLabel("members <span data-role='size-val' style='font-weight:600;color:" + ACCENT + "'>6</span>");
    var sizeSlider = mkSlider(2, 16, 6, 1);
    sizeWrap.appendChild(sizeSlider);
    controls.appendChild(sizeWrap);

    var pertWrap = mkLabel("log₁₀ perturbation <span data-role='pert-val' style='font-weight:600;color:" + ACCENT + "'>−3.0</span>");
    var pertSlider = mkSlider(-6, -1, -3, 0.5);
    pertWrap.appendChild(pertSlider);
    controls.appendChild(pertWrap);

    var runBtn = mkButton("Pause");
    controls.appendChild(runBtn);
    var resetBtn = mkButton("Reset");
    controls.appendChild(resetBtn);

    // ── SVG canvas ──
    var svg = svgEl("svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = CARD;
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // ── Readout ──
    var readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.minHeight = "1.3em";
    host.appendChild(readout);

    // ── Legend ──
    var legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML =
      "<span><span style='display:inline-block;width:24px;height:2px;background:" + ACCENT + ";vertical-align:middle;margin-right:0.35em'></span>ensemble members</span>" +
      "<span><span style='display:inline-block;width:8px;height:8px;border-radius:50%;background:" + WARM + ";vertical-align:middle;margin-right:0.35em'></span>leading heads</span>" +
      "<span><span style='display:inline-block;width:24px;height:2px;background:" + GOLD + ";vertical-align:middle;margin-right:0.35em'></span>spread S(t)</span>";
    host.appendChild(legend);

    // ── Static layers ──
    var gridLayer = svgEl("g"); svg.appendChild(gridLayer);
    var trailLayer = svgEl("g"); svg.appendChild(trailLayer);
    var headLayer = svgEl("g"); svg.appendChild(headLayer);
    var hudLayer = svgEl("g"); svg.appendChild(hudLayer);
    drawAxes(gridLayer);

    // ── State ──
    var state = null;       // { members:[{x,y,z, pts:[[px,py]]}], t, spreadHist:[] }
    var paused = false;
    var raf = null;

    function readN() { return parseInt(sizeSlider.value, 10); }
    function readPert() { return Math.pow(10, parseFloat(pertSlider.value)); }

    function spinUp() {
      // Seed near the attractor, then discard a transient so member 0 sits
      // ON the butterfly (the origin is the unstable fixed point — avoid it).
      var s = { x: 1, y: 1, z: 1 };
      for (var i = 0; i < 1500; i++) s = rk4(s);
      return s;
    }

    function init() {
      var N = readN();
      var eps = readPert();
      var base = spinUp();
      var members = [];
      for (var m = 0; m < N; m++) {
        // Perturb each member by ~eps in a pseudo-random direction.
        var px = (m === 0) ? 0 : (hash(m * 2.1) - 0.5);
        var py = (m === 0) ? 0 : (hash(m * 3.7) - 0.5);
        var pz = (m === 0) ? 0 : (hash(m * 5.3) - 0.5);
        members.push({
          x: base.x + eps * px,
          y: base.y + eps * py,
          z: base.z + eps * pz,
          pts: []
        });
      }
      state = { members: members, t: 0, spreadHist: [] };
      drawAll();
    }

    function step() {
      if (!state) return;
      for (var k = 0; k < SUB; k++) {
        for (var m = 0; m < state.members.length; m++) {
          var mem = state.members[m];
          var nxt = rk4(mem);
          mem.x = nxt.x; mem.y = nxt.y; mem.z = nxt.z;
          mem.pts.push([sx(mem.x), sz(mem.z)]);
          if (mem.pts.length > TRAIL) mem.pts.shift();
        }
        state.t += DT;
      }
      var S = spread(state.members);
      state.spreadHist.push([state.t, S]);
      if (state.spreadHist.length > 600) state.spreadHist.shift();
      drawAll();
      readout.innerHTML =
        "model time t = <strong style='color:" + ACCENT_DEEP + "'>" + state.t.toFixed(1) + "</strong>" +
        " &nbsp;·&nbsp; RMS spread S = <strong style='color:" + ACCENT_DEEP + "'>" + S.toFixed(2) + "</strong>" +
        " &nbsp;·&nbsp; λ ≈ 0.9, horizon ≈ " + horizonText(state.spreadHist);
    }

    function loop() {
      if (!paused) step();
      raf = window.requestAnimationFrame(loop);
    }

    function drawAll() {
      // Trails
      while (trailLayer.firstChild) trailLayer.removeChild(trailLayer.firstChild);
      while (headLayer.firstChild) headLayer.removeChild(headLayer.firstChild);
      if (!state) return;
      for (var m = 0; m < state.members.length; m++) {
        var mem = state.members[m];
        if (mem.pts.length > 1) {
          var path = svgEl("path");
          path.setAttribute("d", polyPath(mem.pts));
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", ACCENT);
          path.setAttribute("stroke-width", m === 0 ? "1.1" : "0.8");
          path.setAttribute("stroke-opacity", m === 0 ? "0.75" : "0.45");
          trailLayer.appendChild(path);
        }
      }
      for (var h = 0; h < state.members.length; h++) {
        var hm = state.members[h];
        var c = svgEl("circle");
        c.setAttribute("cx", sx(hm.x));
        c.setAttribute("cy", sz(hm.z));
        c.setAttribute("r", "3");
        c.setAttribute("fill", WARM);
        c.setAttribute("stroke", "#fff");
        c.setAttribute("stroke-width", "0.8");
        headLayer.appendChild(c);
      }
      drawSpreadInset(hudLayer, state.spreadHist);
    }

    sizeSlider.addEventListener("input", function () {
      sizeWrap.querySelector("[data-role='size-val']").textContent = readN();
      init();
    });
    pertSlider.addEventListener("input", function () {
      pertWrap.querySelector("[data-role='pert-val']").textContent = parseFloat(pertSlider.value).toFixed(1);
      init();
    });
    runBtn.addEventListener("click", function () {
      paused = !paused;
      runBtn.textContent = paused ? "Run" : "Pause";
    });
    resetBtn.addEventListener("click", function () {
      paused = false;
      runBtn.textContent = "Pause";
      init();
    });

    init();
    loop();
  }

  // ── Lorenz-63 RK4 ──────────────────────────────────────
  function deriv(s) {
    return {
      x: SIGMA * (s.y - s.x),
      y: s.x * (RHO - s.z) - s.y,
      z: s.x * s.y - BETA * s.z
    };
  }
  function rk4(s) {
    var k1 = deriv(s);
    var s2 = { x: s.x + 0.5 * DT * k1.x, y: s.y + 0.5 * DT * k1.y, z: s.z + 0.5 * DT * k1.z };
    var k2 = deriv(s2);
    var s3 = { x: s.x + 0.5 * DT * k2.x, y: s.y + 0.5 * DT * k2.y, z: s.z + 0.5 * DT * k2.z };
    var k3 = deriv(s3);
    var s4 = { x: s.x + DT * k3.x, y: s.y + DT * k3.y, z: s.z + DT * k3.z };
    var k4 = deriv(s4);
    return {
      x: s.x + (DT / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: s.y + (DT / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      z: s.z + (DT / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z)
    };
  }

  // RMS distance of members from their mean, in full (x,y,z) state space.
  function spread(members) {
    var n = members.length;
    var mx = 0, my = 0, mz = 0, i;
    for (i = 0; i < n; i++) { mx += members[i].x; my += members[i].y; mz += members[i].z; }
    mx /= n; my /= n; mz /= n;
    var s = 0;
    for (i = 0; i < n; i++) {
      var dx = members[i].x - mx, dy = members[i].y - my, dz = members[i].z - mz;
      s += dx * dx + dy * dy + dz * dz;
    }
    return Math.sqrt(s / n);
  }

  // Estimate the time at which spread first crosses ~half the attractor scale.
  function horizonText(hist) {
    var THRESH = 12; // saturation ~ climatological scatter of the attractor
    for (var i = 0; i < hist.length; i++) {
      if (hist[i][1] >= THRESH) return "t ≈ " + hist[i][0].toFixed(1);
    }
    return "not yet";
  }

  // Deterministic pseudo-random in [0,1) from a seed (so members are repeatable).
  function hash(seed) {
    var v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  }

  // ── Scales ─────────────────────────────────────────────
  function sx(x) { return M.l + ((x - XMIN) / (XMAX - XMIN)) * PW; }
  function sz(z) { return M.t + (1 - (z - ZMIN) / (ZMAX - ZMIN)) * PH; }

  // ── Drawing helpers ────────────────────────────────────
  function drawAxes(layer) {
    var ns = "http://www.w3.org/2000/svg", t;
    // frame
    var rect = svgEl("rect");
    rect.setAttribute("x", M.l); rect.setAttribute("y", M.t);
    rect.setAttribute("width", PW); rect.setAttribute("height", PH);
    rect.setAttribute("fill", "none"); rect.setAttribute("stroke", RULE);
    rect.setAttribute("stroke-width", "1");
    layer.appendChild(rect);
    // x ticks
    [-20, -10, 0, 10, 20].forEach(function (xt) {
      t = svgEl("text");
      t.setAttribute("x", sx(xt)); t.setAttribute("y", H - 9);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-family", "Inter, sans-serif");
      t.setAttribute("font-size", "10"); t.setAttribute("fill", FAINT);
      t.textContent = String(xt);
      layer.appendChild(t);
    });
    // z ticks
    [0, 20, 40].forEach(function (zt) {
      t = svgEl("text");
      t.setAttribute("x", M.l - 6); t.setAttribute("y", sz(zt) + 3.5);
      t.setAttribute("text-anchor", "end");
      t.setAttribute("font-family", "Inter, sans-serif");
      t.setAttribute("font-size", "10"); t.setAttribute("fill", FAINT);
      t.textContent = String(zt);
      layer.appendChild(t);
    });
    // axis labels (italic serif)
    var xl = svgEl("text");
    xl.setAttribute("x", M.l + PW / 2); xl.setAttribute("y", H - 1);
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("font-family", "Source Serif 4, serif");
    xl.setAttribute("font-style", "italic"); xl.setAttribute("font-size", "12");
    xl.setAttribute("fill", MUTED); xl.textContent = "x";
    layer.appendChild(xl);
    var zl = svgEl("text");
    zl.setAttribute("x", 11); zl.setAttribute("y", M.t + PH / 2);
    zl.setAttribute("text-anchor", "middle");
    zl.setAttribute("font-family", "Source Serif 4, serif");
    zl.setAttribute("font-style", "italic"); zl.setAttribute("font-size", "12");
    zl.setAttribute("fill", MUTED);
    zl.setAttribute("transform", "rotate(-90, 11, " + (M.t + PH / 2) + ")");
    zl.textContent = "z";
    layer.appendChild(zl);
  }

  // Small inset plot of S(t) in the upper-left, in gold.
  function drawSpreadInset(layer, hist) {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    if (!hist || hist.length < 2) return;
    var ix = M.l + 10, iy = M.t + 10, iw = 150, ih = 70;
    // background
    var bg = svgEl("rect");
    bg.setAttribute("x", ix); bg.setAttribute("y", iy);
    bg.setAttribute("width", iw); bg.setAttribute("height", ih);
    bg.setAttribute("fill", "#ffffff"); bg.setAttribute("fill-opacity", "0.82");
    bg.setAttribute("stroke", RULE); bg.setAttribute("stroke-width", "0.8");
    layer.appendChild(bg);
    var tMax = hist[hist.length - 1][0];
    var t0 = hist[0][0];
    var span = Math.max(tMax - t0, 1e-6);
    var SMAX = 16;
    var pts = hist.map(function (h) {
      var px = ix + ((h[0] - t0) / span) * iw;
      var py = iy + ih - Math.min(h[1] / SMAX, 1) * ih;
      return [px, py];
    });
    var path = svgEl("path");
    path.setAttribute("d", polyPath(pts));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", GOLD);
    path.setAttribute("stroke-width", "1.6");
    layer.appendChild(path);
    var lab = svgEl("text");
    lab.setAttribute("x", ix + 4); lab.setAttribute("y", iy + 12);
    lab.setAttribute("font-family", "Inter, sans-serif");
    lab.setAttribute("font-size", "9"); lab.setAttribute("fill", MUTED);
    lab.textContent = "spread S(t) vs time";
    layer.appendChild(lab);
  }

  function polyPath(pts) {
    if (!pts.length) return "";
    var d = "M " + pts[0][0].toFixed(2) + " " + pts[0][1].toFixed(2);
    for (var i = 1; i < pts.length; i++) {
      d += " L " + pts[i][0].toFixed(2) + " " + pts[i][1].toFixed(2);
    }
    return d;
  }

  // ── DOM helpers ────────────────────────────────────────
  function svgEl(tag) { return document.createElementNS("http://www.w3.org/2000/svg", tag); }

  function mkLabel(html) {
    var l = document.createElement("label");
    l.style.fontFamily = "Inter, sans-serif";
    l.style.fontSize = "0.82rem";
    l.style.color = INK;
    l.style.display = "flex";
    l.style.alignItems = "center";
    l.style.gap = "0.5rem";
    var span = document.createElement("span");
    span.innerHTML = html;
    l.appendChild(span);
    return l;
  }

  function mkSlider(min, max, val, step) {
    var s = document.createElement("input");
    s.type = "range";
    s.min = String(min); s.max = String(max);
    s.value = String(val); s.step = String(step);
    s.style.width = "120px";
    s.style.accentColor = ACCENT;
    return s;
  }

  function mkButton(text) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.78rem";
    b.style.padding = "0.32rem 0.85rem";
    b.style.border = "1px solid " + ACCENT;
    b.style.background = "#ffffff";
    b.style.color = ACCENT;
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    b.style.transition = "background 100ms, color 100ms";
    b.addEventListener("mouseenter", function () { b.style.background = ACCENT; b.style.color = "#fff"; });
    b.addEventListener("mouseleave", function () { b.style.background = "#fff"; b.style.color = ACCENT; });
    return b;
  }
})();
