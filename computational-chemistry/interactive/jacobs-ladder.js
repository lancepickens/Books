/* Interactive · Jacob's ladder of XC functionals, on benchmarks.
   Approximate MAE (kcal/mol) on standard test sets.
   Compiled from Goerigk et al. PCCP 2017 (GMTKN55) and Mardirossian–Head-Gordon
   2017; treat as illustrative, not authoritative. */

(function () {
  "use strict";

  // rung labels: 1 = LDA, 2 = GGA, 3 = meta-GGA, 4 = hybrid, 5 = double hybrid
  const FUNCTIONALS = [
    { name: "SVWN (LDA)",        rung: 1,
      ingredients: "ρ",
      values: { atom: 80, barrier: 18, noncov: 3.5, tm: 16 } },
    { name: "BLYP (GGA)",        rung: 2,
      ingredients: "ρ, ∇ρ",
      values: { atom: 9, barrier: 8, noncov: 2.5, tm: 7 } },
    { name: "PBE (GGA)",         rung: 2,
      ingredients: "ρ, ∇ρ",
      values: { atom: 17, barrier: 9.5, noncov: 2.7, tm: 6 } },
    { name: "TPSS (meta-GGA)",   rung: 3,
      ingredients: "ρ, ∇ρ, τ",
      values: { atom: 6, barrier: 7.5, noncov: 1.8, tm: 5 } },
    { name: "SCAN (meta-GGA)",   rung: 3,
      ingredients: "ρ, ∇ρ, τ",
      values: { atom: 5, barrier: 7, noncov: 0.8, tm: 4.5 } },
    { name: "B3LYP (hybrid)",    rung: 4,
      ingredients: "ρ, ∇ρ, 20% HF",
      values: { atom: 4.7, barrier: 4.5, noncov: 2.8, tm: 8.5 } },
    { name: "PBE0 (hybrid)",     rung: 4,
      ingredients: "ρ, ∇ρ, 25% HF",
      values: { atom: 5, barrier: 4.2, noncov: 2.0, tm: 5 } },
    { name: "ωB97X-V (RSH+disp)", rung: 4,
      ingredients: "range-sep. HF, NL disp",
      values: { atom: 2.4, barrier: 2.5, noncov: 0.3, tm: 3 } },
    { name: "DSD-PBEP86 (DH)",   rung: 5,
      ingredients: "+ MP2 corr.",
      values: { atom: 1.8, barrier: 1.8, noncov: 0.3, tm: 3 } },
  ];

  const BENCHMARKS = [
    { key: "atom",    label: "Atomization (W4-11)" },
    { key: "barrier", label: "Barriers (BH76)" },
    { key: "noncov",  label: "Non-covalent (S66)" },
    { key: "tm",      label: "TM org. (MOR41)" }
  ];

  const RUNG_COLORS = {
    1: "#b89146", 2: "#7b9aa4", 3: "#3a7a86", 4: "#1f6f7a", 5: "#134752"
  };

  document.querySelectorAll("[data-widget='jacobs-ladder']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gap = "0.9rem";

    // Functional selector list
    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gridTemplateColumns = "repeat(auto-fit, minmax(170px, 1fr))";
    list.style.gap = "0.4rem";
    list.style.fontFamily = "Inter, sans-serif";
    list.style.fontSize = "0.82rem";
    host.appendChild(list);

    // Two functionals can be highlighted at once
    let active = ["SCAN (meta-GGA)", "ωB97X-V (RSH+disp)"];

    function setActive(name) {
      // Cycle: if already first, demote; otherwise insert at front
      const idx = active.indexOf(name);
      if (idx === 0) return;
      active = [name, active[0]];
      drawAll();
    }

    FUNCTIONALS.forEach(f => {
      const card = document.createElement("button");
      card.type = "button";
      card.dataset.name = f.name;
      card.style.display = "block";
      card.style.textAlign = "left";
      card.style.padding = "0.45rem 0.6rem";
      card.style.border = "1px solid #c8d3d5";
      card.style.background = "#ffffff";
      card.style.borderRadius = "2px";
      card.style.cursor = "pointer";
      card.style.fontFamily = "inherit";
      card.style.lineHeight = "1.35";
      card.innerHTML =
        `<div style="font-weight:600;color:#1c1f21;font-size:0.84rem">${f.name}</div>` +
        `<div style="color:#5f6d72;font-size:0.74rem">rung ${f.rung} · ${f.ingredients}</div>`;
      card.addEventListener("click", () => setActive(f.name));
      list.appendChild(card);
    });

    // Plot
    const canvas = document.createElement("canvas");
    canvas.width = 780; canvas.height = 320;
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
    notes.style.fontSize = "0.8rem";
    notes.style.color = "#5f6d72";
    notes.style.lineHeight = "1.5";
    host.appendChild(notes);

    function drawAll() {
      // Highlight cards
      list.querySelectorAll("button").forEach(b => {
        const i = active.indexOf(b.dataset.name);
        if (i === 0) {
          b.style.borderColor = "#1f6f7a";
          b.style.background = "#e2edef";
        } else if (i === 1) {
          b.style.borderColor = "#5f6d72";
          b.style.background = "#ffffff";
        } else {
          b.style.borderColor = "#c8d3d5";
          b.style.background = "#ffffff";
        }
      });
      // Plot
      renderBars(canvas, active);
      // Notes
      const [a, b] = active.map(n => FUNCTIONALS.find(f => f.name === n));
      if (a && b) {
        notes.innerHTML =
          `<strong style="color:#1c1f21;font-weight:600">${a.name}</strong> vs ` +
          `<strong style="color:#1c1f21;font-weight:600">${b.name}</strong>. ` +
          `Lower bars = smaller mean absolute error. Going up Jacob's ladder generally reduces all four MAEs, but at increasing cost — hybrids require Hartree–Fock exchange every SCF cycle (≈10× the cost of pure DFT), and double hybrids inherit MP2's $O(N^5)$ scaling.`;
      }
    }

    drawAll();
  }

  function renderBars(canvas, active) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#fbfaf7";
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 70, r: 30, t: 30, b: 60 };
    const w = W - pad.l - pad.r, h = H - pad.t - pad.b;

    // Find max MAE for scaling
    let maxV = 1;
    active.forEach(name => {
      const f = FUNCTIONALS.find(x => x.name === name);
      if (!f) return;
      BENCHMARKS.forEach(b => { if (f.values[b.key] > maxV) maxV = f.values[b.key]; });
    });
    maxV = Math.ceil(maxV / 5) * 5;
    if (maxV < 10) maxV = 10;

    // Axes
    ctx.strokeStyle = "#c8d3d5";
    ctx.strokeRect(pad.l, pad.t, w, h);
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "#8e9a9e";
    ctx.textAlign = "right";
    const yticks = 5;
    for (let i = 0; i <= yticks; i++) {
      const yv = (maxV * i / yticks);
      const y = pad.t + h - (yv / maxV) * h;
      ctx.strokeStyle = "#eef2f3";
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = "#8e9a9e";
      ctx.fillText(yv.toFixed(1), pad.l - 6, y + 3);
    }

    // 1 kcal/mol line
    const y1 = pad.t + h - (1 / maxV) * h;
    ctx.strokeStyle = "#1f6f7a";
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, y1); ctx.lineTo(W - pad.r, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1f6f7a";
    ctx.textAlign = "left";
    ctx.fillText("1 kcal/mol", pad.l + 6, y1 - 4);

    // Y axis label
    ctx.save();
    ctx.translate(20, pad.t + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#5f6d72";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MAE (kcal/mol)", 0, 0);
    ctx.restore();

    // Grouped bars: BENCHMARKS x active
    const groupW = w / BENCHMARKS.length;
    const barW = (groupW * 0.55) / active.length;
    const groupPad = (groupW - barW * active.length) / 2;

    BENCHMARKS.forEach((bm, gi) => {
      const gx = pad.l + gi * groupW;
      // Group label
      ctx.fillStyle = "#5f6d72";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(bm.label, gx + groupW / 2, H - pad.b + 16);

      active.forEach((name, ai) => {
        const f = FUNCTIONALS.find(x => x.name === name);
        if (!f) return;
        const v = f.values[bm.key];
        const bx = gx + groupPad + ai * barW;
        const by = pad.t + h - (v / maxV) * h;
        const bh = (v / maxV) * h;
        const color = RUNG_COLORS[f.rung];
        ctx.fillStyle = ai === 0 ? color : color + "88";
        ctx.fillRect(bx, by, barW - 2, bh);
        // value label on top
        ctx.fillStyle = "#1c1f21";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(v.toFixed(1), bx + barW / 2, by - 4);
      });
    });

    // Legend
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "left";
    active.forEach((name, ai) => {
      const f = FUNCTIONALS.find(x => x.name === name);
      if (!f) return;
      const lx = pad.l + ai * 230;
      const ly = pad.t - 10;
      const color = RUNG_COLORS[f.rung];
      ctx.fillStyle = ai === 0 ? color : color + "88";
      ctx.fillRect(lx, ly - 9, 14, 10);
      ctx.fillStyle = "#1c1f21";
      ctx.fillText(name, lx + 19, ly);
    });
  }
})();
