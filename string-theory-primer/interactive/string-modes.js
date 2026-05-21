/* Interactive · Vibrating open string with Neumann boundaries.
   X^⊥(τ, σ) = Σ_n A_n cos(nσ) cos(nτ),  σ ∈ [0, π].
   User adjusts amplitudes; animation drives τ. */

(function () {
  "use strict";

  const N_MAX = 4;
  const W = 660, H = 320;
  const padL = 40, padR = 24, padT = 30, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    const amps = [0.7, 0, 0, 0];
    let tau = 0;
    let playing = true;

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "grid";
    controls.style.gridTemplateColumns = "auto 1fr auto auto 1fr auto";
    controls.style.gap = "0.4rem 0.8rem";
    controls.style.alignItems = "center";
    controls.style.marginBottom = "0.9rem";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.85rem";

    const ampInputs = [];
    for (let n = 1; n <= N_MAX; n++) {
      const lbl = document.createElement("span");
      lbl.style.color = "#6f6a63";
      lbl.style.fontWeight = "500";
      lbl.textContent = `A${subscript(n)}`;
      const inp = document.createElement("input");
      inp.type = "range";
      inp.min = "-1"; inp.max = "1"; inp.step = "0.01";
      inp.value = String(amps[n - 1]);
      inp.style.accentColor = "#a83e2a";
      const v = document.createElement("span");
      v.style.color = "#1f1c1a";
      v.style.fontFeatureSettings = "'tnum'";
      v.style.minWidth = "5ch";
      v.textContent = amps[n - 1].toFixed(2);
      inp.addEventListener("input", () => {
        amps[n - 1] = +inp.value;
        v.textContent = amps[n - 1].toFixed(2);
      });
      ampInputs.push(inp);
      controls.appendChild(lbl);
      controls.appendChild(inp);
      controls.appendChild(v);
    }

    mount.appendChild(controls);

    // Play / pause + tau slider
    const transport = document.createElement("div");
    transport.style.display = "flex";
    transport.style.gap = "0.8rem";
    transport.style.alignItems = "center";
    transport.style.marginBottom = "0.9rem";
    transport.style.fontFamily = "Inter, sans-serif";
    transport.style.fontSize = "0.85rem";

    const playBtn = document.createElement("button");
    playBtn.textContent = "Pause";
    Object.assign(playBtn.style, {
      fontFamily: "Inter, sans-serif", fontSize: "0.78rem",
      letterSpacing: "0.08em", textTransform: "uppercase",
      background: "transparent", border: "1px solid #d3cabd",
      color: "#1f1c1a", padding: "0.3rem 0.9rem",
      borderRadius: "2px", cursor: "pointer", fontWeight: "500"
    });
    playBtn.addEventListener("click", () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Play";
    });

    const tauLbl = document.createElement("span");
    tauLbl.style.color = "#6f6a63";
    tauLbl.style.fontWeight = "500";
    tauLbl.textContent = "τ";
    const tauInp = document.createElement("input");
    tauInp.type = "range";
    tauInp.min = "0"; tauInp.max = "6.283"; tauInp.step = "0.01"; tauInp.value = "0";
    tauInp.style.accentColor = "#a83e2a";
    tauInp.style.flex = "1";
    const tauVal = document.createElement("span");
    tauVal.style.color = "#1f1c1a";
    tauVal.style.fontFeatureSettings = "'tnum'";
    tauVal.style.minWidth = "5ch";
    tauVal.textContent = "0.00";
    tauInp.addEventListener("input", () => {
      tau = +tauInp.value;
      playing = false;
      playBtn.textContent = "Play";
      tauVal.textContent = tau.toFixed(2);
    });

    transport.appendChild(playBtn);
    transport.appendChild(tauLbl);
    transport.appendChild(tauInp);
    transport.appendChild(tauVal);
    mount.appendChild(transport);

    // SVG
    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Vibrating open string"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    // Center line
    svg.appendChild(makeSvgEl("line", {
      x1: padL, y1: padT + plotH / 2, x2: padL + plotW, y2: padT + plotH / 2,
      stroke: "#e7e1d6", "stroke-width": 1, "stroke-dasharray": "3 4"
    }));

    // σ axis labels
    const axisStyle = { "font-family": "Inter, sans-serif", "font-size": "11", fill: "#6f6a63" };
    [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI].forEach((s, i) => {
      const px = padL + (s / Math.PI) * plotW;
      svg.appendChild(makeSvgEl("line", { x1: px, y1: padT + plotH, x2: px, y2: padT + plotH + 4, stroke: "#9a9389" }));
      const lbl = makeSvgEl("text", Object.assign({ x: px, y: padT + plotH + 18, "text-anchor": "middle" }, axisStyle));
      lbl.textContent = ["0", "π/4", "π/2", "3π/4", "π"][i];
      svg.appendChild(lbl);
    });

    const xT = makeSvgEl("text", {
      x: padL + plotW / 2, y: H - 16, "text-anchor": "middle",
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    xT.textContent = "σ — position along string";
    svg.appendChild(xT);
    const yT = makeSvgEl("text", {
      x: 18, y: padT + plotH / 2, "text-anchor": "middle",
      transform: `rotate(-90, 18, ${padT + plotH / 2})`,
      "font-family": "Source Serif 4, Georgia, serif", "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    yT.textContent = "transverse displacement";
    svg.appendChild(yT);

    // String path
    const stringPath = makeSvgEl("path", {
      d: "", fill: "none", stroke: "#1f1c1a", "stroke-width": 2.4, "stroke-linejoin": "round", "stroke-linecap": "round"
    });
    svg.appendChild(stringPath);

    // End markers
    const endL = makeSvgEl("circle", { r: 5, fill: "#a83e2a", stroke: "#fbfaf7", "stroke-width": 2 });
    const endR = makeSvgEl("circle", { r: 5, fill: "#a83e2a", stroke: "#fbfaf7", "stroke-width": 2 });
    svg.appendChild(endL); svg.appendChild(endR);

    mount.appendChild(svg);

    function shape(sigma, tauNow) {
      let y = 0;
      for (let n = 1; n <= N_MAX; n++) {
        y += amps[n - 1] * Math.cos(n * sigma) * Math.cos(n * tauNow);
      }
      return y;
    }

    function redraw() {
      const NSEG = 120;
      let d = "";
      // Plot range for y: [-(sumMax), +(sumMax)] but we'll scale visually so 2 corresponds to plotH/2
      const yScale = plotH / 2 / 2.2;  // 2.2 ≈ max possible |sum| (4 amps each up to 1)
      for (let k = 0; k <= NSEG; k++) {
        const sig = (k / NSEG) * Math.PI;
        const y = shape(sig, tau);
        const px = padL + (sig / Math.PI) * plotW;
        const py = padT + plotH / 2 - y * yScale;
        d += (k === 0 ? "M " : "L ") + px.toFixed(2) + "," + py.toFixed(2) + " ";
      }
      stringPath.setAttribute("d", d.trim());
      const y0 = shape(0, tau);
      const yPi = shape(Math.PI, tau);
      endL.setAttribute("cx", padL);
      endL.setAttribute("cy", padT + plotH / 2 - y0 * yScale);
      endR.setAttribute("cx", padL + plotW);
      endR.setAttribute("cy", padT + plotH / 2 - yPi * yScale);
    }

    let last = null;
    function tick(now) {
      if (last === null) last = now;
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        tau += dt * 0.8;  // worldsheet time speed
        if (tau > 2 * Math.PI) tau -= 2 * Math.PI;
        tauInp.value = String(tau);
        tauVal.textContent = tau.toFixed(2);
      }
      redraw();
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function subscript(n) {
    const m = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
    return String(n).split("").map(c => m[c] || c).join("");
  }

  function start() {
    document.querySelectorAll("[data-widget='string-modes']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
