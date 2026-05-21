/* Interactive · Self-consistent field on H₂ (STO-3G).
   A real RHF SCF using verified two-electron integrals at R = 1.4 a₀.
   Source for integrals: Szabo & Ostlund, Modern Quantum Chemistry, §3.5. */

(function () {
  "use strict";

  // H₂ STO-3G integrals at R = 1.4 Bohr (SO §3.5).
  const S12 = 0.6593;                     // overlap between φ₁ and φ₂
  const H11 = -1.1204, H12 = -0.9584;     // core Hamiltonian (one-electron)
  // Two-electron integrals in chemists' notation (μν|λσ).
  const I_1111 = 0.7746;                  // (11|11) = (22|22)
  const I_1122 = 0.5697;                  // (11|22) = (22|11)
  const I_1212 = 0.2970;                  // (12|12) = (12|21) = (21|12) = (21|21)
  const I_1112 = 0.4441;                  // (11|12) and permutations
  // Nuclear repulsion.
  const VNN = 1.0 / 1.4;                  // = 0.7143
  // Exact FCI energy for comparison (SO Tab. 3.1).
  const E_FCI = -1.1373;
  // Reference converged HF energy.
  const E_HF_REF = -1.1167;

  // Look up (μν|λσ) for μ,ν,λ,σ ∈ {0,1}.
  function eri(m, n, l, s) {
    // count how many indices are "1" (1 = atom 2 in 0-indexed)
    const c = m + n + l + s;
    if (c === 0 || c === 4) return I_1111;
    if (c === 2) {
      // Two cases: (11|22)-type vs (12|12)-type.
      // (11|22): m==n and l==s and m≠l.
      if (m === n && l === s && m !== l) return I_1122;
      // (22|11): same by symmetry — also m==n, l==s, m≠l. Already handled.
      // Remaining c==2: exactly two of {m,n,l,s} are 1.
      // (12|12), (12|21), (21|12), (21|21): m≠n, l≠s.
      return I_1212;
    }
    // c == 1 or c == 3: a (11|12)-type integral.
    return I_1112;
  }

  // Build Fock matrix F = h + G(P), closed-shell.
  // G_μν = Σ_λσ P_λσ [(μν|λσ) − ½(μλ|σν)]   (chemists' notation)
  function buildFock(P) {
    const F = [[H11, H12], [H12, H11]];
    for (let m = 0; m < 2; m++) {
      for (let n = 0; n < 2; n++) {
        let g = 0;
        for (let l = 0; l < 2; l++) {
          for (let s = 0; s < 2; s++) {
            g += P[l][s] * (eri(m, n, l, s) - 0.5 * eri(m, l, s, n));
          }
        }
        F[m][n] += g;
      }
    }
    return F;
  }

  // Solve 2×2 generalized eigenvalue problem F C = S C ε.
  // Returns { evals: [ε0, ε1], evecs: [[c0,c0], [c1,c1]] } sorted by ε ascending.
  function genEig2x2(F) {
    const a = F[0][0], b = F[0][1], c = F[1][1];
    const s = S12;
    // (1 − s²)ε² − (a + c − 2bs)ε + (ac − b²) = 0
    const A = 1 - s * s;
    const B = -(a + c - 2 * b * s);
    const C = a * c - b * b;
    const disc = Math.sqrt(B * B - 4 * A * C);
    const e0 = (-B - disc) / (2 * A);
    const e1 = (-B + disc) / (2 * A);
    // Eigenvectors: (a − ε) c0 + (b − εs) c1 = 0 → ratio c0:c1
    function vec(e) {
      const x = -(b - e * s);
      const y = (a - e);
      // Normalize so ⟨v|S|v⟩ = 1
      const norm2 = x * x + 2 * s * x * y + y * y;
      const n = Math.sqrt(Math.abs(norm2));
      return [x / n, y / n];
    }
    return { evals: [e0, e1], evecs: [vec(e0), vec(e1)] };
  }

  // Closed-shell density from MO coefficients (only the lowest MO is occupied,
  // by 2 electrons).
  function densityFrom(evec) {
    const c0 = evec[0], c1 = evec[1];
    return [
      [2 * c0 * c0, 2 * c0 * c1],
      [2 * c0 * c1, 2 * c1 * c1]
    ];
  }

  // Electronic energy: ½ Σ P_μν (h_μν + F_μν)
  function electronicEnergy(P, F) {
    let e = 0;
    const H = [[H11, H12], [H12, H11]];
    for (let m = 0; m < 2; m++)
      for (let n = 0; n < 2; n++)
        e += 0.5 * P[m][n] * (H[m][n] + F[m][n]);
    return e;
  }

  function pNorm(P, Q) {
    let s = 0;
    for (let m = 0; m < 2; m++)
      for (let n = 0; n < 2; n++)
        s += (P[m][n] - Q[m][n]) * (P[m][n] - Q[m][n]);
    return Math.sqrt(s);
  }

  // ── DOM ──────────────────────────────────────────────────

  document.querySelectorAll("[data-widget='scf-iteration']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gridTemplateColumns = "1fr";
    host.style.gap = "0.9rem";

    // State.
    // Initial guess: deliberately asymmetric (both electrons on atom 1)
    // so the SCF visibly iterates rather than converging in one step.
    let P = [[2, 0], [0, 0]];
    let damping = false;
    const ALPHA = 0.5;        // damping factor
    let history = [];          // {iter, E, dP}
    let iter = 0;

    // Controls row
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "0.5rem";
    controls.style.flexWrap = "wrap";
    controls.style.alignItems = "center";
    host.appendChild(controls);

    const stepBtn = mkBtn("Step", () => { stepOnce(); render(); });
    const runBtn  = mkBtn("Run to convergence", () => { runToConvergence(); render(); });
    const resetBtn = mkBtn("Reset", () => { reset(); render(); });
    controls.appendChild(stepBtn);
    controls.appendChild(runBtn);
    controls.appendChild(resetBtn);

    const dampLabel = document.createElement("label");
    dampLabel.style.fontFamily = "Inter, sans-serif";
    dampLabel.style.fontSize = "0.82rem";
    dampLabel.style.color = "#5f6d72";
    dampLabel.style.marginLeft = "auto";
    dampLabel.style.cursor = "pointer";
    dampLabel.style.userSelect = "none";
    const dampBox = document.createElement("input");
    dampBox.type = "checkbox";
    dampBox.style.marginRight = "0.4em";
    dampBox.checked = false;
    dampBox.addEventListener("change", () => { damping = dampBox.checked; });
    dampLabel.appendChild(dampBox);
    dampLabel.appendChild(document.createTextNode("Damp updates (α = 0.5)"));
    controls.appendChild(dampLabel);

    // State display
    const stateBox = document.createElement("div");
    stateBox.style.display = "grid";
    stateBox.style.gridTemplateColumns = "1fr 1fr";
    stateBox.style.gap = "0.7rem 1.4rem";
    stateBox.style.fontFamily = "Inter, sans-serif";
    stateBox.style.fontSize = "0.86rem";
    stateBox.style.color = "#1c1f21";
    stateBox.style.padding = "0.5rem 0";
    stateBox.style.borderTop = "1px solid #dfe6e7";
    stateBox.style.borderBottom = "1px solid #dfe6e7";
    host.appendChild(stateBox);

    const iterEl = mkStat("Iteration", "0");
    const eEl    = mkStat("Total energy", "—");
    const dpEl   = mkStat("‖ΔP‖", "—");
    const homoEl = mkStat("HOMO ε", "—");
    stateBox.appendChild(iterEl.row);
    stateBox.appendChild(eEl.row);
    stateBox.appendChild(dpEl.row);
    stateBox.appendChild(homoEl.row);

    // Matrix display
    const mxBox = document.createElement("div");
    mxBox.style.display = "grid";
    mxBox.style.gridTemplateColumns = "repeat(2, minmax(0,1fr))";
    mxBox.style.gap = "0.7rem 1.4rem";
    mxBox.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    mxBox.style.fontSize = "0.82rem";
    host.appendChild(mxBox);

    const pCell = mkMatrixCell("Density P");
    const fCell = mkMatrixCell("Fock F");
    mxBox.appendChild(pCell.wrap);
    mxBox.appendChild(fCell.wrap);

    // Convergence plot
    const plotWrap = document.createElement("div");
    plotWrap.style.marginTop = "0.4rem";
    host.appendChild(plotWrap);

    const plotLabel = document.createElement("div");
    plotLabel.textContent = "Energy convergence (Hartrees)";
    plotLabel.style.fontFamily = "Inter, sans-serif";
    plotLabel.style.fontSize = "0.75rem";
    plotLabel.style.color = "#8e9a9e";
    plotLabel.style.letterSpacing = "0.04em";
    plotLabel.style.textTransform = "uppercase";
    plotLabel.style.marginBottom = "0.3rem";
    plotWrap.appendChild(plotLabel);

    const canvas = document.createElement("canvas");
    canvas.width = 700; canvas.height = 200;
    canvas.style.width = "100%"; canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.background = "#fbfaf7";
    canvas.style.border = "1px solid #dfe6e7";
    canvas.style.borderRadius = "2px";
    plotWrap.appendChild(canvas);

    // ── helpers ─────────────────────────────────────────

    function stepOnce() {
      const F = buildFock(P);
      const eig = genEig2x2(F);
      const Pnew = densityFrom(eig.evecs[0]);
      const dp = pNorm(Pnew, P);
      const Pmix = damping
        ? [[(1 - ALPHA) * P[0][0] + ALPHA * Pnew[0][0],
            (1 - ALPHA) * P[0][1] + ALPHA * Pnew[0][1]],
           [(1 - ALPHA) * P[1][0] + ALPHA * Pnew[1][0],
            (1 - ALPHA) * P[1][1] + ALPHA * Pnew[1][1]]]
        : Pnew;
      const Eel = electronicEnergy(Pnew, F);
      const Etot = Eel + VNN;
      iter += 1;
      history.push({ iter, E: Etot, dP: dp, eHOMO: eig.evals[0], F });
      P = Pmix;
    }

    function runToConvergence() {
      // Cap at 30 iterations for safety
      for (let k = 0; k < 30; k++) {
        const F = buildFock(P);
        const eig = genEig2x2(F);
        const Pnew = densityFrom(eig.evecs[0]);
        const dp = pNorm(Pnew, P);
        const Eel = electronicEnergy(Pnew, F);
        const Etot = Eel + VNN;
        iter += 1;
        history.push({ iter, E: Etot, dP: dp, eHOMO: eig.evals[0], F });
        if (dp < 1e-7) { P = Pnew; break; }
        P = damping
          ? [[(1 - ALPHA) * P[0][0] + ALPHA * Pnew[0][0],
              (1 - ALPHA) * P[0][1] + ALPHA * Pnew[0][1]],
             [(1 - ALPHA) * P[1][0] + ALPHA * Pnew[1][0],
              (1 - ALPHA) * P[1][1] + ALPHA * Pnew[1][1]]]
          : Pnew;
      }
    }

    function reset() {
      P = [[2, 0], [0, 0]];
      history = [];
      iter = 0;
    }

    function render() {
      iterEl.val.textContent = String(iter);
      if (history.length) {
        const h = history[history.length - 1];
        eEl.val.textContent = h.E.toFixed(6) + " Ha";
        dpEl.val.textContent = h.dP.toExponential(2);
        homoEl.val.textContent = h.eHOMO.toFixed(4) + " Ha";
        renderMatrix(fCell.body, h.F);
      } else {
        eEl.val.textContent = "—";
        dpEl.val.textContent = "—";
        homoEl.val.textContent = "—";
        renderMatrix(fCell.body, [[H11, H12], [H12, H11]]);
      }
      renderMatrix(pCell.body, P);
      renderPlot(canvas, history);
    }

    reset();
    render();
  }

  function mkBtn(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.82rem";
    b.style.padding = "0.4rem 0.85rem";
    b.style.border = "1px solid #1f6f7a";
    b.style.background = "#1f6f7a";
    b.style.color = "#ffffff";
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    b.addEventListener("click", onClick);
    return b;
  }

  function mkStat(label, val) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.borderBottom = "1px dotted #dfe6e7";
    row.style.padding = "0.18rem 0";
    const l = document.createElement("span");
    l.textContent = label;
    l.style.color = "#5f6d72";
    const v = document.createElement("span");
    v.textContent = val;
    v.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    v.style.color = "#1c1f21";
    row.appendChild(l); row.appendChild(v);
    return { row, val: v };
  }

  function mkMatrixCell(title) {
    const wrap = document.createElement("div");
    const t = document.createElement("div");
    t.textContent = title;
    t.style.fontFamily = "Inter, sans-serif";
    t.style.fontSize = "0.75rem";
    t.style.color = "#8e9a9e";
    t.style.letterSpacing = "0.04em";
    t.style.textTransform = "uppercase";
    t.style.marginBottom = "0.25rem";
    const body = document.createElement("table");
    body.style.borderCollapse = "collapse";
    body.style.fontSize = "0.85rem";
    body.style.color = "#1c1f21";
    wrap.appendChild(t);
    wrap.appendChild(body);
    return { wrap, body };
  }

  function renderMatrix(table, M) {
    table.innerHTML = "";
    for (let i = 0; i < 2; i++) {
      const tr = document.createElement("tr");
      for (let j = 0; j < 2; j++) {
        const td = document.createElement("td");
        td.textContent = M[i][j].toFixed(4);
        td.style.padding = "0.18em 0.65em";
        td.style.border = "1px solid #dfe6e7";
        td.style.textAlign = "right";
        td.style.minWidth = "5.5em";
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
  }

  function renderPlot(canvas, history) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 56, r: 18, t: 14, b: 28 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;

    // y range: include reference HF energy and any history.
    let yMin = E_HF_REF - 0.02, yMax = -0.5;
    history.forEach(p => { if (p.E < yMin) yMin = p.E - 0.01; if (p.E > yMax) yMax = p.E + 0.02; });
    if (yMax - yMin < 0.1) yMax = yMin + 0.6;

    const xMax = Math.max(8, history.length);
    function xpx(i) { return pad.l + (i / xMax) * w; }
    function ypx(e) { return pad.t + (1 - (e - yMin) / (yMax - yMin)) * h; }

    // Reference HF line
    ctx.strokeStyle = "rgba(31,111,122,0.4)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, ypx(E_HF_REF)); ctx.lineTo(W - pad.r, ypx(E_HF_REF));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#5f6d72";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("HF reference: −1.1167 Ha", pad.l + 6, ypx(E_HF_REF) - 4);

    // Axis labels
    ctx.fillStyle = "#8e9a9e";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    [yMin, (yMin + yMax) / 2, yMax].forEach(yv => {
      ctx.fillText(yv.toFixed(3), pad.l - 6, ypx(yv) + 3);
    });
    ctx.textAlign = "center";
    ctx.fillText("iteration", pad.l + w / 2, H - 6);

    // Frame
    ctx.strokeStyle = "#c8d3d5";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.l, pad.t, w, h);

    // Plot points + line
    if (history.length) {
      ctx.strokeStyle = "#1f6f7a";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      history.forEach((p, idx) => {
        const x = xpx(idx + 1), y = ypx(p.E);
        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = "#1f6f7a";
      history.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(xpx(idx + 1), ypx(p.E), 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
})();
