/* Interactive · linear-vibronic-coupling conical intersection.
   Two-state LVC model:
     H = [[κg, λh], [λh, -κg]] + ½ ω² (g² + h²) 𝟙
   Adiabatic energies:
     E_± = ½ ω² (g² + h²) ± √(κ²g² + λ²h²)
   The model gives a perfect conical intersection at (g, h) = (0, 0). */

(function () {
  "use strict";

  const KAPPA = 1.0;
  const LAMBDA = 1.0;
  const OMEGA = 0.7;
  const G_MIN = -2.2, G_MAX = 2.2;
  const H_MIN = -2.2, H_MAX = 2.2;
  const DT = 0.012;
  const MASS = 1;
  const HOP_THRESHOLD = 0.25;  // gap below which Landau-Zener hops are allowed

  const W = 540, H_PX = 380;
  const PAD = 12;

  function Eminus(g, h) {
    return 0.5 * OMEGA * OMEGA * (g * g + h * h) - Math.sqrt(KAPPA * KAPPA * g * g + LAMBDA * LAMBDA * h * h);
  }
  function Eplus(g, h) {
    return 0.5 * OMEGA * OMEGA * (g * g + h * h) + Math.sqrt(KAPPA * KAPPA * g * g + LAMBDA * LAMBDA * h * h);
  }
  function gradE(g, h, sign) {
    // ∇E_± = ω²(g, h) ± (κ²g, λ²h) / √(κ²g² + λ²h²)
    const r2 = KAPPA * KAPPA * g * g + LAMBDA * LAMBDA * h * h;
    const r = Math.sqrt(r2 + 1e-12);
    const gx = OMEGA * OMEGA * g + sign * (KAPPA * KAPPA * g) / r;
    const gy = OMEGA * OMEGA * h + sign * (LAMBDA * LAMBDA * h) / r;
    return [gx, gy];
  }
  function gap(g, h) {
    return 2 * Math.sqrt(KAPPA * KAPPA * g * g + LAMBDA * LAMBDA * h * h);
  }

  document.querySelectorAll("[data-widget='conical-intersection']").forEach(section => {
    const host = section.querySelector(".widget-mount");
    if (host) build(host);
  });

  function build(host) {
    host.innerHTML = "";
    host.style.display = "grid";
    host.style.gap = "0.85rem";

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "0.5rem";
    controls.style.alignItems = "center";
    host.appendChild(controls);

    const launchBtn = mkBtn("Launch");
    const resetBtn = mkBtn("Reset");
    controls.appendChild(launchBtn);
    controls.appendChild(resetBtn);

    // Surface toggle
    const surfaceLbl = document.createElement("label");
    surfaceLbl.style.fontFamily = "Inter, sans-serif";
    surfaceLbl.style.fontSize = "0.82rem";
    surfaceLbl.style.color = "#5f6d72";
    surfaceLbl.style.marginLeft = "0.4rem";
    surfaceLbl.style.cursor = "pointer";
    surfaceLbl.style.userSelect = "none";
    const surfaceSel = document.createElement("select");
    surfaceSel.style.fontFamily = "Inter, sans-serif";
    surfaceSel.style.fontSize = "0.82rem";
    surfaceSel.style.padding = "0.15rem 0.4rem";
    surfaceSel.style.border = "1px solid #c8d3d5";
    surfaceSel.style.background = "#fff";
    surfaceSel.style.color = "#1c1f21";
    surfaceSel.style.borderRadius = "2px";
    ["both", "upper", "lower"].forEach(opt => {
      const o = document.createElement("option");
      o.value = opt; o.textContent = "Show " + opt;
      surfaceSel.appendChild(o);
    });
    surfaceLbl.appendChild(surfaceSel);
    controls.appendChild(surfaceLbl);

    // Initial direction slider
    const angLbl = document.createElement("label");
    angLbl.style.fontFamily = "Inter, sans-serif";
    angLbl.style.fontSize = "0.82rem";
    angLbl.style.color = "#5f6d72";
    angLbl.style.marginLeft = "0.4rem";
    angLbl.textContent = "Initial direction:";
    controls.appendChild(angLbl);
    const angSlider = document.createElement("input");
    angSlider.type = "range";
    angSlider.min = "0"; angSlider.max = "360"; angSlider.value = "210"; angSlider.step = "1";
    angSlider.style.width = "120px";
    controls.appendChild(angSlider);

    const stats = document.createElement("span");
    stats.style.marginLeft = "auto";
    stats.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    stats.style.fontSize = "0.78rem";
    stats.style.color = "#5f6d72";
    controls.appendChild(stats);

    // Canvas
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H_PX;
    canvas.style.width = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.background = "#fbfaf7";
    canvas.style.border = "1px solid #dfe6e7";
    canvas.style.borderRadius = "2px";
    host.appendChild(canvas);

    // Legend
    const legend = document.createElement("div");
    legend.style.fontFamily = "Inter, sans-serif";
    legend.style.fontSize = "0.78rem";
    legend.style.color = "#5f6d72";
    legend.style.display = "flex";
    legend.style.gap = "1.2rem";
    legend.style.flexWrap = "wrap";
    legend.innerHTML = `
      <span><span style="display:inline-block;width:10px;height:10px;background:#b88946;border-radius:2px;vertical-align:middle;margin-right:0.4em"></span>upper-state trajectory</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:#1f6f7a;border-radius:2px;vertical-align:middle;margin-right:0.4em"></span>lower-state trajectory</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:#fbfaf7;border:1px solid #1c1f21;border-radius:50%;vertical-align:middle;margin-right:0.4em"></span>CI at origin</span>
      <span>diamond = hop event</span>
    `;
    host.appendChild(legend);

    // Initial state
    let st = initialState(parseFloat(angSlider.value));

    function initialState(angDeg) {
      const r0 = 1.7;
      const phi = (170 / 180) * Math.PI;
      const g0 = r0 * Math.cos(phi), h0 = r0 * Math.sin(phi);
      const ang = angDeg * Math.PI / 180;
      const speed = 1.4;
      return {
        g: g0, h: h0,
        vg: speed * Math.cos(ang), vh: speed * Math.sin(ang),
        surface: 1,         // +1 upper, -1 lower
        trail: [],
        hops: [],
        running: false,
        step: 0
      };
    }

    let bgImg;
    function setupBackground() { bgImg = renderBackground(canvas, surfaceSel.value); }
    surfaceSel.addEventListener("change", () => { setupBackground(); draw(); });
    setupBackground();

    angSlider.addEventListener("input", () => {
      st = initialState(parseFloat(angSlider.value));
      draw();
    });

    launchBtn.addEventListener("click", () => {
      if (st.running) { st.running = false; launchBtn.textContent = "Launch"; return; }
      st.running = true; launchBtn.textContent = "Pause";
      loop();
    });
    resetBtn.addEventListener("click", () => {
      st = initialState(parseFloat(angSlider.value));
      launchBtn.textContent = "Launch";
      draw();
      stats.textContent = "";
    });

    function loop() {
      if (!st.running) return;
      for (let i = 0; i < 4; i++) advance();
      draw();
      stats.textContent = `t = ${(st.step * DT).toFixed(2)}  ·  surface ${st.surface > 0 ? "upper" : "lower"}  ·  gap ${gap(st.g, st.h).toFixed(3)}`;
      if (st.step * DT > 12 || Math.abs(st.g) > 2.3 || Math.abs(st.h) > 2.3) {
        st.running = false; launchBtn.textContent = "Launch";
        return;
      }
      requestAnimationFrame(loop);
    }

    function advance() {
      // Velocity Verlet on current surface
      const sign = st.surface > 0 ? +1 : -1;
      const [gx0, gy0] = gradE(st.g, st.h, sign);
      // half kick
      st.vg += -0.5 * DT * gx0 / MASS;
      st.vh += -0.5 * DT * gy0 / MASS;
      // drift
      st.g += DT * st.vg;
      st.h += DT * st.vh;
      // half kick
      const [gx1, gy1] = gradE(st.g, st.h, sign);
      st.vg += -0.5 * DT * gx1 / MASS;
      st.vh += -0.5 * DT * gy1 / MASS;
      st.step += 1;

      if (st.step % 2 === 0) {
        st.trail.push({ g: st.g, h: st.h, surface: st.surface });
        if (st.trail.length > 1500) st.trail.shift();
      }

      // Landau-Zener-style hop check
      const dG = gap(st.g, st.h);
      if (dG < HOP_THRESHOLD && st.surface > 0) {
        // hop probability per step (very simplified)
        const phop = Math.exp(-Math.PI * dG * dG / (2 * (st.vg * st.vg + st.vh * st.vh) + 0.05));
        if (Math.random() < phop) {
          st.surface = -1;
          st.hops.push({ g: st.g, h: st.h });
          // Rescale velocity to conserve energy approximately
          const KE = 0.5 * MASS * (st.vg * st.vg + st.vh * st.vh);
          const KEnew = KE + dG;             // gain dG of kinetic energy on downward hop
          const factor = Math.sqrt(Math.max(0.01, KEnew) / Math.max(0.01, KE));
          st.vg *= factor;
          st.vh *= factor;
        }
      }
    }

    function draw() {
      const ctx = canvas.getContext("2d");
      ctx.putImageData(bgImg, 0, 0);

      // CI marker
      const [cx, cy] = toPx(0, 0);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fbfaf7";
      ctx.fill();
      ctx.strokeStyle = "#1c1f21";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Trail
      if (st.trail.length > 1) {
        // Draw segments colored by surface
        for (let i = 1; i < st.trail.length; i++) {
          const a = st.trail[i - 1], b = st.trail[i];
          ctx.strokeStyle = b.surface > 0 ? "rgba(184,137,70,0.85)" : "rgba(31,111,122,0.85)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          const [pax, pay] = toPx(a.g, a.h);
          const [pbx, pby] = toPx(b.g, b.h);
          ctx.moveTo(pax, pay); ctx.lineTo(pbx, pby);
          ctx.stroke();
        }
      }

      // Hop markers
      ctx.fillStyle = "#a83e2a";
      st.hops.forEach(p => {
        const [px, py] = toPx(p.g, p.h);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
      });

      // Particle
      const [px, py] = toPx(st.g, st.h);
      ctx.fillStyle = st.surface > 0 ? "#b88946" : "#1f6f7a";
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fbfaf7";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Initial direction arrow (if not running and no trail)
      if (!st.running && st.trail.length === 0) {
        const ang = parseFloat(angSlider.value) * Math.PI / 180;
        const ax = Math.cos(ang) * 60, ay = -Math.sin(ang) * 60;
        ctx.strokeStyle = "rgba(28,31,33,0.45)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(px + ax, py + ay);
        ctx.stroke();
        // arrowhead
        const hx = px + ax, hy = py + ay;
        const a0 = Math.atan2(ay, ax);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - 8 * Math.cos(a0 - 0.4), hy - 8 * Math.sin(a0 - 0.4));
        ctx.lineTo(hx - 8 * Math.cos(a0 + 0.4), hy - 8 * Math.sin(a0 + 0.4));
        ctx.closePath();
        ctx.fillStyle = "rgba(28,31,33,0.45)";
        ctx.fill();
      }
    }

    function toPx(g, h) {
      const px = PAD + ((g - G_MIN) / (G_MAX - G_MIN)) * (W - 2 * PAD);
      const py = PAD + (1 - (h - H_MIN) / (H_MAX - H_MIN)) * (H_PX - 2 * PAD);
      return [px, py];
    }

    draw();
  }

  function mkBtn(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.fontFamily = "Inter, sans-serif";
    b.style.fontSize = "0.82rem";
    b.style.padding = "0.4rem 0.95rem";
    b.style.border = "1px solid #1f6f7a";
    b.style.background = "#1f6f7a";
    b.style.color = "#fff";
    b.style.borderRadius = "2px";
    b.style.cursor = "pointer";
    b.style.fontWeight = "500";
    return b;
  }

  function renderBackground(canvas, mode) {
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H_PX);
    const data = img.data;
    const LOW  = [19, 71, 82];
    const MID  = [220, 225, 220];
    const HIGH = [184, 137, 70];

    let vMin, vMax;
    if (mode === "lower") { vMin = -2.2; vMax = 1.6; }
    else if (mode === "upper") { vMin = 0; vMax = 6; }
    else { vMin = -2.2; vMax = 5; }

    for (let py = 0; py < H_PX; py++) {
      const h = H_MIN + (H_MAX - H_MIN) * (1 - (py - PAD) / (H_PX - 2 * PAD));
      for (let px = 0; px < W; px++) {
        const g = G_MIN + (G_MAX - G_MIN) * ((px - PAD) / (W - 2 * PAD));
        let v;
        if (px < PAD || px > W - PAD || py < PAD || py > H_PX - PAD) {
          v = vMin;
        } else if (mode === "lower") {
          v = Eminus(g, h);
        } else if (mode === "upper") {
          v = Eplus(g, h);
        } else {
          // Side-by-side blend: left half lower, right half upper
          v = (px < W / 2) ? Eminus(g, h) : Eplus(g, h);
        }
        const t = Math.max(0, Math.min(1, (v - vMin) / (vMax - vMin)));
        let r, gC, b;
        if (t < 0.5) {
          const u = t * 2;
          r = LOW[0] + (MID[0] - LOW[0]) * u;
          gC = LOW[1] + (MID[1] - LOW[1]) * u;
          b = LOW[2] + (MID[2] - LOW[2]) * u;
        } else {
          const u = (t - 0.5) * 2;
          r = MID[0] + (HIGH[0] - MID[0]) * u;
          gC = MID[1] + (HIGH[1] - MID[1]) * u;
          b = MID[2] + (HIGH[2] - MID[2]) * u;
        }
        const di = (py * W + px) * 4;
        data[di] = r; data[di + 1] = gC; data[di + 2] = b; data[di + 3] = 255;
      }
    }

    // For "both" mode, draw a divider line
    if (mode === "both") {
      const xDiv = W / 2;
      for (let py = PAD; py < H_PX - PAD; py++) {
        const di = (py * W + Math.floor(xDiv)) * 4;
        data[di] = 251; data[di + 1] = 250; data[di + 2] = 247; data[di + 3] = 255;
      }
    }

    return img;
  }
})();
