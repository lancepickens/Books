/* Interactive · A single self-attention head, by hand.
   8 tokens with 2D Q, K vectors (so we can plot them).
   Compute scores Q K^T / sqrt(d), apply optional causal mask,
   row-softmax, render the attention matrix.
   Mounts into any [data-widget='attention-viewer'] section. */

(function () {
  "use strict";

  const N = 8;        // tokens
  const D = 2;        // for plotting; the math is the same for any d_k

  const W = 540;
  const PLOT_H = 200;
  const MAT_H = 280;
  const ROW_GAP = 12;
  const H = PLOT_H + ROW_GAP + MAT_H + 30;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  document.querySelectorAll("[data-widget='attention-viewer']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    // State: positions of Q and K vectors per token on a unit disk
    // Initialize: queries cluster slightly, keys spread evenly on circle
    const Q = [], K = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 2 * Math.PI;
      K.push([Math.cos(a), Math.sin(a)]);
      // queries: tilt toward neighboring tokens so the matrix shows a band
      const b = a + 0.4 * Math.sin(2 * a);
      Q.push([0.85 * Math.cos(b), 0.85 * Math.sin(b)]);
    }

    let scaled = true;
    let masked = false;
    let selected = null;

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.gap = "0.6rem";
    controls.style.flexWrap = "wrap";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const scaleBtn = document.createElement("button");
    scaleBtn.type = "button";
    const maskBtn = document.createElement("button");
    maskBtn.type = "button";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = "reset";
    [scaleBtn, maskBtn, resetBtn].forEach(b => { styleBtn(b); controls.appendChild(b); });

    function refreshBtns() {
      scaleBtn.textContent = scaled ? "÷√d on" : "÷√d off";
      scaleBtn.style.background = scaled ? ACCENT : "#fff";
      scaleBtn.style.color = scaled ? "#fff" : ACCENT;
      maskBtn.textContent = masked ? "causal mask on" : "causal mask off";
      maskBtn.style.background = masked ? ACCENT : "#fff";
      maskBtn.style.color = masked ? "#fff" : ACCENT;
    }
    scaleBtn.addEventListener("click", () => { scaled = !scaled; refreshBtns(); render(); });
    maskBtn.addEventListener("click", () => { masked = !masked; refreshBtns(); render(); });
    resetBtn.addEventListener("click", () => {
      for (let i = 0; i < N; i++) {
        const a = (i / N) * 2 * Math.PI;
        K[i] = [Math.cos(a), Math.sin(a)];
        const b = a + 0.4 * Math.sin(2 * a);
        Q[i] = [0.85 * Math.cos(b), 0.85 * Math.sin(b)];
      }
      render();
    });
    refreshBtns();

    // SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    host.appendChild(svg);

    // Drag handling on the QK plot
    let drag = null;
    svg.addEventListener("mousedown", e => {
      const pt = svgPt(svg, e);
      // is pt inside QK plot?
      if (pt.x > W / 2) return;
      const local = qkLocal(pt);
      // find closest Q or K
      let best = null, bestD = 0.14;
      for (let i = 0; i < N; i++) {
        for (const which of ["Q", "K"]) {
          const v = (which === "Q" ? Q : K)[i];
          const d = Math.hypot(local.x - v[0], local.y - v[1]);
          if (d < bestD) { bestD = d; best = { i, which }; }
        }
      }
      if (best) { drag = best; render(); }
    });
    svg.addEventListener("mousemove", e => {
      if (!drag) return;
      const pt = svgPt(svg, e);
      const local = qkLocal(pt);
      const arr = (drag.which === "Q" ? Q : K);
      const r = Math.hypot(local.x, local.y);
      const cap = 1.2;
      const s = r > cap ? cap / r : 1;
      arr[drag.i] = [local.x * s, local.y * s];
      render();
    });
    window.addEventListener("mouseup", () => { drag = null; });

    // Click on matrix cell selects a query row
    svg.addEventListener("click", e => {
      const pt = svgPt(svg, e);
      if (pt.y < PLOT_H + ROW_GAP) return;
      const matLeft = (W - MAT_H) / 2;
      const matTop = PLOT_H + ROW_GAP + 18;
      const cell = (MAT_H - 36) / N;
      const col = Math.floor((pt.x - matLeft - 18) / cell);
      const row = Math.floor((pt.y - matTop) / cell);
      if (row >= 0 && row < N && col >= 0 && col < N) {
        selected = selected && selected.i === row && selected.j === col ? null : { i: row, j: col };
        render();
      }
    });

    // QK plot: spans left half (W/2 wide), top PLOT_H tall
    function qkScale(x) { return 18 + (x + 1.2) / 2.4 * (W / 2 - 36); }
    function qkScaleY(y) { return 18 + (1.2 - y) / 2.4 * (PLOT_H - 36); }
    function qkLocal(pt) {
      const x = (pt.x - 18) / (W / 2 - 36) * 2.4 - 1.2;
      const y = 1.2 - (pt.y - 18) / (PLOT_H - 36) * 2.4;
      return { x, y };
    }

    function render() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const ns = "http://www.w3.org/2000/svg";

      // QK plot area background
      const plotRect = svg.appendChild(document.createElementNS(ns, "rect"));
      plotRect.setAttribute("x", 0); plotRect.setAttribute("y", 0);
      plotRect.setAttribute("width", W / 2); plotRect.setAttribute("height", PLOT_H);
      plotRect.setAttribute("fill", "#fbfaf7");
      // axes
      const axX = svg.appendChild(document.createElementNS(ns, "line"));
      axX.setAttribute("x1", 18); axX.setAttribute("x2", W / 2 - 18);
      axX.setAttribute("y1", qkScaleY(0)); axX.setAttribute("y2", qkScaleY(0));
      axX.setAttribute("stroke", "#dfe6e2"); axX.setAttribute("stroke-width", "0.6");
      const axY = svg.appendChild(document.createElementNS(ns, "line"));
      axY.setAttribute("x1", qkScale(0)); axY.setAttribute("x2", qkScale(0));
      axY.setAttribute("y1", 18); axY.setAttribute("y2", PLOT_H - 18);
      axY.setAttribute("stroke", "#dfe6e2"); axY.setAttribute("stroke-width", "0.6");

      // QK plot title
      const title1 = svg.appendChild(document.createElementNS(ns, "text"));
      title1.setAttribute("x", 6); title1.setAttribute("y", 12);
      title1.setAttribute("font-family", "Inter, sans-serif"); title1.setAttribute("font-size", "10");
      title1.setAttribute("fill", FAINT);
      title1.textContent = "queries (filled) & keys (open) in d=2 — drag any point";

      // Draw Q and K with token labels
      for (let i = 0; i < N; i++) {
        // K
        const kx = qkScale(K[i][0]), ky = qkScaleY(K[i][1]);
        const kc = svg.appendChild(document.createElementNS(ns, "circle"));
        kc.setAttribute("cx", kx); kc.setAttribute("cy", ky); kc.setAttribute("r", 6);
        kc.setAttribute("fill", "#fff"); kc.setAttribute("stroke", SAND); kc.setAttribute("stroke-width", "1.6");
        const klab = svg.appendChild(document.createElementNS(ns, "text"));
        klab.setAttribute("x", kx); klab.setAttribute("y", ky + 3);
        klab.setAttribute("text-anchor", "middle");
        klab.setAttribute("font-family", "Inter, sans-serif");
        klab.setAttribute("font-size", "9"); klab.setAttribute("fill", SAND);
        klab.textContent = "k" + i;

        // Q
        const qx = qkScale(Q[i][0]), qy = qkScaleY(Q[i][1]);
        const qc = svg.appendChild(document.createElementNS(ns, "circle"));
        qc.setAttribute("cx", qx); qc.setAttribute("cy", qy); qc.setAttribute("r", 6);
        qc.setAttribute("fill", ACCENT); qc.setAttribute("stroke", "#fff"); qc.setAttribute("stroke-width", "1.4");
        const qlab = svg.appendChild(document.createElementNS(ns, "text"));
        qlab.setAttribute("x", qx); qlab.setAttribute("y", qy + 3);
        qlab.setAttribute("text-anchor", "middle");
        qlab.setAttribute("font-family", "Inter, sans-serif");
        qlab.setAttribute("font-size", "9"); qlab.setAttribute("fill", "#fff");
        qlab.textContent = "q" + i;
      }

      // Right half: scores and softmax matrix preview
      // Compute scores
      const denom = scaled ? Math.sqrt(D) : 1;
      const scores = [];
      for (let i = 0; i < N; i++) {
        const row = new Array(N);
        for (let j = 0; j < N; j++) {
          row[j] = (Q[i][0] * K[j][0] + Q[i][1] * K[j][1]) / denom;
          if (masked && j > i) row[j] = -Infinity;
        }
        scores.push(row);
      }
      // softmax
      const attn = scores.map(row => {
        const mx = Math.max(...row);
        const ex = row.map(v => Math.exp(v - mx));
        const s = ex.reduce((a, b) => a + b, 0);
        return ex.map(v => v / s);
      });

      // Right plot: show the selected query and its scores as bars
      const rx0 = W / 2 + 18, ry0 = 18, rW = W - W / 2 - 36, rH = PLOT_H - 36;
      const t2 = svg.appendChild(document.createElementNS(ns, "text"));
      t2.setAttribute("x", W / 2 + 6); t2.setAttribute("y", 12);
      t2.setAttribute("font-family", "Inter, sans-serif"); t2.setAttribute("font-size", "10"); t2.setAttribute("fill", FAINT);
      const selRow = selected ? selected.i : 0;
      t2.textContent = `attention row q${selRow} → all keys (click a matrix cell to pick a different row)`;
      const slot = rW / N;
      for (let j = 0; j < N; j++) {
        const v = attn[selRow][j];
        const cx = rx0 + (j + 0.5) * slot;
        const h = v * (rH - 14);
        const r = svg.appendChild(document.createElementNS(ns, "rect"));
        const wRect = Math.max(8, slot * 0.55);
        r.setAttribute("x", cx - wRect / 2);
        r.setAttribute("y", ry0 + (rH - 14) - h);
        r.setAttribute("width", wRect);
        r.setAttribute("height", h);
        r.setAttribute("fill", ACCENT);
        r.setAttribute("opacity", "0.85");
        const lab = svg.appendChild(document.createElementNS(ns, "text"));
        lab.setAttribute("x", cx); lab.setAttribute("y", ry0 + rH - 2);
        lab.setAttribute("text-anchor", "middle");
        lab.setAttribute("font-family", "Inter, sans-serif");
        lab.setAttribute("font-size", "9"); lab.setAttribute("fill", FAINT);
        lab.textContent = "k" + j;
        const vlab = svg.appendChild(document.createElementNS(ns, "text"));
        vlab.setAttribute("x", cx); vlab.setAttribute("y", ry0 + (rH - 14) - h - 4);
        vlab.setAttribute("text-anchor", "middle");
        vlab.setAttribute("font-family", "Inter, sans-serif");
        vlab.setAttribute("font-size", "8.5"); vlab.setAttribute("fill", ACCENT_DEEP);
        vlab.textContent = v.toFixed(2);
      }

      // ── Attention matrix below ─────────────────────────
      const matLeft = (W - MAT_H) / 2;
      const matTop = PLOT_H + ROW_GAP + 18;
      const cell = (MAT_H - 36) / N;
      const tLab = svg.appendChild(document.createElementNS(ns, "text"));
      tLab.setAttribute("x", W / 2); tLab.setAttribute("y", PLOT_H + ROW_GAP + 12);
      tLab.setAttribute("text-anchor", "middle");
      tLab.setAttribute("font-family", "Inter, sans-serif");
      tLab.setAttribute("font-size", "10"); tLab.setAttribute("fill", FAINT);
      tLab.textContent = "attention matrix (rows = queries, columns = keys)";

      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          const v = attn[i][j];
          const r = svg.appendChild(document.createElementNS(ns, "rect"));
          r.setAttribute("x", matLeft + 18 + j * cell);
          r.setAttribute("y", matTop + i * cell);
          r.setAttribute("width", cell - 0.5);
          r.setAttribute("height", cell - 0.5);
          const t = Math.sqrt(v);
          r.setAttribute("fill", `rgb(${Math.round(255 - 208 * t)},${Math.round(255 - 148 * t)},${Math.round(255 - 181 * t)})`);
          if (selected && selected.i === i && selected.j === j) {
            r.setAttribute("stroke", ACCENT_DEEP);
            r.setAttribute("stroke-width", "1.5");
          }
        }
      }
      // axis labels
      for (let i = 0; i < N; i++) {
        const ri = svg.appendChild(document.createElementNS(ns, "text"));
        ri.setAttribute("x", matLeft + 14); ri.setAttribute("y", matTop + i * cell + cell / 2 + 3);
        ri.setAttribute("text-anchor", "end");
        ri.setAttribute("font-family", "Inter, sans-serif");
        ri.setAttribute("font-size", "9"); ri.setAttribute("fill", FAINT);
        ri.textContent = "q" + i;
        const ci = svg.appendChild(document.createElementNS(ns, "text"));
        ci.setAttribute("x", matLeft + 18 + i * cell + cell / 2);
        ci.setAttribute("y", matTop + N * cell + 12);
        ci.setAttribute("text-anchor", "middle");
        ci.setAttribute("font-family", "Inter, sans-serif");
        ci.setAttribute("font-size", "9"); ci.setAttribute("fill", FAINT);
        ci.textContent = "k" + i;
      }
    }

    render();
  }

  function svgPt(svg, e) {
    const r = svg.getBoundingClientRect();
    const sx = svg.viewBox.baseVal.width / r.width;
    const sy = svg.viewBox.baseVal.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
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
