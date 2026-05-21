/* Interactive · Stationary action sandbox.

   A free non-relativistic particle is required to travel from (t,x) = (0,0)
   to (t,x) = (1,1) in unit time. The user drags three intermediate knots that
   set the path x(t); the action S = ∫_0^1 (1/2) ẋ² dt is computed in real time
   for a piecewise-linear trajectory through the knots, and compared against
   the analytic minimum S = 1/2 attained by the straight line x(t) = t.

   Mounts into any [data-widget='action-sandbox'] section. */

(function () {
  "use strict";

  const T_MIN = 0, T_MAX = 1;
  const X_MIN = -0.4, X_MAX = 1.6;

  // Knots: (t, x). First and last are fixed boundary conditions.
  // Indices 1..N are draggable.
  const initialKnots = [
    { t: 0.00, x: 0.0, fixed: true },
    { t: 0.25, x: 0.7 },
    { t: 0.50, x: 0.2 },
    { t: 0.75, x: 1.0 },
    { t: 1.00, x: 1.0, fixed: true }
  ];

  // Layout (SVG viewBox units)
  const W = 640, H = 360;
  const padL = 56, padR = 24, padT = 24, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  function tToX(t) { return padL + ((t - T_MIN) / (T_MAX - T_MIN)) * plotW; }
  function xToY(x) { return padT + (1 - (x - X_MIN) / (X_MAX - X_MIN)) * plotH; }
  function yToX(y) { return X_MIN + (1 - (y - padT) / plotH) * (X_MAX - X_MIN); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function pathD(knots) {
    return knots.map((k, i) => (i === 0 ? "M" : "L") + tToX(k.t) + "," + xToY(k.x)).join(" ");
  }

  // Compute S = ∫ (1/2) ẋ² dt for piecewise-linear x(t) through the knots.
  // On each segment from (t_i, x_i) to (t_{i+1}, x_{i+1}):
  //   v = Δx / Δt is constant, so ∫ (1/2) v² dt = (1/2) Δx² / Δt.
  function computeAction(knots) {
    let S = 0;
    for (let i = 0; i < knots.length - 1; i++) {
      const dt = knots[i+1].t - knots[i].t;
      const dx = knots[i+1].x - knots[i].x;
      if (dt > 0) S += 0.5 * dx * dx / dt;
    }
    return S;
  }

  const S_MIN = 0.5;  // Analytic minimum for x(t) = t, V = 0, m = 1.

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    // Working state
    let knots = initialKnots.map(k => Object.assign({}, k));

    // ── Build SVG ──────────────────────────────────────
    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Stationary action sandbox plot"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.touchAction = "none";
    svg.style.userSelect = "none";

    // Plot frame
    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    // Grid
    const gridGroup = makeSvgEl("g");
    for (let i = 0; i <= 5; i++) {
      const t = T_MIN + i * (T_MAX - T_MIN) / 5;
      const x = tToX(t);
      gridGroup.appendChild(makeSvgEl("line", {
        x1: x, y1: padT, x2: x, y2: padT + plotH,
        stroke: "#efe9dd", "stroke-width": 1
      }));
    }
    for (let i = 0; i <= 4; i++) {
      const xVal = X_MIN + i * (X_MAX - X_MIN) / 4;
      const y = xToY(xVal);
      gridGroup.appendChild(makeSvgEl("line", {
        x1: padL, y1: y, x2: padL + plotW, y2: y,
        stroke: "#efe9dd", "stroke-width": 1
      }));
    }
    svg.appendChild(gridGroup);

    // Axes labels
    const axisStyle = {
      "font-family": "Inter, sans-serif",
      "font-size": "11",
      fill: "#6f6a63"
    };
    // X-axis ticks (t)
    for (let i = 0; i <= 5; i++) {
      const t = T_MIN + i * (T_MAX - T_MIN) / 5;
      const lbl = makeSvgEl("text", Object.assign({
        x: tToX(t), y: padT + plotH + 16, "text-anchor": "middle"
      }, axisStyle));
      lbl.textContent = t.toFixed(1);
      svg.appendChild(lbl);
    }
    // Y-axis ticks (x)
    for (let i = 0; i <= 4; i++) {
      const xVal = X_MIN + i * (X_MAX - X_MIN) / 4;
      const lbl = makeSvgEl("text", Object.assign({
        x: padL - 8, y: xToY(xVal) + 4, "text-anchor": "end"
      }, axisStyle));
      lbl.textContent = xVal.toFixed(1);
      svg.appendChild(lbl);
    }
    // Axis titles
    const xTitle = makeSvgEl("text", Object.assign({
      x: padL + plotW / 2, y: H - 16, "text-anchor": "middle",
      "font-style": "italic",
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "13",
      fill: "#1f1c1a"
    }, {}));
    xTitle.textContent = "time t";
    svg.appendChild(xTitle);

    const yTitle = makeSvgEl("text", {
      x: 18, y: padT + plotH / 2,
      "text-anchor": "middle",
      transform: `rotate(-90, 18, ${padT + plotH / 2})`,
      "font-style": "italic",
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "13",
      fill: "#1f1c1a"
    });
    yTitle.textContent = "position x(t)";
    svg.appendChild(yTitle);

    // Reference straight line (the minimum)
    const refLine = makeSvgEl("line", {
      x1: tToX(0), y1: xToY(0), x2: tToX(1), y2: xToY(1),
      stroke: "#a83e2a", "stroke-width": 1.2,
      "stroke-dasharray": "4 4", opacity: 0.55
    });
    svg.appendChild(refLine);

    const refLabel = makeSvgEl("text", {
      x: tToX(0.85), y: xToY(0.85) - 6,
      "font-family": "Inter, sans-serif",
      "font-size": "11",
      fill: "#a83e2a", "font-style": "italic"
    });
    refLabel.textContent = "minimum:  x = t";
    svg.appendChild(refLabel);

    // Trajectory path (will be updated)
    const trajPath = makeSvgEl("path", {
      d: pathD(knots),
      fill: "none",
      stroke: "#1f1c1a",
      "stroke-width": 2.2,
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });
    svg.appendChild(trajPath);

    // Knots (circles)
    const knotEls = knots.map((k, i) => {
      const el = makeSvgEl("circle", {
        cx: tToX(k.t),
        cy: xToY(k.x),
        r: k.fixed ? 5 : 7,
        fill: k.fixed ? "#a83e2a" : "#1e5b8a",
        stroke: "#fbfaf7",
        "stroke-width": 2
      });
      if (!k.fixed) {
        el.style.cursor = "grab";
        el.setAttribute("tabindex", "0");
        el.setAttribute("role", "slider");
        el.setAttribute("aria-label", `Knot ${i}: position at t = ${k.t.toFixed(2)}`);
        el.setAttribute("aria-valuemin", X_MIN);
        el.setAttribute("aria-valuemax", X_MAX);
        el.dataset.idx = String(i);
      }
      svg.appendChild(el);
      return el;
    });

    // ── Readout panel ──────────────────────────────────
    const panel = document.createElement("div");
    panel.style.marginTop = "0.9rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr auto";
    panel.style.gap = "0.5rem 1.5rem";
    panel.style.alignItems = "baseline";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";

    const labelEl = document.createElement("div");
    labelEl.style.fontFamily = "Inter, sans-serif";
    labelEl.style.fontSize = "0.72rem";
    labelEl.style.textTransform = "uppercase";
    labelEl.style.letterSpacing = "0.12em";
    labelEl.style.color = "#6f6a63";
    labelEl.style.fontWeight = "600";
    labelEl.textContent = "Action of this trajectory";

    const sEl = document.createElement("div");
    sEl.style.fontFamily = "Source Serif 4, Georgia, serif";
    sEl.style.fontSize = "1.7rem";
    sEl.style.fontWeight = "600";
    sEl.style.color = "#1f1c1a";
    sEl.style.gridColumn = "1";
    sEl.style.lineHeight = "1.05";

    const minEl = document.createElement("div");
    minEl.style.fontFamily = "Inter, sans-serif";
    minEl.style.fontSize = "0.85rem";
    minEl.style.color = "#a83e2a";
    minEl.style.gridColumn = "2";
    minEl.style.textAlign = "right";
    minEl.style.alignSelf = "end";
    minEl.style.whiteSpace = "nowrap";
    minEl.innerHTML = "minimum: <strong>S = 0.5000</strong>";

    const barWrap = document.createElement("div");
    barWrap.style.gridColumn = "1 / -1";
    barWrap.style.marginTop = "0.1rem";
    barWrap.style.height = "6px";
    barWrap.style.background = "#f1e8e2";
    barWrap.style.borderRadius = "999px";
    barWrap.style.overflow = "hidden";
    barWrap.style.position = "relative";

    const barFill = document.createElement("div");
    barFill.style.height = "100%";
    barFill.style.background = "linear-gradient(90deg, #a83e2a, #d36a4e)";
    barFill.style.width = "0%";
    barFill.style.transition = "width 90ms";
    barWrap.appendChild(barFill);

    const excessEl = document.createElement("div");
    excessEl.style.gridColumn = "1 / -1";
    excessEl.style.fontFamily = "Source Serif 4, Georgia, serif";
    excessEl.style.fontSize = "0.95rem";
    excessEl.style.color = "#6f6a63";
    excessEl.style.fontStyle = "italic";

    // Reset button
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.fontFamily = "Inter, sans-serif";
    resetBtn.style.fontSize = "0.78rem";
    resetBtn.style.letterSpacing = "0.08em";
    resetBtn.style.textTransform = "uppercase";
    resetBtn.style.background = "transparent";
    resetBtn.style.border = "1px solid #d3cabd";
    resetBtn.style.color = "#1f1c1a";
    resetBtn.style.padding = "0.35rem 0.9rem";
    resetBtn.style.borderRadius = "2px";
    resetBtn.style.cursor = "pointer";
    resetBtn.style.fontWeight = "500";
    resetBtn.style.justifySelf = "end";
    resetBtn.style.gridColumn = "2";
    resetBtn.addEventListener("mouseenter", () => {
      resetBtn.style.borderColor = "#a83e2a";
      resetBtn.style.color = "#a83e2a";
    });
    resetBtn.addEventListener("mouseleave", () => {
      resetBtn.style.borderColor = "#d3cabd";
      resetBtn.style.color = "#1f1c1a";
    });
    resetBtn.addEventListener("click", () => {
      knots = initialKnots.map(k => Object.assign({}, k));
      redraw();
    });

    panel.appendChild(labelEl);
    panel.appendChild(resetBtn);
    panel.appendChild(sEl);
    panel.appendChild(minEl);
    panel.appendChild(barWrap);
    panel.appendChild(excessEl);

    mount.appendChild(svg);
    mount.appendChild(panel);

    // ── Update / redraw ─────────────────────────────────
    function redraw() {
      trajPath.setAttribute("d", pathD(knots));
      for (let i = 0; i < knots.length; i++) {
        knotEls[i].setAttribute("cx", tToX(knots[i].t));
        knotEls[i].setAttribute("cy", xToY(knots[i].x));
        if (!knots[i].fixed) {
          knotEls[i].setAttribute("aria-valuenow", knots[i].x.toFixed(2));
        }
      }
      const S = computeAction(knots);
      sEl.textContent = "S = " + S.toFixed(4);
      const excess = S - S_MIN;
      // Bar fills proportional to how close to minimum, capped at 4× minimum
      const ratio = clamp(excess / (4 * S_MIN), 0, 1);
      barFill.style.width = (ratio * 100).toFixed(1) + "%";
      if (excess < 0.01) {
        excessEl.textContent = "At the minimum. δS = 0 — this is the classical trajectory.";
        sEl.style.color = "#2c6e1f";
      } else if (excess < 0.2) {
        excessEl.textContent = "Close to the minimum. Most variations now increase S.";
        sEl.style.color = "#1f1c1a";
      } else {
        excessEl.textContent = "Far from the classical path; the action is well above its minimum value.";
        sEl.style.color = "#1f1c1a";
      }
    }

    // ── Drag handling ──────────────────────────────────
    let dragging = null;

    function pointFromEvent(ev) {
      const pt = svg.createSVGPoint();
      const touch = ev.touches && ev.touches[0];
      pt.x = touch ? touch.clientX : ev.clientX;
      pt.y = touch ? touch.clientY : ev.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
    }

    function onDown(ev) {
      const target = ev.target;
      if (target && target.dataset && target.dataset.idx !== undefined) {
        dragging = parseInt(target.dataset.idx, 10);
        target.style.cursor = "grabbing";
        ev.preventDefault();
      }
    }
    function onMove(ev) {
      if (dragging === null) return;
      const p = pointFromEvent(ev);
      if (!p) return;
      const newX = clamp(yToX(p.y), X_MIN, X_MAX);
      knots[dragging].x = newX;
      redraw();
      ev.preventDefault();
    }
    function onUp() {
      if (dragging !== null) {
        knotEls[dragging].style.cursor = "grab";
        dragging = null;
      }
    }

    svg.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    svg.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    // Keyboard support: focus a knot and use arrow keys
    knotEls.forEach((el, i) => {
      if (knots[i].fixed) return;
      el.addEventListener("keydown", (ev) => {
        let delta = 0;
        switch (ev.key) {
          case "ArrowUp": delta = 0.05; break;
          case "ArrowDown": delta = -0.05; break;
          case "PageUp": delta = 0.2; break;
          case "PageDown": delta = -0.2; break;
          default: return;
        }
        knots[i].x = clamp(knots[i].x + delta, X_MIN, X_MAX);
        redraw();
        ev.preventDefault();
      });
    });

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='action-sandbox']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
