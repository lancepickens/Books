/* Interactive · Twin paradox / geodesic = max proper time.

   Minkowski diagram with c = 1 (so 45° lines are light rays).
   Events:
     A = (t=0, x=0)             — fixed start
     B = (t=T, x=0)             — fixed end (T = 10 in widget units)
     C = (t=t_c, x=x_c)         — draggable turnaround event

   Stay-at-home twin's worldline: A → B (straight, geodesic).
     Proper time τ_stay = T.

   Traveler's worldline: A → C → B (two timelike segments).
     τ_AC = √(t_c² − x_c²)
     τ_CB = √((T − t_c)² − x_c²)
     τ_travel = τ_AC + τ_CB

   The user drags C inside the future light cone of A and past light cone of B.
   Light-cone constraints:
     |x_c| < t_c        (C inside future cone of A)
     |x_c| < T − t_c    (C inside past cone of B)
   Together: |x_c| < min(t_c, T − t_c). */

(function () {
  "use strict";

  const T_TOTAL = 10;        // proper-time units; B is at (T_TOTAL, 0)
  const X_HALF = 6;          // diagram half-width (units)
  const T_MIN = 0;
  const T_MAX = T_TOTAL;
  const X_MIN = -X_HALF;
  const X_MAX = X_HALF;

  // Layout
  const W = 640, H = 420;
  const padL = 60, padR = 24, padT = 30, padB = 56;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  function xToPx(x) { return padL + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW; }
  function tToPx(t) { return padT + (1 - (t - T_MIN) / (T_MAX - T_MIN)) * plotH; }
  function pxToX(px) { return X_MIN + ((px - padL) / plotW) * (X_MAX - X_MIN); }
  function pxToT(py) { return T_MIN + (1 - (py - padT) / plotH) * (T_MAX - T_MIN); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Clamp (t_c, x_c) inside the future cone of A and past cone of B,
  // with a small margin so the path remains timelike (not null).
  function clampInsideCones(tc, xc) {
    const margin = 0.05;
    const tcMin = 0.2, tcMax = T_TOTAL - 0.2;
    tc = clamp(tc, tcMin, tcMax);
    const xMaxAbs = Math.max(0.0, Math.min(tc, T_TOTAL - tc) - margin);
    xc = clamp(xc, -xMaxAbs, xMaxAbs);
    return { tc, xc };
  }

  function properTime(tc, xc) {
    const ac2 = tc * tc - xc * xc;
    const cb2 = (T_TOTAL - tc) * (T_TOTAL - tc) - xc * xc;
    if (ac2 <= 0 || cb2 <= 0) return null;
    return Math.sqrt(ac2) + Math.sqrt(cb2);
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let C = { tc: 5, xc: 3 };

    // ── SVG ────────────────────────────────────────────
    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Minkowski diagram with two worldlines from A to B"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.touchAction = "none";
    svg.style.userSelect = "none";

    // Defs: clip path for the diagram, hatch pattern for light cone
    const defs = makeSvgEl("defs");
    const clip = makeSvgEl("clipPath", { id: "plot-clip" });
    clip.appendChild(makeSvgEl("rect", { x: padL, y: padT, width: plotW, height: plotH }));
    defs.appendChild(clip);
    const pat = makeSvgEl("pattern", {
      id: "lc-hatch", patternUnits: "userSpaceOnUse",
      width: 8, height: 8, patternTransform: "rotate(45)"
    });
    pat.appendChild(makeSvgEl("line", { x1: 0, y1: 0, x2: 0, y2: 8, stroke: "#a83e2a", "stroke-width": 0.6, opacity: 0.2 }));
    defs.appendChild(pat);
    svg.appendChild(defs);

    // Plot frame
    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    // Light cone of A: triangle (0,0) → (T_TOTAL, T_TOTAL) and (0,0) → (T_TOTAL, -T_TOTAL), inside plot
    // Compute on-plot intersection points (cone extends to t = T_TOTAL but is clipped by X bounds)
    const coneRight = { t: Math.min(T_TOTAL, X_MAX), x: Math.min(T_TOTAL, X_MAX) };
    const coneLeft  = { t: Math.min(T_TOTAL, -X_MIN), x: -Math.min(T_TOTAL, -X_MIN) };
    const coneTopT = Math.min(T_TOTAL, X_MAX);
    const conePath = `M ${xToPx(0)},${tToPx(0)} L ${xToPx(coneRight.x)},${tToPx(coneRight.t)} L ${xToPx(coneLeft.x)},${tToPx(coneLeft.t)} Z`;
    svg.appendChild(makeSvgEl("path", {
      d: conePath, fill: "url(#lc-hatch)", "clip-path": "url(#plot-clip)"
    }));

    // Light-cone edge lines (future cone of A)
    svg.appendChild(makeSvgEl("line", {
      x1: xToPx(0), y1: tToPx(0), x2: xToPx(coneRight.x), y2: tToPx(coneRight.t),
      stroke: "#a83e2a", "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0.55,
      "clip-path": "url(#plot-clip)"
    }));
    svg.appendChild(makeSvgEl("line", {
      x1: xToPx(0), y1: tToPx(0), x2: xToPx(coneLeft.x), y2: tToPx(coneLeft.t),
      stroke: "#a83e2a", "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0.55,
      "clip-path": "url(#plot-clip)"
    }));

    // Past cone of B (lines going down from B)
    svg.appendChild(makeSvgEl("line", {
      x1: xToPx(0), y1: tToPx(T_TOTAL),
      x2: xToPx(Math.min(T_TOTAL, X_MAX)), y2: tToPx(T_TOTAL - Math.min(T_TOTAL, X_MAX)),
      stroke: "#a83e2a", "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0.35,
      "clip-path": "url(#plot-clip)"
    }));
    svg.appendChild(makeSvgEl("line", {
      x1: xToPx(0), y1: tToPx(T_TOTAL),
      x2: xToPx(-Math.min(T_TOTAL, -X_MIN)), y2: tToPx(T_TOTAL - Math.min(T_TOTAL, -X_MIN)),
      stroke: "#a83e2a", "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0.35,
      "clip-path": "url(#plot-clip)"
    }));

    // Axes labels
    const axisStyle = {
      "font-family": "Inter, sans-serif",
      "font-size": "11",
      fill: "#6f6a63"
    };
    // X ticks
    for (let x = -6; x <= 6; x += 2) {
      const px = xToPx(x);
      svg.appendChild(makeSvgEl("line", { x1: px, y1: padT + plotH, x2: px, y2: padT + plotH + 4, stroke: "#9a9389" }));
      const lbl = makeSvgEl("text", Object.assign({ x: px, y: padT + plotH + 18, "text-anchor": "middle" }, axisStyle));
      lbl.textContent = String(x);
      svg.appendChild(lbl);
    }
    // T ticks
    for (let t = 0; t <= T_TOTAL; t += 2) {
      const py = tToPx(t);
      svg.appendChild(makeSvgEl("line", { x1: padL - 4, y1: py, x2: padL, y2: py, stroke: "#9a9389" }));
      const lbl = makeSvgEl("text", Object.assign({ x: padL - 8, y: py + 4, "text-anchor": "end" }, axisStyle));
      lbl.textContent = String(t);
      svg.appendChild(lbl);
    }
    // Axis titles
    const xTitle = makeSvgEl("text", {
      x: padL + plotW / 2, y: H - 12, "text-anchor": "middle",
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    xTitle.textContent = "space x";
    svg.appendChild(xTitle);

    const yTitle = makeSvgEl("text", {
      x: 18, y: padT + plotH / 2,
      "text-anchor": "middle",
      transform: `rotate(-90, 18, ${padT + plotH / 2})`,
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    yTitle.textContent = "time t";
    svg.appendChild(yTitle);

    // Stay-at-home worldline: A → B
    const stayLine = makeSvgEl("line", {
      x1: xToPx(0), y1: tToPx(0), x2: xToPx(0), y2: tToPx(T_TOTAL),
      stroke: "#a83e2a", "stroke-width": 2.4, "stroke-linecap": "round"
    });
    svg.appendChild(stayLine);

    // Traveler worldline: A → C → B
    const travLine1 = makeSvgEl("line", {
      x1: xToPx(0), y1: tToPx(0), x2: 0, y2: 0,
      stroke: "#1e5b8a", "stroke-width": 2.4, "stroke-linecap": "round"
    });
    const travLine2 = makeSvgEl("line", {
      x1: 0, y1: 0, x2: xToPx(0), y2: tToPx(T_TOTAL),
      stroke: "#1e5b8a", "stroke-width": 2.4, "stroke-linecap": "round"
    });
    svg.appendChild(travLine1);
    svg.appendChild(travLine2);

    // Event dots
    function eventDot(t, x, fill) {
      const c = makeSvgEl("circle", {
        cx: xToPx(x), cy: tToPx(t), r: 5,
        fill: fill, stroke: "#fbfaf7", "stroke-width": 2
      });
      return c;
    }
    const dotA = eventDot(0, 0, "#1f1c1a");
    const dotB = eventDot(T_TOTAL, 0, "#1f1c1a");
    svg.appendChild(dotA);
    svg.appendChild(dotB);

    // Event labels
    const lblA = makeSvgEl("text", {
      x: xToPx(0) - 12, y: tToPx(0) + 6,
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "14", "font-weight": "600", fill: "#1f1c1a",
      "text-anchor": "end"
    });
    lblA.textContent = "A";
    svg.appendChild(lblA);

    const lblB = makeSvgEl("text", {
      x: xToPx(0) - 12, y: tToPx(T_TOTAL) - 2,
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "14", "font-weight": "600", fill: "#1f1c1a",
      "text-anchor": "end"
    });
    lblB.textContent = "B";
    svg.appendChild(lblB);

    // C (draggable)
    const dotC = makeSvgEl("circle", {
      r: 8, fill: "#1e5b8a", stroke: "#fbfaf7", "stroke-width": 2
    });
    dotC.style.cursor = "grab";
    dotC.setAttribute("tabindex", "0");
    dotC.setAttribute("role", "slider");
    dotC.setAttribute("aria-label", "Turnaround event C");
    svg.appendChild(dotC);

    const lblC = makeSvgEl("text", {
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "14", "font-weight": "600", fill: "#1e5b8a"
    });
    lblC.textContent = "C";
    svg.appendChild(lblC);

    // ── Readout panel ──────────────────────────────────
    const panel = document.createElement("div");
    panel.style.marginTop = "0.9rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr";
    panel.style.gap = "0.5rem 1.5rem";
    panel.style.alignItems = "baseline";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";

    function mkBlock(color, labelText) {
      const wrap = document.createElement("div");
      const lbl = document.createElement("div");
      lbl.style.fontFamily = "Inter, sans-serif";
      lbl.style.fontSize = "0.7rem";
      lbl.style.textTransform = "uppercase";
      lbl.style.letterSpacing = "0.12em";
      lbl.style.color = color;
      lbl.style.fontWeight = "700";
      lbl.style.marginBottom = "0.15rem";
      lbl.textContent = labelText;
      const val = document.createElement("div");
      val.style.fontFamily = "Source Serif 4, Georgia, serif";
      val.style.fontSize = "1.5rem";
      val.style.fontWeight = "600";
      val.style.color = "#1f1c1a";
      val.style.lineHeight = "1.05";
      wrap.appendChild(lbl);
      wrap.appendChild(val);
      return { wrap, val };
    }

    const stayBlock = mkBlock("#a83e2a", "Stay-at-home (geodesic)");
    stayBlock.val.textContent = "τ = " + T_TOTAL.toFixed(3);
    panel.appendChild(stayBlock.wrap);

    const travBlock = mkBlock("#1e5b8a", "Traveler (via C)");
    panel.appendChild(travBlock.wrap);

    const diffEl = document.createElement("div");
    diffEl.style.gridColumn = "1 / -1";
    diffEl.style.fontFamily = "Source Serif 4, Georgia, serif";
    diffEl.style.fontSize = "0.95rem";
    diffEl.style.fontStyle = "italic";
    diffEl.style.color = "#6f6a63";
    diffEl.style.marginTop = "0.1rem";
    panel.appendChild(diffEl);

    // Reset
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset C";
    Object.assign(resetBtn.style, {
      fontFamily: "Inter, sans-serif", fontSize: "0.78rem",
      letterSpacing: "0.08em", textTransform: "uppercase",
      background: "transparent", border: "1px solid #d3cabd",
      color: "#1f1c1a", padding: "0.35rem 0.9rem",
      borderRadius: "2px", cursor: "pointer", fontWeight: "500",
      justifySelf: "end", gridColumn: "2"
    });
    resetBtn.addEventListener("mouseenter", () => {
      resetBtn.style.borderColor = "#a83e2a";
      resetBtn.style.color = "#a83e2a";
    });
    resetBtn.addEventListener("mouseleave", () => {
      resetBtn.style.borderColor = "#d3cabd";
      resetBtn.style.color = "#1f1c1a";
    });
    resetBtn.addEventListener("click", () => {
      C = { tc: 5, xc: 3 };
      redraw();
    });
    panel.appendChild(resetBtn);

    mount.appendChild(svg);
    mount.appendChild(panel);

    // ── Update / redraw ─────────────────────────────────
    function redraw() {
      const { tc, xc } = clampInsideCones(C.tc, C.xc);
      C.tc = tc; C.xc = xc;
      const cx = xToPx(xc), cy = tToPx(tc);
      dotC.setAttribute("cx", cx);
      dotC.setAttribute("cy", cy);
      lblC.setAttribute("x", cx + 12);
      lblC.setAttribute("y", cy + 5);
      travLine1.setAttribute("x2", cx);
      travLine1.setAttribute("y2", cy);
      travLine2.setAttribute("x1", cx);
      travLine2.setAttribute("y1", cy);

      const tau = properTime(tc, xc);
      const tauStr = (tau === null) ? "—" : tau.toFixed(3);
      travBlock.val.textContent = "τ = " + tauStr;
      dotC.setAttribute("aria-valuetext", `t = ${tc.toFixed(2)}, x = ${xc.toFixed(2)}`);

      if (tau === null) {
        diffEl.textContent = "C is on a light cone; the traveler's worldline is null.";
      } else {
        const diff = T_TOTAL - tau;
        if (diff < 0.001) {
          diffEl.textContent = "C lies on the straight line A → B — both twins age the same. This is the geodesic.";
          travBlock.val.style.color = "#2c6e1f";
        } else {
          travBlock.val.style.color = "#1f1c1a";
          diffEl.textContent = `The traveler ages ${diff.toFixed(3)} units less. The stay-at-home (geodesic) maximizes proper time among nearby timelike paths.`;
        }
      }
    }

    // ── Drag handling ──────────────────────────────────
    let dragging = false;

    function pointFromEvent(ev) {
      const pt = svg.createSVGPoint();
      const touch = ev.touches && ev.touches[0];
      pt.x = touch ? touch.clientX : ev.clientX;
      pt.y = touch ? touch.clientY : ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
    }

    dotC.addEventListener("mousedown", (ev) => { dragging = true; dotC.style.cursor = "grabbing"; ev.preventDefault(); });
    dotC.addEventListener("touchstart", (ev) => { dragging = true; ev.preventDefault(); }, { passive: false });

    window.addEventListener("mousemove", (ev) => {
      if (!dragging) return;
      const p = pointFromEvent(ev); if (!p) return;
      C.tc = pxToT(p.y);
      C.xc = pxToX(p.x);
      redraw();
      ev.preventDefault();
    });
    window.addEventListener("touchmove", (ev) => {
      if (!dragging) return;
      const p = pointFromEvent(ev); if (!p) return;
      C.tc = pxToT(p.y);
      C.xc = pxToX(p.x);
      redraw();
      ev.preventDefault();
    }, { passive: false });

    window.addEventListener("mouseup", () => { dragging = false; dotC.style.cursor = "grab"; });
    window.addEventListener("touchend", () => { dragging = false; });

    // Keyboard support
    dotC.addEventListener("keydown", (ev) => {
      const stepT = 0.25, stepX = 0.25;
      switch (ev.key) {
        case "ArrowUp": C.tc += stepT; break;
        case "ArrowDown": C.tc -= stepT; break;
        case "ArrowLeft": C.xc -= stepX; break;
        case "ArrowRight": C.xc += stepX; break;
        default: return;
      }
      redraw();
      ev.preventDefault();
    });

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='twin-paradox']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
