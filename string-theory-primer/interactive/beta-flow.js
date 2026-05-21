/* Interactive · α′ expansion of β^g.

   Schematically: β^g_μν ~ R_μν · [1 + c_1 (α'K) + c_2 (α'K)² + c_3 (α'K)³ + …]
   For visualization we plot the relative size of each order on a log scale
   against the dimensionless curvature x = α' K. */

(function () {
  "use strict";

  const W = 660, H = 320;
  const padL = 56, padR = 24, padT = 28, padB = 52;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // x = α' K, plotted on log scale from 10^-3 to 10^1
  const X_MIN_LOG = -3, X_MAX_LOG = 1;
  // y = relative contribution, log scale from 10^-6 to 10^1
  const Y_MIN_LOG = -6, Y_MAX_LOG = 1;

  // Term coefficients (schematic — chosen for visual clarity, not literal)
  const TERMS = [
    { n: 0, label: "R  (Einstein)",      color: "#1f1c1a" },
    { n: 1, label: "α′ R²",              color: "#a83e2a" },
    { n: 2, label: "α′² R³",             color: "#1e5b8a" },
    { n: 3, label: "α′³ R⁴",             color: "#6f6a63" }
  ];

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function logXToPx(lx) { return padL + ((lx - X_MIN_LOG) / (X_MAX_LOG - X_MIN_LOG)) * plotW; }
  function pxToLogX(px) { return X_MIN_LOG + ((px - padL) / plotW) * (X_MAX_LOG - X_MIN_LOG); }
  function logYToPx(ly) { return padT + plotH - ((ly - Y_MIN_LOG) / (Y_MAX_LOG - Y_MIN_LOG)) * plotH; }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let xCur = 0.1;  // current α' K

    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "α' expansion of beta function"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.touchAction = "none";

    // Frame
    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    // X grid (decades)
    for (let lx = X_MIN_LOG; lx <= X_MAX_LOG; lx++) {
      const px = logXToPx(lx);
      svg.appendChild(makeSvgEl("line", { x1: px, y1: padT, x2: px, y2: padT + plotH, stroke: "#efe9dd", "stroke-width": 1 }));
    }
    // Y grid
    for (let ly = Y_MIN_LOG; ly <= Y_MAX_LOG; ly++) {
      const py = logYToPx(ly);
      svg.appendChild(makeSvgEl("line", { x1: padL, y1: py, x2: padL + plotW, y2: py, stroke: "#efe9dd", "stroke-width": 1 }));
    }

    // Axes labels
    const axisStyle = { "font-family": "Inter, sans-serif", "font-size": "11", fill: "#6f6a63" };
    for (let lx = X_MIN_LOG; lx <= X_MAX_LOG; lx++) {
      const px = logXToPx(lx);
      const lbl = makeSvgEl("text", Object.assign({ x: px, y: padT + plotH + 16, "text-anchor": "middle" }, axisStyle));
      lbl.textContent = "10" + supDigits(lx);
      svg.appendChild(lbl);
    }
    for (let ly = Y_MIN_LOG; ly <= Y_MAX_LOG; ly++) {
      const py = logYToPx(ly);
      const lbl = makeSvgEl("text", Object.assign({ x: padL - 8, y: py + 4, "text-anchor": "end" }, axisStyle));
      lbl.textContent = "10" + supDigits(ly);
      svg.appendChild(lbl);
    }

    const xT = makeSvgEl("text", {
      x: padL + plotW / 2, y: H - 12, "text-anchor": "middle",
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    xT.textContent = "α′ K  (dimensionless curvature)";
    svg.appendChild(xT);

    const yT = makeSvgEl("text", {
      x: 16, y: padT + plotH / 2, "text-anchor": "middle",
      transform: `rotate(-90, 16, ${padT + plotH / 2})`,
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    yT.textContent = "relative size of term";
    svg.appendChild(yT);

    // Plot the term curves: relative size at α'K = x is x^n
    TERMS.forEach((term, idx) => {
      let d = "";
      const N = 200;
      for (let i = 0; i <= N; i++) {
        const lx = X_MIN_LOG + (i / N) * (X_MAX_LOG - X_MIN_LOG);
        const x = Math.pow(10, lx);
        const val = Math.pow(x, term.n);
        if (val <= 0) continue;
        const ly = Math.log10(val);
        if (ly < Y_MIN_LOG) continue;
        const px = logXToPx(lx);
        const py = logYToPx(Math.min(Y_MAX_LOG, ly));
        d += (d === "" ? "M " : "L ") + px.toFixed(2) + "," + py.toFixed(2) + " ";
      }
      const p = makeSvgEl("path", {
        d: d.trim(), fill: "none", stroke: term.color, "stroke-width": 2
      });
      svg.appendChild(p);
    });

    // Current α'K vertical guide
    const guide = makeSvgEl("line", {
      stroke: "#1f1c1a", "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0.5,
      y1: padT, y2: padT + plotH
    });
    svg.appendChild(guide);

    // Markers at current x
    const dots = TERMS.map(term => makeSvgEl("circle", { r: 5, fill: term.color, stroke: "#fbfaf7", "stroke-width": 2 }));
    dots.forEach(d => svg.appendChild(d));

    // Legend
    const legend = makeSvgEl("g");
    TERMS.forEach((term, i) => {
      const lx = padL + plotW - 130;
      const ly = padT + 12 + i * 16;
      legend.appendChild(makeSvgEl("line", { x1: lx, y1: ly, x2: lx + 20, y2: ly, stroke: term.color, "stroke-width": 2 }));
      const lbl = makeSvgEl("text", { x: lx + 26, y: ly + 4, "font-family": "Inter, sans-serif", "font-size": "11", fill: "#1f1c1a" });
      lbl.textContent = term.label;
      legend.appendChild(lbl);
    });
    svg.appendChild(legend);

    mount.appendChild(svg);

    // Readout
    const panel = document.createElement("div");
    panel.style.marginTop = "0.85rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "auto 1fr";
    panel.style.gap = "0.5rem 1rem";
    panel.style.alignItems = "baseline";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";

    const dStat = document.createElement("div");
    dStat.style.cssText = "font-family: Inter, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: #6f6a63; font-weight: 700;";
    dStat.textContent = "current α′ K";
    const dVal = document.createElement("div");
    dVal.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.4rem; font-weight: 600; color: #1f1c1a";
    panel.appendChild(dStat); panel.appendChild(dVal);

    const regimeStat = document.createElement("div");
    regimeStat.style.cssText = "font-family: Inter, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: #a83e2a; font-weight: 700;";
    regimeStat.textContent = "regime";
    const regimeVal = document.createElement("div");
    regimeVal.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.1rem; font-style: italic; color: #1f1c1a";
    panel.appendChild(regimeStat); panel.appendChild(regimeVal);

    mount.appendChild(panel);

    function setX(x) {
      xCur = Math.max(Math.pow(10, X_MIN_LOG), Math.min(Math.pow(10, X_MAX_LOG), x));
      const px = logXToPx(Math.log10(xCur));
      guide.setAttribute("x1", px); guide.setAttribute("x2", px);
      TERMS.forEach((term, i) => {
        const val = Math.pow(xCur, term.n);
        const ly = Math.log10(val);
        const py = logYToPx(Math.max(Y_MIN_LOG, Math.min(Y_MAX_LOG, ly)));
        dots[i].setAttribute("cx", px);
        dots[i].setAttribute("cy", py);
      });
      dVal.textContent = xCur < 0.01 ? xCur.toExponential(2) : xCur.toFixed(3);
      if (xCur < 0.05) regimeVal.textContent = "Einstein-dominated — GR is an excellent approximation";
      else if (xCur < 0.3) regimeVal.textContent = "stringy corrections becoming visible";
      else regimeVal.textContent = "expansion breaking down — full string theory required";
    }

    // Drag
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
    svg.addEventListener("mousedown", (ev) => { dragging = true; const p = pointFromEvent(ev); if (p) setX(Math.pow(10, pxToLogX(p.x))); ev.preventDefault(); });
    svg.addEventListener("touchstart", (ev) => { dragging = true; const p = pointFromEvent(ev); if (p) setX(Math.pow(10, pxToLogX(p.x))); ev.preventDefault(); }, { passive: false });
    window.addEventListener("mousemove", (ev) => { if (!dragging) return; const p = pointFromEvent(ev); if (p) setX(Math.pow(10, pxToLogX(p.x))); });
    window.addEventListener("touchmove", (ev) => { if (!dragging) return; const p = pointFromEvent(ev); if (p) setX(Math.pow(10, pxToLogX(p.x))); ev.preventDefault(); }, { passive: false });
    window.addEventListener("mouseup", () => { dragging = false; });
    window.addEventListener("touchend", () => { dragging = false; });

    setX(xCur);
  }

  function supDigits(n) {
    const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(n).split("").map(c => map[c] || c).join("");
  }

  function start() {
    document.querySelectorAll("[data-widget='beta-flow']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
