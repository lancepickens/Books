/* Interactive · equivariance demo.
   Compare an invariant model (energy from internal coords only) with a
   naive model (linear regression in raw Cartesian coordinates, fit at one
   orientation). The naive model gives orientation-dependent predictions —
   that's the inductive-bias failure equivariant architectures avoid. */

(function () {
  "use strict";

  // True bend potential: E(θ) = ½ k (θ - θ_eq)²
  const K_BEND = 1.4;
  const THETA_EQ = (109.5 / 180) * Math.PI;
  const BOND = 1.0;

  function trueE(theta) {
    const d = theta - THETA_EQ;
    return 0.5 * K_BEND * d * d;
  }

  // Build a naive linear model in raw (x_A, y_A, x_C, y_C) features (with B at
  // origin). Train on a sweep of bend angles θ at orientation φ = 0.
  // The model is y ≈ w · ϕ(x), where features include constant, linear, and
  // quadratic terms in coordinates. At φ = 0 it fits well; at φ ≠ 0 it doesn't.
  function buildNaiveModel() {
    const trainTheta = [];
    for (let i = 0; i < 30; i++) {
      trainTheta.push(Math.PI * (0.3 + 0.5 * i / 29));   // ~55° to ~145°
    }
    const X = trainTheta.map(theta => {
      const ax = BOND, ay = 0;
      const cx = BOND * Math.cos(theta), cy = BOND * Math.sin(theta);
      return featureVec(ax, ay, cx, cy);
    });
    const y = trainTheta.map(theta => trueE(theta));
    // Normal equations: w = (XᵀX)⁻¹ Xᵀ y, with ridge regularization
    return solveRidge(X, y, 1e-3);
  }

  function featureVec(ax, ay, cx, cy) {
    return [
      1,
      ax, ay, cx, cy,
      ax * ax, ay * ay, cx * cx, cy * cy,
      ax * cx, ay * cy, ax * cy, ay * cx
    ];
  }

  function solveRidge(X, y, lam) {
    const n = X.length;
    const d = X[0].length;
    // M = XᵀX + lam I
    const M = [];
    for (let i = 0; i < d; i++) M.push(new Float64Array(d));
    const b = new Float64Array(d);
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < d; i++) {
        b[i] += X[k][i] * y[k];
        for (let j = 0; j < d; j++) {
          M[i][j] += X[k][i] * X[k][j];
        }
      }
    }
    for (let i = 0; i < d; i++) M[i][i] += lam;
    return gaussSolve(M, Array.from(b));
  }

  function gaussSolve(A, b) {
    const n = A.length;
    // Copy
    const M = A.map(r => Array.from(r));
    const x = b.slice();
    // Forward elimination
    for (let p = 0; p < n; p++) {
      // partial pivot
      let max = Math.abs(M[p][p]), pr = p;
      for (let i = p + 1; i < n; i++) {
        if (Math.abs(M[i][p]) > max) { max = Math.abs(M[i][p]); pr = i; }
      }
      if (pr !== p) {
        [M[p], M[pr]] = [M[pr], M[p]];
        [x[p], x[pr]] = [x[pr], x[p]];
      }
      const pivot = M[p][p];
      if (Math.abs(pivot) < 1e-14) continue;
      for (let i = p + 1; i < n; i++) {
        const f = M[i][p] / pivot;
        for (let j = p; j < n; j++) M[i][j] -= f * M[p][j];
        x[i] -= f * x[p];
      }
    }
    // Back substitution
    const out = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = x[i];
      for (let j = i + 1; j < n; j++) s -= M[i][j] * out[j];
      out[i] = s / (M[i][i] || 1);
    }
    return out;
  }

  function predictNaive(model, ax, ay, cx, cy) {
    const f = featureVec(ax, ay, cx, cy);
    let s = 0;
    for (let i = 0; i < f.length; i++) s += f[i] * model[i];
    return s;
  }

  document.querySelectorAll("[data-widget='equivariance']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gap = "0.85rem";

    const naiveModel = buildNaiveModel();

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "grid";
    controls.style.gap = "0.45rem 1rem";
    controls.style.gridTemplateColumns = "auto 1fr auto";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.85rem";
    controls.style.color = "#5f6d72";
    host.appendChild(controls);

    const thetaLbl = document.createElement("label");
    thetaLbl.textContent = "Bend angle θ:";
    const thetaSlider = document.createElement("input");
    thetaSlider.type = "range"; thetaSlider.min = "60"; thetaSlider.max = "160"; thetaSlider.value = "109"; thetaSlider.step = "1";
    const thetaVal = document.createElement("span");
    thetaVal.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    thetaVal.style.color = "#1c1f21";
    thetaVal.style.minWidth = "3em";
    controls.appendChild(thetaLbl); controls.appendChild(thetaSlider); controls.appendChild(thetaVal);

    const phiLbl = document.createElement("label");
    phiLbl.textContent = "Rigid rotation φ:";
    const phiSlider = document.createElement("input");
    phiSlider.type = "range"; phiSlider.min = "0"; phiSlider.max = "360"; phiSlider.value = "0"; phiSlider.step = "1";
    const phiVal = document.createElement("span");
    phiVal.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    phiVal.style.color = "#1c1f21";
    phiVal.style.minWidth = "3em";
    controls.appendChild(phiLbl); controls.appendChild(phiSlider); controls.appendChild(phiVal);

    // Plots
    const plots = document.createElement("div");
    plots.style.display = "grid";
    plots.style.gridTemplateColumns = "1fr 1fr";
    plots.style.gap = "0.7rem";
    host.appendChild(plots);

    const molCanvas = document.createElement("canvas");
    molCanvas.width = 360; molCanvas.height = 320;
    molCanvas.style.width = "100%"; molCanvas.style.height = "auto";
    molCanvas.style.background = "#fbfaf7";
    molCanvas.style.border = "1px solid #dfe6e7";
    molCanvas.style.borderRadius = "2px";
    plots.appendChild(molCanvas);

    const energyCanvas = document.createElement("canvas");
    energyCanvas.width = 360; energyCanvas.height = 320;
    energyCanvas.style.width = "100%"; energyCanvas.style.height = "auto";
    energyCanvas.style.background = "#fbfaf7";
    energyCanvas.style.border = "1px solid #dfe6e7";
    energyCanvas.style.borderRadius = "2px";
    plots.appendChild(energyCanvas);

    // Numeric readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    readout.style.fontSize = "0.82rem";
    readout.style.color = "#1c1f21";
    readout.style.padding = "0.5rem 0";
    readout.style.borderTop = "1px solid #dfe6e7";
    readout.style.borderBottom = "1px solid #dfe6e7";
    readout.style.display = "grid";
    readout.style.gridTemplateColumns = "1fr 1fr 1fr";
    readout.style.gap = "0.5rem 1rem";
    host.appendChild(readout);

    function update() {
      const theta = parseFloat(thetaSlider.value) * Math.PI / 180;
      const phi = parseFloat(phiSlider.value) * Math.PI / 180;
      thetaVal.textContent = (parseFloat(thetaSlider.value)).toFixed(0) + "°";
      phiVal.textContent = (parseFloat(phiSlider.value)).toFixed(0) + "°";

      const Et = trueE(theta);
      const Einv = trueE(theta);                        // invariant model = function of θ alone
      // Naive uses rotated coords
      const ax0 = BOND, ay0 = 0;
      const cx0 = BOND * Math.cos(theta), cy0 = BOND * Math.sin(theta);
      const cs = Math.cos(phi), sn = Math.sin(phi);
      const ax = cs * ax0 - sn * ay0, ay = sn * ax0 + cs * ay0;
      const cx = cs * cx0 - sn * cy0, cy = sn * cx0 + cs * cy0;
      const Enaive = predictNaive(naiveModel, ax, ay, cx, cy);

      readout.innerHTML =
        `<span><span style="color:#5f6d72">True&nbsp;E(θ):</span> ${Et.toFixed(4)}</span>` +
        `<span><span style="color:#5f6d72">Invariant model:</span> ${Einv.toFixed(4)}</span>` +
        `<span><span style="color:#5f6d72">Naive model:</span> ${Enaive.toFixed(4)}</span>`;

      drawMolecule(molCanvas, ax, ay, cx, cy);
      drawEnergyCurve(energyCanvas, naiveModel, theta, phi);
    }

    thetaSlider.addEventListener("input", update);
    phiSlider.addEventListener("input", update);
    update();
  }

  function drawMolecule(canvas, ax, ay, cx, cy) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, W, H);

    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#5f6d72";
    ctx.textAlign = "left";
    ctx.fillText("Three-atom molecule (xy plane)", 12, 18);

    const cx0 = W / 2, cy0 = H / 2 + 10;
    const scale = 70;
    // Atom positions
    const bx = cx0, by = cy0;
    const apx = cx0 + scale * ax, apy = cy0 - scale * ay;
    const cpx = cx0 + scale * cx, cpy = cy0 - scale * cy;

    // Bonds
    ctx.strokeStyle = "#5f6d72";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(apx, apy);
    ctx.moveTo(bx, by); ctx.lineTo(cpx, cpy);
    ctx.stroke();

    // Atoms
    function atom(x, y, label, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fbfaf7";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fbfaf7";
      ctx.textAlign = "center";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.fillText(label, x, y + 4);
    }
    atom(apx, apy, "A", "#1f6f7a");
    atom(bx, by, "B", "#134752");
    atom(cpx, cpy, "C", "#b88946");

    // Reference frame
    ctx.strokeStyle = "#dfe6e7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, H - 24); ctx.lineTo(60, H - 24);
    ctx.moveTo(20, H - 24); ctx.lineTo(20, H - 64);
    ctx.stroke();
    ctx.fillStyle = "#8e9a9e";
    ctx.font = "italic 10px serif";
    ctx.fillText("x", 65, H - 21);
    ctx.fillText("y", 18, H - 70);
  }

  function drawEnergyCurve(canvas, model, currentTheta, currentPhi) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, W, H);
    const PAD = { l: 50, r: 12, t: 22, b: 36 };
    const w = W - PAD.l - PAD.r, h = H - PAD.t - PAD.b;

    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#5f6d72";
    ctx.textAlign = "left";
    ctx.fillText("Energy at the current θ, vs. rotation φ", 12, 18);

    // Compute true E
    const Etrue = trueE(currentTheta);

    // Compute naive E as a function of φ
    const ax0 = BOND, ay0 = 0;
    const cx0 = BOND * Math.cos(currentTheta), cy0 = BOND * Math.sin(currentTheta);
    const NP = 121;
    const E_naive = new Float64Array(NP);
    for (let i = 0; i < NP; i++) {
      const phi = 2 * Math.PI * i / (NP - 1);
      const cs = Math.cos(phi), sn = Math.sin(phi);
      const ax = cs * ax0 - sn * ay0, ay = sn * ax0 + cs * ay0;
      const cx = cs * cx0 - sn * cy0, cy = sn * cx0 + cs * cy0;
      E_naive[i] = predictNaive(model, ax, ay, cx, cy);
    }
    let eMin = Math.min(Etrue, ...E_naive) - 0.1;
    let eMax = Math.max(Etrue, ...E_naive) + 0.1;
    if (eMax - eMin < 0.4) eMax = eMin + 0.4;

    function xpx(phi) { return PAD.l + (phi / 360) * w; }
    function ypx(e) { return PAD.t + (1 - (e - eMin) / (eMax - eMin)) * h; }

    // Axes
    ctx.strokeStyle = "#c8d3d5";
    ctx.strokeRect(PAD.l, PAD.t, w, h);
    ctx.fillStyle = "#8e9a9e";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    [eMin, (eMin + eMax) / 2, eMax].forEach(e => ctx.fillText(e.toFixed(2), PAD.l - 4, ypx(e) + 3));
    ctx.textAlign = "center";
    [0, 90, 180, 270, 360].forEach(p => ctx.fillText(p.toString() + "°", xpx(p), H - PAD.b + 14));
    ctx.fillStyle = "#5f6d72";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("rotation φ", PAD.l + w / 2, H - 6);
    ctx.save();
    ctx.translate(14, PAD.t + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("predicted E", 0, 0);
    ctx.restore();

    // True/invariant line: horizontal at Etrue
    ctx.strokeStyle = "#5f6d72";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.l, ypx(Etrue));
    ctx.lineTo(W - PAD.r, ypx(Etrue));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#5f6d72";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("invariant / true", PAD.l + 8, ypx(Etrue) - 4);

    // Naive curve
    ctx.strokeStyle = "#a83e2a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < NP; i++) {
      const phi = 360 * i / (NP - 1);
      if (i === 0) ctx.moveTo(xpx(phi), ypx(E_naive[i]));
      else ctx.lineTo(xpx(phi), ypx(E_naive[i]));
    }
    ctx.stroke();
    ctx.fillStyle = "#a83e2a";
    ctx.fillText("naive (raw coords)", PAD.l + 8, PAD.t + 14);

    // Current φ marker
    const phiDeg = currentPhi * 180 / Math.PI;
    ctx.strokeStyle = "rgba(28,31,33,0.4)";
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(xpx(phiDeg), PAD.t);
    ctx.lineTo(xpx(phiDeg), H - PAD.b);
    ctx.stroke();
    ctx.setLineDash([]);
  }
})();
