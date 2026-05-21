/* Interactive · Basis-set / method convergence for H₂O.
   Illustrative literature values; numbers rounded to 3 decimals (mHa). */

(function () {
  "use strict";

  // H₂O total energies (Hartrees) at the experimental geometry.
  // Values are reasonable literature approximations and meant to convey
  // the convergence pattern, not high-precision benchmarks.
  const BASES = [
    { key: "sto3g",  label: "STO-3G",   nbf:  7, cardinal: null },
    { key: "321g",   label: "3-21G",    nbf: 13, cardinal: null },
    { key: "631g",   label: "6-31G",    nbf: 13, cardinal: null },
    { key: "631gss", label: "6-31G**",  nbf: 25, cardinal: null },
    { key: "vdz",    label: "cc-pVDZ",  nbf: 24, cardinal: 2 },
    { key: "vtz",    label: "cc-pVTZ",  nbf: 58, cardinal: 3 },
    { key: "vqz",    label: "cc-pVQZ",  nbf: 115, cardinal: 4 },
    { key: "cbs",    label: "CBS limit",  nbf: null, cardinal: null }
  ];

  // Total energy (Hartrees). Approximate.
  const DATA = {
    HF:        { sto3g: -74.962, "321g": -75.586, "631g": -75.984, "631gss": -76.022,
                 vdz: -76.027, vtz: -76.060, vqz: -76.067, cbs: -76.068 },
    MP2:       { sto3g: -74.999, "321g": -75.708, "631g": -76.140, "631gss": -76.219,
                 vdz: -76.230, vtz: -76.319, vqz: -76.355, cbs: -76.366 },
    "CCSD(T)": { sto3g: -75.013, "321g": -75.737, "631g": -76.169, "631gss": -76.246,
                 vdz: -76.243, vtz: -76.337, vqz: -76.378, cbs: -76.392 }
  };

  const COLORS = {
    HF:        "#8e9a9e",
    MP2:       "#1f6f7a",
    "CCSD(T)": "#134752"
  };

  const E_REF_CBS = DATA["CCSD(T)"].cbs;     // reference for "chemical accuracy" band
  const KCAL_TO_HA = 1 / 627.5095;

  document.querySelectorAll("[data-widget='basis-convergence']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gap = "0.9rem";

    // Toggle row
    const toggles = document.createElement("div");
    toggles.style.display = "flex";
    toggles.style.gap = "0.8rem";
    toggles.style.flexWrap = "wrap";
    toggles.style.fontFamily = "Inter, sans-serif";
    toggles.style.fontSize = "0.82rem";
    host.appendChild(toggles);

    const visible = { HF: true, MP2: true, "CCSD(T)": true };
    ["HF", "MP2", "CCSD(T)"].forEach(m => {
      const lbl = document.createElement("label");
      lbl.style.display = "inline-flex";
      lbl.style.alignItems = "center";
      lbl.style.gap = "0.4em";
      lbl.style.cursor = "pointer";
      lbl.style.userSelect = "none";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = true;
      cb.addEventListener("change", () => { visible[m] = cb.checked; draw(); });
      const swatch = document.createElement("span");
      swatch.style.display = "inline-block";
      swatch.style.width = "12px";
      swatch.style.height = "12px";
      swatch.style.background = COLORS[m];
      swatch.style.borderRadius = "2px";
      const txt = document.createElement("span");
      txt.textContent = m;
      lbl.appendChild(cb); lbl.appendChild(swatch); lbl.appendChild(txt);
      toggles.appendChild(lbl);
    });

    // Hover info
    const info = document.createElement("div");
    info.style.fontFamily = "Inter, sans-serif";
    info.style.fontSize = "0.84rem";
    info.style.color = "#5f6d72";
    info.style.minHeight = "1.5em";
    info.textContent = "Hover or click a basis to inspect.";
    host.appendChild(info);

    // Plot
    const canvas = document.createElement("canvas");
    canvas.width = 780; canvas.height = 360;
    canvas.style.width = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.background = "#fbfaf7";
    canvas.style.border = "1px solid #dfe6e7";
    canvas.style.borderRadius = "2px";
    host.appendChild(canvas);

    // Notes
    const notes = document.createElement("div");
    notes.style.fontFamily = "Inter, sans-serif";
    notes.style.fontSize = "0.78rem";
    notes.style.color = "#8e9a9e";
    notes.style.lineHeight = "1.5";
    notes.innerHTML = `
      Reference: CCSD(T)/CBS ≈ ${E_REF_CBS.toFixed(3)} Ha.
      Shaded band marks ±1 kcal/mol (chemical accuracy) around the reference.
      The CCSD curve crosses below HF by the correlation energy; the gap between MP2 and CCSD(T) is what triples and higher add.
    `;
    host.appendChild(notes);

    let hover = null;

    canvas.addEventListener("mousemove", e => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top)  * (canvas.height / rect.height);
      hover = nearestPoint(mx, my);
      draw();
      if (hover) {
        const v = DATA[hover.method][hover.bkey];
        info.innerHTML =
          `<strong style="color:#1c1f21;font-weight:600">${hover.method}/${hover.blabel}</strong>` +
          ` &nbsp; E = ${v.toFixed(4)} Ha` +
          ` &nbsp; (${((v - E_REF_CBS) * 627.5095).toFixed(1)} kcal/mol above CCSD(T)/CBS)`;
      } else {
        info.textContent = "Hover or click a basis to inspect.";
      }
    });
    canvas.addEventListener("mouseleave", () => {
      hover = null;
      draw();
      info.textContent = "Hover or click a basis to inspect.";
    });

    function draw() { renderPlot(canvas, visible, hover); }
    draw();

    function nearestPoint(mx, my) {
      const layout = computeLayout(canvas);
      let best = null, bestD = 20 * 20;
      for (const m of ["HF", "MP2", "CCSD(T)"]) {
        if (!visible[m]) continue;
        BASES.forEach((b, i) => {
          const x = layout.xpx(i), y = layout.ypx(DATA[m][b.key]);
          const d = (x - mx) * (x - mx) + (y - my) * (y - my);
          if (d < bestD) { bestD = d; best = { method: m, bkey: b.key, blabel: b.label, i, x, y }; }
        });
      }
      return best;
    }
  }

  function computeLayout(canvas) {
    const W = canvas.width, H = canvas.height;
    const pad = { l: 70, r: 24, t: 22, b: 56 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;
    const yMin = -76.42, yMax = -74.9;
    const xn = BASES.length;
    return {
      W, H, pad, w, h, yMin, yMax,
      xpx: i => pad.l + (i / (xn - 1)) * w,
      ypx: e => pad.t + (1 - (e - yMin) / (yMax - yMin)) * h
    };
  }

  function renderPlot(canvas, visible, hover) {
    const ctx = canvas.getContext("2d");
    const L = computeLayout(canvas);
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, L.W, L.H);

    // Y gridlines
    ctx.strokeStyle = "#eef2f3";
    ctx.lineWidth = 1;
    const ticks = [-76.4, -76.0, -75.5, -75.0];
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "#8e9a9e";
    ctx.textAlign = "right";
    ticks.forEach(yv => {
      const y = L.ypx(yv);
      ctx.beginPath(); ctx.moveTo(L.pad.l, y); ctx.lineTo(L.W - L.pad.r, y); ctx.stroke();
      ctx.fillText(yv.toFixed(1), L.pad.l - 8, y + 3);
    });
    ctx.textAlign = "center";

    // Chemical accuracy band ±1 kcal/mol around CCSD(T)/CBS
    const bandLo = L.ypx(E_REF_CBS + KCAL_TO_HA);
    const bandHi = L.ypx(E_REF_CBS - KCAL_TO_HA);
    ctx.fillStyle = "rgba(31,111,122,0.10)";
    ctx.fillRect(L.pad.l, bandHi, L.w, bandLo - bandHi);
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "#1f6f7a";
    ctx.textAlign = "left";
    ctx.fillText("± 1 kcal/mol", L.pad.l + 8, bandHi - 4);

    // Frame
    ctx.strokeStyle = "#c8d3d5";
    ctx.lineWidth = 1;
    ctx.strokeRect(L.pad.l, L.pad.t, L.w, L.h);

    // X labels
    ctx.fillStyle = "#5f6d72";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    BASES.forEach((b, i) => {
      const x = L.xpx(i);
      ctx.save();
      ctx.translate(x, L.H - L.pad.b + 12);
      ctx.rotate(-Math.PI / 9);
      ctx.fillText(b.label, 0, 0);
      ctx.restore();
    });

    // Y axis label
    ctx.save();
    ctx.translate(18, L.pad.t + L.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#5f6d72";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Total energy (Hartrees)", 0, 0);
    ctx.restore();

    // Plot lines for each method
    for (const m of ["HF", "MP2", "CCSD(T)"]) {
      if (!visible[m]) continue;
      ctx.strokeStyle = COLORS[m];
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      BASES.forEach((b, i) => {
        const x = L.xpx(i), y = L.ypx(DATA[m][b.key]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = COLORS[m];
      BASES.forEach((b, i) => {
        const x = L.xpx(i), y = L.ypx(DATA[m][b.key]);
        ctx.beginPath();
        ctx.arc(x, y, hover && hover.method === m && hover.i === i ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Method label at right edge
      const last = DATA[m].cbs;
      ctx.fillStyle = COLORS[m];
      ctx.textAlign = "left";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText(m, L.xpx(BASES.length - 1) + 8, L.ypx(last) + 4);
    }

    // Hover marker
    if (hover) {
      ctx.strokeStyle = "#1c1f21";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(hover.x, L.pad.t);
      ctx.lineTo(hover.x, L.H - L.pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
})();
