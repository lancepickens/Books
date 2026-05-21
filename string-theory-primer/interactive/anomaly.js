/* Interactive · Anomaly cancellation vs spacetime dimension D.

   Top plot:    c_total(D) = D − 26
   Bottom plot: α' M² at level 1 = 1 − (D − 2)/24
   Both vanish at D = 26. */

(function () {
  "use strict";

  const W = 660, H = 360;
  const padL = 56, padR = 24, padT = 24, padB = 50;
  const plotW = W - padL - padR;
  const plotH = (H - padT - padB - 28) / 2;  // two stacked plots with a gap

  const D_MIN = 4, D_MAX = 40;

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let D = 10;  // initial

    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Anomaly cancellation"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.touchAction = "none";

    function dToPx(d) { return padL + ((d - D_MIN) / (D_MAX - D_MIN)) * plotW; }
    function pxToD(px) { return D_MIN + ((px - padL) / plotW) * (D_MAX - D_MIN); }

    // Two y-ranges, picked for visual clarity
    function cToPx(c, topY) {
      // c range plotted: [-30, +20]; zero at midline
      const yMin = -30, yMax = 20;
      return topY + plotH - ((c - yMin) / (yMax - yMin)) * plotH;
    }
    function mToPx(m, topY) {
      // M² range: [-2, 2]; zero at midline
      const yMin = -2, yMax = 2;
      return topY + plotH - ((m - yMin) / (yMax - yMin)) * plotH;
    }

    const topY = padT;
    const botY = padT + plotH + 28;

    // Plot frames
    [topY, botY].forEach(y => {
      svg.appendChild(makeSvgEl("rect", {
        x: padL, y: y, width: plotW, height: plotH,
        fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
      }));
    });

    // Zero lines
    const cZeroY = cToPx(0, topY);
    const mZeroY = mToPx(0, botY);
    svg.appendChild(makeSvgEl("line", {
      x1: padL, y1: cZeroY, x2: padL + plotW, y2: cZeroY,
      stroke: "#d3cabd", "stroke-width": 1, "stroke-dasharray": "4 4"
    }));
    svg.appendChild(makeSvgEl("line", {
      x1: padL, y1: mZeroY, x2: padL + plotW, y2: mZeroY,
      stroke: "#d3cabd", "stroke-width": 1, "stroke-dasharray": "4 4"
    }));

    // c_total curve
    const cPath = makeSvgEl("path", { fill: "none", stroke: "#1f1c1a", "stroke-width": 2 });
    const mPath = makeSvgEl("path", { fill: "none", stroke: "#1f1c1a", "stroke-width": 2 });
    {
      let d1 = "", d2 = "";
      const N = 200;
      for (let i = 0; i <= N; i++) {
        const d = D_MIN + (i / N) * (D_MAX - D_MIN);
        const c = d - 26;
        const m = 1 - (d - 2) / 24;
        const cmd1 = (i === 0 ? "M " : "L ") + dToPx(d).toFixed(2) + "," + cToPx(c, topY).toFixed(2) + " ";
        const cmd2 = (i === 0 ? "M " : "L ") + dToPx(d).toFixed(2) + "," + mToPx(m, botY).toFixed(2) + " ";
        d1 += cmd1; d2 += cmd2;
      }
      cPath.setAttribute("d", d1.trim());
      mPath.setAttribute("d", d2.trim());
    }
    svg.appendChild(cPath);
    svg.appendChild(mPath);

    // D=26 vertical line
    svg.appendChild(makeSvgEl("line", {
      x1: dToPx(26), y1: topY, x2: dToPx(26), y2: botY + plotH,
      stroke: "#a83e2a", "stroke-width": 1.2, "stroke-dasharray": "5 4", opacity: 0.75
    }));
    const d26Lbl = makeSvgEl("text", {
      x: dToPx(26) + 5, y: topY + 14,
      "font-family": "Inter, sans-serif", "font-size": "10",
      fill: "#a83e2a", "font-weight": "600"
    });
    d26Lbl.textContent = "D = 26";
    svg.appendChild(d26Lbl);

    // Labels for plot panels
    const lbl1 = makeSvgEl("text", {
      x: padL + 8, y: topY + 14,
      "font-family": "Inter, sans-serif", "font-size": "11",
      fill: "#6f6a63", "font-weight": "600", "letter-spacing": "1.5"
    });
    lbl1.textContent = "TOTAL CENTRAL CHARGE  c = D − 26";
    svg.appendChild(lbl1);
    const lbl2 = makeSvgEl("text", {
      x: padL + 8, y: botY + 14,
      "font-family": "Inter, sans-serif", "font-size": "11",
      fill: "#6f6a63", "font-weight": "600", "letter-spacing": "1.5"
    });
    lbl2.textContent = "LEVEL-1 MASS²  α′M² = 1 − (D − 2)/24";
    svg.appendChild(lbl2);

    // X axis labels (D ticks)
    const axisStyle = { "font-family": "Inter, sans-serif", "font-size": "11", fill: "#6f6a63" };
    [4, 10, 16, 22, 26, 32, 40].forEach(d => {
      const px = dToPx(d);
      svg.appendChild(makeSvgEl("line", { x1: px, y1: botY + plotH, x2: px, y2: botY + plotH + 4, stroke: "#9a9389" }));
      const lbl = makeSvgEl("text", Object.assign({ x: px, y: botY + plotH + 18, "text-anchor": "middle" }, axisStyle));
      lbl.textContent = String(d);
      svg.appendChild(lbl);
    });
    const xT = makeSvgEl("text", {
      x: padL + plotW / 2, y: H - 8, "text-anchor": "middle",
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    xT.textContent = "spacetime dimension D";
    svg.appendChild(xT);

    // Markers + draggable D
    const cDot = makeSvgEl("circle", { r: 6, fill: "#a83e2a", stroke: "#fbfaf7", "stroke-width": 2 });
    const mDot = makeSvgEl("circle", { r: 6, fill: "#a83e2a", stroke: "#fbfaf7", "stroke-width": 2 });
    svg.appendChild(cDot); svg.appendChild(mDot);

    // Vertical guide for current D
    const guide = makeSvgEl("line", {
      stroke: "#1f1c1a", "stroke-width": 1, "stroke-dasharray": "2 3", opacity: 0.6
    });
    svg.appendChild(guide);

    mount.appendChild(svg);

    // Readout
    const panel = document.createElement("div");
    panel.style.marginTop = "0.85rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr 1fr";
    panel.style.gap = "0.5rem 1.5rem";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";
    function mkStat(text, color) {
      const wrap = document.createElement("div");
      const lbl = document.createElement("div");
      lbl.style.cssText = "font-family: Inter, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: " + color + "; font-weight: 700; margin-bottom: 0.15rem";
      lbl.textContent = text;
      const val = document.createElement("div");
      val.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.35rem; font-weight: 600; color: #1f1c1a";
      wrap.appendChild(lbl); wrap.appendChild(val);
      return { wrap, val };
    }
    const dStat = mkStat("Spacetime dim D", "#6f6a63");
    const cStat = mkStat("Anomaly  c = D − 26", "#a83e2a");
    const mStat = mkStat("Level-1  α′M²", "#a83e2a");
    panel.appendChild(dStat.wrap); panel.appendChild(cStat.wrap); panel.appendChild(mStat.wrap);
    mount.appendChild(panel);

    function setD(d) {
      D = Math.max(D_MIN, Math.min(D_MAX, d));
      const px = dToPx(D);
      guide.setAttribute("x1", px); guide.setAttribute("x2", px);
      guide.setAttribute("y1", topY); guide.setAttribute("y2", botY + plotH);
      const c = D - 26;
      const m = 1 - (D - 2) / 24;
      cDot.setAttribute("cx", px); cDot.setAttribute("cy", cToPx(c, topY));
      mDot.setAttribute("cx", px); mDot.setAttribute("cy", mToPx(m, botY));
      dStat.val.textContent = D.toFixed(2);
      cStat.val.textContent = (c >= 0 ? "+" : "") + c.toFixed(2);
      cStat.val.style.color = Math.abs(c) < 0.05 ? "#2c6e1f" : "#1f1c1a";
      mStat.val.textContent = (m >= 0 ? "+" : "") + m.toFixed(3);
      mStat.val.style.color = Math.abs(m) < 0.005 ? "#2c6e1f" : "#1f1c1a";
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
    svg.addEventListener("mousedown", (ev) => { dragging = true; const p = pointFromEvent(ev); if (p) setD(pxToD(p.x)); ev.preventDefault(); });
    svg.addEventListener("touchstart", (ev) => { dragging = true; const p = pointFromEvent(ev); if (p) setD(pxToD(p.x)); ev.preventDefault(); }, { passive: false });
    window.addEventListener("mousemove", (ev) => { if (!dragging) return; const p = pointFromEvent(ev); if (p) setD(pxToD(p.x)); });
    window.addEventListener("touchmove", (ev) => { if (!dragging) return; const p = pointFromEvent(ev); if (p) setD(pxToD(p.x)); ev.preventDefault(); }, { passive: false });
    window.addEventListener("mouseup", () => { dragging = false; });
    window.addEventListener("touchend", () => { dragging = false; });

    setD(D);
  }

  function start() {
    document.querySelectorAll("[data-widget='anomaly']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
