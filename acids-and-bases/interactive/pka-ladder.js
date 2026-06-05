/* Interactive · The pKa ladder with a movable pH line.
   Acids at their tabulated aqueous pKa (CRC Handbook). For each acid the
   fraction protonated is the Henderson–Hasselbalch result
   alpha_HA = 1/(1 + 10^(pH - pKa)). An acid is >50% deprotonated exactly when
   pH > pKa. Drag the pH line (or the slider) to move through the ladder. */

(function () {
  "use strict";

  const ACCENT = "#8a3a6b";       // deprotonated (A-)
  const ACCENT_DEEP = "#5e2247";
  const WARM = "#b8651a";         // protonated (HA)
  const FAINT = "#9a8e95";
  const RULE = "#e6dde3";
  const INK = "#1c1f21";
  const MUTED = "#6a5f66";

  // name, pKa (aqueous, 25 °C)
  const ACIDS = [
    ["H3O+", -1.74],
    ["HSO4-", 1.99],
    ["H3PO4", 2.15],
    ["HF", 3.17],
    ["HCOOH", 3.75],
    ["CH3COOH", 4.76],
    ["H2CO3", 6.35],
    ["H2PO4-", 7.20],
    ["HClO", 7.53],
    ["HCN", 9.21],
    ["NH4+", 9.25],
    ["HCO3-", 10.33],
    ["CH3NH3+", 10.66],
    ["HPO4 2-", 12.35],
    ["H2O", 15.74]
  ];

  // ── Pure function (DOM-free): fraction protonated ──
  function alphaHA(pH, pKa) {
    return 1 / (1 + Math.pow(10, pH - pKa));
  }

  const W = 580, H = 540;
  const M = { l: 132, r: 134, t: 22, b: 28 };
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const PK_MIN = -2, PK_MAX = 16;
  const spineX = M.l + 6;
  const barX = W - M.r + 10, barW = 96;

  function ypx(pk) {
    const v = Math.max(PK_MIN, Math.min(PK_MAX, pk));
    return M.t + (PK_MAX - v) / (PK_MAX - PK_MIN) * PH;
  }
  function yToPH(y) {
    const f = (y - M.t) / PH;
    return PK_MAX - f * (PK_MAX - PK_MIN);
  }

  document.querySelectorAll("[data-widget='pka-ladder']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.7rem";

    let pH = 7.0;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    svg.style.maxWidth = "100%";
    svg.style.background = "#ffffff";
    svg.style.border = "1px solid " + RULE;
    svg.style.borderRadius = "2px";
    svg.style.cursor = "ns-resize";
    svg.style.touchAction = "none";
    host.appendChild(svg);

    // Slider control
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
    slider.min = "-2"; slider.max = "16"; slider.step = "0.1"; slider.value = "7";
    slider.style.flex = "1";
    slider.style.accentColor = ACCENT;
    const phlab = document.createElement("span");
    phlab.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    phlab.style.minWidth = "3.5em";
    phlab.style.textAlign = "right";
    phlab.style.color = INK;
    ctrl.appendChild(lab); ctrl.appendChild(slider); ctrl.appendChild(phlab);
    host.appendChild(ctrl);

    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.8rem";
    legend.style.color = MUTED;
    legend.style.textAlign = "center";
    legend.innerHTML =
      `<span style="color:${WARM};font-weight:600">▮ protonated HA</span> &nbsp;·&nbsp; ` +
      `<span style="color:${ACCENT};font-weight:600">▮ deprotonated A⁻</span>`;
    host.appendChild(legend);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.84rem";
    readout.style.color = MUTED;
    readout.style.textAlign = "center";
    readout.style.lineHeight = "1.5";
    host.appendChild(readout);

    slider.addEventListener("input", () => { pH = +slider.value; redraw(); });

    function setFromY(clientY) {
      const r = svg.getBoundingClientRect();
      const y = (clientY - r.top) / r.height * H;
      pH = Math.max(-2, Math.min(16, yToPH(y)));
      slider.value = pH.toFixed(1);
      redraw();
    }
    let dragging = false;
    svg.addEventListener("mousedown", (e) => { dragging = true; setFromY(e.clientY); });
    window.addEventListener("mousemove", (e) => { if (dragging) setFromY(e.clientY); });
    window.addEventListener("mouseup", () => { dragging = false; });
    svg.addEventListener("touchstart", (e) => { if (e.touches[0]) { setFromY(e.touches[0].clientY); e.preventDefault(); } }, { passive: false });
    svg.addEventListener("touchmove", (e) => { if (e.touches[0]) { setFromY(e.touches[0].clientY); e.preventDefault(); } }, { passive: false });

    redraw();

    function redraw() {
      phlab.textContent = pH.toFixed(1);
      let s = "";

      // pKa gridlines every 2 units
      for (let g = -2; g <= 16; g += 2) {
        const y = ypx(g);
        s += `<line x1="${spineX}" y1="${y.toFixed(1)}" x2="${(barX + barW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${RULE}" stroke-width="1"/>`;
        s += txt(barX + barW + 6, y + 3, g.toFixed(0), 9, FAINT, "start");
      }
      // axis caption
      s += `<text x="${barX + barW + 6}" y="${(M.t - 8).toFixed(1)}" font-size="9" fill="${FAINT}" font-family="Inter,sans-serif">pKa</text>`;
      // spine
      s += `<line x1="${spineX}" y1="${M.t}" x2="${spineX}" y2="${M.t + PH}" stroke="${RULE}" stroke-width="2"/>`;

      let nProt = 0, nDep = 0;
      // acids
      for (const [name, pka] of ACIDS) {
        const y = ypx(pka);
        const a = alphaHA(pH, pka);
        if (a >= 0.5) nProt++; else nDep++;
        const protonated = pka > pH;             // mostly HA
        const col = protonated ? WARM : ACCENT;
        // name + pKa label
        s += txt(spineX - 10, y + 3.5, formula(name), 11, col, "end");
        // dot
        s += `<circle cx="${spineX}" cy="${y.toFixed(1)}" r="3.5" fill="${col}"/>`;
        s += txt(spineX + 8, y + 3.5, pka.toFixed(2), 9.5, MUTED, "start");
        // fraction bar (HA fraction warm on left, A- accent on right)
        const wHA = a * barW;
        s += `<rect x="${barX}" y="${(y - 5).toFixed(1)}" width="${wHA.toFixed(1)}" height="10" fill="${WARM}" opacity="0.85"/>`;
        s += `<rect x="${(barX + wHA).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="${(barW - wHA).toFixed(1)}" height="10" fill="${ACCENT}" opacity="0.85"/>`;
        s += `<rect x="${barX}" y="${(y - 5).toFixed(1)}" width="${barW}" height="10" fill="none" stroke="${RULE}" stroke-width="0.75"/>`;
      }

      // pH line
      const yL = ypx(pH);
      s += `<line x1="${(spineX - 2).toFixed(1)}" y1="${yL.toFixed(1)}" x2="${(barX + barW).toFixed(1)}" y2="${yL.toFixed(1)}" stroke="${ACCENT_DEEP}" stroke-width="2"/>`;
      s += `<polygon points="${(spineX - 2)},${yL} ${(spineX - 10)},${(yL - 5)} ${(spineX - 10)},${(yL + 5)}" fill="${ACCENT_DEEP}"/>`;
      s += `<rect x="${spineX + 30}" y="${(yL - 9).toFixed(1)}" width="58" height="16" rx="2" fill="${ACCENT_DEEP}"/>`;
      s += `<text x="${spineX + 59}" y="${(yL + 2.5).toFixed(1)}" font-size="10.5" fill="#fff" font-family="Inter,sans-serif" text-anchor="middle">pH ${pH.toFixed(1)}</text>`;

      svg.innerHTML = s;

      readout.innerHTML =
        `At pH <strong style="color:${ACCENT_DEEP}">${pH.toFixed(1)}</strong>: ` +
        `<strong style="color:${WARM}">${nProt}</strong> acids mostly protonated (above the line), ` +
        `<strong style="color:${ACCENT}">${nDep}</strong> mostly deprotonated (below).`;
    }
  }

  // Render simple formula names with sub/superscripts as plain SVG text fallback.
  function formula(name) {
    return name
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function txt(x, y, s, size, color, anchor) {
    return `<text x="${(+x).toFixed(1)}" y="${(+y).toFixed(1)}" font-size="${size}" fill="${color}" font-family="Inter,sans-serif" text-anchor="${anchor}">${s}</text>`;
  }
})();
