/* Interactive · Langevin dynamics + metadynamics on the Müller–Brown PES.
   Parameters from Müller & Brown, Theor. Chim. Acta 53, 75 (1979). */

(function () {
  "use strict";

  // Müller–Brown parameters
  const MB = {
    A:  [-200, -100, -170, 15],
    a:  [-1, -1, -6.5, 0.7],
    b:  [0, 0, 11, 0.6],
    c:  [-10, -10, -6.5, 0.7],
    x0: [1, 0, -0.5, -1],
    y0: [0, 0.5, 1.5, 1]
  };

  // Simulation parameters
  const X_MIN = -1.5, X_MAX = 1.0;
  const Y_MIN = -0.5, Y_MAX = 2.0;
  const DT = 0.001;
  const GAMMA = 1.5;            // damping
  const KT = 12;                // thermal energy (units of Müller–Brown)
  const MASS = 1;

  // Metadynamics
  const SIGMA = 0.07;
  const W0 = 1.5;
  const DT_BIAS = 0.6;          // ΔT for well-tempered factor (so factor on h)
  const DEPOSIT_EVERY = 50;     // simulation steps
  const MAX_HILLS = 400;

  const W = 520, H = 420;
  const PAD = 12;

  function V(x, y) {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const dx = x - MB.x0[i], dy = y - MB.y0[i];
      v += MB.A[i] * Math.exp(MB.a[i] * dx * dx + MB.b[i] * dx * dy + MB.c[i] * dy * dy);
    }
    return v;
  }

  function gradV(x, y) {
    let gx = 0, gy = 0;
    for (let i = 0; i < 4; i++) {
      const dx = x - MB.x0[i], dy = y - MB.y0[i];
      const arg = MB.a[i] * dx * dx + MB.b[i] * dx * dy + MB.c[i] * dy * dy;
      const expo = Math.exp(arg);
      const term = MB.A[i] * expo;
      const darg_dx = 2 * MB.a[i] * dx + MB.b[i] * dy;
      const darg_dy = MB.b[i] * dx + 2 * MB.c[i] * dy;
      gx += term * darg_dx;
      gy += term * darg_dy;
    }
    return [gx, gy];
  }

  function biasGrad(x, y, hills) {
    let gx = 0, gy = 0;
    const s2 = SIGMA * SIGMA;
    for (let i = 0; i < hills.length; i++) {
      const h = hills[i];
      const dx = x - h.x, dy = y - h.y;
      const g = h.h * Math.exp(-(dx * dx + dy * dy) / (2 * s2));
      gx += -g * dx / s2;
      gy += -g * dy / s2;
    }
    return [gx, gy];
  }

  function biasValue(x, y, hills) {
    let v = 0;
    const s2 = SIGMA * SIGMA;
    for (let i = 0; i < hills.length; i++) {
      const h = hills[i];
      const dx = x - h.x, dy = y - h.y;
      v += h.h * Math.exp(-(dx * dx + dy * dy) / (2 * s2));
    }
    return v;
  }

  function gaussRandom() {
    // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ── DOM ───────────────────────────────────────────────────

  document.querySelectorAll("[data-widget='muller-brown']").forEach(section => {
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

    const playBtn = mkBtn("Play");
    const resetBtn = mkBtn("Reset");
    controls.appendChild(playBtn);
    controls.appendChild(resetBtn);

    const metaLbl = document.createElement("label");
    metaLbl.style.fontFamily = "Inter, sans-serif";
    metaLbl.style.fontSize = "0.82rem";
    metaLbl.style.color = "#5f6d72";
    metaLbl.style.cursor = "pointer";
    metaLbl.style.userSelect = "none";
    metaLbl.style.marginLeft = "0.4rem";
    const metaCb = document.createElement("input");
    metaCb.type = "checkbox";
    metaCb.style.marginRight = "0.4em";
    metaLbl.appendChild(metaCb);
    metaLbl.appendChild(document.createTextNode("Well-tempered metadynamics"));
    controls.appendChild(metaLbl);

    const stats = document.createElement("span");
    stats.style.marginLeft = "auto";
    stats.style.fontFamily = "JetBrains Mono, ui-monospace, monospace";
    stats.style.fontSize = "0.78rem";
    stats.style.color = "#5f6d72";
    controls.appendChild(stats);

    // Canvas
    const canvasWrap = document.createElement("div");
    canvasWrap.style.position = "relative";
    canvasWrap.style.maxWidth = "100%";
    canvasWrap.style.aspectRatio = `${W} / ${H}`;
    host.appendChild(canvasWrap);

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.style.width = "100%"; canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.background = "#fbfaf7";
    canvas.style.border = "1px solid #dfe6e7";
    canvas.style.borderRadius = "2px";
    canvasWrap.appendChild(canvas);

    // Legend / notes
    const notes = document.createElement("div");
    notes.style.fontFamily = "Inter, sans-serif";
    notes.style.fontSize = "0.78rem";
    notes.style.color = "#5f6d72";
    notes.innerHTML =
      "Dark valleys = low potential energy; light ridges = high. Three minima (◯ marked) and two saddle points (×). " +
      "Without metadynamics, the particle stays in the basin it started in. With it switched on, deposited Gaussians (faint teal dots) progressively fill the visited well until the particle escapes.";
    host.appendChild(notes);

    // Precompute V grid for background
    const bgImage = renderBackground(canvas);

    // State
    let st = {
      x: -0.558, y: 1.442,                // start at MA (deepest minimum)
      vx: 0, vy: 0,
      step: 0,
      hills: [],
      trail: [],
      running: false,
      meta: false
    };

    metaCb.addEventListener("change", () => { st.meta = metaCb.checked; });
    playBtn.addEventListener("click", () => {
      st.running = !st.running;
      playBtn.textContent = st.running ? "Pause" : "Play";
      if (st.running) loop();
    });
    resetBtn.addEventListener("click", () => {
      st = {
        x: -0.558, y: 1.442,
        vx: 0, vy: 0, step: 0,
        hills: [], trail: [],
        running: false, meta: metaCb.checked
      };
      playBtn.textContent = "Play";
      draw();
      stats.textContent = "step 0";
    });

    function loop() {
      if (!st.running) return;
      for (let i = 0; i < 12; i++) advance();
      draw();
      stats.textContent = `step ${st.step}  ·  hills ${st.hills.length}`;
      requestAnimationFrame(loop);
    }

    function advance() {
      // BAOAB-ish Langevin step
      const [gx0, gy0] = gradV(st.x, st.y);
      const [bgx0, bgy0] = biasGrad(st.x, st.y, st.hills);
      const fx0 = -(gx0 + bgx0), fy0 = -(gy0 + bgy0);

      // Half kick
      st.vx += 0.5 * DT * fx0 / MASS;
      st.vy += 0.5 * DT * fy0 / MASS;
      // Half drift
      st.x += 0.5 * DT * st.vx;
      st.y += 0.5 * DT * st.vy;
      // Langevin O step
      const eg = Math.exp(-GAMMA * DT);
      const sigmav = Math.sqrt((1 - eg * eg) * KT / MASS);
      st.vx = eg * st.vx + sigmav * gaussRandom();
      st.vy = eg * st.vy + sigmav * gaussRandom();
      // Half drift
      st.x += 0.5 * DT * st.vx;
      st.y += 0.5 * DT * st.vy;
      // Half kick (new force)
      const [gx1, gy1] = gradV(st.x, st.y);
      const [bgx1, bgy1] = biasGrad(st.x, st.y, st.hills);
      st.vx += 0.5 * DT * (-(gx1 + bgx1)) / MASS;
      st.vy += 0.5 * DT * (-(gy1 + bgy1)) / MASS;

      // Keep in box
      st.x = Math.max(X_MIN + 0.02, Math.min(X_MAX - 0.02, st.x));
      st.y = Math.max(Y_MIN + 0.02, Math.min(Y_MAX - 0.02, st.y));

      st.step += 1;
      if (st.step % 8 === 0) {
        st.trail.push([st.x, st.y]);
        if (st.trail.length > 200) st.trail.shift();
      }

      // Deposit a hill?
      if (st.meta && st.step % DEPOSIT_EVERY === 0 && st.hills.length < MAX_HILLS) {
        const Vb = biasValue(st.x, st.y, st.hills);
        const h = W0 * Math.exp(-Vb / (KT * DT_BIAS));
        st.hills.push({ x: st.x, y: st.y, h });
      }
    }

    function draw() {
      const ctx = canvas.getContext("2d");
      // Background
      ctx.putImageData(bgImage, 0, 0);
      // Hills
      for (let i = 0; i < st.hills.length; i++) {
        const h = st.hills[i];
        const [px, py] = toPx(h.x, h.y);
        const rpx = SIGMA * (W - 2 * PAD) / (X_MAX - X_MIN);
        const a = 0.08 + 0.04 * Math.min(1, h.h / W0);
        ctx.fillStyle = `rgba(31,111,122,${a})`;
        ctx.beginPath();
        ctx.arc(px, py, rpx, 0, Math.PI * 2);
        ctx.fill();
      }
      // Critical points
      const minima = [
        [-0.558, 1.442], [-0.050, 0.467], [0.623, 0.028]
      ];
      const saddles = [
        [-0.822, 0.624], [0.212, 0.293]
      ];
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "#fbfaf7";
      minima.forEach(p => {
        const [px, py] = toPx(p[0], p[1]);
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.strokeStyle = "#fbfaf7";
      ctx.lineWidth = 1.3;
      saddles.forEach(p => {
        const [px, py] = toPx(p[0], p[1]);
        ctx.beginPath();
        ctx.moveTo(px - 5, py - 5); ctx.lineTo(px + 5, py + 5);
        ctx.moveTo(px - 5, py + 5); ctx.lineTo(px + 5, py - 5);
        ctx.stroke();
      });
      // Trail
      if (st.trail.length > 1) {
        ctx.strokeStyle = "rgba(184,137,70,0.6)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        st.trail.forEach((p, i) => {
          const [px, py] = toPx(p[0], p[1]);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
      // Particle
      const [px, py] = toPx(st.x, st.y);
      ctx.fillStyle = "#b88946";
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fbfaf7";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    function toPx(x, y) {
      const px = PAD + (x - X_MIN) / (X_MAX - X_MIN) * (W - 2 * PAD);
      const py = PAD + (1 - (y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD);
      return [px, py];
    }

    draw();
    stats.textContent = "step 0";
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

  // Render the static V(x,y) background as a heatmap with contour lines.
  function renderBackground(canvas) {
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);
    const data = img.data;
    // Sample V on the pixel grid
    const vMin = -160, vMax = 80;          // clamp range
    // Bright editorial palette: low V = deep teal, high V = warm sand
    const LOW  = [19, 71, 82];             // accent-deep
    const MID  = [220, 225, 220];
    const HIGH = [184, 137, 70];

    for (let py = 0; py < H; py++) {
      const y = Y_MIN + (Y_MAX - Y_MIN) * (1 - (py - PAD) / (H - 2 * PAD));
      for (let px = 0; px < W; px++) {
        const x = X_MIN + (X_MAX - X_MIN) * ((px - PAD) / (W - 2 * PAD));
        let v;
        if (px < PAD || px > W - PAD || py < PAD || py > H - PAD) {
          v = vMin;
        } else {
          v = Math.max(vMin, Math.min(vMax, V(x, y)));
        }
        const t = (v - vMin) / (vMax - vMin);
        let r, g, b;
        if (t < 0.5) {
          const u = t * 2;
          r = LOW[0] + (MID[0] - LOW[0]) * u;
          g = LOW[1] + (MID[1] - LOW[1]) * u;
          b = LOW[2] + (MID[2] - LOW[2]) * u;
        } else {
          const u = (t - 0.5) * 2;
          r = MID[0] + (HIGH[0] - MID[0]) * u;
          g = MID[1] + (HIGH[1] - MID[1]) * u;
          b = MID[2] + (HIGH[2] - MID[2]) * u;
        }
        const di = (py * W + px) * 4;
        data[di]     = r;
        data[di + 1] = g;
        data[di + 2] = b;
        data[di + 3] = 255;
      }
    }

    // Add contour lines at fixed V levels
    const LEVELS = [-140, -100, -60, -20, 20, 60];
    for (let py = 1; py < H - 1; py++) {
      const y = Y_MIN + (Y_MAX - Y_MIN) * (1 - (py - PAD) / (H - 2 * PAD));
      for (let px = 1; px < W - 1; px++) {
        const x = X_MIN + (X_MAX - X_MIN) * ((px - PAD) / (W - 2 * PAD));
        const v00 = V(x, y);
        for (let li = 0; li < LEVELS.length; li++) {
          const L = LEVELS[li];
          if ((v00 - L) * (V(x + 0.01, y) - L) < 0 ||
              (v00 - L) * (V(x, y + 0.01) - L) < 0) {
            const di = (py * W + px) * 4;
            data[di] = 251; data[di + 1] = 250; data[di + 2] = 247;
            data[di + 3] = 100;
            break;
          }
        }
      }
    }
    return img;
  }
})();
