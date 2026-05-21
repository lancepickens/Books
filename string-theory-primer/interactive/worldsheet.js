/* Interactive · Worldsheet visualizer.

   Embeds a classical-mode string in 2+1 Minkowski:
     X^0 = τ,  X^1 = σ (longitudinal),  X^2 = transverse embedding y(τ,σ)
   Open string:    y = A cos(nσ) cos(nτ),  σ ∈ [0,π]
   Closed string:  y = A cos(n(σ-τ)),      σ ∈ [0,2π]

   Renders y(τ,σ) as a heatmap over the (σ,τ) rectangle (the worldsheet itself,
   as an abstract 2-manifold) and computes the proper area
       Area = ∫∫ √(-det γ) dτ dσ
   numerically, where γ_ab = ∂_a X · ∂_b X with η = diag(-1,+1,+1). */

(function () {
  "use strict";

  const W = 660, H = 380;
  const padL = 60, padR = 24, padT = 30, padB = 60;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Resolution of the heatmap grid (also used for numerical area integration)
  const NS = 96;  // along σ
  const NT = 60;  // along τ
  const T_MAX = Math.PI;  // worldsheet "time" range

  function makeSvgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // Diverging colormap: blue → cream → terracotta
  function colormap(v) {
    // v in [-1, 1]
    v = Math.max(-1, Math.min(1, v));
    const t = (v + 1) / 2;
    // anchor colors:
    const c0 = [30, 91, 138];    // #1e5b8a deep blue
    const c1 = [251, 250, 247];  // #fbfaf7 background cream
    const c2 = [168, 62, 42];    // #a83e2a terracotta
    let r, g, b;
    if (t < 0.5) {
      const u = t * 2;
      r = c0[0] + (c1[0] - c0[0]) * u;
      g = c0[1] + (c1[1] - c0[1]) * u;
      b = c0[2] + (c1[2] - c0[2]) * u;
    } else {
      const u = (t - 0.5) * 2;
      r = c1[0] + (c2[0] - c1[0]) * u;
      g = c1[1] + (c2[1] - c1[1]) * u;
      b = c1[2] + (c2[2] - c1[2]) * u;
    }
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  function build(section) {
    const mount = section.querySelector(".widget-mount");
    if (!mount) return;

    let state = {
      A: 0.6,
      n: 1,
      closed: false
    };

    // ── Controls (above SVG) ───────────────────────────
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "1.25rem 2rem";
    controls.style.alignItems = "center";
    controls.style.marginBottom = "0.9rem";
    controls.style.fontFamily = "Inter, sans-serif";
    controls.style.fontSize = "0.85rem";

    function mkSliderControl(labelText, min, max, step, initial, onInput) {
      const wrap = document.createElement("label");
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "0.6rem";
      const t = document.createElement("span");
      t.textContent = labelText;
      t.style.color = "#6f6a63";
      t.style.fontWeight = "500";
      t.style.minWidth = "8ch";
      const inp = document.createElement("input");
      inp.type = "range";
      inp.min = min; inp.max = max; inp.step = step; inp.value = initial;
      inp.style.accentColor = "#a83e2a";
      const val = document.createElement("span");
      val.style.color = "#1f1c1a";
      val.style.fontFeatureSettings = "'tnum'";
      val.style.minWidth = "4ch";
      val.textContent = (+inp.value).toFixed(2);
      inp.addEventListener("input", () => {
        val.textContent = (+inp.value).toFixed(2);
        onInput(+inp.value);
      });
      wrap.appendChild(t); wrap.appendChild(inp); wrap.appendChild(val);
      return wrap;
    }

    function mkSelect(labelText, options, initial, onChange) {
      const wrap = document.createElement("label");
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "0.6rem";
      const t = document.createElement("span");
      t.textContent = labelText;
      t.style.color = "#6f6a63";
      t.style.fontWeight = "500";
      const sel = document.createElement("select");
      sel.style.fontFamily = "Inter, sans-serif";
      sel.style.fontSize = "0.85rem";
      sel.style.padding = "0.2rem 0.45rem";
      sel.style.border = "1px solid #d3cabd";
      sel.style.background = "#fbfaf7";
      sel.style.color = "#1f1c1a";
      sel.style.borderRadius = "2px";
      for (const o of options) {
        const opt = document.createElement("option");
        opt.value = String(o.value);
        opt.textContent = o.label;
        if (o.value === initial) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener("change", () => onChange(sel.value));
      wrap.appendChild(t); wrap.appendChild(sel);
      return wrap;
    }

    controls.appendChild(mkSliderControl("Amplitude A", 0, 1.5, 0.01, state.A, v => { state.A = v; redraw(); }));
    controls.appendChild(mkSliderControl("Mode n", 1, 4, 1, state.n, v => { state.n = v|0; redraw(); }));
    controls.appendChild(mkSelect("Topology", [
      { value: "open", label: "Open string" },
      { value: "closed", label: "Closed string" }
    ], "open", v => { state.closed = (v === "closed"); redraw(); }));

    mount.appendChild(controls);

    // ── SVG ────────────────────────────────────────────
    const svg = makeSvgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      role: "img",
      "aria-label": "Worldsheet heatmap"
    });
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    // Frame
    svg.appendChild(makeSvgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH,
      fill: "#fbfaf7", stroke: "#e7e1d6", "stroke-width": 1
    }));

    // Group for heatmap cells (we will rebuild each redraw — simpler than diffing)
    const heatGroup = makeSvgEl("g");
    svg.appendChild(heatGroup);

    // Axes
    const axisStyle = { "font-family": "Inter, sans-serif", "font-size": "11", fill: "#6f6a63" };

    // σ ticks (bottom)
    function rebuildSigmaAxis() {
      // remove existing
      sigmaAxisGroup.innerHTML = "";
      const sMax = state.closed ? 2 * Math.PI : Math.PI;
      const ticks = state.closed ? [0, Math.PI/2, Math.PI, 3*Math.PI/2, 2*Math.PI]
                                 : [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI];
      const labels = state.closed
        ? ["0", "π/2", "π", "3π/2", "2π"]
        : ["0", "π/4", "π/2", "3π/4", "π"];
      ticks.forEach((s, i) => {
        const px = padL + (s / sMax) * plotW;
        sigmaAxisGroup.appendChild(makeSvgEl("line", { x1: px, y1: padT + plotH, x2: px, y2: padT + plotH + 4, stroke: "#9a9389" }));
        const lbl = makeSvgEl("text", Object.assign({ x: px, y: padT + plotH + 18, "text-anchor": "middle" }, axisStyle));
        lbl.textContent = labels[i];
        sigmaAxisGroup.appendChild(lbl);
      });
    }
    const sigmaAxisGroup = makeSvgEl("g");
    svg.appendChild(sigmaAxisGroup);

    // τ ticks (left)
    for (let i = 0; i <= 4; i++) {
      const t = (i / 4) * T_MAX;
      const py = padT + (1 - i / 4) * plotH;
      svg.appendChild(makeSvgEl("line", { x1: padL - 4, y1: py, x2: padL, y2: py, stroke: "#9a9389" }));
      const lbl = makeSvgEl("text", Object.assign({ x: padL - 8, y: py + 4, "text-anchor": "end" }, axisStyle));
      lbl.textContent = (i === 0) ? "0" : (i === 2) ? "π/2" : (i === 4) ? "π" : (i === 1) ? "π/4" : "3π/4";
      svg.appendChild(lbl);
    }

    // Axis titles
    const xTitle = makeSvgEl("text", {
      x: padL + plotW / 2, y: H - 12,
      "text-anchor": "middle",
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    xTitle.textContent = "σ — position along string";
    svg.appendChild(xTitle);

    const yTitle = makeSvgEl("text", {
      x: 18, y: padT + plotH / 2,
      "text-anchor": "middle",
      transform: `rotate(-90, 18, ${padT + plotH / 2})`,
      "font-family": "Source Serif 4, Georgia, serif",
      "font-size": "13", "font-style": "italic", fill: "#1f1c1a"
    });
    yTitle.textContent = "τ — worldsheet time";
    svg.appendChild(yTitle);

    // Colorbar (right of plot)
    const cbX = padL + plotW + 8, cbY = padT, cbW = 12, cbH = plotH;
    // Skip frame; just gradient
    const gradId = "ws-grad";
    const defs = makeSvgEl("defs");
    const grad = makeSvgEl("linearGradient", { id: gradId, x1: "0", y1: "1", x2: "0", y2: "0" });
    for (let i = 0; i <= 10; i++) {
      const v = -1 + (i / 10) * 2;
      const stop = makeSvgEl("stop", { offset: (i * 10) + "%", "stop-color": colormap(v) });
      grad.appendChild(stop);
    }
    defs.appendChild(grad);
    svg.appendChild(defs);
    // (Color bar omitted in compact layout to keep widget simple; heatmap legend in caption.)

    mount.appendChild(svg);

    // ── Readout panel ──────────────────────────────────
    const panel = document.createElement("div");
    panel.style.marginTop = "0.85rem";
    panel.style.display = "grid";
    panel.style.gridTemplateColumns = "1fr 1fr 1fr";
    panel.style.gap = "0.5rem 1.5rem";
    panel.style.alignItems = "baseline";
    panel.style.borderTop = "1px solid #e7e1d6";
    panel.style.paddingTop = "0.85rem";

    function mkStat(labelText, color) {
      const wrap = document.createElement("div");
      const lbl = document.createElement("div");
      lbl.style.fontFamily = "Inter, sans-serif";
      lbl.style.fontSize = "0.7rem";
      lbl.style.textTransform = "uppercase";
      lbl.style.letterSpacing = "0.12em";
      lbl.style.color = color;
      lbl.style.fontWeight = "700";
      lbl.style.marginBottom = "0.15rem";
      lbl.textContent = labelText;
      const val = document.createElement("div");
      val.style.fontFamily = "Source Serif 4, Georgia, serif";
      val.style.fontSize = "1.35rem";
      val.style.fontWeight = "600";
      val.style.color = "#1f1c1a";
      wrap.appendChild(lbl); wrap.appendChild(val);
      return { wrap, val };
    }

    const restStat = mkStat("Rest area (A = 0)", "#6f6a63");
    const areaStat = mkStat("Worldsheet area", "#a83e2a");
    const ratioStat = mkStat("Excess from wiggling", "#6f6a63");

    panel.appendChild(restStat.wrap);
    panel.appendChild(areaStat.wrap);
    panel.appendChild(ratioStat.wrap);
    mount.appendChild(panel);

    // ── Compute & render ────────────────────────────────
    function redraw() {
      const sMax = state.closed ? 2 * Math.PI : Math.PI;
      const A = state.A, n = state.n;
      // Update sigma axis ticks
      rebuildSigmaAxis();

      // Build heatmap cells (rebuilding fresh — NS*NT ≈ 5760 rects)
      heatGroup.innerHTML = "";
      const cellW = plotW / NS;
      const cellH = plotH / NT;
      const cellWStr = cellW.toFixed(2);
      const cellHStr = cellH.toFixed(2);
      // Use a document fragment via innerHTML string for speed
      let parts = "";
      // Also compute area on the same grid using midpoint rule.
      let area = 0;
      const ds = sMax / NS;
      const dt = T_MAX / NT;
      for (let j = 0; j < NT; j++) {
        const tau = ((j + 0.5) / NT) * T_MAX;
        const py = padT + plotH - (j + 1) * cellH;
        for (let i = 0; i < NS; i++) {
          const sig = ((i + 0.5) / NS) * sMax;
          let y, dy_dtau, dy_dsig;
          if (state.closed) {
            const phase = n * (sig - tau);
            y = A * Math.cos(phase);
            dy_dtau = A * n * Math.sin(phase);     // ∂_τ y = An sin(n(σ-τ))
            dy_dsig = -A * n * Math.sin(phase);    // ∂_σ y = -An sin(n(σ-τ))
          } else {
            const cs = Math.cos(n * sig), ss = Math.sin(n * sig);
            const ct = Math.cos(n * tau), st = Math.sin(n * tau);
            y = A * cs * ct;
            dy_dtau = -A * n * cs * st;            // ∂_τ y
            dy_dsig = -A * n * ss * ct;            // ∂_σ y
          }
          // det γ = -1·1 + (∂_τ y)²·1·... actually compute precisely:
          // X = (τ, σ, y(τ,σ)), η = diag(-1,+1,+1)
          //   γ_ττ = -1 + 0 + (∂_τ y)²
          //   γ_σσ = 0 + 1 + (∂_σ y)²
          //   γ_τσ = 0 + 0 + (∂_τ y)(∂_σ y)
          //   det γ = γ_ττ γ_σσ - γ_τσ² = -(1 + (∂_σ y)²) + (∂_τ y)² (1 + (∂_σ y)²) - (∂_τ y)² (∂_σ y)²
          //         = -(1 + (∂_σ y)²) + (∂_τ y)²
          // (the cross term cancels exactly)
          const dtSq = dy_dtau * dy_dtau;
          const dsSq = dy_dsig * dy_dsig;
          const detG = -(1 + dsSq) + dtSq;
          if (-detG > 0) area += Math.sqrt(-detG) * ds * dt;
          // Heatmap color
          const norm = (A > 0) ? Math.max(-1, Math.min(1, y / (A + 1e-9))) : 0;
          const px = padL + i * cellW;
          parts += `<rect x="${px.toFixed(2)}" y="${py.toFixed(2)}" width="${cellWStr}" height="${cellHStr}" fill="${colormap(norm)}" />`;
        }
      }
      heatGroup.innerHTML = parts;

      // Outline plot box on top (re-add so it sits over the heatmap)
      // (already drawn before heatmap, but heatmap covers it — re-draw on top)
      heatGroup.innerHTML += `<rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="none" stroke="#1f1c1a" stroke-width="1.2" />`;

      // Rest area = (sMax) × T_MAX
      const restArea = sMax * T_MAX;
      const excess = area - restArea;
      restStat.val.textContent = restArea.toFixed(3);
      areaStat.val.textContent = area.toFixed(3);
      ratioStat.val.textContent = (excess >= 0 ? "+" : "") + excess.toFixed(3);
    }

    redraw();
  }

  function start() {
    document.querySelectorAll("[data-widget='worldsheet']").forEach(build);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
