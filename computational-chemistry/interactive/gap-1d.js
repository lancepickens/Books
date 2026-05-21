/* Interactive · 1D Gaussian-process fit to a Morse potential.
   Pedagogical proxy for a GAP on a 1D PES. */

(function () {
  "use strict";

  // Morse parameters (loosely H₂)
  const D = 1.0;
  const ALPHA = 1.6;
  const RE = 1.4;

  const X_MIN = 0.5, X_MAX = 5.0;
  const Y_MIN = -0.15, Y_MAX = 1.6;

  const W = 720, H = 360;
  const PAD = { l: 56, r: 16, t: 22, b: 38 };

  function trueV(r) {
    const t = 1 - Math.exp(-ALPHA * (r - RE));
    return D * t * t;
  }

  // Squared-exponential kernel
  function makeKernel(ell, sigF) {
    return (a, b) => sigF * sigF * Math.exp(-(a - b) * (a - b) / (2 * ell * ell));
  }

  // Cholesky decomposition of symmetric positive-definite matrix M.
  // Modifies in place: M becomes L (lower triangular).
  function cholesky(M) {
    const n = M.length;
    const L = [];
    for (let i = 0; i < n; i++) L.push(new Float64Array(n));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let s = M[i][j];
        for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
        if (i === j) L[i][j] = Math.sqrt(Math.max(s, 1e-12));
        else L[i][j] = s / L[j][j];
      }
    }
    return L;
  }

  function forwardSub(L, b) {
    const n = L.length;
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < i; j++) s -= L[i][j] * x[j];
      x[i] = s / L[i][i];
    }
    return x;
  }

  function backSub(LT, b) {
    // Solve L^T x = b
    const n = LT.length;
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= LT[j][i] * x[j];
      x[i] = s / LT[i][i];
    }
    return x;
  }

  document.querySelectorAll("[data-widget='gap-1d']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gap = "0.85rem";

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "0.5rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.82rem";
    controls.style.color = "#5f6d72";
    host.appendChild(controls);

    const resetBtn = mkBtn("Clear");
    controls.appendChild(resetBtn);
    const sampleBtn = mkBtn("Add 6 random");
    controls.appendChild(sampleBtn);

    const ellLbl = document.createElement("label");
    ellLbl.style.marginLeft = "0.5rem";
    ellLbl.textContent = "Length scale ℓ:";
    controls.appendChild(ellLbl);
    const ellSlider = document.createElement("input");
    ellSlider.type = "range"; ellSlider.min = "5"; ellSlider.max = "120"; ellSlider.value = "40";
    ellSlider.style.width = "100px";
    controls.appendChild(ellSlider);
    const ellVal = document.createElement("span");
    ellVal.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    ellVal.style.color = "#1c1f21";
    controls.appendChild(ellVal);

    const stats = document.createElement("span");
    stats.style.marginLeft = "auto";
    stats.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    stats.style.fontSize = "0.78rem";
    stats.style.color = "#5f6d72";
    controls.appendChild(stats);

    // Canvas
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.style.width = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.background = "#fbfaf7";
    canvas.style.border = "1px solid #dfe6e7";
    canvas.style.borderRadius = "2px";
    canvas.style.cursor = "crosshair";
    host.appendChild(canvas);

    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.78rem";
    legend.style.color = "#5f6d72";
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.innerHTML = `
      <span><span style="display:inline-block;width:14px;border-top:1.5px dashed #5f6d72;vertical-align:middle;margin-right:0.4em"></span>true Morse</span>
      <span><span style="display:inline-block;width:14px;border-top:2px solid #1f6f7a;vertical-align:middle;margin-right:0.4em"></span>GP posterior mean</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:rgba(31,111,122,0.18);vertical-align:middle;margin-right:0.4em"></span>±2σ predictive uncertainty</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:#b88946;border-radius:50%;vertical-align:middle;margin-right:0.4em"></span>training points</span>
    `;
    host.appendChild(legend);

    let train = [];
    function ell() { return parseFloat(ellSlider.value) / 100; }
    const SIGF = 0.7;
    const SIGN = 0.0;  // noise-free training

    function recompute() {
      ellVal.textContent = ell().toFixed(2);
      stats.textContent = `${train.length} training points`;
      draw();
    }

    ellSlider.addEventListener("input", recompute);
    resetBtn.addEventListener("click", () => { train = []; recompute(); });
    sampleBtn.addEventListener("click", () => {
      for (let k = 0; k < 6; k++) {
        const r = X_MIN + 0.3 + (X_MAX - X_MIN - 0.6) * Math.random();
        train.push({ x: r, y: trueV(r) });
      }
      recompute();
    });

    canvas.addEventListener("click", e => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      if (mx < PAD.l || mx > W - PAD.r || my < PAD.t || my > H - PAD.b) return;
      const r = X_MIN + (X_MAX - X_MIN) * (mx - PAD.l) / (W - PAD.l - PAD.r);
      train.push({ x: r, y: trueV(r) });
      recompute();
    });

    function draw() {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fbfaf7";
      ctx.fillRect(0, 0, W, H);

      // Grid + frame
      const w = W - PAD.l - PAD.r, h = H - PAD.t - PAD.b;
      ctx.strokeStyle = "#eef2f3";
      ctx.lineWidth = 1;
      [0.0, 0.5, 1.0, 1.5].forEach(yv => {
        const y = PAD.t + (1 - (yv - Y_MIN) / (Y_MAX - Y_MIN)) * h;
        ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      });
      ctx.strokeStyle = "#c8d3d5";
      ctx.strokeRect(PAD.l, PAD.t, w, h);

      // Axis labels
      ctx.fillStyle = "#8e9a9e";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "right";
      [0.0, 0.5, 1.0, 1.5].forEach(yv => {
        const y = PAD.t + (1 - (yv - Y_MIN) / (Y_MAX - Y_MIN)) * h;
        ctx.fillText(yv.toFixed(1), PAD.l - 6, y + 3);
      });
      ctx.textAlign = "center";
      [1, 2, 3, 4, 5].forEach(xv => {
        const x = PAD.l + ((xv - X_MIN) / (X_MAX - X_MIN)) * w;
        ctx.fillText(xv.toString(), x, H - PAD.b + 14);
      });
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = "#5f6d72";
      ctx.fillText("r (Bohr)", PAD.l + w / 2, H - 6);
      ctx.save();
      ctx.translate(16, PAD.t + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("V(r) (Hartree-ish)", 0, 0);
      ctx.restore();

      // GP posterior, computed on a grid
      const NX = 220;
      const xs = new Float64Array(NX);
      const means = new Float64Array(NX);
      const vars_ = new Float64Array(NX);
      for (let i = 0; i < NX; i++) xs[i] = X_MIN + (X_MAX - X_MIN) * (i / (NX - 1));

      if (train.length > 0) {
        const n = train.length;
        const kern = makeKernel(ell(), SIGF);
        const Km = [];
        for (let i = 0; i < n; i++) Km.push(new Float64Array(n));
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            Km[i][j] = kern(train[i].x, train[j].x);
          }
          Km[i][i] += SIGN * SIGN + 1e-6;  // jitter
        }
        const L = cholesky(Km);
        const yvec = train.map(t => t.y);
        const z = forwardSub(L, yvec);
        const alpha = backSub(L, z);

        for (let i = 0; i < NX; i++) {
          const xx = xs[i];
          let mean = 0;
          const kvec = new Float64Array(n);
          for (let j = 0; j < n; j++) {
            kvec[j] = kern(xx, train[j].x);
            mean += kvec[j] * alpha[j];
          }
          // var = k(x,x) - k_*^T (K)^-1 k_*  via  v = L\k_*, var = k(x,x) - v^T v
          const v = forwardSub(L, kvec);
          let vv = 0;
          for (let j = 0; j < n; j++) vv += v[j] * v[j];
          const kxx = kern(xx, xx);
          means[i] = mean;
          vars_[i] = Math.max(0, kxx - vv);
        }
      } else {
        // Prior: mean 0, var σf²
        for (let i = 0; i < NX; i++) { means[i] = 0; vars_[i] = SIGF * SIGF; }
      }

      function xpx(r) { return PAD.l + ((r - X_MIN) / (X_MAX - X_MIN)) * w; }
      function ypx(v) { return PAD.t + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * h; }

      // Uncertainty band ±2σ
      ctx.fillStyle = "rgba(31,111,122,0.18)";
      ctx.beginPath();
      for (let i = 0; i < NX; i++) {
        const s = 2 * Math.sqrt(vars_[i]);
        ctx.lineTo(xpx(xs[i]), ypx(Math.min(Y_MAX, means[i] + s)));
      }
      for (let i = NX - 1; i >= 0; i--) {
        const s = 2 * Math.sqrt(vars_[i]);
        ctx.lineTo(xpx(xs[i]), ypx(Math.max(Y_MIN, means[i] - s)));
      }
      ctx.closePath();
      ctx.fill();

      // True Morse
      ctx.strokeStyle = "#5f6d72";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (let i = 0; i < NX; i++) {
        const v = trueV(xs[i]);
        if (i === 0) ctx.moveTo(xpx(xs[i]), ypx(v)); else ctx.lineTo(xpx(xs[i]), ypx(v));
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // GP mean
      ctx.strokeStyle = "#1f6f7a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < NX; i++) {
        const v = means[i];
        if (i === 0) ctx.moveTo(xpx(xs[i]), ypx(v)); else ctx.lineTo(xpx(xs[i]), ypx(v));
      }
      ctx.stroke();

      // Training points
      train.forEach(p => {
        ctx.fillStyle = "#b88946";
        ctx.beginPath();
        ctx.arc(xpx(p.x), ypx(p.y), 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fbfaf7";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Caption hint when empty
      if (train.length === 0) {
        ctx.fillStyle = "#8e9a9e";
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Click anywhere on the plot to add training data.",
          PAD.l + w / 2, PAD.t + h / 2);
      }
    }

    recompute();
  }

  function mkBtn(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.82rem";
    b.style.padding = "0.35rem 0.85rem";
    b.style.border = "1px solid #1f6f7a";
    b.style.background = "#1f6f7a";
    b.style.color = "#fff";
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    return b;
  }
})();
