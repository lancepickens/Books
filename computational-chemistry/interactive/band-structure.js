/* Interactive · 1D plane-wave band structure for V(x) = V₀ cos(2π x / a).
   Diagonalizes an 11-plane-wave Hamiltonian per k via Jacobi rotation. */

(function () {
  "use strict";

  const N_PW = 11;                 // -5 .. 5
  const N_BANDS_SHOWN = 4;
  const N_K = 81;
  const A = 1.0;                   // lattice constant
  const G0 = 2 * Math.PI / A;      // reciprocal lattice spacing
  const K_MAX = Math.PI / A;

  document.querySelectorAll("[data-widget='band-structure']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gap = "0.85rem";

    // Slider
    const slRow = document.createElement("div");
    slRow.style.display = "flex";
    slRow.style.alignItems = "center";
    slRow.style.gap = "0.7rem";
    slRow.style.fontFamily = "Inter, sans-serif";
    slRow.style.fontSize = "0.84rem";
    slRow.style.color = "#5f6d72";
    host.appendChild(slRow);

    const lbl = document.createElement("label");
    lbl.textContent = "Potential strength V₀:";
    slRow.appendChild(lbl);
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0"; slider.max = "200"; slider.value = "0"; slider.step = "1";
    slider.style.flex = "1";
    slRow.appendChild(slider);
    const v0Val = document.createElement("span");
    v0Val.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    v0Val.style.color = "#1c1f21";
    v0Val.style.minWidth = "5em";
    v0Val.style.textAlign = "right";
    slRow.appendChild(v0Val);

    // Plots
    const plots = document.createElement("div");
    plots.style.display = "grid";
    plots.style.gridTemplateColumns = "1fr 1fr";
    plots.style.gap = "0.7rem";
    host.appendChild(plots);

    const potCanvas = document.createElement("canvas");
    potCanvas.width = 380; potCanvas.height = 260;
    potCanvas.style.width = "100%"; potCanvas.style.height = "auto";
    potCanvas.style.background = "#fbfaf7";
    potCanvas.style.border = "1px solid #dfe6e7";
    potCanvas.style.borderRadius = "2px";
    plots.appendChild(potCanvas);

    const bandCanvas = document.createElement("canvas");
    bandCanvas.width = 380; bandCanvas.height = 260;
    bandCanvas.style.width = "100%"; bandCanvas.style.height = "auto";
    bandCanvas.style.background = "#fbfaf7";
    bandCanvas.style.border = "1px solid #dfe6e7";
    bandCanvas.style.borderRadius = "2px";
    plots.appendChild(bandCanvas);

    // Stats
    const stats = document.createElement("div");
    stats.style.fontFamily = "Inter, sans-serif";
    stats.style.fontSize = "0.84rem";
    stats.style.color = "#5f6d72";
    host.appendChild(stats);

    function v0FromSlider() { return parseFloat(slider.value) / 10; }

    function recompute() {
      const V0 = v0FromSlider();
      v0Val.textContent = V0.toFixed(1);
      const bands = computeBands(V0);
      const gap1 = bands.gap(0, 1, true);
      const gap2 = bands.gap(1, 2, false);
      stats.innerHTML =
        `Band gap at zone boundary (k = π/a) between bands 1 and 2: ` +
        `<strong style="color:#1c1f21">${gap1.toFixed(3)}</strong>. ` +
        `Gap between bands 2 and 3 at k = 0: ` +
        `<strong style="color:#1c1f21">${gap2.toFixed(3)}</strong>. ` +
        (V0 === 0 ? "At V₀ = 0 the bands are free-particle parabolas folded into the first zone."
                  : "The cosine potential couples plane waves separated by ±G, opening gaps where bands would cross.");
      drawPotential(potCanvas, V0);
      drawBands(bandCanvas, bands);
    }

    slider.addEventListener("input", recompute);
    recompute();
  }

  // ── physics ────────────────────────────────────────────

  function computeBands(V0) {
    // For each k in the reduced zone, diagonalize the 11×11 PW Hamiltonian.
    // H_{ii} = ½ (k + G_i)²; H_{i, i+1} = H_{i+1, i} = V0/2 (from cos potential).
    const G = [];
    for (let n = -((N_PW - 1) / 2); n <= (N_PW - 1) / 2; n++) G.push(n * G0);
    const ks = [];
    const ENERGIES = [];
    for (let i = 0; i < N_K; i++) {
      const k = -K_MAX + (2 * K_MAX) * (i / (N_K - 1));
      ks.push(k);
      const H = zeros(N_PW);
      for (let j = 0; j < N_PW; j++) H[j][j] = 0.5 * (k + G[j]) * (k + G[j]);
      for (let j = 0; j < N_PW - 1; j++) {
        H[j][j + 1] = V0 / 2;
        H[j + 1][j] = V0 / 2;
      }
      const evs = jacobiEigenvalues(H);
      evs.sort((a, b) => a - b);
      ENERGIES.push(evs);
    }
    return {
      ks, energies: ENERGIES,
      gap(b1, b2, atBoundary) {
        // At k = ±π/a (index 0 or N_K-1) or at k=0 (index ~N_K/2)
        const i = atBoundary ? 0 : Math.floor(N_K / 2);
        return Math.abs(ENERGIES[i][b2] - ENERGIES[i][b1]);
      }
    };
  }

  function zeros(n) {
    const M = [];
    for (let i = 0; i < n; i++) {
      const r = new Float64Array(n);
      M.push(r);
    }
    return M;
  }

  // Symmetric Jacobi eigensolver: returns eigenvalues only.
  function jacobiEigenvalues(A) {
    const n = A.length;
    // Copy
    const M = [];
    for (let i = 0; i < n; i++) {
      const r = new Float64Array(n);
      for (let j = 0; j < n; j++) r[j] = A[i][j];
      M.push(r);
    }
    for (let sweep = 0; sweep < 60; sweep++) {
      let off = 0;
      for (let p = 0; p < n - 1; p++)
        for (let q = p + 1; q < n; q++)
          off += M[p][q] * M[p][q];
      if (off < 1e-22) break;
      for (let p = 0; p < n - 1; p++) {
        for (let q = p + 1; q < n; q++) {
          const apq = M[p][q];
          if (Math.abs(apq) < 1e-20) continue;
          const app = M[p][p], aqq = M[q][q];
          const theta = (aqq - app) / (2 * apq);
          let t;
          if (Math.abs(theta) > 1e15) t = 1 / (2 * theta);
          else t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1);
          const s = t * c;
          // Rotate
          M[p][p] = app - t * apq;
          M[q][q] = aqq + t * apq;
          M[p][q] = 0; M[q][p] = 0;
          for (let i = 0; i < n; i++) {
            if (i === p || i === q) continue;
            const mip = M[i][p], miq = M[i][q];
            M[i][p] = c * mip - s * miq;
            M[i][q] = s * mip + c * miq;
            M[p][i] = M[i][p]; M[q][i] = M[i][q];
          }
        }
      }
    }
    const ev = new Array(n);
    for (let i = 0; i < n; i++) ev[i] = M[i][i];
    return ev;
  }

  // ── drawing ────────────────────────────────────────────

  function drawPotential(canvas, V0) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const pad = { l: 40, r: 16, t: 30, b: 40 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;

    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#5f6d72";
    ctx.textAlign = "left";
    ctx.fillText("V(x) = V₀ cos(2π x / a)", pad.l, 18);

    // y range
    const yMax = Math.max(2, V0 + 0.5);
    const yMin = -yMax;
    function xpx(x) { return pad.l + ((x + 1.5) / 3.0) * w; }
    function ypx(v) { return pad.t + (1 - (v - yMin) / (yMax - yMin)) * h; }

    // Frame
    ctx.strokeStyle = "#c8d3d5";
    ctx.strokeRect(pad.l, pad.t, w, h);

    // Zero line
    ctx.strokeStyle = "#eef2f3";
    ctx.beginPath(); ctx.moveTo(pad.l, ypx(0)); ctx.lineTo(W - pad.r, ypx(0)); ctx.stroke();

    // Lattice ticks at x = -1, 0, 1
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "#8e9a9e";
    ctx.textAlign = "center";
    [-1, 0, 1].forEach(x => {
      const px = xpx(x);
      ctx.fillText(x.toString(), px, H - pad.b + 14);
      ctx.beginPath();
      ctx.moveTo(px, H - pad.b);
      ctx.lineTo(px, H - pad.b + 4);
      ctx.strokeStyle = "#c8d3d5";
      ctx.stroke();
    });
    ctx.fillText("x / a", pad.l + w / 2, H - 8);

    // y ticks
    ctx.textAlign = "right";
    [-V0, 0, V0].forEach(v => {
      if (Math.abs(v) > yMax || v === 0) return;
      ctx.fillText(v.toFixed(1), pad.l - 4, ypx(v) + 3);
    });
    ctx.fillText("0", pad.l - 4, ypx(0) + 3);

    // Potential curve
    ctx.strokeStyle = "#1f6f7a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = -1.5 + 3 * i / 200;
      const v = V0 * Math.cos(2 * Math.PI * x / A);
      const px = xpx(x), py = ypx(v);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Atom marks at integer x
    [-1, 0, 1].forEach(x => {
      ctx.fillStyle = "#134752";
      ctx.beginPath();
      ctx.arc(xpx(x), ypx(V0), 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawBands(canvas, bands) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const pad = { l: 46, r: 16, t: 30, b: 40 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;

    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#5f6d72";
    ctx.textAlign = "left";
    ctx.fillText("Bands ε_n(k) in reduced zone", pad.l, 18);

    // y range based on top of band 4 at zone boundary
    let eMax = 0;
    bands.energies.forEach(e => { if (e[N_BANDS_SHOWN - 1] > eMax) eMax = e[N_BANDS_SHOWN - 1]; });
    eMax = Math.ceil(eMax * 1.05);
    const eMin = -0.5;

    function xpx(k) { return pad.l + ((k + K_MAX) / (2 * K_MAX)) * w; }
    function ypx(e) { return pad.t + (1 - (e - eMin) / (eMax - eMin)) * h; }

    // Frame
    ctx.strokeStyle = "#c8d3d5";
    ctx.strokeRect(pad.l, pad.t, w, h);

    // X ticks
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "#8e9a9e";
    ctx.textAlign = "center";
    [-K_MAX, 0, K_MAX].forEach((k, i) => {
      ctx.fillText(["-π/a", "0", "π/a"][i], xpx(k), H - pad.b + 14);
      ctx.beginPath();
      ctx.moveTo(xpx(k), H - pad.b);
      ctx.lineTo(xpx(k), H - pad.b + 4);
      ctx.strokeStyle = "#c8d3d5";
      ctx.stroke();
    });
    ctx.fillText("k", pad.l + w / 2, H - 8);

    // y ticks
    ctx.textAlign = "right";
    const yticks = 4;
    for (let i = 0; i <= yticks; i++) {
      const e = eMin + (eMax - eMin) * (i / yticks);
      ctx.fillStyle = "#eef2f3";
      ctx.beginPath();
      ctx.moveTo(pad.l, ypx(e)); ctx.lineTo(W - pad.r, ypx(e));
      ctx.stroke();
      ctx.fillStyle = "#8e9a9e";
      ctx.fillText(e.toFixed(1), pad.l - 4, ypx(e) + 3);
    }
    ctx.save();
    ctx.translate(14, pad.t + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("energy", 0, 0);
    ctx.restore();

    // Bands
    const BAND_COLORS = ["#134752", "#1f6f7a", "#3a7a86", "#7b9aa4"];
    for (let b = 0; b < N_BANDS_SHOWN; b++) {
      ctx.strokeStyle = BAND_COLORS[b];
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      bands.ks.forEach((k, i) => {
        const px = xpx(k), py = ypx(bands.energies[i][b]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }
  }
})();
