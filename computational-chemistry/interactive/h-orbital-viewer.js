/* Interactive · Hydrogen-atom orbital viewer.
   Renders real hydrogen orbitals on the xz-plane.
   Mounts into any [data-widget='h-orbital-viewer'] section.

   Orbital wavefunctions are written in atomic units, unnormalized
   (normalization is absorbed into the colormap). The shapes and
   nodes are correct. */

(function () {
  "use strict";

  // Real hydrogen orbitals: ψ as a function of (x, z) on the xz-plane (y = 0).
  // r = sqrt(x² + z²) on this plane.
  // Each fn returns the unnormalized amplitude.
  const ORBITALS = [
    {
      label: "1s",  display: "1s",
      n: 1, l: 0, mlabel: "m = 0",
      scale: 8,
      fn: (x, z, r) => Math.exp(-r)
    },
    {
      label: "2s", display: "2s",
      n: 2, l: 0, mlabel: "m = 0",
      scale: 16,
      fn: (x, z, r) => (2 - r) * Math.exp(-r / 2)
    },
    {
      label: "2px", display: "2pₓ",
      n: 2, l: 1, mlabel: "real combination, lobes along x",
      scale: 16,
      fn: (x, z, r) => x * Math.exp(-r / 2)
    },
    {
      label: "2pz", display: "2p_z",
      n: 2, l: 1, mlabel: "real combination, lobes along z",
      scale: 16,
      fn: (x, z, r) => z * Math.exp(-r / 2)
    },
    {
      label: "3s", display: "3s",
      n: 3, l: 0, mlabel: "m = 0",
      scale: 30,
      fn: (x, z, r) => (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3)
    },
    {
      label: "3pz", display: "3p_z",
      n: 3, l: 1, mlabel: "real combination",
      scale: 30,
      fn: (x, z, r) => z * (6 - r) * Math.exp(-r / 3)
    },
    {
      label: "3dz2", display: "3d_{z²}",
      n: 3, l: 2, mlabel: "real combination",
      scale: 30,
      fn: (x, z, r) => (3 * z * z - r * r) * Math.exp(-r / 3)
    },
    {
      label: "3dxz", display: "3d_{xz}",
      n: 3, l: 2, mlabel: "real combination",
      scale: 30,
      fn: (x, z, r) => x * z * Math.exp(-r / 3)
    }
  ];

  // Colors. Positive = teal (book accent), negative = warm sand.
  // Paper is bg.
  const BG = [251, 250, 247];          // #fbfaf7
  const POS = [31, 111, 122];          // teal
  const NEG = [184, 137, 70];          // warm sand

  const SIZE = 380;  // canvas px

  document.querySelectorAll("[data-widget='h-orbital-viewer']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (!host) return;
    build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.alignItems = "center";
    host.style.gap = "0.75rem";

    // Button row
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.flexWrap = "wrap";
    btnRow.style.justifyContent = "center";
    btnRow.style.gap = "0.4rem";
    btnRow.style.marginTop = "0.25rem";
    host.appendChild(btnRow);

    const buttons = ORBITALS.map(orb => {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.label = orb.label;
      b.innerHTML = prettyOrbital(orb.display);
      styleButton(b, false);
      b.addEventListener("click", () => select(orb));
      btnRow.appendChild(b);
      return b;
    });

    // Canvas wrapper for the orbital and a scale axis
    const canvasWrap = document.createElement("div");
    canvasWrap.style.position = "relative";
    canvasWrap.style.lineHeight = "0";
    host.appendChild(canvasWrap);

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.style.maxWidth = "100%";
    canvas.style.background = "#fbfaf7";
    canvas.style.border = "1px solid #dfe6e7";
    canvas.style.borderRadius = "2px";
    canvasWrap.appendChild(canvas);

    // Crosshairs + axis labels overlay (SVG)
    const axisSvg = mkAxisOverlay(SIZE);
    canvasWrap.appendChild(axisSvg);

    // Info line
    const info = document.createElement("div");
    info.style.fontFamily = "Inter, sans-serif";
    info.style.fontSize = "0.86rem";
    info.style.color = "#5f6d72";
    info.style.textAlign = "center";
    info.style.minHeight = "2.3em";
    info.style.lineHeight = "1.4";
    info.style.padding = "0 0.5rem";
    host.appendChild(info);

    // Legend
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.74rem";
    legend.style.color = "#8e9a9e";
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.style.justifyContent = "center";
    legend.innerHTML = `
      <span><span style="display:inline-block;width:10px;height:10px;background:rgb(31,111,122);border-radius:2px;vertical-align:middle;margin-right:0.35em"></span>ψ &gt; 0</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:rgb(184,137,70);border-radius:2px;vertical-align:middle;margin-right:0.35em"></span>ψ &lt; 0</span>
      <span>intensity ∝ √|ψ|² · paper = node</span>
    `;
    host.appendChild(legend);

    const ctx = canvas.getContext("2d");
    let current = ORBITALS[0];

    function select(orb) {
      current = orb;
      buttons.forEach(b => styleButton(b, b.dataset.label === orb.label));
      render(ctx, orb);
      updateInfo(info, orb);
      updateAxis(axisSvg, orb.scale);
    }

    select(ORBITALS[0]);
  }

  function styleButton(b, active) {
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.78rem";
    b.style.padding = "0.32rem 0.7rem";
    b.style.border = "1px solid " + (active ? "#1f6f7a" : "#c8d3d5");
    b.style.background = active ? "#1f6f7a" : "#ffffff";
    b.style.color = active ? "#ffffff" : "#1c1f21";
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.transition = "background 100ms, color 100ms, border-color 100ms";
    b.style.fontWeight = active ? "600" : "500";
  }

  function render(ctx, orb) {
    const W = SIZE, H = SIZE;
    const half = orb.scale;        // Bohr units shown in each direction
    const img = ctx.createImageData(W, H);
    const data = img.data;

    // First pass: compute psi on a grid, find absolute max.
    const grid = new Float32Array(W * H);
    let maxAbs = 0;
    for (let py = 0; py < H; py++) {
      // z axis: top = +half, bottom = -half
      const z = half - (2 * half) * (py / (H - 1));
      for (let px = 0; px < W; px++) {
        const x = -half + (2 * half) * (px / (W - 1));
        const r = Math.sqrt(x * x + z * z);
        const psi = orb.fn(x, z, r);
        grid[py * W + px] = psi;
        const a = Math.abs(psi);
        if (a > maxAbs) maxAbs = a;
      }
    }
    if (maxAbs === 0) maxAbs = 1;

    // Second pass: paint.
    for (let i = 0; i < grid.length; i++) {
      const psi = grid[i];
      const t = Math.sqrt(Math.abs(psi) / maxAbs);  // sqrt boosts low-density visibility
      const color = psi >= 0 ? POS : NEG;
      const di = i * 4;
      data[di]     = BG[0] + (color[0] - BG[0]) * t;
      data[di + 1] = BG[1] + (color[1] - BG[1]) * t;
      data[di + 2] = BG[2] + (color[2] - BG[2]) * t;
      data[di + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    // Mark the nucleus (origin).
    const cx = W / 2, cz = H / 2;
    ctx.strokeStyle = "rgba(28,31,33,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cz);
    ctx.lineTo(cx + 4, cz);
    ctx.moveTo(cx, cz - 4);
    ctx.lineTo(cx, cz + 4);
    ctx.stroke();
  }

  function updateInfo(info, orb) {
    const E = -0.5 / (orb.n * orb.n);  // Hartree
    const Eev = E * 27.2114;
    info.innerHTML =
      `<strong style="color:#1c1f21;font-weight:600;font-family:'Source Serif 4',serif">${prettyOrbital(orb.display)}</strong>` +
      `&nbsp;&nbsp; n = ${orb.n}, &nbsp; l = ${orb.l}, &nbsp; ${orb.mlabel}` +
      `<br/>` +
      `Energy E<sub>${orb.n}</sub> = −1/(2·${orb.n}²) = ${E.toFixed(4)} Ha &nbsp; (${Eev.toFixed(3)} eV)` +
      `&nbsp;·&nbsp; ${countNodes(orb)} nodes total`;
  }

  function countNodes(orb) {
    // radial nodes = n - l - 1; angular nodes = l
    const radial = orb.n - orb.l - 1;
    return `${radial} radial + ${orb.l} angular = ${orb.n - 1}`;
  }

  function prettyOrbital(s) {
    return s
      .replace(/_\{([^}]+)\}/g, "<sub>$1</sub>")
      .replace(/_([a-z0-9²])/g, "<sub>$1</sub>");
  }

  function mkAxisOverlay(size) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.pointerEvents = "none";
    svg.style.maxWidth = "100%";

    // Axis labels — added in updateAxis
    const labels = document.createElementNS(ns, "g");
    labels.setAttribute("data-role", "labels");
    svg.appendChild(labels);

    // x and z axis hints
    const xLabel = document.createElementNS(ns, "text");
    xLabel.setAttribute("x", size - 12);
    xLabel.setAttribute("y", size / 2 - 6);
    xLabel.setAttribute("text-anchor", "end");
    xLabel.setAttribute("font-family", "Source Serif 4, serif");
    xLabel.setAttribute("font-style", "italic");
    xLabel.setAttribute("font-size", "13");
    xLabel.setAttribute("fill", "#5f6d72");
    xLabel.textContent = "x";
    svg.appendChild(xLabel);

    const zLabel = document.createElementNS(ns, "text");
    zLabel.setAttribute("x", size / 2 + 6);
    zLabel.setAttribute("y", 14);
    zLabel.setAttribute("font-family", "Source Serif 4, serif");
    zLabel.setAttribute("font-style", "italic");
    zLabel.setAttribute("font-size", "13");
    zLabel.setAttribute("fill", "#5f6d72");
    zLabel.textContent = "z";
    svg.appendChild(zLabel);

    return svg;
  }

  function updateAxis(svg, scale) {
    const labels = svg.querySelector("[data-role='labels']");
    while (labels.firstChild) labels.removeChild(labels.firstChild);

    const ns = "http://www.w3.org/2000/svg";
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", SIZE - 8);
    t.setAttribute("y", SIZE - 8);
    t.setAttribute("text-anchor", "end");
    t.setAttribute("font-family", "Inter, sans-serif");
    t.setAttribute("font-size", "10");
    t.setAttribute("fill", "#8e9a9e");
    t.textContent = `±${scale} a₀`;
    labels.appendChild(t);
  }
})();
