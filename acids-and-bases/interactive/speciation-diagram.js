/* Interactive · Distribution (alpha) diagrams for polyprotic acids.
   For an n-protic acid the fraction of total dissolved species present as the
   j-th form is the distribution (alpha) function

       alpha_j = (numerator_j) / D,
       D = sum_{k=0..n} ( [H+]^(n-k) * prod_{i=1..k} Ka_i ),

   where alpha_0 is the fully protonated acid (H_nA), alpha_n the fully
   deprotonated base. The numerators are the individual terms of D. By
   construction the alphas sum to 1. Crossovers alpha_{j-1} = alpha_j occur at
   pH = pKa_j. Reference (carbonic acid, pKa 6.35/10.33): at pH 6.35
   alpha(H2CO3*) = alpha(HCO3-) = 0.5 with alpha(CO3 2-) ~ 5e-5; at pH 10.33
   alpha(HCO3-) = alpha(CO3 2-) = 0.5. Constants: Harris, Quantitative Chemical
   Analysis 9th ed.; Stumm & Morgan, Aquatic Chemistry 3rd ed. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";
  const GREEN = "#2f6b4a";
  const BLUE = "#2b5c8a";
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  // Series colors, one per species (up to 4 species = triprotic).
  const SERIES = [WARM, ACCENT, GREEN, BLUE];

  // Acid menu: name, pKa array, species labels (j = 0 ... n).
  const ACIDS = [
    {
      key: "carbonic",
      name: "Carbonic acid",
      pKa: [6.35, 10.33],
      species: ["H2CO3*", "HCO3-", "CO3 2-"]
    },
    {
      key: "phosphoric",
      name: "Phosphoric acid",
      pKa: [2.15, 7.20, 12.35],
      species: ["H3PO4", "H2PO4-", "HPO4 2-", "PO4 3-"]
    },
    {
      key: "citric",
      name: "Citric acid",
      pKa: [3.13, 4.76, 6.40],
      species: ["H3Cit", "H2Cit-", "HCit 2-", "Cit 3-"]
    }
  ];

  // ── Pure functions (DOM-free, harness-testable) ──

  // Distribution functions for an n-protic acid at a given pH.
  // pKaArray = [pKa1, pKa2, ...]; returns [alpha_0, ..., alpha_n], summing to 1.
  function alphas(pKaArray, pH) {
    const n = pKaArray.length;
    const Ka = pKaArray.map(p => Math.pow(10, -p));
    const Hp = Math.pow(10, -pH);
    // term_k = [H+]^(n-k) * prod_{i=1..k} Ka_i, for k = 0 ... n
    const terms = new Array(n + 1);
    let cumKa = 1;            // product of Ka_1..Ka_k
    for (let k = 0; k <= n; k++) {
      if (k > 0) cumKa *= Ka[k - 1];
      terms[k] = Math.pow(Hp, n - k) * cumKa;
    }
    let D = 0;
    for (let k = 0; k <= n; k++) D += terms[k];
    return terms.map(t => t / D);
  }

  // Index of the dominant species (largest alpha) at this pH.
  function dominant(pKaArray, pH) {
    const a = alphas(pKaArray, pH);
    let best = 0;
    for (let j = 1; j < a.length; j++) if (a[j] > a[best]) best = j;
    return best;
  }

  // Expose for harness testing.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { alphas, dominant, ACIDS };
  }

  const W = 560, H = 340;
  const M = { l: 46, r: 16, t: 16, b: 38 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const PH_MIN = 0, PH_MAX = 14;

  function xpx(pH) { return M.l + (pH - PH_MIN) / (PH_MAX - PH_MIN) * PW; }
  function ypx(a) { return M.t + (1 - a) * PH; }     // alpha 0..1
  function xToPH(x) {
    const f = (x - M.l) / PW;
    return Math.max(PH_MIN, Math.min(PH_MAX, PH_MIN + f * (PH_MAX - PH_MIN)));
  }

  if (typeof document === "undefined") return;

  document.querySelectorAll("[data-widget='speciation-diagram']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    let acid = ACIDS[0];
    let pH = 7.0;

    // Acid selector
    const menu = document.createElement("div");
    menu.style.display = "flex";
    menu.style.flexWrap = "wrap";
    menu.style.justifyContent = "center";
    menu.style.gap = "0.4rem";
    menu.style.fontFamily = "Inter, sans-serif";
    menu.style.fontSize = "0.8rem";
    const buttons = [];
    ACIDS.forEach(a => {
      const b = document.createElement("button");
      b.textContent = a.name;
      b.style.fontFamily = "Inter, sans-serif";
      b.style.fontSize = "0.78rem";
      b.style.padding = "0.28rem 0.6rem";
      b.style.border = "1px solid " + RULE;
      b.style.borderRadius = "3px";
      b.style.background = "#fff";
      b.style.color = MUTED;
      b.style.cursor = "pointer";
      b.addEventListener("click", () => { acid = a; styleButtons(); redraw(); });
      buttons.push(b);
      menu.appendChild(b);
    });
    host.appendChild(menu);

    function styleButtons() {
      buttons.forEach((b, i) => {
        const on = ACIDS[i] === acid;
        b.style.background = on ? ACCENT : "#fff";
        b.style.color = on ? "#fff" : MUTED;
        b.style.borderColor = on ? ACCENT : RULE;
        b.style.fontWeight = on ? "600" : "400";
      });
    }
    styleButtons();

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    svg.style.cursor = "ew-resize";
    svg.style.touchAction = "none";
    host.appendChild(svg);

    // pH slider
    const ctrl = document.createElement("div");
    ctrl.style.display = "flex";
    ctrl.style.alignItems = "center";
    ctrl.style.gap = "0.6rem";
    ctrl.style.width = "100%";
    ctrl.style.maxWidth = "440px";
    ctrl.style.fontFamily = "Inter, sans-serif";
    ctrl.style.fontSize = "0.82rem";
    ctrl.style.color = MUTED;
    const lab = document.createElement("span");
    lab.textContent = "pH";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0"; slider.max = "14"; slider.step = "0.05"; slider.value = "7";
    slider.style.flex = "1";
    slider.style.accentColor = ACCENT;
    const phlab = document.createElement("span");
    phlab.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    phlab.style.minWidth = "3.5em";
    phlab.style.textAlign = "right";
    phlab.style.color = INK;
    ctrl.appendChild(lab); ctrl.appendChild(slider); ctrl.appendChild(phlab);
    host.appendChild(ctrl);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.84rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.6";
    readout.style.maxWidth = "480px";
    host.appendChild(readout);

    slider.addEventListener("input", () => { pH = +slider.value; redraw(); });

    function setFromX(clientX) {
      const r = svg.getBoundingClientRect();
      const x = (clientX - r.left) / r.width * W;
      pH = xToPH(x);
      slider.value = pH.toFixed(2);
      redraw();
    }
    let dragging = false;
    svg.addEventListener("mousedown", (e) => { dragging = true; setFromX(e.clientX); });
    window.addEventListener("mousemove", (e) => { if (dragging) setFromX(e.clientX); });
    window.addEventListener("mouseup", () => { dragging = false; });
    svg.addEventListener("touchstart", (e) => { if (e.touches[0]) { setFromX(e.touches[0].clientX); e.preventDefault(); } }, { passive: false });
    svg.addEventListener("touchmove", (e) => { if (e.touches[0]) { setFromX(e.touches[0].clientX); e.preventDefault(); } }, { passive: false });

    redraw();

    function redraw() {
      phlab.textContent = pH.toFixed(2);
      let s = "";

      // Horizontal gridlines for alpha = 0, 0.25, 0.5, 0.75, 1
      for (let g = 0; g <= 1.0001; g += 0.25) {
        const y = ypx(g);
        s += line(M.l, y, W - M.r, y, RULE, 1);
        s += text(M.l - 7, y + 3, g.toFixed(2), 9.5, FAINT, "end");
      }
      // Vertical gridlines every 2 pH units
      for (let p = 0; p <= 14; p += 2) {
        const x = xpx(p);
        s += line(x, M.t, x, M.t + PH, RULE, 1);
        s += text(x, H - M.b + 15, p.toFixed(0), 9.5, FAINT, "middle");
      }
      // axis titles
      s += text(M.l + PW / 2, H - 5, "pH", 11, MUTED, "middle");
      s += `<text x="12" y="${M.t + PH / 2}" font-size="11" fill="${MUTED}" font-family="'Source Serif 4',serif" font-style="italic" text-anchor="middle" transform="rotate(-90 12 ${M.t + PH / 2})">fraction  &#945;</text>`;

      // pKa vertical markers (crossover points)
      acid.pKa.forEach((pk, i) => {
        const x = xpx(pk);
        s += `<line x1="${x.toFixed(1)}" y1="${M.t}" x2="${x.toFixed(1)}" y2="${(M.t + PH).toFixed(1)}" stroke="${FAINT}" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"/>`;
        s += text(x, M.t - 4, "pKa" + (i + 1), 8.5, FAINT, "middle");
      });

      const nSpecies = acid.species.length;

      // Sample each alpha curve across the pH window.
      const curves = [];
      for (let j = 0; j < nSpecies; j++) curves.push([]);
      for (let p = PH_MIN; p <= PH_MAX + 1e-9; p += 0.05) {
        const a = alphas(acid.pKa, p);
        for (let j = 0; j < nSpecies; j++) curves[j].push([xpx(p), ypx(a[j])]);
      }
      for (let j = 0; j < nSpecies; j++) {
        s += path(curves[j], SERIES[j % SERIES.length], 2);
      }

      // Label each curve near its peak (the pH where it dominates).
      for (let j = 0; j < nSpecies; j++) {
        // Domain midpoint for species j: between pKa_j and pKa_{j+1}.
        let pPeak;
        if (j === 0) pPeak = acid.pKa[0] - 1.4;
        else if (j === nSpecies - 1) pPeak = acid.pKa[acid.pKa.length - 1] + 1.4;
        else pPeak = (acid.pKa[j - 1] + acid.pKa[j]) / 2;
        pPeak = Math.max(0.4, Math.min(13.6, pPeak));
        const aPeak = alphas(acid.pKa, pPeak)[j];
        const lx = xpx(pPeak), ly = ypx(aPeak) - 6;
        s += text(lx, Math.max(M.t + 9, ly), formula(acid.species[j]), 10.5, SERIES[j % SERIES.length], "middle");
      }

      // pH line
      const xL = xpx(pH);
      s += `<line x1="${xL.toFixed(1)}" y1="${M.t}" x2="${xL.toFixed(1)}" y2="${(M.t + PH).toFixed(1)}" stroke="${ACCENT_DEEP}" stroke-width="2"/>`;
      // dots where the pH line meets each curve
      const aNow = alphas(acid.pKa, pH);
      for (let j = 0; j < nSpecies; j++) {
        s += `<circle cx="${xL.toFixed(1)}" cy="${ypx(aNow[j]).toFixed(1)}" r="3.5" fill="${SERIES[j % SERIES.length]}" stroke="#fff" stroke-width="1"/>`;
      }

      svg.innerHTML = s;

      // Readout: alpha of each species, plus the dominant one.
      const dom = dominant(acid.pKa, pH);
      let parts = [];
      for (let j = 0; j < nSpecies; j++) {
        const col = SERIES[j % SERIES.length];
        parts.push(
          `<span style="color:${col};font-weight:600">${formulaHTML(acid.species[j])}</span> ` +
          `<span style="font-family:'JetBrains Mono',monospace;color:${INK}">${aNow[j].toFixed(3)}</span>`
        );
      }
      readout.innerHTML =
        parts.join("&nbsp;&nbsp;·&nbsp;&nbsp;") +
        `<br>Dominant species: <strong style="color:${SERIES[dom % SERIES.length]}">${formulaHTML(acid.species[dom])}</strong>` +
        ` &nbsp;(fractions sum to ${aNow.reduce((u, v) => u + v, 0).toFixed(3)}).`;
    }
  }

  // ── Pure SVG helpers ──
  function line(x1, y1, x2, y2, color, w) {
    return `<line x1="${(+x1).toFixed(1)}" y1="${(+y1).toFixed(1)}" x2="${(+x2).toFixed(1)}" y2="${(+y2).toFixed(1)}" stroke="${color}" stroke-width="${w}"/>`;
  }
  function text(x, y, s, size, color, anchor) {
    return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-size="${size}" fill="${color}" font-family="Inter,sans-serif" text-anchor="${anchor}">${s}</text>`;
  }
  function path(pts, color, w) {
    if (!pts.length) return "";
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
  }

  // Render formula labels for SVG <text> (sub/superscripts flattened, escaped).
  function formula(name) {
    return name
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Render formula labels for HTML readout with <sub>/<sup>.
  function formulaHTML(name) {
    // e.g. "H2CO3*" -> H<sub>2</sub>CO<sub>3</sub>*, "CO3 2-" -> CO<sub>3</sub><sup>2-</sup>
    const m = name.match(/^([A-Za-z0-9*]+?)(\s+(\d*[+-]))?$/);
    let core = name, charge = "";
    if (m) { core = m[1]; charge = m[3] || ""; }
    let html = core.replace(/([A-Za-z*])(\d+)/g, "$1<sub>$2</sub>");
    if (charge) html += "<sup>" + charge + "</sup>";
    return html;
  }
})();
