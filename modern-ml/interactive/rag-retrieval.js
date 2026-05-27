/* Interactive · RAG retrieval visualizer in 2D.
   A hand-set corpus of (label, point) pairs. User drags a query.
   Show top-k by cosine similarity with scores.
   Mounts into any [data-widget='rag-retrieval'] section. */

(function () {
  "use strict";

  const W = 540, H = 380;
  const M = { l: 32, r: 32, t: 22, b: 24 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;

  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  // Corpus: 14 documents in a 2D embedding space.
  // Loose theme: ML topics. Pretend the geometry reflects some real similarity structure.
  const CORPUS = [
    { label: "transformers paper",       p: [1.3, 0.9] },
    { label: "RoPE position encoding",   p: [1.6, 0.6] },
    { label: "BERT pretraining",         p: [0.9, 1.2] },
    { label: "GPT-3 paper",              p: [1.5, 1.1] },
    { label: "Chinchilla scaling",       p: [0.7, 1.6] },
    { label: "InstructGPT / RLHF",       p: [-0.4, 1.5] },
    { label: "DPO paper",                p: [-0.9, 1.2] },
    { label: "DeepSeek-R1 (RLVR)",       p: [-1.4, 0.6] },
    { label: "o1 system card",           p: [-1.3, 0.0] },
    { label: "ReAct loops",              p: [-0.6, -0.9] },
    { label: "RAG (Lewis et al.)",       p: [0.4, -1.3] },
    { label: "DPR retrieval",            p: [0.9, -1.0] },
    { label: "Sentence-BERT",            p: [1.1, -0.5] },
    { label: "ResNet (vision)",          p: [-1.6, -1.0] },
  ];

  document.querySelectorAll("[data-widget='rag-retrieval']").forEach(section => {
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
    controls.style.alignItems = "center";
    host.appendChild(controls);

    const kWrap = document.createElement("label");
    kWrap.style.fontFamily = "Inter, sans-serif";
    kWrap.style.fontSize = "0.82rem";
    kWrap.style.display = "flex"; kWrap.style.alignItems = "center"; kWrap.style.gap = "0.5rem";
    kWrap.innerHTML = `<span>k <span data-role="k-val" style="font-weight:600;color:${ACCENT}">3</span></span>`;
    const kSlider = document.createElement("input");
    kSlider.type = "range"; kSlider.min = "1"; kSlider.max = "10"; kSlider.step = "1"; kSlider.value = "3";
    kSlider.style.width = "140px"; kSlider.style.accentColor = ACCENT;
    kWrap.appendChild(kSlider);
    controls.appendChild(kWrap);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    svg.style.cursor = "crosshair";
    host.appendChild(svg);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.78rem";
    readout.style.color = "#5f6d72";
    readout.style.textAlign = "left";
    readout.style.maxWidth = "32rem";
    readout.style.width = "100%";
    host.appendChild(readout);

    // State: query position (start near the alignment cluster)
    let q = [-0.6, 1.0];
    let dragging = false;

    function xs(x) { return M.l + (x + 2.2) / 4.4 * PW; }
    function ys(y) { return M.t + (2.2 - y) / 4.4 * PH; }
    function fromPx(px, py) {
      const x = (px - M.l) / PW * 4.4 - 2.2;
      const y = 2.2 - (py - M.t) / PH * 4.4;
      return [x, y];
    }

    svg.addEventListener("mousedown", e => {
      dragging = true; setFromEvent(e);
    });
    svg.addEventListener("mousemove", e => { if (dragging) setFromEvent(e); });
    window.addEventListener("mouseup", () => { dragging = false; });
    function setFromEvent(e) {
      const r = svg.getBoundingClientRect();
      const sx = svg.viewBox.baseVal.width / r.width;
      const sy = svg.viewBox.baseVal.height / r.height;
      const px = (e.clientX - r.left) * sx;
      const py = (e.clientY - r.top) * sy;
      const [x, y] = fromPx(px, py);
      const rr = Math.hypot(x, y);
      const cap = 2.0;
      if (rr > cap) { q = [x * cap / rr, y * cap / rr]; }
      else { q = [x, y]; }
      redraw();
    }

    kSlider.addEventListener("input", () => {
      kWrap.querySelector("[data-role='k-val']").textContent = kSlider.value;
      redraw();
    });

    function redraw() {
      // Compute cosine sims
      const sims = CORPUS.map((d, i) => {
        const dot = q[0] * d.p[0] + q[1] * d.p[1];
        const nq = Math.hypot(q[0], q[1]) || 1e-9;
        const nd = Math.hypot(d.p[0], d.p[1]) || 1e-9;
        return { i, sim: dot / (nq * nd), p: d.p, label: d.label };
      });
      sims.sort((a, b) => b.sim - a.sim);
      const k = +kSlider.value;
      const topK = new Set(sims.slice(0, k).map(s => s.i));

      render(svg, q, sims, topK, xs, ys);

      // Readout: list top-k
      readout.innerHTML = `<strong style="color:${ACCENT_DEEP};font-family:Inter,sans-serif">Top ${k} retrieved:</strong>` +
        sims.slice(0, k).map((s, rank) =>
          `<div style="display:flex;justify-content:space-between;border-bottom:1px dotted ${RULE};padding:0.18rem 0">` +
          `<span><span style="display:inline-block;width:1.1em;color:${FAINT}">${rank + 1}.</span> ${s.label}</span>` +
          `<span style="color:${ACCENT_DEEP};font-variant-numeric:tabular-nums">${s.sim.toFixed(3)}</span>` +
          `</div>`
        ).join("");
    }

    redraw();
  }

  function render(svg, q, sims, topK, xs, ys) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const ns = "http://www.w3.org/2000/svg";

    // Faint grid axes
    const xax = svg.appendChild(document.createElementNS(ns, "line"));
    xax.setAttribute("x1", xs(-2.2)); xax.setAttribute("x2", xs(2.2));
    xax.setAttribute("y1", ys(0)); xax.setAttribute("y2", ys(0));
    xax.setAttribute("stroke", "#eef2ee"); xax.setAttribute("stroke-width", "0.7");
    const yax = svg.appendChild(document.createElementNS(ns, "line"));
    yax.setAttribute("y1", ys(-2.2)); yax.setAttribute("y2", ys(2.2));
    yax.setAttribute("x1", xs(0)); xax.setAttribute("x2", xs(0));
    yax.setAttribute("x2", xs(0));
    yax.setAttribute("stroke", "#eef2ee"); yax.setAttribute("stroke-width", "0.7");

    // Query ray (line from origin through q)
    const qn = Math.hypot(q[0], q[1]) || 1e-9;
    const ux = q[0] / qn, uy = q[1] / qn;
    const ray = svg.appendChild(document.createElementNS(ns, "line"));
    ray.setAttribute("x1", xs(-3 * ux)); ray.setAttribute("y1", ys(-3 * uy));
    ray.setAttribute("x2", xs(3 * ux));  ray.setAttribute("y2", ys(3 * uy));
    ray.setAttribute("stroke", ACCENT);
    ray.setAttribute("stroke-opacity", "0.18");
    ray.setAttribute("stroke-width", "1.4");

    // Document points
    sims.forEach(s => {
      const inK = topK.has(s.i);
      const cx = xs(s.p[0]), cy = ys(s.p[1]);
      const c = svg.appendChild(document.createElementNS(ns, "circle"));
      c.setAttribute("cx", cx); c.setAttribute("cy", cy);
      c.setAttribute("r", inK ? 6 : 4);
      c.setAttribute("fill", inK ? ACCENT : "#fff");
      c.setAttribute("stroke", inK ? ACCENT_DEEP : "#bcc6c1");
      c.setAttribute("stroke-width", inK ? "1.4" : "1.0");
      const tx = svg.appendChild(document.createElementNS(ns, "text"));
      tx.setAttribute("x", cx + 9); tx.setAttribute("y", cy + 4);
      tx.setAttribute("font-family", "Inter, sans-serif");
      tx.setAttribute("font-size", inK ? "10" : "9.5");
      tx.setAttribute("fill", inK ? ACCENT_DEEP : FAINT);
      tx.setAttribute("font-weight", inK ? "600" : "500");
      tx.textContent = s.label;
    });

    // Query
    const qx = xs(q[0]), qy = ys(q[1]);
    const qc = svg.appendChild(document.createElementNS(ns, "circle"));
    qc.setAttribute("cx", qx); qc.setAttribute("cy", qy); qc.setAttribute("r", 8);
    qc.setAttribute("fill", SAND);
    qc.setAttribute("stroke", "#fff"); qc.setAttribute("stroke-width", "2");
    const qt = svg.appendChild(document.createElementNS(ns, "text"));
    qt.setAttribute("x", qx); qt.setAttribute("y", qy + 4);
    qt.setAttribute("text-anchor", "middle");
    qt.setAttribute("font-family", "Inter, sans-serif");
    qt.setAttribute("font-size", "9.5"); qt.setAttribute("fill", "#fff");
    qt.setAttribute("font-weight", "700");
    qt.textContent = "q";

    // Hint
    const hint = svg.appendChild(document.createElementNS(ns, "text"));
    hint.setAttribute("x", W - 8); hint.setAttribute("y", H - 6);
    hint.setAttribute("text-anchor", "end");
    hint.setAttribute("font-family", "Inter, sans-serif");
    hint.setAttribute("font-size", "9"); hint.setAttribute("fill", FAINT);
    hint.textContent = "click & drag to move the query";
  }
})();
