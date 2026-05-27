/* Interactive · DDPM on a 4-mode 2D Gaussian mixture.
   The model uses the *analytic* score of the noised mixture
   (because the data distribution is closed-form), so we see
   the reverse process as it would look with a perfect denoiser.
   Mounts into any [data-widget='diffusion-2d'] section. */

(function () {
  "use strict";

  const W = 480, H = 380;
  const M = { l: 28, r: 14, t: 22, b: 28 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  // Modes (data distribution): 4 isotropic Gaussians
  const MU = [[1.0, 1.0], [-1.0, 1.0], [-1.0, -1.0], [1.0, -1.0]];
  const SIG0 = 0.18;
  const WTS = [0.25, 0.25, 0.25, 0.25];

  // Beta schedule: linear from β_min to β_max over T steps.
  const T = 100;
  const BMIN = 1e-4, BMAX = 0.04;
  const BETAS = new Array(T);
  const ALPHAS = new Array(T);   // 1 - β
  const ABAR = new Array(T);     // Π α
  function buildSchedule() {
    let cum = 1;
    for (let t = 0; t < T; t++) {
      BETAS[t] = BMIN + (BMAX - BMIN) * (t / (T - 1));
      ALPHAS[t] = 1 - BETAS[t];
      cum *= ALPHAS[t];
      ABAR[t] = cum;
    }
  }
  buildSchedule();

  // Sample a data point: pick a mode, then Gaussian.
  function sampleData() {
    const k = Math.floor(Math.random() * 4);
    const mu = MU[k];
    return [mu[0] + gauss() * SIG0, mu[1] + gauss() * SIG0];
  }
  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Noised mixture component variance at time t.
  // x_t = √ᾱ_t x_0 + √(1-ᾱ_t) eps, with x_0 ~ N(μ_k, σ_0² I).
  // So p_t(·) is a mixture of N( √ᾱ_t μ_k, (ᾱ_t σ_0² + (1-ᾱ_t)) I )
  function componentMuVar(t) {
    const ab = ABAR[t];
    const s = Math.sqrt(ab);
    const varT = ab * SIG0 * SIG0 + (1 - ab);
    return { s, varT };
  }

  // Score of mixture at x_t at time t (gradient of log p_t).
  function score(xt, t) {
    const { s, varT } = componentMuVar(t);
    let Z = 0;
    const logp = new Array(4);
    let maxLogP = -Infinity;
    for (let k = 0; k < 4; k++) {
      const muk = [s * MU[k][0], s * MU[k][1]];
      const dx = xt[0] - muk[0], dy = xt[1] - muk[1];
      logp[k] = Math.log(WTS[k]) - (dx * dx + dy * dy) / (2 * varT);
      if (logp[k] > maxLogP) maxLogP = logp[k];
    }
    const w = new Array(4);
    for (let k = 0; k < 4; k++) { w[k] = Math.exp(logp[k] - maxLogP); Z += w[k]; }
    for (let k = 0; k < 4; k++) w[k] /= Z;
    let sx = 0, sy = 0;
    for (let k = 0; k < 4; k++) {
      const muk = [s * MU[k][0], s * MU[k][1]];
      sx += w[k] * (-(xt[0] - muk[0]) / varT);
      sy += w[k] * (-(xt[1] - muk[1]) / varT);
    }
    return [sx, sy];
  }

  document.querySelectorAll("[data-widget='diffusion-2d']").forEach(section => {
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
    controls.style.gap = "0.6rem";
    controls.style.flexWrap = "wrap";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const noiseBtn = document.createElement("button"); noiseBtn.textContent = "▶ noise (forward)"; styleBtn(noiseBtn);
    const denoiseBtn = document.createElement("button"); denoiseBtn.textContent = "▶ denoise (reverse)"; styleBtn(denoiseBtn);
    const resetBtn = document.createElement("button"); resetBtn.textContent = "reset data"; styleBtn(resetBtn);
    const noiseInitBtn = document.createElement("button"); noiseInitBtn.textContent = "init from N(0, I)"; styleBtn(noiseInitBtn);
    [noiseBtn, denoiseBtn, resetBtn, noiseInitBtn].forEach(b => controls.appendChild(b));

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

    const N = 250;
    let pts = [];
    let tStep = 0;
    let mode = "idle";   // "noise" or "denoise"
    let timer = null;

    function resetData() {
      pts = []; for (let i = 0; i < N; i++) pts.push(sampleData());
      tStep = 0;
      mode = "idle";
      render();
      readout.innerHTML = `t = <strong>0</strong> · data samples shown (4-mode mixture)`;
    }
    function initFromNoise() {
      pts = []; for (let i = 0; i < N; i++) pts.push([gauss(), gauss()]);
      tStep = T - 1;
      mode = "idle";
      render();
      readout.innerHTML = `t = <strong>${T - 1}</strong> · samples from N(0, I) — press ▶ denoise`;
    }

    function stopAnim() {
      if (timer) { clearInterval(timer); timer = null; }
      mode = "idle";
      noiseBtn.textContent = "▶ noise (forward)";
      denoiseBtn.textContent = "▶ denoise (reverse)";
    }

    function startNoise() {
      stopAnim();
      mode = "noise";
      noiseBtn.textContent = "⏸ pause";
      // If we are already at t=T-1, restart from data
      if (tStep >= T - 1) resetData();
      timer = setInterval(() => {
        if (tStep >= T - 1) { stopAnim(); return; }
        // step forward: x_{t+1} = √(1-β_{t+1}) x_t + √(β_{t+1}) eps
        const b = BETAS[tStep + 1];
        const a = 1 - b;
        for (let i = 0; i < N; i++) {
          const e = [gauss(), gauss()];
          pts[i] = [Math.sqrt(a) * pts[i][0] + Math.sqrt(b) * e[0],
                    Math.sqrt(a) * pts[i][1] + Math.sqrt(b) * e[1]];
        }
        tStep++;
        render();
        readout.innerHTML = `t = <strong>${tStep}</strong> / ${T - 1}  · forward noising  · √ᾱ = ${Math.sqrt(ABAR[tStep]).toFixed(3)}`;
      }, 30);
    }

    function startDenoise() {
      stopAnim();
      mode = "denoise";
      denoiseBtn.textContent = "⏸ pause";
      if (tStep <= 0) initFromNoise();
      timer = setInterval(() => {
        if (tStep <= 0) { stopAnim(); return; }
        // DDPM ancestral step:
        // x_{t-1} = (1/√α_t) (x_t + β_t * score(x_t, t)) + σ_t z
        const t = tStep;
        const a = ALPHAS[t], b = BETAS[t];
        const sigma = Math.sqrt(b);
        for (let i = 0; i < N; i++) {
          const s = score(pts[i], t);
          const mean = [
            (1 / Math.sqrt(a)) * (pts[i][0] + b * s[0]),
            (1 / Math.sqrt(a)) * (pts[i][1] + b * s[1]),
          ];
          // Add small fresh noise unless we're at the very last step
          if (t > 1) {
            pts[i] = [mean[0] + sigma * gauss(), mean[1] + sigma * gauss()];
          } else {
            pts[i] = mean;
          }
        }
        tStep--;
        render();
        readout.innerHTML = `t = <strong>${tStep}</strong> · reverse denoising`;
      }, 30);
    }

    noiseBtn.addEventListener("click", () => {
      if (mode === "noise") { stopAnim(); }
      else startNoise();
    });
    denoiseBtn.addEventListener("click", () => {
      if (mode === "denoise") { stopAnim(); }
      else startDenoise();
    });
    resetBtn.addEventListener("click", () => { stopAnim(); resetData(); });
    noiseInitBtn.addEventListener("click", () => { stopAnim(); initFromNoise(); });

    function render() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const ns = "http://www.w3.org/2000/svg";
      const xs = x => M.l + (x + 3) / 6 * PW;
      const ys = y => M.t + (3 - y) / 6 * PH;

      // axes
      const xa = svg.appendChild(document.createElementNS(ns, "line"));
      xa.setAttribute("x1", M.l); xa.setAttribute("x2", M.l + PW);
      xa.setAttribute("y1", ys(0)); xa.setAttribute("y2", ys(0));
      xa.setAttribute("stroke", "#eef2ee"); xa.setAttribute("stroke-width", "0.6");
      const ya = svg.appendChild(document.createElementNS(ns, "line"));
      ya.setAttribute("x1", xs(0)); ya.setAttribute("x2", xs(0));
      ya.setAttribute("y1", M.t); ya.setAttribute("y2", M.t + PH);
      ya.setAttribute("stroke", "#eef2ee"); ya.setAttribute("stroke-width", "0.6");

      // mode markers (open circles in sand)
      MU.forEach(m => {
        const c = svg.appendChild(document.createElementNS(ns, "circle"));
        c.setAttribute("cx", xs(m[0])); c.setAttribute("cy", ys(m[1])); c.setAttribute("r", 18);
        c.setAttribute("fill", "none");
        c.setAttribute("stroke", SAND);
        c.setAttribute("stroke-width", "0.8");
        c.setAttribute("stroke-dasharray", "3 3");
      });

      // points
      for (let i = 0; i < pts.length; i++) {
        const c = svg.appendChild(document.createElementNS(ns, "circle"));
        c.setAttribute("cx", xs(pts[i][0])); c.setAttribute("cy", ys(pts[i][1]));
        c.setAttribute("r", "2.4");
        c.setAttribute("fill", ACCENT);
        c.setAttribute("opacity", "0.55");
      }

      // border
      const br = svg.appendChild(document.createElementNS(ns, "rect"));
      br.setAttribute("x", M.l); br.setAttribute("y", M.t);
      br.setAttribute("width", PW); br.setAttribute("height", PH);
      br.setAttribute("fill", "none");
      br.setAttribute("stroke", "#dfe6e2"); br.setAttribute("stroke-width", "0.7");

      // axis labels
      const xl = svg.appendChild(document.createElementNS(ns, "text"));
      xl.setAttribute("x", M.l + PW - 4); xl.setAttribute("y", ys(0) - 4);
      xl.setAttribute("text-anchor", "end");
      xl.setAttribute("font-family", "Source Serif 4, serif"); xl.setAttribute("font-style", "italic");
      xl.setAttribute("font-size", "12"); xl.setAttribute("fill", "#5f6d72"); xl.textContent = "x";
      const yl = svg.appendChild(document.createElementNS(ns, "text"));
      yl.setAttribute("x", xs(0) + 6); yl.setAttribute("y", M.t + 12);
      yl.setAttribute("font-family", "Source Serif 4, serif"); yl.setAttribute("font-style", "italic");
      yl.setAttribute("font-size", "12"); yl.setAttribute("fill", "#5f6d72"); yl.textContent = "y";
    }

    resetData();
  }

  function styleBtn(b) {
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.78rem";
    b.style.padding = "0.32rem 0.8rem";
    b.style.border = "1px solid " + ACCENT;
    b.style.background = "#fff";
    b.style.color = ACCENT;
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
  }
})();
