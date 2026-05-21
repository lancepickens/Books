/* Interactive · Reparametrization is gauge.

   Shows two parameterizations of the same worldsheet:
     - left:  uniform grid in (τ, σ)
     - right: deformed grid via τ' = τ + ε sin(πτ/T) cos(πσ/S),  σ' = σ + ε sin(πσ/S) cos(πτ/T)
   Both grids paint the same surface; user moves the deformation slider.
   We numerically compute the proper area for each parameterization and show
   that they agree (up to discretization error). */

(function () {
  "use strict";

  const W = 700, H = 360;
  const padL = 40, padR = 24, padT = 30, padB = 60;
  const panelW = (W - padL - padR - 32) / 2;  // two side-by-side panels
  const plotH = H - padT - padB;

  // Worldsheet parameter range
  const T_MAX = Math.PI, S_MAX = Math.PI;
  // Number of grid lines drawn
  const NG = 9;
  // Resolution for numerical area integration
  const NI = 80, NJ = 80;
  // Fixed string mode embedded in 2+1 Minkowski:
  // X^0 = τ, X^1 = σ, X^2 = A cos(σ) cos(τ) [open string, mode 1]
  const A_MODE = 0.5;

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function xEmbed(tau, sig) {
    return {
      X0: tau,
      X1: sig,
      X2: A_MODE * Math.cos(sig) * Math.cos(tau)
    };
  }

  // Numerical proper area of the worldsheet image, computed from a parameterization
  // (tau(u,v), sig(u,v)) over u ∈ [0, T_MAX], v ∈ [0, S_MAX], using det γ in (u,v).
  // Cross-term-free formula derived for X^μ = (τ, σ, y(τ,σ)) with η = diag(-1,+1,+1):
  //    det γ_(τ,σ) = -(1 + (∂_σ y)²) + (∂_τ y)²
  // For a reparametrization (u,v) → (τ(u,v), σ(u,v)), area is invariant; we verify
  // by computing det γ_(u,v) = det γ_(τ,σ) · (Jacobian)² and integrating in (u,v).
  function area(tauFn, sigFn) {
    const du = T_MAX / NI, dv = S_MAX / NJ;
    let total = 0;
    for (let i = 0; i < NI; i++) {
      const u = (i + 0.5) * du;
      for (let j = 0; j < NJ; j++) {
        const v = (j + 0.5) * dv;
        // Numerical Jacobian of (τ, σ) wrt (u, v)
        const eps = 1e-3;
        const tu = (tauFn(u + eps, v) - tauFn(u - eps, v)) / (2 * eps);
        const tv = (tauFn(u, v + eps) - tauFn(u, v - eps)) / (2 * eps);
        const su = (sigFn(u + eps, v) - sigFn(u - eps, v)) / (2 * eps);
        const sv = (sigFn(u, v + eps) - sigFn(u, v - eps)) / (2 * eps);
        const J = tu * sv - tv * su;
        // det γ at the corresponding (τ,σ)
        const tau = tauFn(u, v);
        const sig = sigFn(u, v);
        const dy_dtau = -A_MODE * Math.cos(sig) * Math.sin(tau);
        const dy_dsig = -A_MODE * Math.sin(sig) * Math.cos(tau);
        const detG_ts = -(1 + dy_dsig * dy_dsig) + dy_dtau * dy_dtau;
        // det γ in (u,v) = det γ in (τ,σ) × J²
        const detG_uv = detG_ts * J * J;
        if (-detG_uv > 0) total += Math.sqrt(-detG_uv) * du * dv;
      }
    }
    return total;
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let eps = 0.0;  // deformation amplitude

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "0.7rem";
    controls.style.marginBottom = "0.9rem";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.85rem";
    const label = document.createElement("span");
    label.textContent = "Deformation ε";
    label.style.color = "#6f6a63";
    label.style.fontWeight = "500";
    label.style.minWidth = "10ch";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0"; slider.max = "0.8"; slider.step = "0.01"; slider.value = "0";
    slider.style.accentColor = "#a83e2a";
    slider.style.flex = "1";
    slider.style.maxWidth = "16rem";
    const epsVal = document.createElement("span");
    epsVal.style.color = "#1f1c1a";
    epsVal.style.fontFeatureSettings = "'tnum'";
    epsVal.style.minWidth = "4ch";
    epsVal.textContent = "0.00";
    slider.addEventListener("input", () => {
      eps = +slider.value;
      epsVal.textContent = eps.toFixed(2);
      redraw();
    });
    controls.appendChild(label);
    controls.appendChild(slider);
    controls.appendChild(epsVal);
    mount.appendChild(controls);

    // SVG
    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Two parameterizations of the same worldsheet"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    // Two panels
    function panelX(idx) { return padL + idx * (panelW + 32); }

    const titleStyle = {
      "font-family": "Inter, sans-serif",
      "font-size": "11", fill: "#6f6a63",
      "letter-spacing": "1.5", "font-weight": "600"
    };

    // Panel frames + titles
    for (let p = 0; p < 2; p++) {
      svg.appendChild(makeSvgEl("rect", {
        x: panelX(p), y: padT, width: panelW, height: plotH,
        fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
      }));
      const t = makeSvgEl("text", Object.assign({ x: panelX(p), y: padT - 8, "text-anchor": "start" }, titleStyle));
      t.textContent = (p === 0) ? "PARAMETERIZATION  α" : "PARAMETERIZATION  β";
      svg.appendChild(t);
    }

    // Group for grid lines (rebuild each redraw)
    const gridA = makeSvgEl("g");
    const gridB = makeSvgEl("g");
    svg.appendChild(gridA);
    svg.appendChild(gridB);

    // Axis labels
    [0, 1].forEach(p => {
      const xT = makeSvgEl("text", {
        x: panelX(p) + panelW / 2, y: H - 16,
        "text-anchor": "middle",
        "font-family": "Source Serif 4, Georgia, serif",
        "font-size": "12", "font-style": "italic", fill: "#1f1c1a"
      });
      xT.textContent = "σ";
      svg.appendChild(xT);
      const yT = makeSvgEl("text", {
        x: panelX(p) - 16, y: padT + plotH / 2,
        "text-anchor": "middle",
        transform: `rotate(-90, ${panelX(p) - 16}, ${padT + plotH / 2})`,
        "font-family": "Source Serif 4, Georgia, serif",
        "font-size": "12", "font-style": "italic", fill: "#1f1c1a"
      });
      yT.textContent = "τ";
      svg.appendChild(yT);
    });

    mount.appendChild(svg);

    // Readout
    const panel = document.createElement("div");
    panel.style.marginTop = "0.85rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr 1fr";
    panel.style.gap = "0.5rem 1.5rem";
    panel.style.alignItems = "baseline";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";

    function mkStat(text, color) {
      const wrap = document.createElement("div");
      const lbl = document.createElement("div");
      lbl.style.fontFamily = "Inter, sans-serif";
      lbl.style.fontSize = "0.7rem";
      lbl.style.textTransform = "uppercase";
      lbl.style.letterSpacing = "0.12em";
      lbl.style.color = color;
      lbl.style.fontWeight = "700";
      lbl.style.marginBottom = "0.15rem";
      lbl.textContent = text;
      const val = document.createElement("div");
      val.style.fontFamily = "Source Serif 4, Georgia, serif";
      val.style.fontSize = "1.35rem";
      val.style.fontWeight = "600";
      val.style.color = "#1f1c1a";
      wrap.appendChild(lbl); wrap.appendChild(val);
      return { wrap, val };
    }
    const statA = mkStat("Area · α", "#6f6a63");
    const statB = mkStat("Area · β", "#a83e2a");
    const statDiff = mkStat("Difference", "#6f6a63");
    panel.appendChild(statA.wrap);
    panel.appendChild(statB.wrap);
    panel.appendChild(statDiff.wrap);
    mount.appendChild(panel);

    // Drawing helpers
    function panelMap(p, tau, sig) {
      // map (τ, σ) ∈ [0, T_MAX] × [0, S_MAX] into panel p's plot area
      const x = panelX(p) + (sig / S_MAX) * panelW;
      const y = padT + plotH - (tau / T_MAX) * plotH;
      return { x, y };
    }

    function drawGrid(group, tauFn, sigFn) {
      group.innerHTML = "";
      // Lines of constant u (drawn at NG values of u, each as polyline in v)
      let lines = "";
      const samples = 30;
      // const-u lines: u fixed, v varies
      for (let i = 0; i <= NG; i++) {
        const u = (i / NG) * T_MAX;
        let pts = "";
        for (let k = 0; k <= samples; k++) {
          const v = (k / samples) * S_MAX;
          const tau = tauFn(u, v);
          const sig = sigFn(u, v);
          const p = panelMap(0, tau, sig);  // we'll set panel later
          pts += `${p.x.toFixed(2)},${p.y.toFixed(2)} `;
        }
        lines += `<polyline points="${pts.trim()}" fill="none" stroke="#1e5b8a" stroke-width="1" opacity="0.55" />`;
      }
      // const-v lines: v fixed, u varies
      for (let j = 0; j <= NG; j++) {
        const v = (j / NG) * S_MAX;
        let pts = "";
        for (let k = 0; k <= samples; k++) {
          const u = (k / samples) * T_MAX;
          const tau = tauFn(u, v);
          const sig = sigFn(u, v);
          const p = panelMap(0, tau, sig);
          pts += `${p.x.toFixed(2)},${p.y.toFixed(2)} `;
        }
        lines += `<polyline points="${pts.trim()}" fill="none" stroke="#a83e2a" stroke-width="1" opacity="0.55" />`;
      }
      group.innerHTML = lines;
    }

    function drawGridIntoPanel(group, p, tauFn, sigFn) {
      group.innerHTML = "";
      const samples = 30;
      let lines = "";
      for (let i = 0; i <= NG; i++) {
        const u = (i / NG) * T_MAX;
        let pts = "";
        for (let k = 0; k <= samples; k++) {
          const v = (k / samples) * S_MAX;
          const tau = tauFn(u, v);
          const sig = sigFn(u, v);
          const pt = panelMap(p, tau, sig);
          pts += `${pt.x.toFixed(2)},${pt.y.toFixed(2)} `;
        }
        lines += `<polyline points="${pts.trim()}" fill="none" stroke="#1e5b8a" stroke-width="1.1" opacity="0.6" />`;
      }
      for (let j = 0; j <= NG; j++) {
        const v = (j / NG) * S_MAX;
        let pts = "";
        for (let k = 0; k <= samples; k++) {
          const u = (k / samples) * T_MAX;
          const tau = tauFn(u, v);
          const sig = sigFn(u, v);
          const pt = panelMap(p, tau, sig);
          pts += `${pt.x.toFixed(2)},${pt.y.toFixed(2)} `;
        }
        lines += `<polyline points="${pts.trim()}" fill="none" stroke="#a83e2a" stroke-width="1.1" opacity="0.6" />`;
      }
      group.innerHTML = lines;
    }

    function redraw() {
      // Parameterization α: identity (τ,σ) = (u,v)
      const tauA = (u, v) => u;
      const sigA = (u, v) => v;
      // Parameterization β: deformed
      const tauB = (u, v) => clamp(u + eps * Math.sin(Math.PI * u / T_MAX) * Math.cos(Math.PI * v / S_MAX), 0, T_MAX);
      const sigB = (u, v) => clamp(v + eps * Math.sin(Math.PI * v / S_MAX) * Math.cos(Math.PI * u / T_MAX), 0, S_MAX);

      drawGridIntoPanel(gridA, 0, tauA, sigA);
      drawGridIntoPanel(gridB, 1, tauB, sigB);

      const areaA = area(tauA, sigA);
      const areaB = area(tauB, sigB);
      statA.val.textContent = areaA.toFixed(4);
      statB.val.textContent = areaB.toFixed(4);
      const diff = Math.abs(areaA - areaB);
      statDiff.val.textContent = diff.toFixed(5);
      statDiff.val.style.color = (diff < 0.01) ? "#2c6e1f" : "#1f1c1a";
    }

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='reparam']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
