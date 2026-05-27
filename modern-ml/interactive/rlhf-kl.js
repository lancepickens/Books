/* Interactive · KL-regularized RLHF / DPO policy.
   π_ref: Gaussian over a 1D "response space" y ∈ [-3, 3].
   r(y): hand-set reward (two Gaussians scaled by user slider).
   π*(y) ∝ π_ref(y) exp(r(y)/β).  User sliders: β, reward peak position.
   Mounts into any [data-widget='rlhf-kl'] section. */

(function () {
  "use strict";

  const W = 540, H = 320;
  const M = { l: 42, r: 16, t: 18, b: 36 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const GREY = "#9aa3a8";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  const NPTS = 240;
  const YMIN = -3, YMAX = 3;

  document.querySelectorAll("[data-widget='rlhf-kl']").forEach(section => {
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

    const bWrap = mkSlider("β", "0.5", 0.05, 4.0, 0.05);
    const cWrap = mkSlider("reward center", "1.5", -3, 3, 0.05);
    const sWrap = mkSlider("reward height", "3.0", 0, 6, 0.05);
    controls.appendChild(bWrap.el);
    controls.appendChild(cWrap.el);
    controls.appendChild(sWrap.el);

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
    legend.style.gap = "1.4rem";
    legend.style.justifyContent = "center";
    legend.innerHTML = `
      <span><span style="display:inline-block;width:24px;height:2px;background:${GREY};vertical-align:middle;margin-right:0.35em"></span>π_ref(y)</span>
      <span><span style="display:inline-block;width:24px;height:2px;background:${SAND};vertical-align:middle;margin-right:0.35em"></span>r(y)</span>
      <span><span style="display:inline-block;width:24px;height:2.5px;background:${ACCENT};vertical-align:middle;margin-right:0.35em"></span>π*(y)</span>
    `;
    host.appendChild(legend);

    function redraw() {
      const beta = +bWrap.slider.value;
      const c0 = +cWrap.slider.value;
      const s0 = +sWrap.slider.value;
      bWrap.val.textContent = beta.toFixed(2);
      cWrap.val.textContent = c0.toFixed(2);
      sWrap.val.textContent = s0.toFixed(2);

      const ys = [], piRef = [], rew = [], piStar = [];
      // Reference: N(0, 1)
      const refSig = 1.0;
      for (let i = 0; i < NPTS; i++) {
        const y = YMIN + (i / (NPTS - 1)) * (YMAX - YMIN);
        ys.push(y);
        piRef.push(Math.exp(-y * y / (2 * refSig * refSig)) / Math.sqrt(2 * Math.PI * refSig * refSig));
        // reward: peak at c0, width 0.6, plus a small valley near -c0
        const r = s0 * Math.exp(-((y - c0) ** 2) / (2 * 0.6 * 0.6))
                - 0.4 * s0 * Math.exp(-((y + c0) ** 2) / (2 * 0.8 * 0.8));
        rew.push(r);
      }
      // π*(y) ∝ π_ref(y) exp(r/β)
      let Z = 0;
      for (let i = 0; i < NPTS; i++) {
        piStar.push(piRef[i] * Math.exp(rew[i] / beta));
        Z += piStar[i];
      }
      const dy = (YMAX - YMIN) / (NPTS - 1);
      Z *= dy;
      for (let i = 0; i < NPTS; i++) piStar[i] /= Z;

      // KL[π* || π_ref]
      let kl = 0;
      for (let i = 0; i < NPTS; i++) {
        if (piStar[i] > 1e-12 && piRef[i] > 1e-12) kl += piStar[i] * Math.log(piStar[i] / piRef[i]) * dy;
      }
      // E_π* [r]
      let er = 0;
      for (let i = 0; i < NPTS; i++) er += piStar[i] * rew[i] * dy;
      // Mode of π*
      let im = 0;
      for (let i = 1; i < NPTS; i++) if (piStar[i] > piStar[im]) im = i;
      const yStar = ys[im];

      render(svg, ys, piRef, rew, piStar);

      readout.innerHTML =
        `mode of π*: <strong style="color:${ACCENT_DEEP}">y = ${yStar.toFixed(2)}</strong> &nbsp;·&nbsp; ` +
        `E[r] = <strong style="color:${ACCENT_DEEP}">${er.toFixed(2)}</strong> &nbsp;·&nbsp; ` +
        `KL[π* ‖ π_ref] = <strong style="color:${ACCENT_DEEP}">${kl.toFixed(2)}</strong> nats`;
    }

    bWrap.slider.addEventListener("input", redraw);
    cWrap.slider.addEventListener("input", redraw);
    sWrap.slider.addEventListener("input", redraw);
    redraw();
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
    slider.style.width = "150px";
    slider.style.accentColor = ACCENT;
    wrap.appendChild(lab); wrap.appendChild(slider);
    return { el: wrap, slider, val: lab.querySelector("[data-role='v']") };
  }

  function render(svg, ys, piRef, rew, piStar) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    // Two y-axes: left = density (π_ref, π*), right = reward
    const maxPi = Math.max(...piRef, ...piStar) * 1.05 + 1e-9;
    const maxR = Math.max(...rew, 0.1) * 1.05;
    const minR = Math.min(...rew, -0.1) * 1.05;

    const xs = y => M.l + (y - YMIN) / (YMAX - YMIN) * PW;
    const ysL = p => M.t + (maxPi - p) / maxPi * PH;
    const ysR = r => M.t + (maxR - r) / (maxR - minR) * PH;

    // x=0 reference
    [-2, -1, 0, 1, 2].forEach(yt => {
      const t = svg.appendChild(document.createElementNS(ns, "line"));
      t.setAttribute("x1", xs(yt)); t.setAttribute("x2", xs(yt));
      t.setAttribute("y1", M.t + PH); t.setAttribute("y2", M.t + PH + 4);
      t.setAttribute("stroke", FAINT); t.setAttribute("stroke-width", "0.6");
      const lab = svg.appendChild(document.createElementNS(ns, "text"));
      lab.setAttribute("x", xs(yt)); lab.setAttribute("y", M.t + PH + 16);
      lab.setAttribute("text-anchor", "middle");
      lab.setAttribute("font-family", "Inter, sans-serif");
      lab.setAttribute("font-size", "10"); lab.setAttribute("fill", FAINT);
      lab.textContent = yt.toString();
    });

    // baseline
    const bl = svg.appendChild(document.createElementNS(ns, "line"));
    bl.setAttribute("x1", M.l); bl.setAttribute("x2", M.l + PW);
    bl.setAttribute("y1", ysL(0)); bl.setAttribute("y2", ysL(0));
    bl.setAttribute("stroke", FAINT); bl.setAttribute("stroke-width", "0.5");

    // π_ref (grey, light)
    pathLine(svg, ys.map((y, i) => [xs(y), ysL(piRef[i])]), GREY, 1.4);
    // reward (sand) on right axis
    pathLine(svg, ys.map((y, i) => [xs(y), ysR(rew[i])]), SAND, 1.4);
    // r = 0 axis ghost
    const zeroR = ysR(0);
    if (zeroR > M.t && zeroR < M.t + PH) {
      const l0 = svg.appendChild(document.createElementNS(ns, "line"));
      l0.setAttribute("x1", M.l); l0.setAttribute("x2", M.l + PW);
      l0.setAttribute("y1", zeroR); l0.setAttribute("y2", zeroR);
      l0.setAttribute("stroke", SAND); l0.setAttribute("stroke-opacity", "0.2");
      l0.setAttribute("stroke-dasharray", "3 3");
    }
    // π*
    pathLine(svg, ys.map((y, i) => [xs(y), ysL(piStar[i])]), ACCENT, 2.2);

    // labels
    const xl = svg.appendChild(document.createElementNS(ns, "text"));
    xl.setAttribute("x", M.l + PW / 2); xl.setAttribute("y", H - 8);
    xl.setAttribute("text-anchor", "middle");
    xl.setAttribute("font-family", "Source Serif 4, serif");
    xl.setAttribute("font-style", "italic");
    xl.setAttribute("font-size", "12");
    xl.setAttribute("fill", "#5f6d72");
    xl.textContent = "response y";
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
