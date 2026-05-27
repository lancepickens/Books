/* Interactive · Inference-time scaling for best-of-N and self-consistency.
   - "any-correct" curve: 1 - (1-p)^N
   - "majority-vote" curve (binary): P(≥ ceil(N/2) heads in N flips with prob p)
   Mounts into any [data-widget='best-of-n'] section. */

(function () {
  "use strict";

  const W = 540, H = 320;
  const M = { l: 50, r: 18, t: 22, b: 36 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  const NMAX = 200;

  document.querySelectorAll("[data-widget='best-of-n']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "1rem";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const pWrap = mkSlider("p (per-sample accuracy)", "0.4", 0.05, 0.95, 0.01);
    const nWrap = mkSlider("N (samples)", "10", 1, NMAX, 1);
    controls.appendChild(pWrap.el);
    controls.appendChild(nWrap.el);

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
    host.appendChild(readout);

    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = FAINT;
    legend.style.display = "flex";
    legend.style.gap = "1.5rem";
    legend.style.justifyContent = "center";
    legend.innerHTML = `
      <span><span style="display:inline-block;width:24px;height:2.4px;background:${ACCENT};vertical-align:middle;margin-right:0.35em"></span>any correct (pass@N)</span>
      <span><span style="display:inline-block;width:24px;height:2.4px;background:${SAND};vertical-align:middle;margin-right:0.35em"></span>majority vote</span>
    `;
    host.appendChild(legend);

    function redraw() {
      const p = +pWrap.slider.value;
      const N = Math.round(+nWrap.slider.value);
      pWrap.val.textContent = p.toFixed(2);
      nWrap.val.textContent = N.toString();

      // Compute curves for N = 1..NMAX
      const anyArr = new Array(NMAX);
      const majArr = new Array(NMAX);
      let prevAny = 1;
      for (let n = 1; n <= NMAX; n++) {
        anyArr[n - 1] = 1 - Math.pow(1 - p, n);
        majArr[n - 1] = majorityVote(p, n);
      }
      render(svg, anyArr, majArr, p, N);

      const ay = anyArr[N - 1];
      const my = majArr[N - 1];
      readout.innerHTML =
        `at N = <strong>${N}</strong>: ` +
        `pass@N = <strong style="color:${ACCENT_DEEP}">${(ay * 100).toFixed(1)}%</strong> &nbsp;·&nbsp; ` +
        `majority vote = <strong style="color:${ACCENT_DEEP}">${(my * 100).toFixed(1)}%</strong>` +
        `<br/>` +
        `<span style="color:${FAINT}">pass@N rises whenever p &gt; 0; majority only helps when p &gt; 0.5.</span>`;
    }

    pWrap.slider.addEventListener("input", redraw);
    nWrap.slider.addEventListener("input", redraw);
    redraw();
  }

  // P(at least k successes in n bernoulli(p)) for k = ceil(n/2)+1 (strict majority of distinct answers)
  // We approximate majority vote as "≥ ceil((n+1)/2) correct out of n independent samples" — i.e., majority of correct vs incorrect when both occur.
  function majorityVote(p, n) {
    if (n === 1) return p;
    const need = Math.floor(n / 2) + 1;
    // P(X >= need) where X ~ Binomial(n, p)
    return 1 - binomCDF(need - 1, n, p);
  }

  // Stable computation via log
  function binomCDF(k, n, p) {
    // F(k) = sum_{i=0..k} C(n,i) p^i (1-p)^(n-i)
    if (k < 0) return 0;
    if (k >= n) return 1;
    let logC = 0; // log C(n, 0) = 0
    let logFact = 0;
    const logp = Math.log(p);
    const log1p = Math.log(1 - p);
    let sum = Math.exp(logC + 0 * logp + n * log1p);
    for (let i = 1; i <= k; i++) {
      logC += Math.log(n - i + 1) - Math.log(i);
      sum += Math.exp(logC + i * logp + (n - i) * log1p);
    }
    return Math.min(1, Math.max(0, sum));
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

  function render(svg, anyArr, majArr, p, Nsel) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    // x: log-N from 1..200, y: 0..1
    const xs = n => M.l + Math.log(n) / Math.log(NMAX) * PW;
    const ys = y => M.t + (1 - y) * PH;

    // gridlines
    [0, 0.25, 0.5, 0.75, 1.0].forEach(yt => {
      const ln = svg.appendChild(document.createElementNS(ns, "line"));
      ln.setAttribute("x1", M.l); ln.setAttribute("x2", M.l + PW);
      ln.setAttribute("y1", ys(yt)); ln.setAttribute("y2", ys(yt));
      ln.setAttribute("stroke", yt === 0 ? FAINT : "#eef2ee");
      ln.setAttribute("stroke-width", yt === 0 ? "0.7" : "0.5");
      const lab = svg.appendChild(document.createElementNS(ns, "text"));
      lab.setAttribute("x", M.l - 6); lab.setAttribute("y", ys(yt) + 3.5);
      lab.setAttribute("text-anchor", "end");
      lab.setAttribute("font-family", "Inter, sans-serif");
      lab.setAttribute("font-size", "10"); lab.setAttribute("fill", FAINT);
      lab.textContent = (yt * 100).toFixed(0) + "%";
    });
    [1, 2, 5, 10, 20, 50, 100, 200].forEach(nt => {
      const lab = svg.appendChild(document.createElementNS(ns, "text"));
      lab.setAttribute("x", xs(nt)); lab.setAttribute("y", M.t + PH + 14);
      lab.setAttribute("text-anchor", "middle");
      lab.setAttribute("font-family", "Inter, sans-serif");
      lab.setAttribute("font-size", "10"); lab.setAttribute("fill", FAINT);
      lab.textContent = nt.toString();
      const tick = svg.appendChild(document.createElementNS(ns, "line"));
      tick.setAttribute("x1", xs(nt)); tick.setAttribute("x2", xs(nt));
      tick.setAttribute("y1", M.t + PH); tick.setAttribute("y2", M.t + PH + 4);
      tick.setAttribute("stroke", FAINT);
    });

    // p=horizontal reference line
    const pl = svg.appendChild(document.createElementNS(ns, "line"));
    pl.setAttribute("x1", M.l); pl.setAttribute("x2", M.l + PW);
    pl.setAttribute("y1", ys(p)); pl.setAttribute("y2", ys(p));
    pl.setAttribute("stroke", "#bcc6c1"); pl.setAttribute("stroke-dasharray", "3 4");
    const pll = svg.appendChild(document.createElementNS(ns, "text"));
    pll.setAttribute("x", M.l + PW - 4); pll.setAttribute("y", ys(p) - 4);
    pll.setAttribute("text-anchor", "end");
    pll.setAttribute("font-family", "Inter, sans-serif"); pll.setAttribute("font-size", "9");
    pll.setAttribute("fill", FAINT); pll.textContent = `p = ${p.toFixed(2)}`;

    // Curves
    const anyPts = [], majPts = [];
    for (let n = 1; n <= NMAX; n++) {
      anyPts.push([xs(n), ys(anyArr[n - 1])]);
      majPts.push([xs(n), ys(majArr[n - 1])]);
    }
    pathLine(svg, anyPts, ACCENT, 2.0);
    pathLine(svg, majPts, SAND, 2.0);

    // Selected-N marker line
    const sx = xs(Nsel);
    const mk = svg.appendChild(document.createElementNS(ns, "line"));
    mk.setAttribute("x1", sx); mk.setAttribute("x2", sx);
    mk.setAttribute("y1", M.t); mk.setAttribute("y2", M.t + PH);
    mk.setAttribute("stroke", "#1c1f21"); mk.setAttribute("stroke-width", "0.7");
    mk.setAttribute("stroke-dasharray", "4 3");
    const acy = svg.appendChild(document.createElementNS(ns, "circle"));
    acy.setAttribute("cx", sx); acy.setAttribute("cy", ys(anyArr[Nsel - 1])); acy.setAttribute("r", 5);
    acy.setAttribute("fill", ACCENT); acy.setAttribute("stroke", "#fff"); acy.setAttribute("stroke-width", "1.4");
    const mcy = svg.appendChild(document.createElementNS(ns, "circle"));
    mcy.setAttribute("cx", sx); mcy.setAttribute("cy", ys(majArr[Nsel - 1])); mcy.setAttribute("r", 5);
    mcy.setAttribute("fill", SAND); mcy.setAttribute("stroke", "#fff"); mcy.setAttribute("stroke-width", "1.4");

    // axis labels
    const xl = svg.appendChild(document.createElementNS(ns, "text"));
    xl.setAttribute("x", M.l + PW / 2); xl.setAttribute("y", H - 8);
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("font-family", "Source Serif 4, serif");
    xl.setAttribute("font-style", "italic");
    xl.setAttribute("font-size", "12");
    xl.setAttribute("fill", "#5f6d72");
    xl.textContent = "number of samples N (log scale)";

    const yl = svg.appendChild(document.createElementNS(ns, "text"));
    yl.setAttribute("x", 14); yl.setAttribute("y", M.t + PH / 2);
    yl.setAttribute("text-anchor", "middle");
    yl.setAttribute("font-family", "Source Serif 4, serif");
    yl.setAttribute("font-style", "italic");
    yl.setAttribute("font-size", "12");
    yl.setAttribute("fill", "#5f6d72");
    yl.setAttribute("transform", `rotate(-90, 14, ${M.t + PH / 2})`);
    yl.textContent = "probability of correct";
  }

  function pathLine(svg, pts, stroke, width) {
    if (!pts.length) return;
    const ns = "http://www.w3.org/2000/svg";
    const p = svg.appendChild(document.createElementNS(ns, "path"));
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", stroke);
    p.setAttribute("stroke-width", width);
  }
})();
