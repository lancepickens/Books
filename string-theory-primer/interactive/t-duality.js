/* Interactive · T-duality: KK vs winding spectrum as a function of radius R.
   Uses α' = 1, so the self-dual radius is R* = 1. */

(function () {
  "use strict";

  const W = 660, H = 340;
  const padL = 60, padR = 30, padT = 30, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const ALPHA = 1.0;
  const R_MIN_LOG = -1.2, R_MAX_LOG = 1.2;
  const M_MAX = 5;

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function rToPx(logR) { return padL + ((logR - R_MIN_LOG) / (R_MAX_LOG - R_MIN_LOG)) * plotW; }
  function pxToLogR(px) { return R_MIN_LOG + ((px - padL) / plotW) * (R_MAX_LOG - R_MIN_LOG); }
  function mToPy(m) { return padT + plotH - (m / M_MAX) * plotH; }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let R = 1.0;

    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "T-duality spectrum"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.touchAction = "none";

    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    // Self-dual line at R = √α' = 1, so log10(R) = 0
    svg.appendChild(makeSvgEl("line", {
      x1: rToPx(0), y1: padT, x2: rToPx(0), y2: padT + plotH,
      stroke: "#a83e2a", "stroke-width": 1.4, "stroke-dasharray": "5 5", opacity: 0.7
    }));
    const sdLbl = makeSvgEl("text", {
      x: rToPx(0) + 6, y: padT + 14,
      "font-family": "Inter, sans-serif", "font-size": "10", fill: "#a83e2a", "font-weight": "700"
    });
    sdLbl.textContent = "R = √α′  (self-dual)";
    svg.appendChild(sdLbl);

    // Plot KK curves: m = |n|/R for n = 1..4
    // Plot winding curves: m = |w| R / α' for w = 1..4
    const N_MAX = 4;
    const curveGroupKK = makeSvgEl("g");
    const curveGroupW = makeSvgEl("g");
    svg.appendChild(curveGroupKK);
    svg.appendChild(curveGroupW);

    function curveD(modeFn) {
      const N = 200;
      let d = "";
      let started = false;
      for (let i = 0; i <= N; i++) {
        const logR = R_MIN_LOG + (i / N) * (R_MAX_LOG - R_MIN_LOG);
        const Rval = Math.pow(10, logR);
        const m = modeFn(Rval);
        if (m > M_MAX) { started = false; continue; }
        const px = rToPx(logR);
        const py = mToPy(m);
        d += (started ? "L " : "M ") + px.toFixed(2) + "," + py.toFixed(2) + " ";
        started = true;
      }
      return d.trim();
    }

    for (let n = 1; n <= N_MAX; n++) {
      const p = makeSvgEl("path", {
        d: curveD(r => n / r),
        fill: "none", stroke: "#1e5b8a",
        "stroke-width": 1.8, opacity: clamp(1 - (n - 1) / N_MAX, 0.35, 1)
      });
      curveGroupKK.appendChild(p);
    }
    for (let w = 1; w <= N_MAX; w++) {
      const p = makeSvgEl("path", {
        d: curveD(r => w * r / ALPHA),
        fill: "none", stroke: "#a83e2a",
        "stroke-width": 1.8, opacity: clamp(1 - (w - 1) / N_MAX, 0.35, 1)
      });
      curveGroupW.appendChild(p);
    }

    // Axes
    const axisStyle = { "font-family": "Inter, sans-serif", "font-size": "11", fill: "#6f6a63" };
    // X axis: log10(R) ticks
    [-1, -0.5, 0, 0.5, 1].forEach(lr => {
      const px = rToPx(lr);
      svg.appendChild(makeSvgEl("line", { x1: px, y1: padT + plotH, x2: px, y2: padT + plotH + 4, stroke: "#9a9389" }));
      const lbl = makeSvgEl("text", Object.assign({ x: px, y: padT + plotH + 18, "text-anchor": "middle" }, axisStyle));
      lbl.textContent = (lr === 0) ? "1" : ((lr === 1) ? "10" : ((lr === -1) ? "0.1" : Math.pow(10, lr).toFixed(2)));
      svg.appendChild(lbl);
    });
    for (let m = 0; m <= M_MAX; m++) {
      const py = mToPy(m);
      svg.appendChild(makeSvgEl("line", { x1: padL - 4, y1: py, x2: padL, y2: py, stroke: "#9a9389" }));
      const lbl = makeSvgEl("text", Object.assign({ x: padL - 8, y: py + 4, "text-anchor": "end" }, axisStyle));
      lbl.textContent = String(m);
      svg.appendChild(lbl);
    }
    const xT = makeSvgEl("text", {
      x: padL + plotW / 2, y: H - 14, "text-anchor": "middle",
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    xT.textContent = "compactification radius  R  (units of √α′)";
    svg.appendChild(xT);
    const yT = makeSvgEl("text", {
      x: 16, y: padT + plotH / 2, "text-anchor": "middle",
      transform: `rotate(-90, 16, ${padT + plotH / 2})`,
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    yT.textContent = "mass  M  (units of 1/√α′)";
    svg.appendChild(yT);

    // Legend
    const legend = makeSvgEl("g");
    [
      { color: "#1e5b8a", label: "KK modes  m = |n| / R" },
      { color: "#a83e2a", label: "Winding modes  m = |w| R / α′" }
    ].forEach((it, i) => {
      const lx = padL + 12, ly = padT + 12 + i * 16;
      legend.appendChild(makeSvgEl("line", { x1: lx, y1: ly, x2: lx + 18, y2: ly, stroke: it.color, "stroke-width": 2 }));
      const lbl = makeSvgEl("text", { x: lx + 24, y: ly + 4, "font-family": "Inter, sans-serif", "font-size": "11", fill: "#1f1c1a" });
      lbl.textContent = it.label;
      legend.appendChild(lbl);
    });
    svg.appendChild(legend);

    // Current R guide
    const guide = makeSvgEl("line", {
      stroke: "#1f1c1a", "stroke-width": 1, "stroke-dasharray": "2 3", opacity: 0.5,
      y1: padT, y2: padT + plotH
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
      val.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.3rem; font-weight: 600; color: #1f1c1a";
      wrap.appendChild(lbl); wrap.appendChild(val);
      return { wrap, val };
    }
    const sR = mkStat("Radius R", "#6f6a63");
    const sDual = mkStat("T-dual radius α′/R", "#6f6a63");
    const sLight = mkStat("Lightest non-zero mode", "#a83e2a");
    panel.appendChild(sR.wrap); panel.appendChild(sDual.wrap); panel.appendChild(sLight.wrap);
    mount.appendChild(panel);

    function setR(r) {
      R = clamp(r, Math.pow(10, R_MIN_LOG), Math.pow(10, R_MAX_LOG));
      const px = rToPx(Math.log10(R));
      guide.setAttribute("x1", px); guide.setAttribute("x2", px);
      sR.val.textContent = R.toFixed(3);
      sDual.val.textContent = (ALPHA / R).toFixed(3);
      const kk1 = 1 / R;
      const w1 = R / ALPHA;
      const light = Math.min(kk1, w1);
      const which = (kk1 <= w1) ? "KK (n=1)" : "winding (w=1)";
      sLight.val.textContent = light.toFixed(3) + "  · " + which;
    }

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
    svg.addEventListener("mousedown", (ev) => { dragging = true; const p = pointFromEvent(ev); if (p) setR(Math.pow(10, pxToLogR(p.x))); ev.preventDefault(); });
    svg.addEventListener("touchstart", (ev) => { dragging = true; const p = pointFromEvent(ev); if (p) setR(Math.pow(10, pxToLogR(p.x))); ev.preventDefault(); }, { passive: false });
    window.addEventListener("mousemove", (ev) => { if (!dragging) return; const p = pointFromEvent(ev); if (p) setR(Math.pow(10, pxToLogR(p.x))); });
    window.addEventListener("touchmove", (ev) => { if (!dragging) return; const p = pointFromEvent(ev); if (p) setR(Math.pow(10, pxToLogR(p.x))); ev.preventDefault(); }, { passive: false });
    window.addEventListener("mouseup", () => { dragging = false; });
    window.addEventListener("touchend", () => { dragging = false; });

    setR(R);
  }

  function start() {
    document.querySelectorAll("[data-widget='t-duality']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
