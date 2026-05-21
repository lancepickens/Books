/* Interactive · Kaluza–Klein tower on S^1.
   Modes M_n = n/R for n ∈ {0, ±1, ±2, …}; user adjusts R. */

(function () {
  "use strict";

  const W = 660, H = 320;
  const padL = 60, padR = 24, padT = 30, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const N_MAX = 6;       // modes ±1 … ±N_MAX
  const M_MAX = 8;       // plot range for M (units of 1/R₀ where R₀ = 1)
  const R_MIN = 0.2, R_MAX = 3;

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let R = 1.0;

    // Slider
    const ctl = document.createElement("div");
    ctl.style.display = "flex";
    ctl.style.alignItems = "center";
    ctl.style.gap = "0.7rem";
    ctl.style.marginBottom = "0.9rem";
    ctl.style.fontFamily = "Inter, sans-serif";
    ctl.style.fontSize = "0.85rem";

    const lbl = document.createElement("span");
    lbl.style.color = "#6f6a63";
    lbl.style.fontWeight = "500";
    lbl.style.minWidth = "12ch";
    lbl.textContent = "Compact radius R";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(R_MIN); slider.max = String(R_MAX); slider.step = "0.01";
    slider.value = String(R);
    slider.style.accentColor = "#a83e2a";
    slider.style.flex = "1";
    slider.style.maxWidth = "20rem";
    const val = document.createElement("span");
    val.style.color = "#1f1c1a";
    val.style.fontFeatureSettings = "'tnum'";
    val.style.minWidth = "5ch";
    val.textContent = R.toFixed(2);
    slider.addEventListener("input", () => {
      R = +slider.value;
      val.textContent = R.toFixed(2);
      redraw();
    });
    ctl.appendChild(lbl); ctl.appendChild(slider); ctl.appendChild(val);
    mount.appendChild(ctl);

    // SVG
    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Kaluza-Klein tower"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    function mToY(m) {
      return padT + plotH - (m / M_MAX) * plotH;
    }

    // y axis ticks
    const axisStyle = { "font-family": "Inter, sans-serif", "font-size": "11", fill: "#6f6a63" };
    for (let m = 0; m <= M_MAX; m += 2) {
      const py = mToY(m);
      svg.appendChild(makeSvgEl("line", { x1: padL - 4, y1: py, x2: padL, y2: py, stroke: "#9a9389" }));
      const txt = makeSvgEl("text", Object.assign({ x: padL - 8, y: py + 4, "text-anchor": "end" }, axisStyle));
      txt.textContent = String(m);
      svg.appendChild(txt);
    }

    const yT = makeSvgEl("text", {
      x: 16, y: padT + plotH / 2, "text-anchor": "middle",
      transform: `rotate(-90, 16, ${padT + plotH / 2})`,
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    yT.textContent = "4-d mass  M  (units of 1/R₀, R₀ = 1)";
    svg.appendChild(yT);

    // Group for KK level lines
    const levels = makeSvgEl("g");
    svg.appendChild(levels);

    // Zero mode highlight
    const zeroLine = makeSvgEl("line", {
      x1: padL, x2: padL + plotW, y1: mToY(0), y2: mToY(0),
      stroke: "#2c6e1f", "stroke-width": 2.4
    });
    svg.appendChild(zeroLine);
    const zeroLbl = makeSvgEl("text", {
      x: padL + plotW + 6, y: mToY(0) + 4,
      "font-family": "Inter, sans-serif", "font-size": "10", fill: "#2c6e1f", "font-weight": "600"
    });
    zeroLbl.textContent = "n = 0  (visible)";
    svg.appendChild(zeroLbl);

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
      const lblE = document.createElement("div");
      lblE.style.cssText = "font-family: Inter, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: " + color + "; font-weight: 700; margin-bottom: 0.15rem";
      lblE.textContent = text;
      const valE = document.createElement("div");
      valE.style.cssText = "font-family: 'Source Serif 4', Georgia, serif; font-size: 1.3rem; font-weight: 600; color: #1f1c1a";
      wrap.appendChild(lblE); wrap.appendChild(valE);
      return { wrap, val: valE };
    }
    const sRad = mkStat("Radius R", "#6f6a63");
    const sStep = mkStat("KK spacing 1/R", "#a83e2a");
    const sMode1 = mkStat("Lightest KK mass", "#a83e2a");
    panel.appendChild(sRad.wrap); panel.appendChild(sStep.wrap); panel.appendChild(sMode1.wrap);
    mount.appendChild(panel);

    function redraw() {
      levels.innerHTML = "";
      for (let n = -N_MAX; n <= N_MAX; n++) {
        if (n === 0) continue;
        const m = Math.abs(n) / R;
        if (m > M_MAX) continue;
        const y = mToY(m);
        const line = makeSvgEl("line", {
          x1: padL + 8, x2: padL + plotW - 8, y1: y, y2: y,
          stroke: "#1f1c1a", "stroke-width": 1.6,
          opacity: clamp(1 - Math.abs(n) / (N_MAX + 1), 0.2, 1)
        });
        levels.appendChild(line);
        const lbl = makeSvgEl("text", {
          x: padL + plotW + 6, y: y + 4,
          "font-family": "Inter, sans-serif", "font-size": "10", fill: "#6f6a63"
        });
        lbl.textContent = "n = ±" + Math.abs(n);
        levels.appendChild(lbl);
      }
      sRad.val.textContent = R.toFixed(2);
      sStep.val.textContent = (1 / R).toFixed(3);
      sMode1.val.textContent = (1 / R).toFixed(3);
    }

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='kk-tower']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
