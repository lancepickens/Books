/* Interactive · Chinchilla compute-optimal scaling.
   Loss model: L(N, D) = E + A/N^α + B/D^β
   Fit (Hoffmann et al. 2022): A=406.4, α=0.34, B=410.7, β=0.28, E=1.69
   Compute approx: C ≈ 6 N D.
   Mounts into any [data-widget='scaling-laws'] section. */

(function () {
  "use strict";

  const A = 406.4, ALPHA = 0.34;
  const B = 410.7, BETA = 0.28;
  const E = 1.69;

  const W = 540, H = 380;
  const M = { l: 56, r: 16, t: 18, b: 40 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  // axes: log10(N) ∈ [6, 12.5] (1M..3T params), log10(D) ∈ [8, 14] (100M..100T tokens)
  const NMIN = 6, NMAX = 12.5;
  const DMIN = 8, DMAX = 14;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  const loss = (N, D) => E + A / Math.pow(N, ALPHA) + B / Math.pow(D, BETA);
  const compute = (N, D) => 6 * N * D;

  // For a given total compute C, find N*, D* that minimize L(N,D) s.t. 6ND=C.
  // d/dN [L] = -A α N^{-α-1}, d/dD [L] = -B β D^{-β-1}.
  // Lagrange: ∂L/∂N = λ * ∂C/∂N = 6Dλ; ∂L/∂D = 6Nλ.
  // => A α N^{-α-1} / D = B β D^{-β-1} / N
  // => A α N^{-α} = B β D^{-β}        (after multiplying both sides by ND)
  // With C = 6 N D fixed, parameterize D = C/(6N).
  function optimal(C) {
    // Newton on log10(N) for f(N) = A α N^{-α} - B β D^{-β}, D=C/(6N)
    let lN = 8.5;
    for (let it = 0; it < 80; it++) {
      const N = Math.pow(10, lN);
      const D = C / (6 * N);
      const f = A * ALPHA * Math.pow(N, -ALPHA) - B * BETA * Math.pow(D, -BETA);
      // df/d(logN) = ln10 * N * df/dN; df/dN = -α(α+1) A N^{-α-1} ... but easier numerical
      const dlN = 0.01;
      const N2 = Math.pow(10, lN + dlN), D2 = C / (6 * N2);
      const f2 = A * ALPHA * Math.pow(N2, -ALPHA) - B * BETA * Math.pow(D2, -BETA);
      const slope = (f2 - f) / dlN;
      if (Math.abs(slope) < 1e-9) break;
      const step = -f / slope;
      lN += Math.max(-0.5, Math.min(0.5, step));
      lN = Math.max(NMIN, Math.min(NMAX, lN));
      if (Math.abs(step) < 1e-5) break;
    }
    const Nopt = Math.pow(10, lN);
    const Dopt = C / (6 * Nopt);
    return { N: Nopt, D: Dopt, L: loss(Nopt, Dopt) };
  }

  document.querySelectorAll("[data-widget='scaling-laws']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "1rem";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const cWrap = mkSlider("log₁₀ compute (FLOPs)", "21", 18, 26, 0.1);
    const aWrap = mkSlider("log₁₀(D/N) offset from optimal", "0", -2.5, 2.5, 0.05);
    controls.appendChild(cWrap.el);
    controls.appendChild(aWrap.el);

    // SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = "#5f6d72";
    readout.style.textAlign = "center";
    readout.style.maxWidth = "32rem";
    host.appendChild(readout);

    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1rem";
    legend.style.justifyContent = "center";
    legend.innerHTML = `
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ACCENT};vertical-align:middle;margin-right:0.3em"></span>your (N, D)</span>
      <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${SAND};vertical-align:middle;margin-right:0.3em"></span>compute-optimal</span>
      <span>dashed = iso-compute</span>
    `;
    host.appendChild(legend);

    function redraw() {
      const logC = +cWrap.slider.value;
      const off = +aWrap.slider.value;
      cWrap.val.textContent = logC.toFixed(1);
      aWrap.val.textContent = (off >= 0 ? "+" : "") + off.toFixed(2);
      const C = Math.pow(10, logC);
      const opt = optimal(C);
      // Apply user offset: increase log N by 'off/2', decrease log D by 'off/2' so that
      // log(D/N) = log(D*/N*) + (-off). Actually we want "offset from optimal D/N":
      // user slider increases D, decreases N if positive.
      // log N = log N* - off/2, log D = log D* + off/2 keeps 6ND ≈ same? No, log(ND) = log(N*D*).
      const lNu = Math.log10(opt.N) - off / 2;
      const lDu = Math.log10(opt.D) + off / 2;
      const Nu = Math.pow(10, lNu);
      const Du = Math.pow(10, lDu);
      const Lu = loss(Nu, Du);
      render(svg, opt, Nu, Du, Lu, C);

      readout.innerHTML =
        `compute C = <strong>${pretty(C)}</strong> FLOPs &nbsp;·&nbsp; ` +
        `optimal N* = <strong>${pretty(opt.N)}</strong>, D* = <strong>${pretty(opt.D)}</strong>, ` +
        `L* = <strong style="color:${ACCENT_DEEP}">${opt.L.toFixed(2)}</strong><br/>` +
        `your N = ${pretty(Nu)}, D = ${pretty(Du)} &nbsp;·&nbsp; ` +
        `L = <strong style="color:${ACCENT_DEEP}">${Lu.toFixed(2)}</strong> &nbsp;·&nbsp; ` +
        `D/N = <strong>${(Du / Nu).toFixed(1)}</strong> ` +
        `<span style="color:${FAINT}">(Chinchilla recipe ≈ 20)</span>`;
    }

    cWrap.slider.addEventListener("input", redraw);
    aWrap.slider.addEventListener("input", redraw);
    redraw();
  }

  function pretty(x) {
    if (x >= 1e12) return (x / 1e12).toFixed(2) + "T";
    if (x >= 1e9)  return (x / 1e9).toFixed(2) + "B";
    if (x >= 1e6)  return (x / 1e6).toFixed(2) + "M";
    if (x >= 1e3)  return (x / 1e3).toFixed(2) + "K";
    return x.toFixed(2);
  }

  function mkSlider(label, init, min, max, step) {
    const wrap = document.createElement("label");
    wrap.style.fontFamily = "Inter, sans-serif";
    wrap.style.fontSize = "0.82rem";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "0.5rem";
    const lab = document.createElement("span");
    lab.innerHTML = `${label} <span data-role="v" style="font-weight:600;color:${ACCENT}">${init}</span>`;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min; slider.max = max; slider.step = step; slider.value = init;
    slider.style.width = "180px";
    slider.style.accentColor = ACCENT;
    wrap.appendChild(lab); wrap.appendChild(slider);
    return { el: wrap, slider, val: lab.querySelector("[data-role='v']") };
  }

  function render(svg, opt, Nu, Du, Lu, C) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    const xs = lN => M.l + (lN - NMIN) / (NMAX - NMIN) * PW;
    const ys = lD => M.t + (DMAX - lD) / (DMAX - DMIN) * PH;

    // Heatmap: sample on grid
    const G = 60;
    let lmin = Infinity, lmax = -Infinity;
    const grid = new Array(G * G);
    for (let i = 0; i < G; i++) {
      const lD = DMAX - (i + 0.5) / G * (DMAX - DMIN);
      for (let j = 0; j < G; j++) {
        const lN = NMIN + (j + 0.5) / G * (NMAX - NMIN);
        const N = Math.pow(10, lN), D = Math.pow(10, lD);
        const L = loss(N, D);
        grid[i * G + j] = L;
        if (L < lmin) lmin = L;
        if (L > lmax) lmax = L;
      }
    }
    const clip = lmin + (lmax - lmin) * 0.6; // emphasize low-loss region
    const cellW = PW / G, cellH = PH / G;
    for (let i = 0; i < G; i++) {
      for (let j = 0; j < G; j++) {
        const L = Math.min(grid[i * G + j], clip);
        const t = (L - lmin) / (clip - lmin);
        // Color: low loss = green, high loss = warm bg
        const r = Math.round(255 * t + 220 * (1 - t));
        const g = Math.round(255 * t * 0.95 + 235 * (1 - t));
        const b = Math.round(255 * t * 0.95 + 220 * (1 - t));
        // muted: blend toward green for low loss
        const aGreen = 1 - t;
        const fr = Math.round(255 * (1 - aGreen) + 47 * aGreen);
        const fg = Math.round(255 * (1 - aGreen) + 107 * aGreen);
        const fb = Math.round(255 * (1 - aGreen) + 74 * aGreen);
        const rect = svg.appendChild(document.createElementNS(ns, "rect"));
        rect.setAttribute("x", M.l + j * cellW);
        rect.setAttribute("y", M.t + i * cellH);
        rect.setAttribute("width", cellW + 0.5);
        rect.setAttribute("height", cellH + 0.5);
        rect.setAttribute("fill", `rgb(${fr},${fg},${fb})`);
        rect.setAttribute("opacity", "0.85");
      }
    }

    // Iso-compute line: 6 * 10^lN * 10^lD = C => lN + lD = log10(C/6)
    const cnst = Math.log10(C / 6);
    const segs = [];
    // intersect with the box [NMIN,NMAX] x [DMIN, DMAX]
    // For lN ∈ [NMIN, NMAX], lD = cnst - lN; clip to [DMIN, DMAX]
    const points = [];
    const nA = NMIN, nB = NMAX;
    for (let s = 0; s <= 1; s += 0.02) {
      const lN = nA + s * (nB - nA);
      const lD = cnst - lN;
      if (lD >= DMIN && lD <= DMAX) points.push([xs(lN), ys(lD)]);
    }
    if (points.length > 1) {
      const path = svg.appendChild(document.createElementNS(ns, "path"));
      let d = `M ${points[0][0]} ${points[0][1]}`;
      for (let p = 1; p < points.length; p++) d += ` L ${points[p][0]} ${points[p][1]}`;
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#1c1f21");
      path.setAttribute("stroke-width", "1");
      path.setAttribute("stroke-dasharray", "5 4");
    }

    // Mark optimal
    const ox = xs(Math.log10(opt.N)), oy = ys(Math.log10(opt.D));
    const oc = svg.appendChild(document.createElementNS(ns, "circle"));
    oc.setAttribute("cx", ox); oc.setAttribute("cy", oy); oc.setAttribute("r", 6);
    oc.setAttribute("fill", SAND); oc.setAttribute("stroke", "#fff"); oc.setAttribute("stroke-width", "1.4");

    // Mark user
    const ux = xs(Math.log10(Nu)), uy = ys(Math.log10(Du));
    const uc = svg.appendChild(document.createElementNS(ns, "circle"));
    uc.setAttribute("cx", ux); uc.setAttribute("cy", uy); uc.setAttribute("r", 7);
    uc.setAttribute("fill", ACCENT); uc.setAttribute("stroke", "#fff"); uc.setAttribute("stroke-width", "1.5");

    // Axes
    for (let lN = 7; lN <= NMAX; lN++) {
      const t = svg.appendChild(document.createElementNS(ns, "line"));
      t.setAttribute("x1", xs(lN)); t.setAttribute("x2", xs(lN));
      t.setAttribute("y1", M.t + PH); t.setAttribute("y2", M.t + PH + 4);
      t.setAttribute("stroke", FAINT);
      const lab = svg.appendChild(document.createElementNS(ns, "text"));
      lab.setAttribute("x", xs(lN)); lab.setAttribute("y", M.t + PH + 16);
      lab.setAttribute("text-anchor", "middle");
      lab.setAttribute("font-family", "Inter, sans-serif");
      lab.setAttribute("font-size", "9.5"); lab.setAttribute("fill", FAINT);
      lab.textContent = lN.toString();
    }
    for (let lD = 9; lD <= DMAX; lD++) {
      const t = svg.appendChild(document.createElementNS(ns, "line"));
      t.setAttribute("y1", ys(lD)); t.setAttribute("y2", ys(lD));
      t.setAttribute("x1", M.l - 4); t.setAttribute("x2", M.l);
      t.setAttribute("stroke", FAINT);
      const lab = svg.appendChild(document.createElementNS(ns, "text"));
      lab.setAttribute("x", M.l - 7); lab.setAttribute("y", ys(lD) + 3);
      lab.setAttribute("text-anchor", "end");
      lab.setAttribute("font-family", "Inter, sans-serif");
      lab.setAttribute("font-size", "9.5"); lab.setAttribute("fill", FAINT);
      lab.textContent = lD.toString();
    }

    // Axis labels
    const xl = svg.appendChild(document.createElementNS(ns, "text"));
    xl.setAttribute("x", M.l + PW / 2); xl.setAttribute("y", H - 8);
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("font-family", "Source Serif 4, serif");
    xl.setAttribute("font-style", "italic");
    xl.setAttribute("font-size", "12");
    xl.setAttribute("fill", "#5f6d72");
    xl.textContent = "log₁₀ N (parameters)";

    const yl = svg.appendChild(document.createElementNS(ns, "text"));
    yl.setAttribute("x", 14); yl.setAttribute("y", M.t + PH / 2);
    yl.setAttribute("text-anchor", "middle");
    yl.setAttribute("font-family", "Source Serif 4, serif");
    yl.setAttribute("font-style", "italic");
    yl.setAttribute("font-size", "12");
    yl.setAttribute("fill", "#5f6d72");
    yl.setAttribute("transform", `rotate(-90, 14, ${M.t + PH / 2})`);
    yl.textContent = "log₁₀ D (tokens)";
  }
})();
