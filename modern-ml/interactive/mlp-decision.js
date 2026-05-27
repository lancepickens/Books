/* Interactive · Tiny MLP learning a 2D spiral decision boundary.
   Architecture: 2 → 16 (tanh) → 16 (tanh) → 1 (sigmoid).
   Trained by full-batch gradient descent with momentum.
   Mounts into any [data-widget='mlp-decision'] section. */

(function () {
  "use strict";

  const W = 460, H = 460;
  const ACCENT = "#2f6b4a";
  const ACCENT_DEEP = "#1c4530";
  const SAND = "#b8651a";
  const FAINT = "#8e9a9e";
  const RULE = "#dfe6e2";

  const H1 = 16, H2 = 16;
  const LR = 0.05;
  const MOM = 0.9;
  const STEPS_PER_TICK = 5;
  const TICK_MS = 30;

  // ── Data: a two-class spiral ─────────────────────────
  function makeSpiral(n = 100) {
    const X = [], y = [];
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < n; i++) {
        const t = i / n * 3.5;
        const r = t + 0.05;
        const a = 4 * t + c * Math.PI + 0.15 * (Math.random() - 0.5);
        const px = r * Math.cos(a) * 0.25;
        const py = r * Math.sin(a) * 0.25;
        X.push([px, py]);
        y.push(c);
      }
    }
    return { X, y };
  }

  // ── Model ────────────────────────────────────────────
  function rand(d) {
    // Kaiming-ish: std = sqrt(2/d)
    return (Math.random() * 2 - 1) * Math.sqrt(2 / d);
  }

  function initModel(seed) {
    if (typeof seed === "number") {
      // simple deterministic seed via mulberry32
      let a = seed | 0;
      Math.random = function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    const W1 = mat(H1, 2, () => rand(2));
    const b1 = arr(H1);
    const W2 = mat(H2, H1, () => rand(H1));
    const b2 = arr(H2);
    const W3 = mat(1, H2, () => rand(H2));
    const b3 = arr(1);
    return { W1, b1, W2, b2, W3, b3 };
  }

  function mat(r, c, f) {
    const m = [];
    for (let i = 0; i < r; i++) {
      const row = new Array(c);
      for (let j = 0; j < c; j++) row[j] = f(i, j);
      m.push(row);
    }
    return m;
  }
  function arr(n, v = 0) { return new Array(n).fill(v); }

  function forward(x, m) {
    const z1 = matvec(m.W1, x, m.b1);
    const h1 = z1.map(Math.tanh);
    const z2 = matvec(m.W2, h1, m.b2);
    const h2 = z2.map(Math.tanh);
    const z3 = matvec(m.W3, h2, m.b3);
    const o = sig(z3[0]);
    return { h1, h2, o };
  }

  function matvec(W, x, b) {
    const r = W.length, out = new Array(r);
    for (let i = 0; i < r; i++) {
      let s = b ? b[i] : 0;
      const row = W[i];
      for (let j = 0; j < x.length; j++) s += row[j] * x[j];
      out[i] = s;
    }
    return out;
  }

  function sig(z) { return 1 / (1 + Math.exp(-z)); }

  // Full-batch step. Accumulate grads, divide by N, apply momentum.
  function step(model, X, y, grads, vel) {
    const N = X.length;
    zeroGrads(grads);
    let loss = 0;
    for (let n = 0; n < N; n++) {
      const x = X[n], yn = y[n];
      const fwd = forward(x, model);
      const o = fwd.o;
      loss += -yn * Math.log(o + 1e-12) - (1 - yn) * Math.log(1 - o + 1e-12);

      // dL/do via sigmoid+BCE: just (o - y) for z3
      const dz3 = o - yn;
      // dW3, db3
      for (let j = 0; j < H2; j++) grads.W3[0][j] += dz3 * fwd.h2[j];
      grads.b3[0] += dz3;

      // dh2 = W3^T * dz3
      const dh2 = new Array(H2);
      for (let j = 0; j < H2; j++) dh2[j] = model.W3[0][j] * dz3;
      // dz2 = dh2 * (1 - tanh^2)
      const dz2 = new Array(H2);
      for (let j = 0; j < H2; j++) dz2[j] = dh2[j] * (1 - fwd.h2[j] * fwd.h2[j]);

      // dW2, db2
      for (let i = 0; i < H2; i++) {
        for (let j = 0; j < H1; j++) grads.W2[i][j] += dz2[i] * fwd.h1[j];
        grads.b2[i] += dz2[i];
      }

      // dh1 = W2^T * dz2
      const dh1 = new Array(H1).fill(0);
      for (let i = 0; i < H2; i++) {
        for (let j = 0; j < H1; j++) dh1[j] += model.W2[i][j] * dz2[i];
      }
      const dz1 = new Array(H1);
      for (let j = 0; j < H1; j++) dz1[j] = dh1[j] * (1 - fwd.h1[j] * fwd.h1[j]);

      // dW1, db1
      for (let i = 0; i < H1; i++) {
        for (let j = 0; j < 2; j++) grads.W1[i][j] += dz1[i] * x[j];
        grads.b1[i] += dz1[i];
      }
    }
    // average + apply momentum update
    scaleGrads(grads, 1 / N);
    applyMomentum(model, grads, vel, LR, MOM);
    return loss / N;
  }

  function zeroGrads(g) {
    for (const W of [g.W1, g.W2, g.W3]) for (const row of W) row.fill(0);
    for (const b of [g.b1, g.b2, g.b3]) b.fill(0);
  }
  function scaleGrads(g, s) {
    for (const W of [g.W1, g.W2, g.W3]) for (const row of W) for (let j = 0; j < row.length; j++) row[j] *= s;
    for (const b of [g.b1, g.b2, g.b3]) for (let j = 0; j < b.length; j++) b[j] *= s;
  }
  function applyMomentum(model, grads, vel, lr, mom) {
    const Ms = ["W1", "b1", "W2", "b2", "W3", "b3"];
    for (const key of Ms) {
      const p = model[key], g = grads[key], v = vel[key];
      if (Array.isArray(p[0])) {
        for (let i = 0; i < p.length; i++) {
          for (let j = 0; j < p[i].length; j++) {
            v[i][j] = mom * v[i][j] + g[i][j];
            p[i][j] -= lr * v[i][j];
          }
        }
      } else {
        for (let j = 0; j < p.length; j++) {
          v[j] = mom * v[j] + g[j];
          p[j] -= lr * v[j];
        }
      }
    }
  }
  function zerosLike(m) {
    return {
      W1: mat(H1, 2, () => 0), b1: arr(H1),
      W2: mat(H2, H1, () => 0), b2: arr(H2),
      W3: mat(1, H2, () => 0), b3: arr(1),
    };
  }

  // ── Mount ────────────────────────────────────────────
  document.querySelectorAll("[data-widget='mlp-decision']").forEach(section => {
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
    controls.style.gap = "0.6rem";
    controls.style.flexWrap = "wrap";
    controls.style.justifyContent = "center";
    host.appendChild(controls);

    const playBtn = document.createElement("button"); playBtn.textContent = "▶ train"; styleBtn(playBtn);
    const stepBtn = document.createElement("button"); stepBtn.textContent = "+1 step"; styleBtn(stepBtn);
    const resetBtn = document.createElement("button"); resetBtn.textContent = "reset"; styleBtn(resetBtn);
    const newBtn = document.createElement("button"); newBtn.textContent = "new init"; styleBtn(newBtn);
    [playBtn, stepBtn, resetBtn, newBtn].forEach(b => controls.appendChild(b));

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.style.maxWidth = "100%";
    canvas.style.background = "#ffffff";
    canvas.style.border = "1px solid " + RULE;
    canvas.style.borderRadius = "2px";
    host.appendChild(canvas);

    const readout = document.createElement("div");
    readout.style.fontFamily = "Inter, sans-serif";
    readout.style.fontSize = "0.82rem";
    readout.style.color = "#5f6d72";
    host.appendChild(readout);

    const ctx = canvas.getContext("2d");
    const data = makeSpiral(80);
    let model, vel, grads, iter, lastLoss, seed = 7, running = false, timer = null;

    function reset(newSeed) {
      seed = newSeed != null ? newSeed : seed;
      model = initModel(seed);
      vel = zerosLike(model);
      grads = zerosLike(model);
      iter = 0;
      lastLoss = NaN;
      render();
      updateReadout();
    }

    function render() {
      // Heatmap of P(class=1) over [-1.2, 1.2]^2
      const px = 80; // resolution
      const cell = W / px;
      const img = ctx.createImageData(W, H);
      const buf = img.data;

      for (let pi = 0; pi < px; pi++) {
        for (let pj = 0; pj < px; pj++) {
          const x = -1.2 + (2.4 * (pj + 0.5)) / px;
          const y = 1.2 - (2.4 * (pi + 0.5)) / px;
          const o = forward([x, y], model).o;
          // color: o=0 → SAND, o=1 → ACCENT, blend with bg
          const col = blend(o);
          // fill cell
          for (let dy = 0; dy < cell; dy++) {
            for (let dx = 0; dx < cell; dx++) {
              const px_x = Math.floor(pj * cell + dx);
              const px_y = Math.floor(pi * cell + dy);
              if (px_x >= W || px_y >= H) continue;
              const idx = (px_y * W + px_x) * 4;
              buf[idx]     = col[0];
              buf[idx + 1] = col[1];
              buf[idx + 2] = col[2];
              buf[idx + 3] = 255;
            }
          }
        }
      }
      ctx.putImageData(img, 0, 0);

      // Decision boundary contour at o=0.5 — draw via crude marching
      ctx.strokeStyle = "#1c1f21";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      const fine = 160;
      for (let i = 0; i < fine - 1; i++) {
        for (let j = 0; j < fine - 1; j++) {
          const xs = [-1.2 + 2.4 * (j) / (fine - 1), -1.2 + 2.4 * (j + 1) / (fine - 1)];
          const ys = [1.2 - 2.4 * (i) / (fine - 1), 1.2 - 2.4 * (i + 1) / (fine - 1)];
          const vs = [
            forward([xs[0], ys[0]], model).o - 0.5,
            forward([xs[1], ys[0]], model).o - 0.5,
            forward([xs[1], ys[1]], model).o - 0.5,
            forward([xs[0], ys[1]], model).o - 0.5,
          ];
          if (Math.max(...vs) * Math.min(...vs) <= 0) {
            // crossing — just draw a tick at the cell center
            const cx = (xs[0] + xs[1]) / 2, cy = (ys[0] + ys[1]) / 2;
            const px2 = (cx + 1.2) / 2.4 * W;
            const py2 = (1.2 - cy) / 2.4 * H;
            ctx.fillStyle = "#1c1f21";
            ctx.fillRect(px2 - 0.6, py2 - 0.6, 1.2, 1.2);
          }
        }
      }

      // Data points
      data.X.forEach(([x, y], k) => {
        const px2 = (x + 1.2) / 2.4 * W;
        const py2 = (1.2 - y) / 2.4 * H;
        ctx.beginPath();
        ctx.arc(px2, py2, 3.3, 0, Math.PI * 2);
        ctx.fillStyle = data.y[k] ? ACCENT_DEEP : SAND;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });
    }

    function blend(o) {
      // o ∈ [0,1]; mix sand → bg → accent through a soft midpoint
      const BG = [255, 255, 255];
      const POS = [47, 107, 74];      // accent
      const NEG = [184, 101, 26];     // sand
      const strength = Math.abs(o - 0.5) * 2; // 0 at boundary, 1 at extremes
      const target = o > 0.5 ? POS : NEG;
      // muted (low alpha-like) version mixed with white
      const a = 0.25 + 0.55 * strength;
      return [
        Math.round(BG[0] * (1 - a) + target[0] * a),
        Math.round(BG[1] * (1 - a) + target[1] * a),
        Math.round(BG[2] * (1 - a) + target[2] * a),
      ];
    }

    function trainSteps(k) {
      for (let i = 0; i < k; i++) {
        lastLoss = step(model, data.X, data.y, grads, vel);
        iter++;
      }
      render();
      updateReadout();
    }

    function updateReadout() {
      const acc = computeAcc();
      readout.innerHTML =
        `step <strong style="color:${ACCENT_DEEP}">${iter}</strong> &nbsp;·&nbsp; ` +
        `loss <strong style="color:${ACCENT_DEEP}">${isFinite(lastLoss) ? lastLoss.toFixed(3) : "—"}</strong> &nbsp;·&nbsp; ` +
        `train acc <strong style="color:${ACCENT_DEEP}">${(acc * 100).toFixed(1)}%</strong>`;
    }

    function computeAcc() {
      let c = 0;
      for (let i = 0; i < data.X.length; i++) {
        const o = forward(data.X[i], model).o;
        const yhat = o >= 0.5 ? 1 : 0;
        if (yhat === data.y[i]) c++;
      }
      return c / data.X.length;
    }

    playBtn.addEventListener("click", () => {
      running = !running;
      playBtn.textContent = running ? "⏸ pause" : "▶ train";
      if (running) {
        timer = setInterval(() => trainSteps(STEPS_PER_TICK), TICK_MS);
      } else {
        clearInterval(timer);
      }
    });
    stepBtn.addEventListener("click", () => trainSteps(1));
    resetBtn.addEventListener("click", () => { if (running) { running = false; clearInterval(timer); playBtn.textContent = "▶ train"; } reset(); });
    newBtn.addEventListener("click", () => { if (running) { running = false; clearInterval(timer); playBtn.textContent = "▶ train"; } reset(Math.floor(Math.random() * 100000)); });

    reset(seed);
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
    b.addEventListener("mouseenter", () => { b.style.background = ACCENT; b.style.color = "#fff"; });
    b.addEventListener("mouseleave", () => { b.style.background = "#fff"; b.style.color = ACCENT; });
  }
})();
