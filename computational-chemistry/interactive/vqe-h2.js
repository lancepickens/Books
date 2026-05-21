/* Interactive · 1-parameter UCC VQE for H₂ / STO-3G.
   Hamiltonian matrix elements in the {|HF⟩, |D⟩} two-determinant basis
   are approximate literature values for R = 1.4 a₀. */

(function () {
  "use strict";

  // 2-determinant Hamiltonian for H2 / STO-3G:
  //   |HF⟩ = doubly-occupied bonding orbital
  //   |D⟩  = doubly-excited (both electrons in antibonding orbital)
  // Diagonalizing this 2×2 gives the FCI energy.
  // Values: rough Szabo–Ostlund range; FCI ≈ -1.137 Ha at R = 1.4.
  const E_HF = -1.1167;
  const E_DD = -0.4961;       // doubly excited determinant energy
  const H_HD = -0.1813;       // off-diagonal coupling
  const E_FCI = 0.5 * (E_HF + E_DD) -
                Math.sqrt(Math.pow((E_HF - E_DD) / 2, 2) + H_HD * H_HD);

  // E(θ) for ansatz |ψ⟩ = cos(θ) |HF⟩ - sin(θ) |D⟩
  function energy(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return c * c * E_HF + s * s * E_DD - 2 * c * s * H_HD;
  }

  function thetaOpt() {
    // Minimum of E(θ) — analytic. The eigenvector of [[E_HF, -H_HD], [-H_HD, E_DD]]
    // with lowest eigenvalue.
    // Compute it numerically by minimizing energy over θ.
    let t0 = 0, t1 = Math.PI / 2;
    for (let k = 0; k < 80; k++) {
      const mid1 = t0 + (t1 - t0) / 3, mid2 = t1 - (t1 - t0) / 3;
      if (energy(mid1) < energy(mid2)) t1 = mid2; else t0 = mid1;
    }
    return (t0 + t1) / 2;
  }

  const THETA_OPT = thetaOpt();

  document.querySelectorAll("[data-widget='vqe-h2']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gap = "0.85rem";

    // Slider + buttons
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "0.55rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.84rem";
    controls.style.color = "#5f6d72";
    host.appendChild(controls);

    const lbl = document.createElement("label");
    lbl.textContent = "Ansatz parameter θ:";
    controls.appendChild(lbl);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-90"; slider.max = "90"; slider.step = "1"; slider.value = "0";
    slider.style.flex = "1";
    slider.style.minWidth = "180px";
    controls.appendChild(slider);

    const thetaVal = document.createElement("span");
    thetaVal.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    thetaVal.style.color = "#1c1f21";
    thetaVal.style.minWidth = "4em";
    thetaVal.style.textAlign = "right";
    controls.appendChild(thetaVal);

    const optBtn = mkBtn("Optimize");
    controls.appendChild(optBtn);
    const resetBtn = mkBtn("Reset");
    controls.appendChild(resetBtn);

    // Numeric readout
    const readout = document.createElement("div");
    readout.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    readout.style.fontSize = "0.84rem";
    readout.style.color = "#1c1f21";
    readout.style.padding = "0.5rem 0";
    readout.style.borderTop = "1px solid #dfe6e7";
    readout.style.borderBottom = "1px solid #dfe6e7";
    readout.style.display = "grid";
    readout.style.gridTemplateColumns = "1fr 1fr";
    readout.style.gap = "0.45rem 1.5rem";
    host.appendChild(readout);

    // Plot
    const canvas = document.createElement("canvas");
    canvas.width = 720; canvas.height = 320;
    canvas.style.width = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.background = "#fbfaf7";
    canvas.style.border = "1px solid #dfe6e7";
    canvas.style.borderRadius = "2px";
    host.appendChild(canvas);

    // State amplitude pie / bar
    const stateBar = document.createElement("div");
    stateBar.style.display = "grid";
    stateBar.style.gridTemplateColumns = "1fr 1fr";
    stateBar.style.gap = "0.5rem 1rem";
    stateBar.style.fontFamily = "Inter, sans-serif";
    stateBar.style.fontSize = "0.8rem";
    stateBar.style.color = "#5f6d72";
    host.appendChild(stateBar);

    const hfBar = document.createElement("div");
    const ddBar = document.createElement("div");
    stateBar.appendChild(hfBar);
    stateBar.appendChild(ddBar);

    function update() {
      const thetaDeg = parseFloat(slider.value);
      const theta = thetaDeg * Math.PI / 180;
      thetaVal.textContent = thetaDeg.toFixed(0) + "°";
      const E = energy(theta);
      const c = Math.cos(theta), s = Math.sin(theta);
      readout.innerHTML =
        `<span><span style="color:#5f6d72">⟨ψ(θ)|Ĥ|ψ(θ)⟩</span>&nbsp;= <strong>${E.toFixed(5)}</strong> Ha</span>` +
        `<span><span style="color:#5f6d72">FCI ground state</span>&nbsp;= <strong>${E_FCI.toFixed(5)}</strong> Ha</span>` +
        `<span><span style="color:#5f6d72">HF reference</span>&nbsp;= ${E_HF.toFixed(5)} Ha</span>` +
        `<span><span style="color:#5f6d72">Δ to FCI</span>&nbsp;= ${(E - E_FCI).toFixed(5)} Ha</span>`;
      hfBar.innerHTML =
        `|HF⟩ probability: ${(c * c * 100).toFixed(1)}%` +
        `<div style="height:6px;background:#eef2f3;border-radius:3px;overflow:hidden;margin-top:3px">` +
        `<div style="height:100%;width:${(c * c * 100).toFixed(1)}%;background:#1f6f7a"></div></div>`;
      ddBar.innerHTML =
        `|D⟩ probability: ${(s * s * 100).toFixed(1)}%` +
        `<div style="height:6px;background:#eef2f3;border-radius:3px;overflow:hidden;margin-top:3px">` +
        `<div style="height:100%;width:${(s * s * 100).toFixed(1)}%;background:#b88946"></div></div>`;
      draw(canvas, theta);
    }

    slider.addEventListener("input", update);
    resetBtn.addEventListener("click", () => { slider.value = "0"; update(); });

    // Animated optimization
    optBtn.addEventListener("click", () => {
      const target = THETA_OPT * 180 / Math.PI;
      const start = parseFloat(slider.value);
      const steps = 30;
      let k = 0;
      const tick = () => {
        const t = (k + 1) / steps;
        const v = start + (target - start) * (1 - Math.pow(1 - t, 3));
        slider.value = v.toFixed(1);
        update();
        k++;
        if (k < steps) requestAnimationFrame(tick);
      };
      tick();
    });

    update();
  }

  function draw(canvas, currentTheta) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, W, H);

    const PAD = { l: 64, r: 18, t: 22, b: 38 };
    const w = W - PAD.l - PAD.r, h = H - PAD.t - PAD.b;

    // Sample E(θ)
    const N = 240;
    const xs = new Float64Array(N);
    const ys = new Float64Array(N);
    let eMin = +Infinity, eMax = -Infinity;
    for (let i = 0; i < N; i++) {
      const theta = -Math.PI / 2 + Math.PI * i / (N - 1);
      xs[i] = theta;
      ys[i] = energy(theta);
      if (ys[i] < eMin) eMin = ys[i];
      if (ys[i] > eMax) eMax = ys[i];
    }
    const yLo = eMin - 0.05, yHi = eMax + 0.05;
    function xpx(theta) { return PAD.l + ((theta * 180 / Math.PI) + 90) / 180 * w; }
    function ypx(e) { return PAD.t + (1 - (e - yLo) / (yHi - yLo)) * h; }

    // Frame
    ctx.strokeStyle = "#c8d3d5";
    ctx.strokeRect(PAD.l, PAD.t, w, h);
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "#8e9a9e";
    ctx.textAlign = "right";
    [yLo, (yLo + yHi) / 2, yHi].forEach(e => ctx.fillText(e.toFixed(3), PAD.l - 6, ypx(e) + 3));
    ctx.textAlign = "center";
    [-90, -45, 0, 45, 90].forEach(d => ctx.fillText(d + "°", xpx(d * Math.PI / 180), H - PAD.b + 14));
    ctx.fillStyle = "#5f6d72";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("θ (ansatz parameter)", PAD.l + w / 2, H - 6);
    ctx.save();
    ctx.translate(18, PAD.t + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("⟨ψ(θ)|Ĥ|ψ(θ)⟩ (Hartrees)", 0, 0);
    ctx.restore();

    // HF and FCI reference lines
    ctx.strokeStyle = "rgba(95,109,114,0.6)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD.l, ypx(E_HF)); ctx.lineTo(W - PAD.r, ypx(E_HF));
    ctx.stroke();
    ctx.fillStyle = "#5f6d72";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HF reference", PAD.l + 6, ypx(E_HF) - 4);

    ctx.strokeStyle = "rgba(31,111,122,0.8)";
    ctx.beginPath();
    ctx.moveTo(PAD.l, ypx(E_FCI)); ctx.lineTo(W - PAD.r, ypx(E_FCI));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1f6f7a";
    ctx.fillText("FCI ground state", PAD.l + 6, ypx(E_FCI) + 12);

    // Energy curve
    ctx.strokeStyle = "#134752";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = xpx(xs[i]), py = ypx(ys[i]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Current θ marker
    const E_cur = energy(currentTheta);
    const px = xpx(currentTheta), py = ypx(E_cur);
    ctx.strokeStyle = "rgba(28,31,33,0.4)";
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(px, PAD.t); ctx.lineTo(px, H - PAD.b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#b88946";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fbfaf7";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  function mkBtn(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.82rem";
    b.style.padding = "0.4rem 0.95rem";
    b.style.border = "1px solid #1f6f7a";
    b.style.background = "#1f6f7a";
    b.style.color = "#fff";
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    return b;
  }
})();
