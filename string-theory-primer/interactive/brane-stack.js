/* Interactive · Brane stack and Higgs mechanism.
   Draws N parallel branes; user drags one along a transverse direction.
   Computes massless / massive open-string spectrum. */

(function () {
  "use strict";

  const N = 4;
  const W = 660, H = 320;
  const padL = 50, padR = 40, padT = 30, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const Y_MAX = 4;
  const Y_MIN = -1;

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function yToPy(y) { return padT + plotH - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * plotH; }
  function pyToY(py) { return Y_MIN + (1 - (py - padT) / plotH) * (Y_MAX - Y_MIN); }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    // Initial brane positions
    const branes = [0.0, 0.0, 0.0, 0.0];

    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Brane stack"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.touchAction = "none";
    svg.style.userSelect = "none";

    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    // y axis ticks
    const axisStyle = { "font-family": "Inter, sans-serif", "font-size": "11", fill: "#6f6a63" };
    for (let y = Y_MIN; y <= Y_MAX; y++) {
      const py = yToPy(y);
      svg.appendChild(makeSvgEl("line", { x1: padL - 4, y1: py, x2: padL, y2: py, stroke: "#9a9389" }));
      const txt = makeSvgEl("text", Object.assign({ x: padL - 8, y: py + 4, "text-anchor": "end" }, axisStyle));
      txt.textContent = String(y);
      svg.appendChild(txt);
    }
    const yT = makeSvgEl("text", {
      x: 14, y: padT + plotH / 2, "text-anchor": "middle",
      transform: `rotate(-90, 14, ${padT + plotH / 2})`,
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    yT.textContent = "transverse position  y  (units of √α′)";
    svg.appendChild(yT);

    // Brane group + string group (rebuild each redraw)
    const stringGroup = makeSvgEl("g");
    const braneGroup = makeSvgEl("g");
    svg.appendChild(stringGroup);
    svg.appendChild(braneGroup);

    // Build brane elements (lines + handle)
    const braneEls = [];
    const handleEls = [];
    for (let i = 0; i < N; i++) {
      const line = makeSvgEl("line", {
        x1: padL + 60, x2: padL + plotW - 60,
        stroke: "#1f1c1a", "stroke-width": 3, "stroke-linecap": "round"
      });
      braneGroup.appendChild(line);
      braneEls.push(line);

      // Handle in the middle of the brane
      const handle = makeSvgEl("circle", {
        r: 10, fill: "#a83e2a", stroke: "#fbfaf7", "stroke-width": 2
      });
      handle.style.cursor = "grab";
      handle.setAttribute("tabindex", "0");
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-label", `Brane ${i+1} position`);
      handle.dataset.idx = String(i);
      braneGroup.appendChild(handle);
      handleEls.push(handle);

      // Brane label
      const lbl = makeSvgEl("text", {
        "font-family": "Inter, sans-serif", "font-size": "10",
        fill: "#6f6a63", "text-anchor": "end"
      });
      lbl.textContent = "D-brane " + (i + 1);
      braneGroup.appendChild(lbl);
      handle.dataset.lblIdx = String(braneGroup.children.length - 1);
    }

    mount.appendChild(svg);

    // Readout
    const panel = document.createElement("div");
    panel.style.marginTop = "0.85rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr";
    panel.style.gap = "0.5rem 1.5rem";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";
    panel.style.alignItems = "baseline";

    const masslessLbl = document.createElement("div");
    masslessLbl.style.cssText = "font-family: Inter, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: #2c6e1f; font-weight: 700; margin-bottom: 0.15rem";
    masslessLbl.textContent = "Massless gauge bosons (coincident brane pairs)";
    const masslessVal = document.createElement("div");
    masslessVal.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.3rem; font-weight: 600; color: #1f1c1a";

    const massiveLbl = document.createElement("div");
    massiveLbl.style.cssText = "font-family: Inter, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: #a83e2a; font-weight: 700; margin-bottom: 0.15rem";
    massiveLbl.textContent = "Massive  W  bosons (separated brane pairs)";
    const massiveVal = document.createElement("div");
    massiveVal.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.3rem; font-weight: 600; color: #1f1c1a";

    const colA = document.createElement("div");
    colA.appendChild(masslessLbl); colA.appendChild(masslessVal);
    const colB = document.createElement("div");
    colB.appendChild(massiveLbl); colB.appendChild(massiveVal);
    panel.appendChild(colA); panel.appendChild(colB);

    const gaugeLbl = document.createElement("div");
    gaugeLbl.style.cssText = "grid-column: 1 / -1; font-family: 'Source Serif 4', Georgia, serif; font-size: 0.95rem; font-style: italic; color: #6f6a63; margin-top: 0.1rem";
    panel.appendChild(gaugeLbl);

    mount.appendChild(panel);

    // Layout helpers
    function brXMid(i) {
      // spread along x for clarity (anchor positions along the worldvolume axis)
      const left = padL + 100, right = padL + plotW - 100;
      const t = (N === 1) ? 0.5 : i / (N - 1);
      return left + t * (right - left);
    }

    function redraw() {
      // Update brane lines + handles + labels
      for (let i = 0; i < N; i++) {
        const py = yToPy(branes[i]);
        braneEls[i].setAttribute("y1", py);
        braneEls[i].setAttribute("y2", py);
        handleEls[i].setAttribute("cx", brXMid(i));
        handleEls[i].setAttribute("cy", py);
        handleEls[i].setAttribute("aria-valuenow", branes[i].toFixed(2));
        // Move label
        const labelIdx = parseInt(handleEls[i].dataset.lblIdx, 10);
        const lbl = braneGroup.children[labelIdx];
        lbl.setAttribute("x", padL + plotW - 65);
        lbl.setAttribute("y", py - 6);
      }
      // Strings between every pair (i, j) — draw as light curves between handles
      stringGroup.innerHTML = "";
      let parts = "";
      let massless = 0, massive = 0;
      const tol = 0.02;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const sep = Math.abs(branes[i] - branes[j]);
          const x1 = brXMid(i), x2 = brXMid(j);
          const y1 = yToPy(branes[i]), y2 = yToPy(branes[j]);
          const mid = ((x1 + x2) / 2) + 30 * Math.sin((i + j) * 1.7);
          const ctlY = (y1 + y2) / 2;
          const color = (sep < tol) ? "#2c6e1f" : "#a83e2a";
          const opacity = (sep < tol) ? 0.55 : 0.85;
          const sw = (sep < tol) ? 1 : 1.6;
          parts += `<path d="M ${x1.toFixed(1)},${y1.toFixed(1)} Q ${mid.toFixed(1)},${ctlY.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" />`;
          if (sep < tol) massless++; else massive++;
        }
      }
      stringGroup.innerHTML = parts;
      // U(N) → product breakdown
      // count clusters of coincident branes (tol)
      const groups = [];
      const used = new Array(N).fill(false);
      for (let i = 0; i < N; i++) {
        if (used[i]) continue;
        const grp = [i]; used[i] = true;
        for (let j = i + 1; j < N; j++) {
          if (!used[j] && Math.abs(branes[i] - branes[j]) < tol) { grp.push(j); used[j] = true; }
        }
        groups.push(grp.length);
      }
      groups.sort((a, b) => b - a);
      const gaugeName = groups.map(k => `U(${k})`).join(" × ");
      masslessVal.textContent = String(2 * massless + N);   // each pair contributes 2 (i→j and j→i), plus N diagonals
      massiveVal.textContent = String(2 * massive);
      gaugeLbl.textContent = "Unbroken gauge group:  " + gaugeName +
        ((groups.length === 1 && groups[0] === N) ? "  (full unbroken)" : "  (broken)");
    }

    // Drag
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
    for (let i = 0; i < N; i++) {
      const h = handleEls[i];
      h.addEventListener("mousedown", (ev) => { dragging = i; h.style.cursor = "grabbing"; ev.preventDefault(); });
      h.addEventListener("touchstart", (ev) => { dragging = i; ev.preventDefault(); }, { passive: false });
      h.addEventListener("keydown", (ev) => {
        const step = 0.1;
        switch (ev.key) {
          case "ArrowUp": branes[i] = clamp(branes[i] + step, Y_MIN, Y_MAX); break;
          case "ArrowDown": branes[i] = clamp(branes[i] - step, Y_MIN, Y_MAX); break;
          default: return;
        }
        redraw();
        ev.preventDefault();
      });
    }
    window.addEventListener("mousemove", (ev) => {
      if (dragging === null) return;
      const p = pointFromEvent(ev); if (!p) return;
      branes[dragging] = clamp(pyToY(p.y), Y_MIN, Y_MAX);
      redraw();
    });
    window.addEventListener("touchmove", (ev) => {
      if (dragging === null) return;
      const p = pointFromEvent(ev); if (!p) return;
      branes[dragging] = clamp(pyToY(p.y), Y_MIN, Y_MAX);
      redraw();
      ev.preventDefault();
    }, { passive: false });
    window.addEventListener("mouseup", () => { if (dragging !== null) { handleEls[dragging].style.cursor = "grab"; dragging = null; } });
    window.addEventListener("touchend", () => { dragging = null; });

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='brane-stack']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
